import { RoomState, ChatMessage } from '../types/game';
import { localEngine } from './localEngine';
import { p2pMesh } from './p2pMesh';
import { firebaseService } from './firebaseService';
import { Unsubscribe } from 'firebase/firestore';

type MessageHandler = (data: any) => void;

class SocketService {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<MessageHandler>> = new Map();
  private isConnecting: boolean = false;
  public isFallbackMode: boolean = false;
  public isP2PHost: boolean = false;
  public isP2PGuest: boolean = false;

  public playerId: string = '';
  public sessionToken: string = '';
  public currentRoomCode: string = '';
  public walletBalance: number = 10000;
  private firestoreUnsub: Unsubscribe | null = null;
  private syncPollInterval: any = null;

  constructor() {
    this.playerId =
      sessionStorage.getItem('sw_player_id') ||
      `p_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    this.sessionToken =
      sessionStorage.getItem('sw_session_token') ||
      `token_${Math.random().toString(36).substring(2, 10)}`;
    this.currentRoomCode = sessionStorage.getItem('sw_room_code') || '';

    sessionStorage.setItem('sw_player_id', this.playerId);
    sessionStorage.setItem('sw_session_token', this.sessionToken);

    // Bind local engine broadcasts to this service
    localEngine.setBroadcast((msg: any) => {
      this.handleServerMessage(msg);
    });

    // Bind P2P Mesh messages across devices (WebRTC)
    p2pMesh.onMessage((data: any, senderPeerId?: string) => {
      if (this.isP2PHost) {
        if (data.type === 'JOIN_ROOM') {
          localEngine.handleGuestJoin(data.payload, senderPeerId);
        } else {
          localEngine.handleAction(data.playerId, data.type, data.payload);
        }
      } else {
        // Guest receives authoritative state from Host
        this.handleServerMessage(data);
      }
    });

    // Start background sync poll to guarantee state is continuously fresh
    this.syncPollInterval = setInterval(() => {
      this.backgroundSync();
    }, 1500);

    // Load persisted wallet from Firebase
    firebaseService.getUserWallet(this.playerId).then((balance) => {
      if (balance !== null) {
        this.walletBalance = balance;
      }
    });
  }

  public connect(): Promise<void> {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return Promise.resolve();
    }

    this.isConnecting = true;

    return new Promise((resolve) => {
      const customWsUrl = (import.meta as any).env?.VITE_WS_URL;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = customWsUrl || `${protocol}//${host}`;

      // If on Vercel and no custom WS URL provided, activate P2P WebRTC mesh
      if (!customWsUrl && window.location.hostname.includes('vercel.app')) {
        this.isFallbackMode = true;
        this.isConnecting = false;
        resolve();
        return;
      }

      try {
        this.ws = new WebSocket(wsUrl);

        const timeout = setTimeout(() => {
          if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            this.isFallbackMode = true;
            this.isConnecting = false;
            resolve();
          }
        }, 1200);

        this.ws.onopen = () => {
          clearTimeout(timeout);
          this.isConnecting = false;
          this.isFallbackMode = false;
          console.log('[Socket] Connected to real-time server');
          if (this.currentRoomCode && this.sessionToken) {
            this.reconnect();
          }
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            this.handleServerMessage(msg);
          } catch (err) {
            console.error('[Socket] Failed to parse message', err);
          }
        };

        this.ws.onclose = () => {
          clearTimeout(timeout);
          this.isConnecting = false;
          this.isFallbackMode = true;
          resolve();
        };

