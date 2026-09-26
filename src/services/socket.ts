import { RoomState, ChatMessage } from '../types/game';
import { localEngine } from './localEngine';

type MessageHandler = (data: any) => void;

class SocketService {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<MessageHandler>> = new Map();
  private reconnectTimer: any = null;
  private isConnecting: boolean = false;
  public isFallbackMode: boolean = false;

  public playerId: string = '';
  public sessionToken: string = '';
  public currentRoomCode: string = '';
  public walletBalance: number = 10000;

  constructor() {
    this.playerId = sessionStorage.getItem('sw_player_id') || `p_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    this.sessionToken = sessionStorage.getItem('sw_session_token') || `token_${Math.random().toString(36).substring(2, 10)}`;
    this.currentRoomCode = sessionStorage.getItem('sw_room_code') || '';

    sessionStorage.setItem('sw_player_id', this.playerId);
    sessionStorage.setItem('sw_session_token', this.sessionToken);

    // Bind local engine broadcasts to this service
    localEngine.setBroadcast((msg: any) => {
      this.handleServerMessage(msg);
    });
  }

  public connect(): Promise<void> {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return Promise.resolve();
    }

    this.isConnecting = true;

    return new Promise((resolve) => {
      // Optional explicit external WebSocket URL via environment variable
      const customWsUrl = (import.meta as any).env?.VITE_WS_URL;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = customWsUrl || `${protocol}//${host}`;

      // If on Vercel and no custom WS URL provided, immediately activate resilient local engine
      if (!customWsUrl && window.location.hostname.includes('vercel.app')) {
        this.isFallbackMode = true;
        this.isConnecting = false;
        resolve();
        return;
      }

      try {
        this.ws = new WebSocket(wsUrl);

        // Safety timeout: if WebSocket doesn't connect in 1.2s, enable fallback engine so buttons never stall
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
          // Switch seamlessly to fallback mode on connection drop
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

    if (type === 'ROOM_JOINED') {
      this.playerId = msg.playerId;
      this.sessionToken = msg.sessionToken;
      this.currentRoomCode = msg.roomCode;
      this.walletBalance = msg.walletBalance;

      sessionStorage.setItem('sw_player_id', this.playerId);
      sessionStorage.setItem('sw_session_token', this.sessionToken);
      sessionStorage.setItem('sw_room_code', this.currentRoomCode);
    }

    if (type === 'HINT_DELIVERED') {
      this.walletBalance = msg.newWalletBalance;
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
    // If WebSocket is open and active, send to real-time server
    if (this.ws && this.ws.readyState === WebSocket.OPEN && !this.isFallbackMode) {
      this.ws.send(JSON.stringify({ type, payload }));
      return;
    }

    // Otherwise, immediately execute in client authoritative engine with 0ms latency!
    localEngine.handleAction(this.playerId, type, payload);
  }

  public createRoom(playerName: string, avatar: string, title?: string, badgeFrame?: string) {
    this.send('CREATE_ROOM', {
      playerName,
      avatar,
      title,
      badgeFrame,
      sessionToken: this.sessionToken,
    });
  }

  public joinRoom(roomCode: string, playerName: string, avatar: string, title?: string, badgeFrame?: string) {
    this.currentRoomCode = roomCode.toUpperCase().trim();
    sessionStorage.setItem('sw_room_code', this.currentRoomCode);
    this.send('JOIN_ROOM', {
      roomCode: this.currentRoomCode,
      playerName,
      avatar,
      title,
      badgeFrame,
      sessionToken: this.sessionToken,
    });
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
    window.location.reload();
  }
}

export const socket = new SocketService();
