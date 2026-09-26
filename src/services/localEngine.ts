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
  generateDrawAndGuessGame,
  DRAW_WORDS_DICTIONARY,
  getRandomWordByDifficulty,
  getDrawAndGuessRoundDuration,
} from './procedural';
import { p2pMesh } from './p2pMesh';
import { firebaseService } from './firebaseService';

type EngineBroadcast = (msg: any) => void;

class LocalRoomEngine {
  private rooms: Map<string, RoomState> = new Map();
  private broadcastCallback: EngineBroadcast | null = null;
  private channel: BroadcastChannel | null = null;
  private tickerInterval: any = null;
  public activeRoomCode: string = '';

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.channel = new BroadcastChannel('social_wars_mesh');
      this.channel.onmessage = (event) => {
        const { type, room, message, payload, targetPlayerId, roomCode } = event.data;
        const targetCode = (roomCode || room?.roomCode || '').toUpperCase().trim();

        if (room) {
          this.rooms.set(room.roomCode, room);
        }

        // Room-Scoped Event Filtering:
        // Only deliver event to this client's active listener if the event targets this room
        // or if this tab has not joined a room yet.
        if (!this.activeRoomCode || !targetCode || targetCode === this.activeRoomCode) {
          if (this.broadcastCallback) {
            this.broadcastCallback(event.data);
          }
        }
      };
    }

    // Authoritative ticker for Vercel/local mode
    this.tickerInterval = setInterval(() => {
      this.tick();
    }, 1000);
  }

  public setActiveRoom(code: string) {
    this.activeRoomCode = (code || '').toUpperCase().trim();
  }

  public setBroadcast(cb: EngineBroadcast) {
    this.broadcastCallback = cb;
  }

  public getRoom(roomCode: string): RoomState | undefined {
    const code = roomCode.toUpperCase().trim();
    let room = this.rooms.get(code);
    if (!room && typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(`sw_room_${code}`);
      if (stored) {
        try {
          room = JSON.parse(stored);
          if (room) {
            this.rooms.set(code, room);
          }
        } catch {}
      }
    }
    return room;
  }

  private broadcast(msg: any) {
    const targetCode = (msg.roomCode || msg.room?.roomCode || this.activeRoomCode || '').toUpperCase().trim();
    const taggedMsg = targetCode ? { ...msg, roomCode: targetCode } : msg;

    if (msg.room) {
      firebaseService.saveRoom(msg.room);
    }

    if (this.channel) {
      this.channel.postMessage(taggedMsg);
    }
    // Broadcast to all connected guests over WebRTC DataChannels for this specific room
    p2pMesh.broadcastToGuests(taggedMsg);

    if (this.broadcastCallback) {
      this.broadcastCallback(taggedMsg);
    }
  }

  public handleGuestJoin(payload: any, guestPeerId?: string): RoomPlayer | null {
    const { roomCode, playerName, avatar, title, badgeFrame, sessionToken, playerId } = payload;
    const code = (roomCode || '').toUpperCase().trim();
    const room = this.rooms.get(code);
    if (!room) {
      if (guestPeerId) {
        p2pMesh.sendToGuest(guestPeerId, {
          type: 'ERROR',
          message: `Room "${code}" was not found on this Host.`,
        });
      }
      return null;
    }

    const pId = playerId || `p_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const token = sessionToken || `token_${Math.random().toString(36).substring(2, 10)}`;

    if (!room.players[pId]) {
      room.players[pId] = {
        id: pId,
        name: playerName || `Player ${Object.keys(room.players).length + 1}`,
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

    try {
      localStorage.setItem(`sw_room_${code}`, JSON.stringify(room));
    } catch {}

    const response = {
      type: 'ROOM_JOINED',
      roomCode: code,
      playerId: pId,
      sessionToken: token,
      walletBalance: 10000,
      room,
    };

    if (guestPeerId) {
      p2pMesh.sendToGuest(guestPeerId, response);
    }

    this.broadcast({ type: 'ROOM_UPDATE', room });
    return room.players[pId];
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

          this.broadcast({
            type: 'ERROR',
            message: `Room "${code}" was not found. Please confirm the room code with the host!`,
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
        } else if (gameType === 'DRAW_AND_GUESS') {
          room.drawAndGuessState = generateDrawAndGuessGame(
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
        } else if (gameType === 'DRAW_AND_GUESS' && room.drawAndGuessState) {
          if (action === 'DRAW_STROKE') {
            room.drawAndGuessState.drawingStrokes.push(actionPayload.stroke);
          } else if (action === 'CLEAR_CANVAS') {
            room.drawAndGuessState.drawingStrokes = [];
          }
        }

        this.broadcast({ type: 'ROOM_UPDATE', room });
        break;
      }

      case 'SEND_CHAT': {
        const room = this.findRoomOfPlayer(playerId);
        if (!room || !room.players[playerId]) return;

        let messageText = payload.text || '';

        // Draw and Guess Secret Word Guess Checking
        if (room.drawAndGuessState && room.drawAndGuessState.phase === 'DRAWING') {
          const dg = room.drawAndGuessState;
          const isDrawer = playerId === dg.currentDrawerId;
          const alreadyGuessed = dg.correctGuessers.some((g) => g.playerId === playerId);

          if (!isDrawer && !alreadyGuessed) {
            const textClean = messageText.trim().toUpperCase();
            if (textClean === dg.currentWord.trim().toUpperCase()) {
              const rankNum = dg.correctGuessers.length + 1;
              const points = rankNum === 1 ? 1000 : rankNum === 2 ? 700 : 500;

              dg.correctGuessers.push({
                playerId,
                playerName: room.players[playerId]?.name || 'Player',
                rank: (rankNum <= 3 ? rankNum : 3) as 1 | 2 | 3,
                pointsEarned: points,
                timeTakenSeconds: Math.round((Date.now() - dg.serverStartTime) / 1000),
              });

              room.players[playerId].score += points;
              if (room.players[dg.currentDrawerId]) {
                room.players[dg.currentDrawerId].score += 300;
              }

              // Broadcast Winner System Message
              this.broadcast({
                type: 'CHAT_MESSAGE',
                message: {
                  id: `chat_${Date.now()}_${Math.random()}`,
                  senderId: 'SYSTEM',
                  senderName: '🎉 WINNER ANNOUNCEMENT',
                  senderAvatar: '🏆',
                  text: `🎉 ${room.players[playerId]?.name} GUESSED THE WORD CORRECTLY! (${rankNum === 1 ? '🥇 1st Place! +1,000 Pts' : rankNum === 2 ? '🥈 2nd Place! +700 Pts' : '🥉 3rd Place! +500 Pts'})`,
                  timestamp: Date.now(),
                  isSystem: true,
                },
              });

              const nonDrawersCount = Object.keys(room.players).length - 1;
              if (dg.correctGuessers.length >= Math.min(3, nonDrawersCount)) {
                this.rotateDrawAndGuessRound(room);
              }
              this.broadcast({ type: 'ROOM_UPDATE', room });
              return;
            }
          }
        }

        const chatMsg: ChatMessage = {
          id: `chat_${Date.now()}_${Math.random()}`,
          senderId: playerId,
          senderName: room.players[playerId].name,
          senderAvatar: room.players[playerId].avatar,
          recipientId: payload.recipientId,
          text: messageText,
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
          room.drawAndGuessState = undefined;
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

  private rotateDrawAndGuessRound(room: RoomState) {
    if (!room.drawAndGuessState) return;
    const dg = room.drawAndGuessState;
    if (dg.round >= dg.maxRounds) {
      this.finishMatch(room, 'DRAW_AND_GUESS');
      return;
    }

    dg.round += 1;
    const activeHumanPlayerIds = (
      room.playerOrder && room.playerOrder.length > 0
        ? room.playerOrder
        : Object.keys(room.players)
    ).filter(
      (id) =>
        room.players[id] &&
        !id.toLowerCase().includes('bot') &&
        !id.toLowerCase().includes('ai')
    );

    const humanList = activeHumanPlayerIds.length > 0 ? activeHumanPlayerIds : Object.keys(room.players);
    const currentIdx = humanList.indexOf(dg.currentDrawerId);
    const nextDrawerId = humanList[(currentIdx + 1) % humanList.length] || humanList[0];

    const wordObj = getRandomWordByDifficulty(room.settings.difficulty, dg.usedWords);

    dg.currentDrawerId = nextDrawerId;
    dg.currentDrawerName = room.players[nextDrawerId]?.name || 'Artist';
    dg.currentWord = wordObj.word.toUpperCase();
    dg.category = wordObj.category;
    dg.maskedWord = wordObj.word
      .split('')
      .map((c) => (/[A-Za-z]/.test(c) ? '_' : c))
      .join(' ');
    dg.drawingStrokes = [];
    dg.correctGuessers = [];
    dg.usedWords.push(wordObj.word);

    const durationSec = getDrawAndGuessRoundDuration(room.settings.difficulty, room.settings.level);
    const now = Date.now();
    dg.serverStartTime = now;
    dg.serverEndTime = now + durationSec * 1000;
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

      if (room.drawAndGuessState && now >= room.drawAndGuessState.serverEndTime) {
        this.rotateDrawAndGuessRound(room);
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