        this.ws.onerror = () => {
          clearTimeout(timeout);
          this.isConnecting = false;
          this.isFallbackMode = true;
          resolve();
        };
      } catch (err) {
        this.isConnecting = false;
        this.isFallbackMode = true;
        resolve();
      }
    });
  }

  public handleServerMessage(msg: any) {
    const { type } = msg;

    // Strict Room-Based Scoping & Namespace Isolation:
    // If the client is already in a room, verify that incoming events match this room code,
    // preventing cross-room collisions or leaked updates from foreign lobbies.
    const incomingRoomCode = (msg.roomCode || msg.room?.roomCode || '').toUpperCase().trim();
    if (
      this.currentRoomCode &&
      incomingRoomCode &&
      incomingRoomCode !== this.currentRoomCode &&
      type !== 'ROOM_JOINED'
    ) {
      console.warn(`[Socket Scoping] Ignored event for room ${incomingRoomCode} while in ${this.currentRoomCode}`);
      return;
    }

    if (type === 'ROOM_JOINED') {
      this.playerId = msg.playerId;
      this.sessionToken = msg.sessionToken;
      this.currentRoomCode = (msg.roomCode || '').toUpperCase().trim();
      this.walletBalance = msg.walletBalance;

      sessionStorage.setItem('sw_player_id', this.playerId);
      sessionStorage.setItem('sw_session_token', this.sessionToken);
      sessionStorage.setItem('sw_room_code', this.currentRoomCode);

      localEngine.setActiveRoom(this.currentRoomCode);
      this.subscribeToFirestore(this.currentRoomCode);
      firebaseService.saveUserWallet(this.playerId, this.walletBalance);
    }

    if (type === 'HINT_DELIVERED') {
      this.walletBalance = msg.newWalletBalance;
      firebaseService.saveUserWallet(this.playerId, this.walletBalance);
    }

    const typeListeners = this.listeners.get(type);
    if (typeListeners) {
      typeListeners.forEach((handler) => handler(msg));
    }

    const allListeners = this.listeners.get('*');
    if (allListeners) {
      allListeners.forEach((handler) => handler(msg));
    }
  }

  public on(type: string, handler: MessageHandler) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(handler);
    return () => {
      this.listeners.get(type)?.delete(handler);
    };
  }

  public send(type: string, payload: any = {}) {
    const scopedPayload = {
      ...payload,
      roomCode: payload.roomCode || this.currentRoomCode,
    };

    // If WebSocket is open and active, send to real-time server
    if (this.ws && this.ws.readyState === WebSocket.OPEN && !this.isFallbackMode) {
      this.ws.send(JSON.stringify({ type, payload: scopedPayload }));
      return;
    }

    // If Guest in P2P WebRTC mesh, forward action to the Host
    if (this.isP2PGuest) {
      p2pMesh.send({
        type,
        playerId: this.playerId,
        roomCode: this.currentRoomCode,
        payload: scopedPayload,
      });
      return;
    }

    // If Host, execute in authoritative local engine (which broadcasts to all guests)
    localEngine.handleAction(this.playerId, type, scopedPayload);
  }

  public async createRoom(playerName: string, avatar: string, title?: string, badgeFrame?: string) {
    // If WebSocket is active, create on server
    if (this.ws && this.ws.readyState === WebSocket.OPEN && !this.isFallbackMode) {
      this.send('CREATE_ROOM', {
        playerName,
        avatar,
        title,
        badgeFrame,
        sessionToken: this.sessionToken,
      });
      return;
    }

    // Serverless / Vercel Host Mode
    this.isP2PHost = true;
    this.isP2PGuest = false;

    localEngine.handleAction(this.playerId, 'CREATE_ROOM', {
      playerName,
      avatar,
      title,
      badgeFrame,
      sessionToken: this.sessionToken,
    });

    if (this.currentRoomCode) {
      try {
        await p2pMesh.hostRoom(this.currentRoomCode);
        console.log('[Socket] P2P WebRTC Host active for room:', this.currentRoomCode);
      } catch (err) {
        console.warn('[Socket] Could not open P2P Host peer:', err);
      }
    }
  }

  private subscribeToFirestore(roomCode: string) {
    if (this.firestoreUnsub) {
      this.firestoreUnsub();
      this.firestoreUnsub = null;
    }

    if (!roomCode) return;

    this.firestoreUnsub = firebaseService.subscribeRoom(roomCode, (remoteRoom) => {
      if (remoteRoom && remoteRoom.roomCode === this.currentRoomCode) {
        this.handleServerMessage({
          type: 'ROOM_UPDATE',
          room: remoteRoom,
        });
      }
    });
  }

  private async backgroundSync() {
    if (!this.currentRoomCode) return;

    try {
      const room = await firebaseService.fetchRoom(this.currentRoomCode);
      if (room && room.roomCode === this.currentRoomCode) {
        this.handleServerMessage({
          type: 'ROOM_UPDATE',
          room,
        });
      }
    } catch (err) {
      // background sync silent catch
    }
  }

  public async joinRoom(
    roomCode: string,
    playerName: string,
    avatar: string,
    title?: string,
    badgeFrame?: string
  ) {
    const code = roomCode.toUpperCase().trim();
    this.currentRoomCode = code;
    sessionStorage.setItem('sw_room_code', code);

    // If WebSocket is active, join on server
    if (this.ws && this.ws.readyState === WebSocket.OPEN && !this.isFallbackMode) {
      this.send('JOIN_ROOM', {
        roomCode: code,
        playerName,
        avatar,
        title,
        badgeFrame,
        sessionToken: this.sessionToken,
      });
      return;
    }

    // Check if room is present in local memory
    if (localEngine.getRoom(code)) {
      this.isP2PHost = true;
      this.isP2PGuest = false;
      localEngine.handleAction(this.playerId, 'JOIN_ROOM', {
        roomCode: code,
        playerName,
        avatar,
        title,
        badgeFrame,
        sessionToken: this.sessionToken,
      });
      return;
    }

    // Check if room exists in Firebase Firestore
    try {
      const firestoreRoom = await firebaseService.fetchRoom(code);
      if (firestoreRoom) {
        if (!firestoreRoom.players[this.playerId]) {
          firestoreRoom.players[this.playerId] = {
            id: this.playerId,
            name: playerName || `Agent ${Object.keys(firestoreRoom.players).length + 1}`,
            avatar: avatar || '🦊',
            title: title || 'Rookie Tactician',
            badgeFrame: badgeFrame || 'border-slate-700',
            isHost: false,
            isReady: false,
            isConnected: true,
            score: 0,
            sessionToken: this.sessionToken,
            lastActive: Date.now(),
            hintsUsed: 0,
          };
          if (!firestoreRoom.playerOrder.includes(this.playerId)) {
            firestoreRoom.playerOrder.push(this.playerId);
          }
        } else {
          firestoreRoom.players[this.playerId].isConnected = true;
          firestoreRoom.players[this.playerId].lastActive = Date.now();
        }

        await firebaseService.saveRoom(firestoreRoom);

        this.handleServerMessage({
          type: 'ROOM_JOINED',
          roomCode: code,
          playerId: this.playerId,
          sessionToken: this.sessionToken,
          walletBalance: this.walletBalance,
          room: firestoreRoom,
        });
        this.handleServerMessage({ type: 'ROOM_UPDATE', room: firestoreRoom });
        return;
      }
    } catch (err) {
      console.warn('[Socket] Firestore room lookup notice:', err);
    }

    // Cross-device WebRTC P2P Guest Connection Fallback
    this.isP2PHost = false;
    this.isP2PGuest = true;

    try {
      await p2pMesh.joinRoom(code, {
        type: 'JOIN_ROOM',
        playerId: this.playerId,
        payload: {
          roomCode: code,
          playerName,
          avatar,
          title,
          badgeFrame,
          sessionToken: this.sessionToken,
          playerId: this.playerId,
        },
      });
      console.log('[Socket] Connected as P2P Guest to room:', code);
    } catch (err: any) {
      this.handleServerMessage({
        type: 'ERROR',
        message: `Could not connect to Room "${code}". Make sure the Host has created the room first!`,
      });
    }
  }

  public reconnect() {
    if (this.currentRoomCode && this.sessionToken) {
      this.send('JOIN_ROOM', {
        roomCode: this.currentRoomCode,
        sessionToken: this.sessionToken,
      });
    }
  }

  public setReady() {
    this.send('SET_READY');
  }

  public addBotPlayer() {
    this.send('HOST_ADD_BOT');
  }

  public updateSettings(settings: any) {
    this.send('HOST_UPDATE_SETTINGS', settings);
  }

  public startGame() {
    this.send('HOST_START_GAME');
  }

  public useHint(tier: number) {
    this.send('USE_HINT', { tier });
  }

  public sendGameAction(gameType: string, action: string, actionPayload: any = {}) {
    this.send('GAME_ACTION', { gameType, action, actionPayload });
  }

  public sendChat(text: string, recipientId?: string) {
    this.send('SEND_CHAT', { text, recipientId });
  }

  public sendReaction(emoji: string) {
    this.send('SEND_REACTION', { emoji });
  }

  public kickPlayer(targetPlayerId: string) {
    this.send('HOST_KICK_PLAYER', { targetPlayerId });
  }

  public transferHost(targetPlayerId: string) {
    this.send('HOST_TRANSFER', { targetPlayerId });
  }

  public rematch() {
    this.send('HOST_REMATCH');
  }

  public leaveRoom() {
    this.currentRoomCode = '';
    sessionStorage.removeItem('sw_room_code');
    p2pMesh.destroy();
    window.location.reload();
  }
}

export const socket = new SocketService();
