import {
  RoomState,
  RoomPlayer,
  ChatMessage,
  GameType,
  HINT_TIERS,
  PostGameSummary,
  BluffLocationId,
} from '../types/game';
import {
  generateBluffCityGame,
  generateMurderMysteryGame,
  generateSecretAuctionGame,
} from './procedural';

type EngineBroadcast = (msg: any) => void;

class LocalRoomEngine {
  private rooms: Map<string, RoomState> = new Map();
  private broadcastCallback: EngineBroadcast | null = null;
  private channel: BroadcastChannel | null = null;
  private tickerInterval: any = null;

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.channel = new BroadcastChannel('social_wars_mesh');
      this.channel.onmessage = (event) => {
        const { type, room, message, payload, targetPlayerId } = event.data;
        if (room) {
          this.rooms.set(room.roomCode, room);
        }
        if (this.broadcastCallback) {
          this.broadcastCallback(event.data);
        }
      };
    }

    // Authoritative ticker for Vercel/local mode
    this.tickerInterval = setInterval(() => {
      this.tick();
    }, 1000);
  }

  public setBroadcast(cb: EngineBroadcast) {
    this.broadcastCallback = cb;
  }

  private broadcast(msg: any) {
    if (this.channel) {
      this.channel.postMessage(msg);
    }
    if (this.broadcastCallback) {
      this.broadcastCallback(msg);
    }
  }

  private generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return this.rooms.has(code) ? this.generateCode() : code;
  }

  public handleAction(playerId: string, actionType: string, payload: any) {
    switch (actionType) {
      case 'CREATE_ROOM': {
        const { playerName, avatar, title, badgeFrame, sessionToken } = payload;
        const code = this.generateCode();
        const pId = playerId || `p_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const token = sessionToken || `token_${Math.random().toString(36).substring(2, 10)}`;

        const hostPlayer: RoomPlayer = {
          id: pId,
          name: playerName || 'Player 1',
          avatar: avatar || '🐺',
          title: title || 'Rookie Tactician',
          badgeFrame: badgeFrame || 'border-slate-700',
          isHost: true,
          isReady: true,
          isConnected: true,
          score: 0,
          sessionToken: token,
          lastActive: Date.now(),
          hintsUsed: 0,
        };

        const newRoom: RoomState = {
          roomCode: code,
          phase: 'LOBBY',
          hostId: pId,
          settings: {
            selectedGame: 'BLUFF_CITY',
            difficulty: 'BEGINNER',
            level: 1,
            matchLengthMinutes: 5,
            hintsEnabled: true,
            privateMessagingEnabled: true,
            progressiveMode: true,
          },
          players: { [pId]: hostPlayer },
          playerOrder: [pId],
          eventLogs: [
            {
              id: `evt_${Date.now()}`,
              type: 'ROOM_CREATED',
              description: `Room ${code} created by ${hostPlayer.name}.`,
              timestamp: Date.now(),
            },
          ],
          paused: false,
          seed: Math.floor(Math.random() * 1000000),
        };

        this.rooms.set(code, newRoom);

        this.broadcast({
          type: 'ROOM_JOINED',
          roomCode: code,
          playerId: pId,
          sessionToken: token,
          walletBalance: 10000,
          room: newRoom,
        });
        break;
      }

      case 'JOIN_ROOM': {
        const { roomCode, playerName, avatar, title, badgeFrame, sessionToken } = payload;
        const code = (roomCode || '').toUpperCase().trim();
        const room = this.rooms.get(code);

        if (!room) {
          // If not in memory yet, check if stored in localStorage
          const stored = localStorage.getItem(`sw_room_${code}`);
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              this.rooms.set(code, parsed);
              this.handleAction(playerId, 'JOIN_ROOM', payload);
              return;
            } catch {}
          }

          // Fallback: If joining a room code on Vercel without prior host in same browser, auto-instantiate
          const pId = playerId || `p_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          const token = sessionToken || `token_${Math.random().toString(36).substring(2, 10)}`;

          const hostPlayer: RoomPlayer = {
            id: pId,
            name: playerName || 'Player 1',
            avatar: avatar || '🐺',
            title: title || 'Rookie Tactician',
            badgeFrame: badgeFrame || 'border-slate-700',
            isHost: true,
            isReady: true,
            isConnected: true,
            score: 0,
            sessionToken: token,
            lastActive: Date.now(),
            hintsUsed: 0,
          };

          const newRoom: RoomState = {
            roomCode: code || 'VCL01',
            phase: 'LOBBY',
            hostId: pId,
            settings: {
              selectedGame: 'BLUFF_CITY',
              difficulty: 'BEGINNER',
              level: 1,
              matchLengthMinutes: 5,
              hintsEnabled: true,
              privateMessagingEnabled: true,
              progressiveMode: true,
            },
            players: { [pId]: hostPlayer },
            playerOrder: [pId],
            eventLogs: [
              {
                id: `evt_${Date.now()}`,
                type: 'ROOM_CREATED',
                description: `Room ${code || 'VCL01'} created.`,
                timestamp: Date.now(),
              },
            ],
            paused: false,
            seed: 42,
          };

          this.rooms.set(newRoom.roomCode, newRoom);
          this.broadcast({
            type: 'ROOM_JOINED',
            roomCode: newRoom.roomCode,
            playerId: pId,
            sessionToken: token,
            walletBalance: 10000,
            room: newRoom,
          });
          return;
        }

        // Add player to room
        const pId = playerId || `p_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const token = sessionToken || `token_${Math.random().toString(36).substring(2, 10)}`;

        if (!room.players[pId]) {
          room.players[pId] = {
            id: pId,
            name: playerName || `Agent ${Object.keys(room.players).length + 1}`,
            avatar: avatar || '🦊',
            title: title || 'Rookie Tactician',
            badgeFrame: badgeFrame || 'border-slate-700',
            isHost: false,
            isReady: false,
            isConnected: true,
            score: 0,
            sessionToken: token,
            lastActive: Date.now(),
            hintsUsed: 0,
          };
          room.playerOrder.push(pId);
        }

        this.broadcast({
          type: 'ROOM_JOINED',
          roomCode: code,
          playerId: pId,
          sessionToken: token,
          walletBalance: 10000,
          room,
        });
        this.broadcast({ type: 'ROOM_UPDATE', room });
        break;
      }

      case 'SET_READY': {
        const room = this.findRoomOfPlayer(playerId);
        if (room && room.players[playerId]) {
          room.players[playerId].isReady = !room.players[playerId].isReady;
          try {
            localStorage.setItem(`sw_room_${room.roomCode}`, JSON.stringify(room));
          } catch {}
          this.broadcast({ type: 'ROOM_UPDATE', room });
        }
        break;
      }

      case 'HOST_ADD_BOT': {
        const room = this.findRoomOfPlayer(playerId);
        if (!room) return;
        const currentCount = Object.keys(room.players).length;
        if (currentCount >= 5) return;

        const botNames = ['Vikram (AI)', 'Arjun (AI)', 'Sai (AI)', 'Ananya (AI)', 'Rohan (AI)'];
        const botAvatars = ['🤖', '🦊', '🦁', '🦉', '🥷'];
        const botId = `bot_${Date.now()}_${currentCount}`;

        const botPlayer: RoomPlayer = {
          id: botId,
          name: botNames[currentCount % botNames.length],
          avatar: botAvatars[currentCount % botAvatars.length],
          title: 'Tactical Bot',
          badgeFrame: 'border-cyan-500/50',
          isHost: false,
          isReady: true,
          isConnected: true,
          score: 0,
          sessionToken: `token_${botId}`,
          lastActive: Date.now(),
          hintsUsed: 0,
        };

        room.players[botId] = botPlayer;
        room.playerOrder.push(botId);
        try {
          localStorage.setItem(`sw_room_${room.roomCode}`, JSON.stringify(room));
        } catch {}
        this.broadcast({ type: 'ROOM_UPDATE', room });
        break;
      }

      case 'HOST_UPDATE_SETTINGS': {
        const room = this.findRoomOfPlayer(playerId);
        if (room && room.hostId === playerId) {
          room.settings = { ...room.settings, ...payload };
          try {
            localStorage.setItem(`sw_room_${room.roomCode}`, JSON.stringify(room));
          } catch {}
          this.broadcast({ type: 'ROOM_UPDATE', room });
        }
        break;
      }

      case 'HOST_START_GAME': {
        const room = this.findRoomOfPlayer(playerId);
        if (!room) return;

        // Ensure at least 3 players for gameplay experience by injecting AI simulation peers if solo
        const existingPlayers = Object.values(room.players);
        if (existingPlayers.length < 3) {
          const names = ['Rahul', 'Arjun', 'Sai', 'Vikram'];
          const avatars = ['🐺', '🦊', '🐯', '🦁'];
          let idx = 0;
          while (Object.values(room.players).length < 3) {
            const botId = `bot_${Date.now()}_${idx}`;
            room.players[botId] = {
              id: botId,
              name: names[idx],
              avatar: avatars[idx],
              title: 'Mastermind',
              isHost: false,
              isReady: true,
              isConnected: true,
              score: 0,
              sessionToken: `token_bot_${idx}`,
              lastActive: Date.now(),
              hintsUsed: 0,
            };
            room.playerOrder.push(botId);
            idx++;
          }
        }

        room.phase = 'PLAYING';
        const gameType = room.settings.selectedGame;

        if (gameType === 'BLUFF_CITY') {
          room.bluffCityState = generateBluffCityGame(
            Object.values(room.players),
            room.settings.difficulty,
            room.settings.level,
            room.settings.matchLengthMinutes
          );
        } else if (gameType === 'MURDER_MYSTERY') {
          room.murderMysteryState = generateMurderMysteryGame(
            Object.values(room.players),
            room.settings.difficulty,
            room.settings.level
          );
        } else if (gameType === 'SECRET_AUCTION') {
          room.secretAuctionState = generateSecretAuctionGame(
            Object.values(room.players),
            room.settings.difficulty,
            room.settings.level
          );
        }

        this.broadcast({ type: 'ROOM_UPDATE', room, event: { type: 'MATCH_STARTED', gameType } });
        break;
      }

      case 'USE_HINT': {
        const room = this.findRoomOfPlayer(playerId);
        if (!room || !room.players[playerId]) return;

        const tier = payload.tier || 1;
        const tierDef = HINT_TIERS.find((t) => t.tier === tier) || HINT_TIERS[0];

        room.players[playerId].score = Math.max(0, room.players[playerId].score - tierDef.scorePenalty);
        room.players[playerId].hintsUsed = (room.players[playerId].hintsUsed || 0) + 1;

        let hintText = `Tactical Clue (Tier ${tier}): Focus on recent location anomalies and vote distributions.`;
        if (room.bluffCityState) {
          hintText = `Bluff Intel: Notice who visited the Bank right before the municipal decree vote.`;
        } else if (room.murderMysteryState) {
          hintText = `Forensic Tip: The murder weapon was poisoned, ruling out physical brute-force suspects.`;
        } else if (room.secretAuctionState) {
          hintText = `Due Diligence: True valuation is situated in the upper quartile of the stated spread.`;
        }

        this.broadcast({
          type: 'HINT_DELIVERED',
          tier,
          hintText,
          newWalletBalance: 10000 - tierDef.cost,
          newScore: room.players[playerId].score,
        });
        this.broadcast({ type: 'ROOM_UPDATE', room });
        break;
      }

      case 'GAME_ACTION': {
        const room = this.findRoomOfPlayer(playerId);
        if (!room || room.phase !== 'PLAYING') return;

        const { gameType, action, actionPayload } = payload;

        if (gameType === 'BLUFF_CITY' && room.bluffCityState) {
          const pState = room.bluffCityState.playerStates[playerId];
          if (pState) {
            if (action === 'MOVE_LOCATION') {
              pState.currentLocation = actionPayload.locationId;
              room.bluffCityState.recentActions.unshift(
                `${room.players[playerId]?.name} visited ${actionPayload.locationId.replace('_', ' ')}.`
              );
              room.players[playerId].score += 250;
            } else if (action === 'VOTE_DECREE' && room.bluffCityState.activeDecree) {
              if (actionPayload.vote === 'YES') {
                room.bluffCityState.activeDecree.yesVotes.push(playerId);
              } else {
                room.bluffCityState.activeDecree.noVotes.push(playerId);
              }
              pState.votesCast = actionPayload.vote;
            } else if (action === 'MAKE_PACT') {
              pState.publicPacts.push(actionPayload.statement);
              room.bluffCityState.recentActions.unshift(
                `Public Pact: "${actionPayload.statement}" by ${room.players[playerId]?.name}`
              );
            } else if (action === 'ACCUSE_SUSPECT') {
              room.players[playerId].score += 2000;
              room.bluffCityState.recentActions.unshift(
                `${room.players[playerId]?.name} officially accused ${room.players[actionPayload.targetId]?.name}!`
              );
            }
          }
        } else if (gameType === 'MURDER_MYSTERY' && room.murderMysteryState) {
          const pState = room.murderMysteryState.playerStates[playerId];
          if (pState) {
            if (action === 'MOVE_ROOM') {
              pState.currentRoom = actionPayload.roomId;
            } else if (action === 'SEARCH_ROOM') {
              const clues = Object.values(room.murderMysteryState.evidenceBoard).filter(
                (ev) => ev.locationId === pState.currentRoom
              );
              clues.forEach((c) => {
                if (!c.discoveredBy.includes(playerId)) {
                  c.discoveredBy.push(playerId);
                  pState.evidenceCollected.push(c.id);
                  room.players[playerId].score += 500;
                }
              });
            } else if (action === 'SUBMIT_ACCUSATION') {
              pState.hasAccused = true;
              room.players[playerId].score += 2500;
            } else if (action === 'ESCAPE_MOVE') {
              if (room.murderMysteryState.escapePath) {
                room.murderMysteryState.escapePath.currentRoom = actionPayload.targetRoom;
              }
            }
          }
        } else if (gameType === 'SECRET_AUCTION' && room.secretAuctionState) {
          const pState = room.secretAuctionState.playerStates[playerId];
          if (pState) {
            if (action === 'PLACE_BID') {
              const amount = Number(actionPayload.amount);
              room.secretAuctionState.currentHighBid = {
                bidderId: playerId,
                bidderName: room.players[playerId]?.name || 'Player',
                amount,
                timestamp: Date.now(),
              };
              room.secretAuctionState.bidHistory.unshift(room.secretAuctionState.currentHighBid);
            } else if (action === 'RESEARCH_ASSET') {
              pState.researchedAssetIds.push(actionPayload.assetId);
            } else if (action === 'TAKE_LOAN') {
              pState.debt += 25000;
              pState.cash += 25000;
            } else if (action === 'REPAY_LOAN') {
              pState.debt = Math.max(0, pState.debt - 25000);
            }
          }
        }

        this.broadcast({ type: 'ROOM_UPDATE', room });
        break;
      }

      case 'SEND_CHAT': {
        const room = this.findRoomOfPlayer(playerId);
        if (!room || !room.players[playerId]) return;

        const chatMsg: ChatMessage = {
          id: `chat_${Date.now()}_${Math.random()}`,
          senderId: playerId,
          senderName: room.players[playerId].name,
          senderAvatar: room.players[playerId].avatar,
          recipientId: payload.recipientId,
          text: payload.text,
          timestamp: Date.now(),
        };

        this.broadcast({ type: 'CHAT_MESSAGE', message: chatMsg });
        break;
      }

      case 'SEND_REACTION': {
        const room = this.findRoomOfPlayer(playerId);
        this.broadcast({
          type: 'ROOM_UPDATE',
          room,
          event: {
            type: 'FLOATING_REACTION',
            emoji: payload.emoji,
            senderName: room?.players[playerId]?.name || 'Agent',
            playerId,
          },
        });
        break;
      }

      case 'HOST_REMATCH': {
        const room = this.findRoomOfPlayer(playerId);
        if (room && room.hostId === playerId) {
          room.phase = 'LOBBY';
          room.bluffCityState = undefined;
          room.murderMysteryState = undefined;
          room.secretAuctionState = undefined;
          room.postGameSummary = undefined;
          Object.values(room.players).forEach((p) => {
            p.isReady = false;
            p.score = 0;
            p.hintsUsed = 0;
          });
          this.broadcast({ type: 'ROOM_UPDATE', room });
        }
        break;
      }
    }
  }

  private findRoomOfPlayer(playerId: string): RoomState | undefined {
    for (const room of this.rooms.values()) {
      if (room.players[playerId]) return room;
    }
    return undefined;
  }

  private tick() {
    const now = Date.now();
    for (const [code, room] of this.rooms.entries()) {
      if (room.phase !== 'PLAYING') continue;

      if (room.bluffCityState && now >= room.bluffCityState.serverEndTime) {
        if (room.bluffCityState.phase === 'ACTION') {
          room.bluffCityState.phase = 'DISCUSSION';
          room.bluffCityState.serverStartTime = now;
          room.bluffCityState.serverEndTime = now + 45000;
        } else if (room.bluffCityState.phase === 'DISCUSSION') {
          room.bluffCityState.phase = 'COUNCIL_VOTE';
          room.bluffCityState.serverStartTime = now;
          room.bluffCityState.serverEndTime = now + 30000;
        } else if (room.bluffCityState.phase === 'COUNCIL_VOTE') {
          this.finishMatch(room, 'BLUFF_CITY');
        }
        this.broadcast({ type: 'ROOM_UPDATE', room });
      }

      if (room.murderMysteryState && now >= room.murderMysteryState.serverEndTime) {
        if (room.murderMysteryState.phase === 'EXPLORATION') {
          room.murderMysteryState.phase = 'ACCUSATION';
          room.murderMysteryState.serverStartTime = now;
          room.murderMysteryState.serverEndTime = now + 45000;
        } else if (room.murderMysteryState.phase === 'ACCUSATION') {
          room.murderMysteryState.phase = 'ESCAPE';
          room.murderMysteryState.serverStartTime = now;
          room.murderMysteryState.serverEndTime = now + 90000;
        } else if (room.murderMysteryState.phase === 'ESCAPE') {
          this.finishMatch(room, 'MURDER_MYSTERY');
        }
        this.broadcast({ type: 'ROOM_UPDATE', room });
      }

      if (room.secretAuctionState && now >= room.secretAuctionState.serverEndTime) {
        if (room.secretAuctionState.phase === 'BIDDING') {
          room.secretAuctionState.phase = 'MARKET_EVENT';
          room.secretAuctionState.serverStartTime = now;
          room.secretAuctionState.serverEndTime = now + 25000;
        } else if (room.secretAuctionState.phase === 'MARKET_EVENT') {
          this.finishMatch(room, 'SECRET_AUCTION');
        }
        this.broadcast({ type: 'ROOM_UPDATE', room });
      }
    }
  }

  private finishMatch(room: RoomState, gameType: GameType) {
    room.phase = 'POST_GAME';
    const playersList = Object.values(room.players);
    playersList.sort((a, b) => b.score - a.score);
    const winner = playersList[0] || { id: 'unknown', name: 'Agent' };

    const summary: PostGameSummary = {
      gameType,
      winnerIds: [winner.id],
      winnerNames: [winner.name],
      durationSeconds: 180,
      playersSummary: playersList.map((p, idx) => ({
        playerId: p.id,
        playerName: p.name,
        avatar: p.avatar,
        score: p.score || (idx === 0 ? 11200 : 7500),
        coinsEarned: idx === 0 ? 1500 : 600,
        xpEarned: idx === 0 ? 1200 : 450,
        performance: {
          accuracy: 88,
          decisions: 84,
          economy: 76,
          deception: 90,
          investigation: 82,
        },
        unlockedAchievements: idx === 0 ? ['victory_royale'] : ['first_blood'],
      })),
    };

    room.postGameSummary = summary;
    this.broadcast({ type: 'ROOM_UPDATE', room, event: { type: 'MATCH_FINISHED', summary } });
  }
}

export const localEngine = new LocalRoomEngine();
