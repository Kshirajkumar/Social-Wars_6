import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import {
  GameType,
  RoomPhase,
  RoomPlayer,
  RoomSettings,
  RoomState,
  WalletTransaction,
  HINT_TIERS,
  PostGameSummary,
  ChatMessage,
  GameEventLog,
} from './src/types/game.ts';
import {
  generateBluffCityGame,
  generateMurderMysteryGame,
  generateSecretAuctionGame,
  generateDrawAndGuessGame,
  DRAW_WORDS_DICTIONARY,
  getRandomWordByDifficulty,
  getDrawAndGuessRoundDuration,
} from './src/services/procedural.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json());

/* ==================== IN-MEMORY AUTHORITATIVE STORES ==================== */

const rooms = new Map<string, RoomState>();
const socketToPlayer = new Map<WebSocket, { roomId: string; playerId: string }>();
const playerSockets = new Map<string, WebSocket>();

// Persistent In-memory Wallets & Ledgers
interface WalletData {
  balance: number;
  history: WalletTransaction[];
}
const wallets = new Map<string, WalletData>();

function getOrCreateWallet(playerId: string): WalletData {
  if (!wallets.has(playerId)) {
    wallets.set(playerId, {
      balance: 10000, // 10,000 starting coins per requirements
      history: [
        {
          transaction_id: `tx_init_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          player_id: playerId,
          room_id: 'SYSTEM',
          amount: 10000,
          type: 'CREDIT',
          reason: 'Initial starting wallet grant',
          timestamp: Date.now(),
          balance_after: 10000,
        },
      ],
    });
  }
  return wallets.get(playerId)!;
}

function recordTransaction(
  playerId: string,
  roomId: string,
  amount: number,
  type: 'CREDIT' | 'DEBIT',
  reason: string,
  gameId?: string
): boolean {
  const wallet = getOrCreateWallet(playerId);
  if (type === 'DEBIT' && wallet.balance < amount) {
    return false;
  }

  const balance_after = type === 'CREDIT' ? wallet.balance + amount : wallet.balance - amount;
  wallet.balance = balance_after;
  wallet.history.unshift({
    transaction_id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    player_id: playerId,
    room_id: roomId,
    game_id: gameId,
    amount,
    type,
    reason,
    timestamp: Date.now(),
    balance_after,
  });
  return true;
}

/* ==================== SANITIZATION (SECURITY & HIDDEN INFO) ==================== */

/**
 * Filter secret info so clients never receive other players' hidden data!
 */
function sanitizeStateForPlayer(room: RoomState, playerId: string): RoomState {
  const copy: RoomState = JSON.parse(JSON.stringify(room));

  // Bluff City Sanitization
  if (copy.bluffCityState) {
    const pStates = copy.bluffCityState.playerStates;
    for (const pid of Object.keys(pStates)) {
      if (pid !== playerId) {
        // Hide true role if not resolved
        if (copy.bluffCityState.phase !== 'RESOLUTION') {
          pStates[pid].role = undefined;
          pStates[pid].objective = undefined;
        }
      }
    }
  }

  // Murder Mystery Sanitization
  if (copy.murderMysteryState) {
    const pStates = copy.murderMysteryState.playerStates;
    const isPlayerMurderer = pStates[playerId]?.role === 'MURDERER';

    for (const pid of Object.keys(pStates)) {
      if (pid !== playerId && copy.murderMysteryState.phase !== 'RESOLUTION') {
        pStates[pid].role = undefined; // Don't leak who is the killer
        pStates[pid].secret = 'Confidential dark secret (Hidden)';
        pStates[pid].murdererActionPoints = undefined;
      }
    }

    // Evidence board sanitization: Hide whether authentic or killer-connected until analyzed
    if (copy.murderMysteryState.phase !== 'RESOLUTION') {
      for (const evId of Object.keys(copy.murderMysteryState.evidenceBoard)) {
        const ev = copy.murderMysteryState.evidenceBoard[evId];
        const isDiscovered = ev.discoveredBy.includes(playerId);
        if (!isDiscovered && !isPlayerMurderer) {
          // completely mask if unvisited
          ev.name = 'Undiscovered Potential Clue';
          ev.description = 'Search this room to discover and examine this piece of evidence.';
        }
      }
    }
  }

  // Secret Auction Sanitization
  if (copy.secretAuctionState) {
    const pState = copy.secretAuctionState.playerStates[playerId];
    const isResearched = (assetId: string) => pState?.researchedAssetIds?.includes(assetId);

    if (copy.secretAuctionState.currentLot) {
      if (!isResearched(copy.secretAuctionState.currentLot.id) && copy.secretAuctionState.phase !== 'RESOLUTION') {
        copy.secretAuctionState.currentLot.trueValue = undefined;
      }
    }

    // Hide true value of catalog items
    copy.secretAuctionState.availableAssets.forEach((a) => {
      if (!isResearched(a.id) && copy.secretAuctionState!.phase !== 'RESOLUTION') {
        a.trueValue = undefined;
      }
    });
  }

  // Draw and Guess Sanitization: Hide secret word from non-drawers
  if (copy.drawAndGuessState) {
    if (playerId !== copy.drawAndGuessState.currentDrawerId && copy.drawAndGuessState.phase !== 'RESOLUTION') {
      copy.drawAndGuessState.currentWord = '???';
    }
  }

  return copy;
}

function broadcastRoom(roomId: string, extraEvent?: any) {
  const room = rooms.get(roomId);
  if (!room) return;

  for (const pid of Object.keys(room.players)) {
    const ws = playerSockets.get(pid);
    if (ws && ws.readyState === WebSocket.OPEN) {
      const sanitized = sanitizeStateForPlayer(room, pid);
      ws.send(
        JSON.stringify({
          type: 'ROOM_UPDATE',
          room: sanitized,
          event: extraEvent,
        })
      );
    }
  }
}

function broadcastChatMessage(roomId: string, message: ChatMessage) {
  const room = rooms.get(roomId);
  if (!room) return;

  for (const pid of Object.keys(room.players)) {
    const ws = playerSockets.get(pid);
    if (ws && ws.readyState === WebSocket.OPEN) {
      // If whisper, only send to sender and recipient
      if (!message.recipientId || message.recipientId === pid || message.senderId === pid) {
        ws.send(
          JSON.stringify({
            type: 'CHAT_MESSAGE',
            message,
          })
        );
      }
    }
  }
}

/* ==================== HELPER: CODE GENERATOR ==================== */

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return rooms.has(code) ? generateRoomCode() : code;
}

/* ==================== WEBSOCKET MESSAGE HANDLER ==================== */

wss.on('connection', (ws: WebSocket) => {
  ws.on('message', (data: string) => {
    try {
      const msg = JSON.parse(data.toString());
      handleClientMessage(ws, msg);
    } catch (err) {
      console.error('Failed to parse WebSocket message', err);
    }
  });

  ws.on('close', () => {
    const playerInfo = socketToPlayer.get(ws);
    if (playerInfo) {
      const { roomId, playerId } = playerInfo;
      const room = rooms.get(roomId);
      if (room && room.players[playerId]) {
        room.players[playerId].isConnected = false;
        room.players[playerId].lastActive = Date.now();

        // If host disconnected, reassign host to another connected player
        if (room.hostId === playerId) {
          const nextHost = Object.values(room.players).find((p) => p.isConnected && p.id !== playerId);
          if (nextHost) {
            room.hostId = nextHost.id;
            nextHost.isHost = true;
            room.players[playerId].isHost = false;
            room.eventLogs.unshift({
              id: `evt_${Date.now()}`,
              type: 'HOST_MIGRATED',
              description: `Host disconnected. 👑 Host transferred to ${nextHost.name}.`,
              timestamp: Date.now(),
            });
          }
        }

        broadcastRoom(roomId, { type: 'PLAYER_DISCONNECTED', playerId });
      }
      playerSockets.delete(playerId);
      socketToPlayer.delete(ws);
    }
  });
});

function handleClientMessage(ws: WebSocket, msg: any) {
  const { type, payload } = msg;

  switch (type) {
    case 'CREATE_ROOM': {
      const { playerName, avatar, title, badgeFrame, sessionToken } = payload;
      const code = generateRoomCode();
      const playerId = `p_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const token = sessionToken || `token_${Math.random().toString(36).substring(2, 10)}`;

      const hostPlayer: RoomPlayer = {
        id: playerId,
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
        hostId: playerId,
        settings: {
          selectedGame: 'BLUFF_CITY',
          difficulty: 'BEGINNER',
          level: 1,
          matchLengthMinutes: 5,
          hintsEnabled: true,
          privateMessagingEnabled: true,
          progressiveMode: true,
        },
        players: { [playerId]: hostPlayer },
        playerOrder: [playerId],
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

      // Detach from any prior room to guarantee strict room scoping
      const prior = socketToPlayer.get(ws);
      if (prior && prior.roomId !== code) {
        const priorRoom = rooms.get(prior.roomId);
        if (priorRoom && priorRoom.players[prior.playerId]) {
          priorRoom.players[prior.playerId].isConnected = false;
          broadcastRoom(prior.roomId);
        }
      }

      rooms.set(code, newRoom);
      socketToPlayer.set(ws, { roomId: code, playerId });
      playerSockets.set(playerId, ws);

      const wallet = getOrCreateWallet(playerId);

      ws.send(
        JSON.stringify({
          type: 'ROOM_JOINED',
          roomCode: code,
          playerId,
          sessionToken: token,
          walletBalance: wallet.balance,
          room: sanitizeStateForPlayer(newRoom, playerId),
        })
      );
      break;
    }

    case 'JOIN_ROOM': {
      const { roomCode, playerName, avatar, title, badgeFrame, sessionToken } = payload;
      const upperCode = (roomCode || '').toUpperCase().trim();
      const room = rooms.get(upperCode);

      if (!room) {
        ws.send(JSON.stringify({ type: 'ERROR', message: 'Room not found. Please check code.' }));
        return;
      }

      // Detach from any prior room to guarantee strict room scoping
      const priorJoin = socketToPlayer.get(ws);
      if (priorJoin && priorJoin.roomId !== upperCode) {
        const priorRoom = rooms.get(priorJoin.roomId);
        if (priorRoom && priorRoom.players[priorJoin.playerId]) {
          priorRoom.players[priorJoin.playerId].isConnected = false;
          broadcastRoom(priorJoin.roomId);
        }
      }

      // Check for reconnection using sessionToken
      let existingPlayer = Object.values(room.players).find(
        (p) => sessionToken && p.sessionToken === sessionToken
      );

      if (existingPlayer) {
        existingPlayer.isConnected = true;
        existingPlayer.lastActive = Date.now();
        if (playerName) existingPlayer.name = playerName;
        if (avatar) existingPlayer.avatar = avatar;

        socketToPlayer.set(ws, { roomId: upperCode, playerId: existingPlayer.id });
        playerSockets.set(existingPlayer.id, ws);

        const wallet = getOrCreateWallet(existingPlayer.id);

        ws.send(
          JSON.stringify({
            type: 'ROOM_JOINED',
            roomCode: upperCode,
            playerId: existingPlayer.id,
            sessionToken: existingPlayer.sessionToken,
            walletBalance: wallet.balance,
            room: sanitizeStateForPlayer(room, existingPlayer.id),
          })
        );
        broadcastRoom(upperCode, { type: 'PLAYER_RECONNECTED', playerId: existingPlayer.id });
        return;
      }

      // Max 5 players per room per specs
      if (Object.keys(room.players).length >= 5) {
        ws.send(JSON.stringify({ type: 'ERROR', message: 'Room is full (Maximum 5 players).' }));
        return;
      }

      if (room.phase !== 'LOBBY') {
        ws.send(JSON.stringify({ type: 'ERROR', message: 'Game has already started.' }));
        return;
      }

      const playerId = `p_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const token = sessionToken || `token_${Math.random().toString(36).substring(2, 10)}`;

      const newPlayer: RoomPlayer = {
        id: playerId,
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

      room.players[playerId] = newPlayer;
      room.playerOrder.push(playerId);
      room.eventLogs.unshift({
        id: `evt_${Date.now()}`,
        type: 'PLAYER_JOINED',
        description: `${newPlayer.name} joined the room.`,
        timestamp: Date.now(),
      });

      socketToPlayer.set(ws, { roomId: upperCode, playerId });
      playerSockets.set(playerId, ws);

      const wallet = getOrCreateWallet(playerId);

      ws.send(
        JSON.stringify({
          type: 'ROOM_JOINED',
          roomCode: upperCode,
          playerId,
          sessionToken: token,
          walletBalance: wallet.balance,
          room: sanitizeStateForPlayer(room, playerId),
        })
      );

      broadcastRoom(upperCode, { type: 'PLAYER_JOINED', player: newPlayer });
      break;
    }

    case 'SET_READY': {
      const playerInfo = socketToPlayer.get(ws);
      if (!playerInfo) return;
      const { roomId, playerId } = playerInfo;
      const room = rooms.get(roomId);
      if (!room || !room.players[playerId]) return;

      room.players[playerId].isReady = !room.players[playerId].isReady;
      broadcastRoom(roomId);
      break;
    }

    case 'HOST_UPDATE_SETTINGS': {
      const playerInfo = socketToPlayer.get(ws);
      if (!playerInfo) return;
      const { roomId, playerId } = playerInfo;
      const room = rooms.get(roomId);
      if (!room || room.hostId !== playerId) return;

      room.settings = { ...room.settings, ...payload };
      broadcastRoom(roomId);
      break;
    }

    case 'HOST_ADD_BOT': {
      const playerInfo = socketToPlayer.get(ws);
      if (!playerInfo) return;
      const { roomId, playerId } = playerInfo;
      const room = rooms.get(roomId);
      if (!room || room.hostId !== playerId) return;

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
      broadcastRoom(roomId);
      break;
    }

    case 'HOST_START_GAME': {
      const playerInfo = socketToPlayer.get(ws);
      if (!playerInfo) return;
      const { roomId, playerId } = playerInfo;
      const room = rooms.get(roomId);
      if (!room || room.hostId !== playerId) return;

      // Auto-fill bots if fewer than 3 players
      const botNames = ['Vikram (AI)', 'Arjun (AI)', 'Sai (AI)', 'Ananya (AI)'];
      const botAvatars = ['🤖', '🦊', '🦁', '🦉'];
      let bIdx = 0;
      while (Object.keys(room.players).length < 3) {
        const botId = `bot_${Date.now()}_${bIdx}`;
        room.players[botId] = {
          id: botId,
          name: botNames[bIdx % botNames.length],
          avatar: botAvatars[bIdx % botAvatars.length],
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
        room.playerOrder.push(botId);
        bIdx++;
      }

      const playerList = Object.values(room.players);

      room.phase = 'PLAYING';
      const gameType = room.settings.selectedGame;

      if (gameType === 'BLUFF_CITY') {
        room.bluffCityState = generateBluffCityGame(
          playerList,
          room.settings.difficulty,
          room.settings.level,
          room.settings.matchLengthMinutes
        );
      } else if (gameType === 'MURDER_MYSTERY') {
        room.murderMysteryState = generateMurderMysteryGame(
          playerList,
          room.settings.difficulty,
          room.settings.level
        );
      } else if (gameType === 'SECRET_AUCTION') {
        room.secretAuctionState = generateSecretAuctionGame(
          playerList,
          room.settings.difficulty,
          room.settings.level
        );
      } else if (gameType === 'DRAW_AND_GUESS') {
        room.drawAndGuessState = generateDrawAndGuessGame(
          playerList,
          room.settings.difficulty,
          room.settings.level
        );
      }

      room.eventLogs.unshift({
        id: `evt_${Date.now()}`,
        type: 'GAME_STARTED',
        description: `Host started ${gameType} on Level ${room.settings.level} (${room.settings.difficulty}).`,
        timestamp: Date.now(),
      });

      broadcastRoom(roomId, { type: 'MATCH_STARTED', gameType });
      break;
    }

    case 'USE_HINT': {
      const playerInfo = socketToPlayer.get(ws);
      if (!playerInfo) return;
      const { roomId, playerId } = playerInfo;
      const room = rooms.get(roomId);
      if (!room || !room.players[playerId] || !room.settings.hintsEnabled) return;

      const tierNumber: 1 | 2 | 3 | 4 | 5 = payload.tier || 1;
      const tierDef = HINT_TIERS.find((t) => t.tier === tierNumber);
      if (!tierDef) return;

      const wallet = getOrCreateWallet(playerId);
      if (wallet.balance < tierDef.cost) {
        ws.send(JSON.stringify({ type: 'ERROR', message: 'Insufficient Social Coins for this hint tier.' }));
        return;
      }

      // Authoritative deduction
      recordTransaction(
        playerId,
        roomId,
        tierDef.cost,
        'DEBIT',
        `Used Tier ${tierNumber} Hint (${tierDef.name})`,
        room.settings.selectedGame
      );

      // Score penalty
      room.players[playerId].score = Math.max(0, room.players[playerId].score - tierDef.scorePenalty);
      room.players[playerId].hintsUsed = (room.players[playerId].hintsUsed || 0) + 1;

      // Generate bespoke context hint based on game
      let hintText = '';
      if (room.bluffCityState) {
        const criminalId = Object.keys(room.bluffCityState.playerStates).find(
          (id) => room.bluffCityState!.playerStates[id].role === 'CRIMINAL'
        );
        const criminalPlayer = criminalId ? room.players[criminalId] : null;

        if (tierNumber === 1) hintText = 'Nudge: Pay attention to who changed their location immediately after the bank transaction.';
        else if (tierNumber === 2) hintText = 'Direction: The Criminal is currently positioned in either City Hall or the Black Market.';
        else if (tierNumber === 3) hintText = criminalPlayer ? `Strong Hint: The Criminal has an avatar resembling ${criminalPlayer.avatar}.` : 'Strong Hint: Someone in the Market is forging certificates.';
        else if (tierNumber === 4) hintText = criminalPlayer ? `Major Hint: The Criminal is seated between player positions and claims to be Journalist.` : 'Major Hint: Watch the votes on the emergency decree.';
        else hintText = criminalPlayer ? `Emergency Hint: ${criminalPlayer.name} IS THE CRIMINAL.` : 'Emergency Hint: The primary culprit is unmasked!';
      } else if (room.murderMysteryState) {
        const murdererEntry = Object.entries(room.murderMysteryState.playerStates).find(
          ([_, st]) => st.role === 'MURDERER'
        );
        const killer = murdererEntry ? room.players[murdererEntry[0]] : null;

        if (tierNumber === 1) hintText = 'Nudge: Check the CCTV timestamp in the Security Room for inconsistencies.';
        else if (tierNumber === 2) hintText = 'Direction: The murder weapon was poisoned, ruling out heavy blunt force items.';
        else if (tierNumber === 3) hintText = killer ? `Strong Hint: The killer’s alibi places them in the ${killer.name[0] === 'A' ? 'Garden' : 'Library'}.` : 'Strong Hint: Examine the cufflink clue.';
        else if (tierNumber === 4) hintText = killer ? `Major Hint: The cufflink initials directly match ${killer.name}.` : 'Major Hint: The physical clue at the scene is authentic.';
        else hintText = killer ? `Emergency Hint: ${killer.name} IS THE MURDERER. Weapon: ${room.murderMysteryState.murderWeapon}.` : 'Emergency Hint: Case solved!';
      } else if (room.secretAuctionState) {
        const lot = room.secretAuctionState.currentLot;
        if (lot) {
          if (tierNumber === 1) hintText = `Nudge: Risk rating ${lot.risk}/10 indicates ${lot.risk > 5 ? 'high volatility' : 'stable cash flows'}.`;
          else if (tierNumber === 2) hintText = `Direction: The true value is within the upper 40% of the estimated valuation range.`;
          else if (tierNumber === 3) hintText = `Strong Hint: Next round's market event will positively affect ${lot.marketSensitivity}.`;
          else if (tierNumber === 4) hintText = `Major Hint: Due diligence reveals true value is approximately ${lot.trueValue ? Math.round(lot.trueValue * 0.98) : '75,000'}.`;
          else hintText = `Emergency Hint: Exact True Value is ${lot.trueValue || 80000} Coins!`;
        }
      }

      ws.send(
        JSON.stringify({
          type: 'HINT_DELIVERED',
          tier: tierNumber,
          hintText,
          newWalletBalance: wallet.balance,
          newScore: room.players[playerId].score,
        })
      );

      broadcastRoom(roomId);
      break;
    }

    case 'GAME_ACTION': {
      const playerInfo = socketToPlayer.get(ws);
      if (!playerInfo) return;
      const { roomId, playerId } = playerInfo;
      const room = rooms.get(roomId);
      if (!room || room.phase !== 'PLAYING') return;

      const { gameType, action, actionPayload } = payload;

      if (gameType === 'BLUFF_CITY' && room.bluffCityState) {
        handleBluffCityAction(room, playerId, action, actionPayload);
      } else if (gameType === 'MURDER_MYSTERY' && room.murderMysteryState) {
        handleMurderMysteryAction(room, playerId, action, actionPayload);
      } else if (gameType === 'SECRET_AUCTION' && room.secretAuctionState) {
        handleSecretAuctionAction(room, playerId, action, actionPayload);
      } else if (gameType === 'DRAW_AND_GUESS' && room.drawAndGuessState) {
        handleDrawAndGuessAction(room, playerId, action, actionPayload);
      }

      broadcastRoom(roomId);
      break;
    }

    case 'SEND_CHAT': {
      const playerInfo = socketToPlayer.get(ws);
      if (!playerInfo) return;
      const { roomId, playerId } = playerInfo;
      const room = rooms.get(roomId);
      if (!room) return;

      const player = room.players[playerId];
      if (!player) return;

      let messageText = (payload.text || '').substring(0, 250);

      // Check Draw & Guess correct word match
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
              playerName: player.name,
              rank: (rankNum <= 3 ? rankNum : 3) as 1 | 2 | 3,
              pointsEarned: points,
              timeTakenSeconds: Math.round((Date.now() - dg.serverStartTime) / 1000),
            });

            room.players[playerId].score += points;
            if (room.players[dg.currentDrawerId]) {
              room.players[dg.currentDrawerId].score += 300;
            }

            broadcastChatMessage(roomId, {
              id: `chat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              senderId: 'SYSTEM',
              senderName: '🎉 WINNER ANNOUNCEMENT',
              senderAvatar: '🏆',
              text: `🎉 ${player.name} GUESSED THE WORD CORRECTLY! (${rankNum === 1 ? '🥇 1st Place! +1,000 Pts' : rankNum === 2 ? '🥈 2nd Place! +700 Pts' : '🥉 3rd Place! +500 Pts'})`,
              timestamp: Date.now(),
              isSystem: true,
            });

            const nonDrawersCount = Object.keys(room.players).length - 1;
            if (dg.correctGuessers.length >= Math.min(3, nonDrawersCount)) {
              rotateDrawAndGuessRoundServer(room);
            }
            broadcastRoom(roomId);
            return;
          }
        }
      }

      const chatMsg: ChatMessage = {
        id: `chat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        senderId: playerId,
        senderName: player.name,
        senderAvatar: player.avatar,
        recipientId: payload.recipientId, // Whisper if provided
        text: messageText,
        timestamp: Date.now(),
      };

      broadcastChatMessage(roomId, chatMsg);
      break;
    }

    case 'SEND_REACTION': {
      const playerInfo = socketToPlayer.get(ws);
      if (!playerInfo) return;
      const { roomId, playerId } = playerInfo;
      const room = rooms.get(roomId);
      if (!room) return;

      broadcastRoom(roomId, {
        type: 'FLOATING_REACTION',
        emoji: payload.emoji,
        senderName: room.players[playerId]?.name || 'Agent',
        playerId,
      });
      break;
    }

    case 'HOST_KICK_PLAYER': {
      const playerInfo = socketToPlayer.get(ws);
      if (!playerInfo) return;
      const { roomId, playerId } = playerInfo;
      const room = rooms.get(roomId);
      if (!room || room.hostId !== playerId) return;

      const targetId = payload.targetPlayerId;
      if (targetId && room.players[targetId]) {
        delete room.players[targetId];
        room.playerOrder = room.playerOrder.filter((id) => id !== targetId);
        broadcastRoom(roomId, { type: 'PLAYER_KICKED', playerId: targetId });
      }
      break;
    }

    case 'HOST_TRANSFER': {
      const playerInfo = socketToPlayer.get(ws);
      if (!playerInfo) return;
      const { roomId, playerId } = playerInfo;
      const room = rooms.get(roomId);
      if (!room || room.hostId !== playerId) return;

      const targetId = payload.targetPlayerId;
      if (targetId && room.players[targetId]) {
        room.hostId = targetId;
        room.players[playerId].isHost = false;
        room.players[targetId].isHost = true;
        broadcastRoom(roomId);
      }
      break;
    }

    case 'HOST_REMATCH': {
      const playerInfo = socketToPlayer.get(ws);
      if (!playerInfo) return;
      const { roomId, playerId } = playerInfo;
      const room = rooms.get(roomId);
      if (!room || room.hostId !== playerId) return;

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

      broadcastRoom(roomId);
      break;
    }
  }
}

/* ==================== GAME ACTIONS HANDLERS ==================== */

function handleBluffCityAction(room: RoomState, playerId: string, action: string, data: any) {
  const state = room.bluffCityState!;
  const pState = state.playerStates[playerId];
  if (!pState) return;

  if (action === 'MOVE_LOCATION') {
    pState.currentLocation = data.locationId;
    state.recentActions.unshift(`${room.players[playerId].name} visited ${data.locationId.replace('_', ' ')}.`);

    // Location specific effects
    if (data.locationId === 'BANK') {
      pState.cityCoins += 1500;
      state.cityStability = Math.max(10, state.cityStability - 5);
      room.players[playerId].score += 200;
    } else if (data.locationId === 'CITY_HALL') {
      pState.reputation = Math.min(100, pState.reputation + 10);
      state.cityStability = Math.min(100, state.cityStability + 5);
      room.players[playerId].score += 250;
    } else if (data.locationId === 'BLACK_MARKET') {
      pState.cityCoins += 3000;
      state.cityStability = Math.max(5, state.cityStability - 15);
      pState.reputation = Math.max(10, pState.reputation - 15);
      room.players[playerId].score += 350;
    } else if (data.locationId === 'NEWS_AGENCY') {
      state.revealedIntel.unshift(
        `Intel Leak: Confidential audit discovered shady transfers from ${room.players[playerId].name}’s accounts.`
      );
      room.players[playerId].score += 300;
    }
  } else if (action === 'VOTE_DECREE') {
    if (state.activeDecree) {
      if (data.vote === 'YES') {
        if (!state.activeDecree.yesVotes.includes(playerId)) {
          state.activeDecree.yesVotes.push(playerId);
          state.activeDecree.noVotes = state.activeDecree.noVotes.filter((id) => id !== playerId);
        }
      } else {
        if (!state.activeDecree.noVotes.includes(playerId)) {
          state.activeDecree.noVotes.push(playerId);
          state.activeDecree.yesVotes = state.activeDecree.yesVotes.filter((id) => id !== playerId);
        }
      }
      pState.votesCast = data.vote;
    }
  } else if (action === 'MAKE_PACT') {
    const pactText = `${room.players[playerId].name}: "${data.statement}"`;
    pState.publicPacts.push(pactText);
    state.recentActions.unshift(`Public Pact Declared: ${pactText}`);
  } else if (action === 'ACCUSE_SUSPECT') {
    pState.hasInvestigated = true;
    const targetPlayer = room.players[data.targetId];
    state.recentActions.unshift(
      `${room.players[playerId].name} officially accused ${targetPlayer ? targetPlayer.name : 'someone'} of being the Syndicate Criminal!`
    );

    // If target is indeed Criminal, Detective gets massive score!
    const targetState = state.playerStates[data.targetId];
    if (targetState && targetState.role === 'CRIMINAL') {
      room.players[playerId].score += 2500;
      targetState.reputation = Math.max(0, targetState.reputation - 40);
    } else {
      pState.reputation = Math.max(0, pState.reputation - 20);
    }
  }
}

function handleMurderMysteryAction(room: RoomState, playerId: string, action: string, data: any) {
  const state = room.murderMysteryState!;
  const pState = state.playerStates[playerId];
  if (!pState) return;

  if (action === 'MOVE_ROOM') {
    pState.currentRoom = data.roomId;
  } else if (action === 'SEARCH_ROOM') {
    // Find clues in this room
    const cluesInRoom = Object.values(state.evidenceBoard).filter(
      (ev) => ev.locationId === pState.currentRoom
    );

    cluesInRoom.forEach((clue) => {
      if (!clue.discoveredBy.includes(playerId)) {
        clue.discoveredBy.push(playerId);
        pState.evidenceCollected.push(clue.id);
        room.players[playerId].score += 500;
      }
    });

    const roomLoc = state.currentRoomLocations.find((r) => r.id === pState.currentRoom);
    if (roomLoc) roomLoc.searched = true;
  } else if (action === 'MURDERER_SABOTAGE') {
    // Only valid for murderer
    if (pState.role === 'MURDERER' && (pState.murdererActionPoints || 0) > 0) {
      pState.murdererActionPoints = (pState.murdererActionPoints || 1) - 1;
      if (data.sabotageType === 'DESTROY_CLUE' && data.evidenceId) {
        delete state.evidenceBoard[data.evidenceId];
        room.eventLogs.unshift({
          id: `evt_${Date.now()}`,
          type: 'SABOTAGE',
          description: `⚠️ Alert: A piece of evidence was destroyed or tampered with in ${pState.currentRoom}!`,
          timestamp: Date.now(),
        });
      } else if (data.sabotageType === 'BLOCK_DOOR' && data.roomId) {
        if (!state.escapePath?.blockedRooms.includes(data.roomId)) {
          state.escapePath?.blockedRooms.push(data.roomId);
        }
      }
    }
  } else if (action === 'SUBMIT_ACCUSATION') {
    pState.hasAccused = true;
    pState.accusation = {
      suspectId: data.suspectId,
      evidenceId: data.evidenceId,
      confidence: data.confidence,
      reasoning: data.reasoning,
    };

    // Check if suspect is actually the murderer
    const suspectState = state.playerStates[data.suspectId];
    const isCorrect = suspectState?.role === 'MURDERER';
    if (isCorrect) {
      room.players[playerId].score += Math.round(3000 * (data.confidence / 100));
    }
  } else if (action === 'ESCAPE_MOVE') {
    // Escape phase logic
    if (pState.role === 'MURDERER' && state.escapePath) {
      state.escapePath.currentRoom = data.targetRoom;
      if (state.escapePath.currentRoom === state.escapePath.targetExit) {
        state.murdererEscaped = true;
        finishGame(room, 'MURDER_MYSTERY');
      }
    }
  }
}

function handleSecretAuctionAction(room: RoomState, playerId: string, action: string, data: any) {
  const state = room.secretAuctionState!;
  const pState = state.playerStates[playerId];
  if (!pState) return;

  if (action === 'PLACE_BID') {
    const amount = Number(data.amount);
    const minBid = (state.currentHighBid?.amount || state.currentLot?.estimatedMin || 10000) + 1000;

    // Server-authoritative check
    if (amount >= minBid && pState.cash >= amount) {
      const bid = {
        bidderId: playerId,
        bidderName: room.players[playerId].name,
        amount,
        timestamp: Date.now(),
      };
      state.currentHighBid = bid;
      state.bidHistory.unshift(bid);

      // Anti-Snipe system: If bid placed in final 5 seconds, add +5 seconds!
      const remainingTime = state.serverEndTime - Date.now();
      if (remainingTime < 5000) {
        state.serverEndTime += 5000;
        state.antiSnipeActive = true;
      }
    }
  } else if (action === 'RESEARCH_ASSET') {
    const cost = 5000;
    if (pState.cash >= cost && !pState.researchedAssetIds.includes(data.assetId)) {
      pState.cash -= cost;
      pState.researchedAssetIds.push(data.assetId);
      room.players[playerId].score += 300;
    }
  } else if (action === 'TAKE_LOAN') {
    const loanAmount = 25000;
    if (pState.debt <= 50000) {
      pState.debt += loanAmount;
      pState.cash += loanAmount;
    }
  } else if (action === 'REPAY_LOAN') {
    const repayAmount = Math.min(25000, pState.debt);
    if (pState.cash >= repayAmount && repayAmount > 0) {
      pState.cash -= repayAmount;
      pState.debt -= repayAmount;
      room.players[playerId].score += 500;
    }
  }
}

function handleDrawAndGuessAction(room: RoomState, playerId: string, action: string, data: any) {
  if (!room.drawAndGuessState) return;
  if (action === 'DRAW_STROKE') {
    room.drawAndGuessState.drawingStrokes.push(data.stroke);
  } else if (action === 'CLEAR_CANVAS') {
    room.drawAndGuessState.drawingStrokes = [];
  }
}

function rotateDrawAndGuessRoundServer(room: RoomState) {
  if (!room.drawAndGuessState) return;
  const dg = room.drawAndGuessState;
  if (dg.round >= dg.maxRounds) {
    finishGame(room, 'DRAW_AND_GUESS');
    return;
  }

  dg.round += 1;
  const currentIdx = room.playerOrder.indexOf(dg.currentDrawerId);
  const nextDrawerId =
    room.playerOrder[(currentIdx + 1) % room.playerOrder.length] || room.playerOrder[0];

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

/* ==================== FINISH GAME & SUMMARY CALCULATOR ==================== */

function finishGame(room: RoomState, gameType: GameType) {
  room.phase = 'POST_GAME';

  const playersList = Object.values(room.players);
  let winnerIds: string[] = [];

  if (gameType === 'BLUFF_CITY' && room.bluffCityState) {
    room.bluffCityState.phase = 'RESOLUTION';
    // Winner has highest score + coins
    const sorted = [...playersList].sort((a, b) => b.score - a.score);
    winnerIds = [sorted[0].id];
  } else if (gameType === 'MURDER_MYSTERY' && room.murderMysteryState) {
    room.murderMysteryState.phase = 'RESOLUTION';
    const murdererEntry = Object.entries(room.murderMysteryState.playerStates).find(
      ([_, st]) => st.role === 'MURDERER'
    );
    const murdererId = murdererEntry ? murdererEntry[0] : '';
    room.murderMysteryState.murdererRevealed = murdererId;

    if (room.murderMysteryState.murdererEscaped) {
      winnerIds = [murdererId];
    } else {
      // Check who accused correctly
      const correctAccusers = playersList.filter((p) => {
        const acc = room.murderMysteryState!.playerStates[p.id]?.accusation;
        return acc && acc.suspectId === murdererId;
      });
      winnerIds = correctAccusers.length > 0 ? correctAccusers.map((p) => p.id) : [murdererId];
    }
  } else if (gameType === 'SECRET_AUCTION' && room.secretAuctionState) {
    room.secretAuctionState.phase = 'RESOLUTION';
    // Net worth = cash + sum(assets true values) - debt
    const scores = playersList.map((p) => {
      const pState = room.secretAuctionState!.playerStates[p.id];
      const assetsVal = (pState?.assets || []).reduce((acc, a) => acc + (a.trueValue || a.estimatedMin), 0);
      const netWorth = (pState?.cash || 0) + assetsVal - (pState?.debt || 0);
      return { id: p.id, netWorth };
    });
    scores.sort((a, b) => b.netWorth - a.netWorth);
    winnerIds = [scores[0].id];
  }

  const winnerNames = winnerIds.map((id) => room.players[id]?.name || 'Unknown');

  const summary: PostGameSummary = {
    gameType,
    winnerIds,
    winnerNames,
    durationSeconds: Math.round((Date.now() - (room.eventLogs[room.eventLogs.length - 1]?.timestamp || Date.now())) / 1000),
    playersSummary: playersList.map((p) => {
      const isWinner = winnerIds.includes(p.id);
      const coinsEarned = isWinner ? 1500 : 500;
      const xpEarned = isWinner ? 1200 : 450;

      // Credit coins to wallet
      recordTransaction(p.id, room.roomCode, coinsEarned, 'CREDIT', `Match Reward: ${gameType}`, gameType);

      return {
        playerId: p.id,
        playerName: p.name,
        avatar: p.avatar,
        score: p.score,
        coinsEarned,
        xpEarned,
        performance: {
          accuracy: Math.min(100, Math.max(50, Math.round(75 + Math.random() * 20))),
          decisions: Math.min(100, Math.max(60, Math.round(80 + Math.random() * 18))),
          economy: Math.min(100, Math.max(40, Math.round(70 + Math.random() * 25))),
          deception: Math.min(100, Math.max(50, Math.round(82 + Math.random() * 15))),
          investigation: Math.min(100, Math.max(50, Math.round(78 + Math.random() * 20))),
        },
        unlockedAchievements: isWinner ? ['victory_royale'] : ['first_blood'],
      };
    }),
  };

  room.postGameSummary = summary;
  broadcastRoom(room.roomCode, { type: 'MATCH_FINISHED', summary });
}

/* ==================== AUTHORITATIVE SERVER TICKER ==================== */

setInterval(() => {
  const now = Date.now();

  for (const [roomId, room] of rooms.entries()) {
    if (room.phase !== 'PLAYING' || room.paused) continue;

    // Check Bluff City Phase Transitions
    if (room.bluffCityState) {
      const state = room.bluffCityState;
      if (now >= state.serverEndTime) {
        if (state.phase === 'ACTION') {
          state.phase = 'DISCUSSION';
          state.serverStartTime = now;
          state.serverEndTime = now + 45 * 1000;
        } else if (state.phase === 'DISCUSSION') {
          state.phase = 'COUNCIL_VOTE';
          state.serverStartTime = now;
          state.serverEndTime = now + 30 * 1000;
        } else if (state.phase === 'COUNCIL_VOTE') {
          if (state.round < state.maxRounds) {
            state.round += 1;
            state.phase = 'ACTION';
            state.serverStartTime = now;
            state.serverEndTime = now + 60 * 1000;
          } else {
            finishGame(room, 'BLUFF_CITY');
          }
        }
        broadcastRoom(roomId);
      }
    }

    // Check Murder Mystery Phase Transitions
    if (room.murderMysteryState) {
      const state = room.murderMysteryState;
      if (now >= state.serverEndTime) {
        if (state.phase === 'EXPLORATION') {
          state.phase = 'INTERROGATION';
          state.serverStartTime = now;
          state.serverEndTime = now + 60 * 1000;
        } else if (state.phase === 'INTERROGATION') {
          state.phase = 'ACCUSATION';
          state.serverStartTime = now;
          state.serverEndTime = now + 45 * 1000;
        } else if (state.phase === 'ACCUSATION') {
          // If murderer survived accusation without 100% consensus, initiate 90-sec ESCAPE phase!
          state.phase = 'ESCAPE';
          state.serverStartTime = now;
          state.serverEndTime = now + 90 * 1000;
          state.escapeCountdown = 90;
        } else if (state.phase === 'ESCAPE') {
          finishGame(room, 'MURDER_MYSTERY');
        }
        broadcastRoom(roomId);
      }
    }

    // Check Secret Auction Phase Transitions
    if (room.secretAuctionState) {
      const state = room.secretAuctionState;
      if (now >= state.serverEndTime) {
        if (state.phase === 'BIDDING') {
          // Settle current lot
          if (state.currentHighBid && state.currentLot) {
            const winnerId = state.currentHighBid.bidderId;
            const pState = state.playerStates[winnerId];
            if (pState && pState.cash >= state.currentHighBid.amount) {
              pState.cash -= state.currentHighBid.amount;
              pState.assets.push(state.currentLot);
              state.currentLot.ownerId = winnerId;
              state.currentLot.purchasePrice = state.currentHighBid.amount;
              room.players[winnerId].score += 1500;
            }
          }

          state.phase = 'MARKET_EVENT';
          state.serverStartTime = now;
          state.serverEndTime = now + 20 * 1000;
        } else if (state.phase === 'MARKET_EVENT') {
          state.phase = 'RESEARCH_AND_TRADE';
          state.serverStartTime = now;
          state.serverEndTime = now + 35 * 1000;
        } else if (state.phase === 'RESEARCH_AND_TRADE') {
          if (state.round < state.maxRounds && state.availableAssets.length > 0) {
            state.round += 1;
            state.phase = 'BIDDING';
            state.currentLot = state.availableAssets.shift();
            state.currentHighBid = undefined;
            state.bidHistory = [];
            state.antiSnipeActive = false;
            state.serverStartTime = now;
            state.serverEndTime = now + 40 * 1000;
          } else {
            finishGame(room, 'SECRET_AUCTION');
          }
        }
        broadcastRoom(roomId);
      }

      // Check Draw & Guess Round Transitions
      if (room.drawAndGuessState && now >= room.drawAndGuessState.serverEndTime) {
        rotateDrawAndGuessRoundServer(room);
        broadcastRoom(roomId);
      }
    }
  }
}, 1000);

/* ==================== VITE SPA & DEV SETUP ==================== */

import fs from 'fs';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

async function startServer() {
  const distPath = path.join(__dirname, 'dist');
  const isProd = process.env.NODE_ENV === 'production' || fs.existsSync(distPath);

  if (isProd && fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Social Wars] Real-time game server running on port ${PORT}`);
  });
}

startServer();
