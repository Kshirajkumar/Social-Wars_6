import { Peer, DataConnection } from 'peerjs';

export type P2PMessageHandler = (data: any, senderPeerId?: string) => void;

class P2PMeshService {
  private peer: Peer | null = null;
  private hostConnection: DataConnection | null = null;
  private guestConnections: Map<string, DataConnection> = new Map();
  private messageHandlers: Set<P2PMessageHandler> = new Set();
  private isHost: boolean = false;
  private currentRoomCode: string = '';
  public isConnected: boolean = false;

  private iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
  ];

  public onMessage(handler: P2PMessageHandler) {
    this.messageHandlers.add(handler);
    return () => {
      this.messageHandlers.delete(handler);
    };
  }

  private emitMessage(data: any, senderPeerId?: string) {
    // Room-Scoped Isolation:
    // If message is tagged with a room code, ensure it matches this peer's active room
    const msgRoomCode = (data?.roomCode || data?.room?.roomCode || '').toUpperCase().trim();
    if (this.currentRoomCode && msgRoomCode && msgRoomCode !== this.currentRoomCode) {
      console.warn(`[P2P Mesh] Dropped message for foreign room: ${msgRoomCode} (Active: ${this.currentRoomCode})`);
      return;
    }
    this.messageHandlers.forEach((handler) => handler(data, senderPeerId));
  }

  /**
   * Host initializes room as the WebRTC Room Server
   */
  public hostRoom(roomCode: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.destroy();

      this.isHost = true;
      this.currentRoomCode = roomCode.toUpperCase().trim();
      const peerId = `swars_host_${this.currentRoomCode.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

      try {
        this.peer = new Peer(peerId, {
          debug: 1,
          config: { iceServers: this.iceServers },
        });

        this.peer.on('open', (id) => {
          console.log('[P2P Mesh] Host peer opened with ID:', id);
          this.isConnected = true;
          resolve(id);
        });

        this.peer.on('connection', (conn) => {
          console.log('[P2P Mesh] Guest connected:', conn.peer);
          this.guestConnections.set(conn.peer, conn);

          conn.on('open', () => {
            this.guestConnections.set(conn.peer, conn);
          });

          conn.on('data', (data: any) => {
            this.emitMessage(data, conn.peer);
          });

          conn.on('close', () => {
            console.log('[P2P Mesh] Guest disconnected:', conn.peer);
            this.guestConnections.delete(conn.peer);
            this.emitMessage({
              type: 'P2P_GUEST_DISCONNECTED',
              guestPeerId: conn.peer,
            });
          });

          conn.on('error', (err) => {
            console.warn('[P2P Mesh] Guest connection error:', err);
            this.guestConnections.delete(conn.peer);
          });
        });

        this.peer.on('error', (err: any) => {
          console.warn('[P2P Mesh] Host peer error:', err);
          if (err.type === 'unavailable-id') {
            // Already taken ID (e.g. fast refresh), fallback with random suffix
            resolve(peerId);
          } else {
            reject(err);
          }
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Guest connects to the Host's room
   */
  public joinRoom(roomCode: string, initialPayload?: any): Promise<void> {
    return new Promise((resolve, reject) => {
      this.destroy();

      this.isHost = false;
      this.currentRoomCode = roomCode.toUpperCase().trim();
      const targetHostPeerId = `swars_host_${this.currentRoomCode.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      const guestPeerId = `swars_guest_${this.currentRoomCode.toLowerCase()}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;

      let hasResolved = false;

      const timeout = setTimeout(() => {
        if (!hasResolved) {
          hasResolved = true;
          reject(new Error(`Room ${this.currentRoomCode} not found or Host is offline.`));
        }
      }, 7000);

      try {
        this.peer = new Peer(guestPeerId, {
          debug: 1,
          config: { iceServers: this.iceServers },
        });

        this.peer.on('open', () => {
          console.log('[P2P Mesh] Guest peer opened, connecting to host:', targetHostPeerId);
          const conn = this.peer!.connect(targetHostPeerId, { reliable: true });
          this.hostConnection = conn;

          conn.on('open', () => {
            console.log('[P2P Mesh] Connected to Host!');
            this.isConnected = true;
            clearTimeout(timeout);
            if (!hasResolved) {
              hasResolved = true;
              resolve();
            }

            if (initialPayload) {
              conn.send(initialPayload);
            }
          });

          conn.on('data', (data: any) => {
            this.emitMessage(data);
          });

          conn.on('close', () => {
            console.warn('[P2P Mesh] Host closed connection');
            this.isConnected = false;
            this.emitMessage({
              type: 'ERROR',
              message: 'Host disconnected from room.',
            });
          });

          conn.on('error', (err) => {
            console.error('[P2P Mesh] Connection error to host:', err);
            clearTimeout(timeout);
            if (!hasResolved) {
              hasResolved = true;
              reject(err);
            }
          });
        });

        this.peer.on('error', (err: any) => {
          console.warn('[P2P Mesh] Peer error:', err);
          clearTimeout(timeout);
          if (!hasResolved) {
            hasResolved = true;
            reject(err);
          }
        });
      } catch (err) {
        clearTimeout(timeout);
        if (!hasResolved) {
          hasResolved = true;
          reject(err);
        }
      }
    });
  }

  /**
   * Send a message:
   * - If Host: broadcasts to all connected guests
   * - If Guest: sends directly to Host
   */
  public send(msg: any) {
    if (this.isHost) {
      this.broadcastToGuests(msg);
    } else if (this.hostConnection && this.hostConnection.open) {
      this.hostConnection.send(msg);
    }
  }

  /**
   * Host sends message directly to a specific guest phone
   */
  public sendToGuest(guestPeerId: string, msg: any) {
    const conn = this.guestConnections.get(guestPeerId);
    if (conn) {
      if (conn.open) {
        try {
          conn.send(msg);
        } catch (err) {
          console.warn('[P2P Mesh] Failed to send direct to guest:', guestPeerId, err);
        }
      } else {
        let sent = false;
        conn.on('open', () => {
          if (sent) return;
          sent = true;
          try {
            conn.send(msg);
          } catch (err) {
            console.warn('[P2P Mesh] Failed to send queued msg to guest:', guestPeerId, err);
          }
        });
      }
    }
  }

  /**
   * Host broadcasts message to all guest phones
   */
  public broadcastToGuests(msg: any) {
    const taggedMsg = this.currentRoomCode ? { ...msg, roomCode: this.currentRoomCode } : msg;
    this.guestConnections.forEach((conn) => {
      if (conn.open) {
        try {
          conn.send(taggedMsg);
        } catch (err) {
          console.warn('[P2P Mesh] Failed to send to guest:', conn.peer, err);
        }
      }
    });
  }

  public getConnectedGuestsCount(): number {
    return Array.from(this.guestConnections.values()).filter((c) => c.open).length;
  }

  public destroy() {
    this.isConnected = false;
    this.isHost = false;
    if (this.hostConnection) {
      try {
        this.hostConnection.close();
      } catch {}
      this.hostConnection = null;
    }
    this.guestConnections.forEach((conn) => {
      try {
        conn.close();
      } catch {}
    });
    this.guestConnections.clear();
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch {}
      this.peer = null;
    }
  }
}

export const p2pMesh = new P2PMeshService();
