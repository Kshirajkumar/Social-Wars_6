// server.ts
import express from "express";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// src/types/game.ts
var HINT_TIERS = [
  { tier: 1, name: "Nudge", description: "A subtle push in the right direction.", cost: 100, scorePenalty: 100 },
  { tier: 2, name: "Direction", description: "Eliminates one false option.", cost: 250, scorePenalty: 250 },
  { tier: 3, name: "Strong Hint", description: "Reveals a key piece of information.", cost: 500, scorePenalty: 500 },
  { tier: 4, name: "Major Hint", description: "Significantly clarifies the situation.", cost: 1e3, scorePenalty: 1e3 },
  { tier: 5, name: "Emergency Hint", description: "Practically solves this step of the puzzle.", cost: 2e3, scorePenalty: 2e3 }
];

// server/procedural.ts
function generateBluffCityGame(players, difficulty, level, matchLengthMinutes = 5) {
  const count = players.length;
  let roles = [];
  if (count === 3) {
    roles = ["DETECTIVE", "CRIMINAL", "JOURNALIST"];
  } else if (count === 4) {
    roles = ["DETECTIVE", "CRIMINAL", "JOURNALIST", "POLITICIAN"];
  } else {
    if (level >= 10) {
      roles = ["DETECTIVE", "CRIMINAL", "JOURNALIST", "POLITICIAN", "DOUBLE_AGENT"];
    } else if (level >= 6) {
      roles = ["DETECTIVE", "CRIMINAL", "JOURNALIST", "POLITICIAN", "INFORMANT"];
    } else {
      roles = ["DETECTIVE", "CRIMINAL", "JOURNALIST", "POLITICIAN", "INFORMANT"];
    }
  }
  const shuffledRoles = [...roles].sort(() => Math.random() - 0.5);
  const playerStates = {};
  players.forEach((p, index) => {
    const role = shuffledRoles[index % shuffledRoles.length];
    let objective;
    switch (role) {
      case "DETECTIVE":
        objective = {
          id: `obj_det_${p.id}`,
          title: "Unmask the Syndicate",
          description: "Identify the Criminal during the voting phase and keep City Stability above 60%.",
          targetMetric: "STABILITY_AND_CATCH",
          targetValue: 1,
          rewardScore: 3500,
          rewardCoins: 1200,
          completed: false
        };
        break;
      case "CRIMINAL":
      case "CRIME_BOSS":
        objective = {
          id: `obj_crm_${p.id}`,
          title: "Syndicate Extortion",
          description: "Accumulate at least 15,000 City Coins and avoid being unmasked by the Detective.",
          targetMetric: "COINS_AND_EVADE",
          targetValue: 15e3,
          rewardScore: 4e3,
          rewardCoins: 1500,
          completed: false
        };
        break;
      case "JOURNALIST":
        objective = {
          id: `obj_jou_${p.id}`,
          title: "Publish Front-Page Expos\xE9",
          description: "Collect and publish 3 verified pieces of confidential city intel.",
          targetMetric: "INTEL_PUBLISHED",
          targetValue: 3,
          rewardScore: 3200,
          rewardCoins: 1e3,
          completed: false
        };
        break;
      case "POLITICIAN":
        objective = {
          id: `obj_pol_${p.id}`,
          title: "Master of the Council",
          description: "Pass 2 City Decrees and finish with a Reputation score of at least 70.",
          targetMetric: "DECREES_AND_REP",
          targetValue: 70,
          rewardScore: 3400,
          rewardCoins: 1100,
          completed: false
        };
        break;
      case "INFORMANT":
      case "DOUBLE_AGENT":
      default:
        objective = {
          id: `obj_inf_${p.id}`,
          title: "Shadow Broker",
          description: "Form 2 public pacts and end the match with more coins than the Detective.",
          targetMetric: "PACTS_AND_WEALTH",
          targetValue: 1e4,
          rewardScore: 3300,
          rewardCoins: 1150,
          completed: false
        };
        break;
    }
    playerStates[p.id] = {
      role,
      publicClaimRole: role === "CRIMINAL" ? "JOURNALIST" : role,
      objective,
      reputation: 50,
      cityCoins: 5e3,
      currentLocation: "CITY_HALL",
      intelPieces: [
        `Confidential City Dispatch #${Math.floor(100 + Math.random() * 900)}: Suspicious transfers logged in offshore accounts.`
      ],
      publicPacts: []
    };
  });
  const durationSec = 75;
  const now = Date.now();
  return {
    round: 1,
    maxRounds: level >= 10 ? 4 : 3,
    phase: "ACTION",
    serverStartTime: now,
    serverEndTime: now + durationSec * 1e3,
    cityStability: 80,
    activeDecree: {
      id: "decree_1",
      title: "Emergency Surveillance Act",
      description: "Authorize wiretapping in Hotel & Bank. Reduces crime risk but costs city stability.",
      effectDescription: "+15% Detective accuracy, -10% City Stability",
      yesVotes: [],
      noVotes: []
    },
    revealedIntel: [
      "The morning edition reports unusual activity near the Waterfront Vault.",
      "City Council is debating emergency measures to protect municipal reserves."
    ],
    playerStates,
    recentActions: ["Match started: Five power brokers enter Bluff City."]
  };
}
var MANSION_ROOMS = [
  { id: "LIBRARY", name: "Grand Library", icon: "\u{1F4DA}", searched: false },
  { id: "BEDROOM", name: "Master Bedroom", icon: "\u{1F6CF}\uFE0F", searched: false },
  { id: "LABORATORY", name: "Alchemical Lab", icon: "\u{1F52C}", searched: false },
  { id: "DINING_ROOM", name: "Dining Room", icon: "\u{1F377}", searched: false },
  { id: "VAULT", name: "Private Vault", icon: "\u{1F3E6}", searched: false },
  { id: "SECURITY_ROOM", name: "Security Room", icon: "\u{1F4F9}", searched: false },
  { id: "GARDEN", name: "Moonlit Garden", icon: "\u{1F333}", searched: false },
  { id: "GRAND_HALL", name: "Grand Entrance Hall", icon: "\u{1F3DB}\uFE0F", searched: false },
  { id: "OFFICE", name: "Lord Blackwood\u2019s Office", icon: "\u{1F4BC}", searched: false }
];
var VICTIM_NAMES = [
  "Lord Reginald Blackwood",
  "Baroness Vivienne Vance",
  "Dr. Alistair Finch",
  "Archibald Sterling"
];
var WEAPONS_POOL = [
  "Antique Poisoned Dagger",
  "Rare Cyanide Decanter",
  "Heavy Brass Candlestick",
  "Severed Elevator Cable",
  "Venomous Black Lotus Extract"
];
var SECRETS_POOL = [
  "You were seen sneaking into the Vault 10 minutes prior to the murder to steal bearer bonds.",
  "You were having a clandestine affair with the victim and threatened to expose them.",
  "You owe 150,000 coins to underworld lenders and stood to inherit the Blackwood estate.",
  "You forged the victim\u2019s signature on the revised last will and testament.",
  "You secretly slipped a sleeping draught into the victim\u2019s tea earlier in the evening.",
  "You were blackmailed by the victim regarding an industrial espionage scandal."
];
var ALIBIS_POOL = [
  "Claims to have been cataloging rare manuscripts in the Library.",
  "Claims to have been in the Dining Room tasting the vintage port.",
  "Claims to have been resting in the Guest Quarters with a severe headache.",
  "Claims to have been strolling through the Moonlit Garden for fresh air.",
  "Claims to have been reviewing financial spreadsheets in the Private Office."
];
function generateMurderMysteryGame(players, difficulty, level) {
  const victimName = VICTIM_NAMES[Math.floor(Math.random() * VICTIM_NAMES.length)];
  const crimeRoom = MANSION_ROOMS[Math.floor(Math.random() * 4)];
  const murderWeapon = WEAPONS_POOL[Math.floor(Math.random() * WEAPONS_POOL.length)];
  const timeOfMurder = "23:42 PM";
  const murdererIndex = Math.floor(Math.random() * players.length);
  const murdererId = players[murdererIndex].id;
  const playerStates = {};
  const shuffledSecrets = [...SECRETS_POOL].sort(() => Math.random() - 0.5);
  const shuffledAlibis = [...ALIBIS_POOL].sort(() => Math.random() - 0.5);
  players.forEach((p, idx) => {
    const isMurderer = p.id === murdererId;
    playerStates[p.id] = {
      role: isMurderer ? "MURDERER" : "INVESTIGATOR",
      secret: shuffledSecrets[idx % shuffledSecrets.length],
      alibi: shuffledAlibis[idx % shuffledAlibis.length],
      currentRoom: "GRAND_HALL",
      evidenceCollected: [],
      hasAccused: false,
      murdererActionPoints: isMurderer ? 3 : void 0
    };
  });
  const evidenceBoard = {
    ev_1: {
      id: "ev_1",
      name: "Torn Monogrammed Cufflink",
      type: "PHYSICAL",
      locationId: crimeRoom.id,
      description: `Discovered right beside the body. Embossed with initials matching ${players[murdererIndex].name[0]}.`,
      isAuthentic: true,
      discoveredBy: [],
      revealsKillerConnection: true,
      clueSummary: "Physical evidence found directly at the crime scene tying to the killer."
    },
    ev_2: {
      id: "ev_2",
      name: "Security Camera Log 23:41",
      type: "DIGITAL",
      locationId: "SECURITY_ROOM",
      description: `Footage timestamped 23:41 shows a hooded silhouette entering ${crimeRoom.name}.`,
      isAuthentic: true,
      discoveredBy: [],
      revealsKillerConnection: true,
      clueSummary: "Timestamp places the killer at the scene exactly at 23:41."
    },
    ev_3: {
      id: "ev_3",
      name: "Smudged Fingerprints on Safe Handle",
      type: "PHYSICAL",
      locationId: "VAULT",
      description: "Partial whorls recovered on the mahogany safe lock.",
      isAuthentic: false,
      // Planted/distraction!
      discoveredBy: [],
      revealsKillerConnection: false,
      clueSummary: "Distraction: Points to unauthorized safe opening, not the murder."
    },
    ev_4: {
      id: "ev_4",
      name: "Toxicology Vial Remnants",
      type: "DOCUMENTARY",
      locationId: "LABORATORY",
      description: `Chemical residue matching ${murderWeapon}.`,
      isAuthentic: true,
      discoveredBy: [],
      revealsKillerConnection: true,
      clueSummary: "Confirms the precise murder weapon used."
    },
    ev_5: {
      id: "ev_5",
      name: "Witness Statement: Butler\u2019s Diary",
      type: "WITNESS",
      locationId: "OFFICE",
      description: `Noted Lord Blackwood had a heated argument regarding family inheritance shortly before midnight.`,
      isAuthentic: true,
      discoveredBy: [],
      revealsKillerConnection: false,
      clueSummary: "Context on the lethal motive of greed."
    },
    ev_6: {
      id: "ev_6",
      name: "Altered Guest Clock",
      type: "PHYSICAL",
      locationId: "LIBRARY",
      description: "The grandfather clock hands were forcibly moved back 15 minutes.",
      isAuthentic: level >= 5,
      // false lead or tampering
      discoveredBy: [],
      revealsKillerConnection: false,
      clueSummary: "Proof that an alibi was artificially staged."
    }
  };
  const durationSec = 110;
  const now = Date.now();
  return {
    caseTitle: "The Last Night at Blackwood Manor",
    caseDifficulty: difficulty,
    victimName,
    victimProfession: "Eccentric Industrialist & Estate Patriarch",
    crimeSceneRoom: crimeRoom.name,
    murderWeapon,
    timeOfMurder,
    phase: "EXPLORATION",
    serverStartTime: now,
    serverEndTime: now + durationSec * 1e3,
    currentRoomLocations: MANSION_ROOMS,
    evidenceBoard,
    playerStates,
    escapePath: {
      currentRoom: crimeRoom.id,
      targetExit: "GARDEN",
      blockedRooms: []
    }
  };
}
var ASSET_CATALOG = [
  {
    name: "Metropolitan Grand Palace Hotel",
    category: "REAL_ESTATE",
    icon: "\u{1F3E8}",
    estimatedMin: 45e3,
    estimatedMax: 85e3,
    risk: 4,
    growth: 7,
    liquidity: 5,
    incomePerRound: 6500,
    operatingCost: 2e3,
    marketSensitivity: "REAL_ESTATE"
  },
  {
    name: "NeuralCore AI Semiconductor Foundry",
    category: "TECH",
    icon: "\u{1F916}",
    estimatedMin: 6e4,
    estimatedMax: 12e4,
    risk: 8,
    growth: 10,
    liquidity: 7,
    incomePerRound: 9500,
    operatingCost: 3500,
    marketSensitivity: "TECH"
  },
  {
    name: "Pacific Freight Cargo Fleet",
    category: "LOGISTICS",
    icon: "\u{1F6A2}",
    estimatedMin: 4e4,
    estimatedMax: 7e4,
    risk: 5,
    growth: 6,
    liquidity: 6,
    incomePerRound: 5500,
    operatingCost: 1800,
    marketSensitivity: "LOGISTICS"
  },
  {
    name: "Emerald Ridge Lithium Mine",
    category: "ENERGY",
    icon: "\u26A1",
    estimatedMin: 55e3,
    estimatedMax: 95e3,
    risk: 7,
    growth: 8,
    liquidity: 4,
    incomePerRound: 8e3,
    operatingCost: 2800,
    marketSensitivity: "ENERGY"
  },
  {
    name: 'Monaco Harbor Superyacht "Aegean Star"',
    category: "LUXURY",
    icon: "\u{1F6E5}\uFE0F",
    estimatedMin: 35e3,
    estimatedMax: 65e3,
    risk: 3,
    growth: 5,
    liquidity: 8,
    incomePerRound: 4200,
    operatingCost: 1500,
    marketSensitivity: "LUXURY"
  },
  {
    name: "VoxelForge Triple-A Game Studio",
    category: "TECH",
    icon: "\u{1F3AE}",
    estimatedMin: 5e4,
    estimatedMax: 9e4,
    risk: 7,
    growth: 9,
    liquidity: 6,
    incomePerRound: 7200,
    operatingCost: 2400,
    marketSensitivity: "TECH"
  },
  {
    name: "GeneThera Rare Oncology Patent",
    category: "TECH",
    icon: "\u{1F9EC}",
    estimatedMin: 5e4,
    estimatedMax: 11e4,
    risk: 8,
    growth: 9,
    liquidity: 5,
    incomePerRound: 8500,
    operatingCost: 2600,
    marketSensitivity: "TECH"
  },
  {
    name: "Manhattan 5th Ave Penthouse Loft",
    category: "REAL_ESTATE",
    icon: "\u{1F3D9}\uFE0F",
    estimatedMin: 45e3,
    estimatedMax: 75e3,
    risk: 3,
    growth: 6,
    liquidity: 7,
    incomePerRound: 5e3,
    operatingCost: 1200,
    marketSensitivity: "REAL_ESTATE"
  }
];
var MARKET_EVENTS_POOL = [
  {
    id: "evt_tech_boom",
    title: "Breakthrough Quantum Wave",
    description: "Tech valuations surge +35% as international demand skyrockets.",
    affectedCategory: "TECH",
    multiplier: 1.35,
    icon: "\u{1F680}"
  },
  {
    id: "evt_recession",
    title: "Global Credit Tightening",
    description: "Central banks raise benchmark rates. Real Estate valuations dip -20%.",
    affectedCategory: "REAL_ESTATE",
    multiplier: 0.8,
    icon: "\u{1F4C9}"
  },
  {
    id: "evt_tourism_boom",
    title: "Luxury Tourism Renaissance",
    description: "High net worth travel increases luxury & hospitality returns by +25%.",
    affectedCategory: "LUXURY",
    multiplier: 1.25,
    icon: "\u{1F942}"
  },
  {
    id: "evt_supply_crisis",
    title: "Strait of Hormuz Congestion",
    description: "Global logistics rates multiply, pushing logistics valuations up +30%.",
    affectedCategory: "LOGISTICS",
    multiplier: 1.3,
    icon: "\u{1F4E6}"
  },
  {
    id: "evt_green_mandate",
    title: "Clean Energy Sovereign Subsidies",
    description: "Massive government clean energy grants surge energy assets by +40%.",
    affectedCategory: "ENERGY",
    multiplier: 1.4,
    icon: "\u2600\uFE0F"
  }
];
function generateSecretAuctionGame(players, difficulty, level) {
  const availableAssets = ASSET_CATALOG.map((item, idx) => {
    const spread = item.estimatedMax - item.estimatedMin;
    const trueVal = Math.round((item.estimatedMin + Math.random() * spread) / 1e3) * 1e3;
    return {
      ...item,
      id: `asset_${idx + 1}`,
      trueValue: trueVal
    };
  }).sort(() => Math.random() - 0.5);
  const playerStates = {};
  players.forEach((p) => {
    playerStates[p.id] = {
      cash: 1e5,
      // 100,000 starting coins per requirement
      debt: 0,
      interestRate: 0.08,
      assets: [],
      researchedAssetIds: [],
      pendingTrades: []
    };
  });
  const currentLot = availableAssets[0];
  const durationSec = 45;
  const now = Date.now();
  return {
    round: 1,
    maxRounds: 4,
    phase: "BIDDING",
    serverStartTime: now,
    serverEndTime: now + durationSec * 1e3,
    currentLot,
    currentHighBid: void 0,
    bidHistory: [],
    antiSnipeActive: false,
    currentMarketEvent: MARKET_EVENTS_POOL[0],
    playerStates,
    availableAssets: availableAssets.slice(1)
  };
}

// server.ts
dotenv.config();
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var app = express();
var server = http.createServer(app);
var wss = new WebSocketServer({ server });
app.use(express.json());
var rooms = /* @__PURE__ */ new Map();
var socketToPlayer = /* @__PURE__ */ new Map();
var playerSockets = /* @__PURE__ */ new Map();
var wallets = /* @__PURE__ */ new Map();
function getOrCreateWallet(playerId) {
  if (!wallets.has(playerId)) {
    wallets.set(playerId, {
      balance: 1e4,
      // 10,000 starting coins per requirements
      history: [
        {
          transaction_id: `tx_init_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          player_id: playerId,
          room_id: "SYSTEM",
          amount: 1e4,
          type: "CREDIT",
          reason: "Initial starting wallet grant",
          timestamp: Date.now(),
          balance_after: 1e4
        }
      ]
    });
  }
  return wallets.get(playerId);
}
function recordTransaction(playerId, roomId, amount, type, reason, gameId) {
  const wallet = getOrCreateWallet(playerId);
  if (type === "DEBIT" && wallet.balance < amount) {
    return false;
  }
  const balance_after = type === "CREDIT" ? wallet.balance + amount : wallet.balance - amount;
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
    balance_after
  });
  return true;
}
function sanitizeStateForPlayer(room, playerId) {
  const copy = JSON.parse(JSON.stringify(room));
  if (copy.bluffCityState) {
    const pStates = copy.bluffCityState.playerStates;
    for (const pid of Object.keys(pStates)) {
      if (pid !== playerId) {
        if (copy.bluffCityState.phase !== "RESOLUTION") {
          pStates[pid].role = void 0;
          pStates[pid].objective = void 0;
        }
      }
    }
  }
  if (copy.murderMysteryState) {
    const pStates = copy.murderMysteryState.playerStates;
    const isPlayerMurderer = pStates[playerId]?.role === "MURDERER";
    for (const pid of Object.keys(pStates)) {
      if (pid !== playerId && copy.murderMysteryState.phase !== "RESOLUTION") {
        pStates[pid].role = void 0;
        pStates[pid].secret = "Confidential dark secret (Hidden)";
        pStates[pid].murdererActionPoints = void 0;
      }
    }
    if (copy.murderMysteryState.phase !== "RESOLUTION") {
      for (const evId of Object.keys(copy.murderMysteryState.evidenceBoard)) {
        const ev = copy.murderMysteryState.evidenceBoard[evId];
        const isDiscovered = ev.discoveredBy.includes(playerId);
        if (!isDiscovered && !isPlayerMurderer) {
          ev.name = "Undiscovered Potential Clue";
          ev.description = "Search this room to discover and examine this piece of evidence.";
        }
      }
    }
  }
  if (copy.secretAuctionState) {
    const pState = copy.secretAuctionState.playerStates[playerId];
    const isResearched = (assetId) => pState?.researchedAssetIds?.includes(assetId);
    if (copy.secretAuctionState.currentLot) {
      if (!isResearched(copy.secretAuctionState.currentLot.id) && copy.secretAuctionState.phase !== "RESOLUTION") {
        copy.secretAuctionState.currentLot.trueValue = void 0;
      }
    }
    copy.secretAuctionState.availableAssets.forEach((a) => {
      if (!isResearched(a.id) && copy.secretAuctionState.phase !== "RESOLUTION") {
        a.trueValue = void 0;
      }
    });
  }
  return copy;
}
function broadcastRoom(roomId, extraEvent) {
  const room = rooms.get(roomId);
  if (!room) return;
  for (const pid of Object.keys(room.players)) {
    const ws = playerSockets.get(pid);
    if (ws && ws.readyState === WebSocket.OPEN) {
      const sanitized = sanitizeStateForPlayer(room, pid);
      ws.send(
        JSON.stringify({
          type: "ROOM_UPDATE",
          room: sanitized,
          event: extraEvent
        })
      );
    }
  }
}
function broadcastChatMessage(roomId, message) {
  const room = rooms.get(roomId);
  if (!room) return;
  for (const pid of Object.keys(room.players)) {
    const ws = playerSockets.get(pid);
    if (ws && ws.readyState === WebSocket.OPEN) {
      if (!message.recipientId || message.recipientId === pid || message.senderId === pid) {
        ws.send(
          JSON.stringify({
            type: "CHAT_MESSAGE",
            message
          })
        );
      }
    }
  }
}
function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return rooms.has(code) ? generateRoomCode() : code;
}
wss.on("connection", (ws) => {
  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString());
      handleClientMessage(ws, msg);
    } catch (err) {
      console.error("Failed to parse WebSocket message", err);
    }
  });
  ws.on("close", () => {
    const playerInfo = socketToPlayer.get(ws);
    if (playerInfo) {
      const { roomId, playerId } = playerInfo;
      const room = rooms.get(roomId);
      if (room && room.players[playerId]) {
        room.players[playerId].isConnected = false;
        room.players[playerId].lastActive = Date.now();
        if (room.hostId === playerId) {
          const nextHost = Object.values(room.players).find((p) => p.isConnected && p.id !== playerId);
          if (nextHost) {
            room.hostId = nextHost.id;
            nextHost.isHost = true;
            room.players[playerId].isHost = false;
            room.eventLogs.unshift({
              id: `evt_${Date.now()}`,
              type: "HOST_MIGRATED",
              description: `Host disconnected. \u{1F451} Host transferred to ${nextHost.name}.`,
              timestamp: Date.now()
            });
          }
        }
        broadcastRoom(roomId, { type: "PLAYER_DISCONNECTED", playerId });
      }
      playerSockets.delete(playerId);
      socketToPlayer.delete(ws);
    }
  });
});
function handleClientMessage(ws, msg) {
  const { type, payload } = msg;
  switch (type) {
    case "CREATE_ROOM": {
      const { playerName, avatar, title, badgeFrame, sessionToken } = payload;
      const code = generateRoomCode();
      const playerId = `p_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const token = sessionToken || `token_${Math.random().toString(36).substring(2, 10)}`;
      const hostPlayer = {
        id: playerId,
        name: playerName || "Player 1",
        avatar: avatar || "\u{1F43A}",
        title: title || "Rookie Tactician",
        badgeFrame: badgeFrame || "border-slate-700",
        isHost: true,
        isReady: true,
        isConnected: true,
        score: 0,
        sessionToken: token,
        lastActive: Date.now(),
        hintsUsed: 0
      };
      const newRoom = {
        roomCode: code,
        phase: "LOBBY",
        hostId: playerId,
        settings: {
          selectedGame: "BLUFF_CITY",
          difficulty: "BEGINNER",
          level: 1,
          matchLengthMinutes: 5,
          hintsEnabled: true,
          privateMessagingEnabled: true,
          progressiveMode: true
        },
        players: { [playerId]: hostPlayer },
        playerOrder: [playerId],
        eventLogs: [
          {
            id: `evt_${Date.now()}`,
            type: "ROOM_CREATED",
            description: `Room ${code} created by ${hostPlayer.name}.`,
            timestamp: Date.now()
          }
        ],
        paused: false,
        seed: Math.floor(Math.random() * 1e6)
      };
      rooms.set(code, newRoom);
      socketToPlayer.set(ws, { roomId: code, playerId });
      playerSockets.set(playerId, ws);
      const wallet = getOrCreateWallet(playerId);
      ws.send(
        JSON.stringify({
          type: "ROOM_JOINED",
          roomCode: code,
          playerId,
          sessionToken: token,
          walletBalance: wallet.balance,
          room: sanitizeStateForPlayer(newRoom, playerId)
        })
      );
      break;
    }
    case "JOIN_ROOM": {
      const { roomCode, playerName, avatar, title, badgeFrame, sessionToken } = payload;
      const upperCode = (roomCode || "").toUpperCase().trim();
      const room = rooms.get(upperCode);
      if (!room) {
        ws.send(JSON.stringify({ type: "ERROR", message: "Room not found. Please check code." }));
        return;
      }
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
        const wallet2 = getOrCreateWallet(existingPlayer.id);
        ws.send(
          JSON.stringify({
            type: "ROOM_JOINED",
            roomCode: upperCode,
            playerId: existingPlayer.id,
            sessionToken: existingPlayer.sessionToken,
            walletBalance: wallet2.balance,
            room: sanitizeStateForPlayer(room, existingPlayer.id)
          })
        );
        broadcastRoom(upperCode, { type: "PLAYER_RECONNECTED", playerId: existingPlayer.id });
        return;
      }
      if (Object.keys(room.players).length >= 5) {
        ws.send(JSON.stringify({ type: "ERROR", message: "Room is full (Maximum 5 players)." }));
        return;
      }
      if (room.phase !== "LOBBY") {
        ws.send(JSON.stringify({ type: "ERROR", message: "Game has already started." }));
        return;
      }
      const playerId = `p_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const token = sessionToken || `token_${Math.random().toString(36).substring(2, 10)}`;
      const newPlayer = {
        id: playerId,
        name: playerName || `Agent ${Object.keys(room.players).length + 1}`,
        avatar: avatar || "\u{1F98A}",
        title: title || "Rookie Tactician",
        badgeFrame: badgeFrame || "border-slate-700",
        isHost: false,
        isReady: false,
        isConnected: true,
        score: 0,
        sessionToken: token,
        lastActive: Date.now(),
        hintsUsed: 0
      };
      room.players[playerId] = newPlayer;
      room.playerOrder.push(playerId);
      room.eventLogs.unshift({
        id: `evt_${Date.now()}`,
        type: "PLAYER_JOINED",
        description: `${newPlayer.name} joined the room.`,
        timestamp: Date.now()
      });
      socketToPlayer.set(ws, { roomId: upperCode, playerId });
      playerSockets.set(playerId, ws);
      const wallet = getOrCreateWallet(playerId);
      ws.send(
        JSON.stringify({
          type: "ROOM_JOINED",
          roomCode: upperCode,
          playerId,
          sessionToken: token,
          walletBalance: wallet.balance,
          room: sanitizeStateForPlayer(room, playerId)
        })
      );
      broadcastRoom(upperCode, { type: "PLAYER_JOINED", player: newPlayer });
      break;
    }
    case "SET_READY": {
      const playerInfo = socketToPlayer.get(ws);
      if (!playerInfo) return;
      const { roomId, playerId } = playerInfo;
      const room = rooms.get(roomId);
      if (!room || !room.players[playerId]) return;
      room.players[playerId].isReady = !room.players[playerId].isReady;
      broadcastRoom(roomId);
      break;
    }
    case "HOST_UPDATE_SETTINGS": {
      const playerInfo = socketToPlayer.get(ws);
      if (!playerInfo) return;
      const { roomId, playerId } = playerInfo;
      const room = rooms.get(roomId);
      if (!room || room.hostId !== playerId) return;
      room.settings = { ...room.settings, ...payload };
      broadcastRoom(roomId);
      break;
    }
    case "HOST_START_GAME": {
      const playerInfo = socketToPlayer.get(ws);
      if (!playerInfo) return;
      const { roomId, playerId } = playerInfo;
      const room = rooms.get(roomId);
      if (!room || room.hostId !== playerId) return;
      const playerList = Object.values(room.players);
      if (playerList.length < 3) {
        ws.send(
          JSON.stringify({
            type: "ERROR",
            message: "Minimum 3 players required to start Social Wars."
          })
        );
        return;
      }
      room.phase = "PLAYING";
      const gameType = room.settings.selectedGame;
      if (gameType === "BLUFF_CITY") {
        room.bluffCityState = generateBluffCityGame(
          playerList,
          room.settings.difficulty,
          room.settings.level,
          room.settings.matchLengthMinutes
        );
      } else if (gameType === "MURDER_MYSTERY") {
        room.murderMysteryState = generateMurderMysteryGame(
          playerList,
          room.settings.difficulty,
          room.settings.level
        );
      } else if (gameType === "SECRET_AUCTION") {
        room.secretAuctionState = generateSecretAuctionGame(
          playerList,
          room.settings.difficulty,
          room.settings.level
        );
      }
      room.eventLogs.unshift({
        id: `evt_${Date.now()}`,
        type: "GAME_STARTED",
        description: `Host started ${gameType} on Level ${room.settings.level} (${room.settings.difficulty}).`,
        timestamp: Date.now()
      });
      broadcastRoom(roomId, { type: "MATCH_STARTED", gameType });
      break;
    }
    case "USE_HINT": {
      const playerInfo = socketToPlayer.get(ws);
      if (!playerInfo) return;
      const { roomId, playerId } = playerInfo;
      const room = rooms.get(roomId);
      if (!room || !room.players[playerId] || !room.settings.hintsEnabled) return;
      const tierNumber = payload.tier || 1;
      const tierDef = HINT_TIERS.find((t) => t.tier === tierNumber);
      if (!tierDef) return;
      const wallet = getOrCreateWallet(playerId);
      if (wallet.balance < tierDef.cost) {
        ws.send(JSON.stringify({ type: "ERROR", message: "Insufficient Social Coins for this hint tier." }));
        return;
      }
      recordTransaction(
        playerId,
        roomId,
        tierDef.cost,
        "DEBIT",
        `Used Tier ${tierNumber} Hint (${tierDef.name})`,
        room.settings.selectedGame
      );
      room.players[playerId].score = Math.max(0, room.players[playerId].score - tierDef.scorePenalty);
      room.players[playerId].hintsUsed = (room.players[playerId].hintsUsed || 0) + 1;
      let hintText = "";
      if (room.bluffCityState) {
        const criminalId = Object.keys(room.bluffCityState.playerStates).find(
          (id) => room.bluffCityState.playerStates[id].role === "CRIMINAL"
        );
        const criminalPlayer = criminalId ? room.players[criminalId] : null;
        if (tierNumber === 1) hintText = "Nudge: Pay attention to who changed their location immediately after the bank transaction.";
        else if (tierNumber === 2) hintText = "Direction: The Criminal is currently positioned in either City Hall or the Black Market.";
        else if (tierNumber === 3) hintText = criminalPlayer ? `Strong Hint: The Criminal has an avatar resembling ${criminalPlayer.avatar}.` : "Strong Hint: Someone in the Market is forging certificates.";
        else if (tierNumber === 4) hintText = criminalPlayer ? `Major Hint: The Criminal is seated between player positions and claims to be Journalist.` : "Major Hint: Watch the votes on the emergency decree.";
        else hintText = criminalPlayer ? `Emergency Hint: ${criminalPlayer.name} IS THE CRIMINAL.` : "Emergency Hint: The primary culprit is unmasked!";
      } else if (room.murderMysteryState) {
        const murdererEntry = Object.entries(room.murderMysteryState.playerStates).find(
          ([_, st]) => st.role === "MURDERER"
        );
        const killer = murdererEntry ? room.players[murdererEntry[0]] : null;
        if (tierNumber === 1) hintText = "Nudge: Check the CCTV timestamp in the Security Room for inconsistencies.";
        else if (tierNumber === 2) hintText = "Direction: The murder weapon was poisoned, ruling out heavy blunt force items.";
        else if (tierNumber === 3) hintText = killer ? `Strong Hint: The killer\u2019s alibi places them in the ${killer.name[0] === "A" ? "Garden" : "Library"}.` : "Strong Hint: Examine the cufflink clue.";
        else if (tierNumber === 4) hintText = killer ? `Major Hint: The cufflink initials directly match ${killer.name}.` : "Major Hint: The physical clue at the scene is authentic.";
        else hintText = killer ? `Emergency Hint: ${killer.name} IS THE MURDERER. Weapon: ${room.murderMysteryState.murderWeapon}.` : "Emergency Hint: Case solved!";
      } else if (room.secretAuctionState) {
        const lot = room.secretAuctionState.currentLot;
        if (lot) {
          if (tierNumber === 1) hintText = `Nudge: Risk rating ${lot.risk}/10 indicates ${lot.risk > 5 ? "high volatility" : "stable cash flows"}.`;
          else if (tierNumber === 2) hintText = `Direction: The true value is within the upper 40% of the estimated valuation range.`;
          else if (tierNumber === 3) hintText = `Strong Hint: Next round's market event will positively affect ${lot.marketSensitivity}.`;
          else if (tierNumber === 4) hintText = `Major Hint: Due diligence reveals true value is approximately ${lot.trueValue ? Math.round(lot.trueValue * 0.98) : "75,000"}.`;
          else hintText = `Emergency Hint: Exact True Value is ${lot.trueValue || 8e4} Coins!`;
        }
      }
      ws.send(
        JSON.stringify({
          type: "HINT_DELIVERED",
          tier: tierNumber,
          hintText,
          newWalletBalance: wallet.balance,
          newScore: room.players[playerId].score
        })
      );
      broadcastRoom(roomId);
      break;
    }
    case "GAME_ACTION": {
      const playerInfo = socketToPlayer.get(ws);
      if (!playerInfo) return;
      const { roomId, playerId } = playerInfo;
      const room = rooms.get(roomId);
      if (!room || room.phase !== "PLAYING") return;
      const { gameType, action, actionPayload } = payload;
      if (gameType === "BLUFF_CITY" && room.bluffCityState) {
        handleBluffCityAction(room, playerId, action, actionPayload);
      } else if (gameType === "MURDER_MYSTERY" && room.murderMysteryState) {
        handleMurderMysteryAction(room, playerId, action, actionPayload);
      } else if (gameType === "SECRET_AUCTION" && room.secretAuctionState) {
        handleSecretAuctionAction(room, playerId, action, actionPayload);
      }
      broadcastRoom(roomId);
      break;
    }
    case "SEND_CHAT": {
      const playerInfo = socketToPlayer.get(ws);
      if (!playerInfo) return;
      const { roomId, playerId } = playerInfo;
      const room = rooms.get(roomId);
      if (!room) return;
      const player = room.players[playerId];
      if (!player) return;
      const chatMsg = {
        id: `chat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        senderId: playerId,
        senderName: player.name,
        senderAvatar: player.avatar,
        recipientId: payload.recipientId,
        // Whisper if provided
        text: (payload.text || "").substring(0, 250),
        // rate limit length
        timestamp: Date.now()
      };
      broadcastChatMessage(roomId, chatMsg);
      break;
    }
    case "SEND_REACTION": {
      const playerInfo = socketToPlayer.get(ws);
      if (!playerInfo) return;
      const { roomId, playerId } = playerInfo;
      const room = rooms.get(roomId);
      if (!room) return;
      broadcastRoom(roomId, {
        type: "FLOATING_REACTION",
        emoji: payload.emoji,
        senderName: room.players[playerId]?.name || "Agent",
        playerId
      });
      break;
    }
    case "HOST_KICK_PLAYER": {
      const playerInfo = socketToPlayer.get(ws);
      if (!playerInfo) return;
      const { roomId, playerId } = playerInfo;
      const room = rooms.get(roomId);
      if (!room || room.hostId !== playerId) return;
      const targetId = payload.targetPlayerId;
      if (targetId && room.players[targetId]) {
        delete room.players[targetId];
        room.playerOrder = room.playerOrder.filter((id) => id !== targetId);
        broadcastRoom(roomId, { type: "PLAYER_KICKED", playerId: targetId });
      }
      break;
    }
    case "HOST_TRANSFER": {
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
    case "HOST_REMATCH": {
      const playerInfo = socketToPlayer.get(ws);
      if (!playerInfo) return;
      const { roomId, playerId } = playerInfo;
      const room = rooms.get(roomId);
      if (!room || room.hostId !== playerId) return;
      room.phase = "LOBBY";
      room.bluffCityState = void 0;
      room.murderMysteryState = void 0;
      room.secretAuctionState = void 0;
      room.postGameSummary = void 0;
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
function handleBluffCityAction(room, playerId, action, data) {
  const state = room.bluffCityState;
  const pState = state.playerStates[playerId];
  if (!pState) return;
  if (action === "MOVE_LOCATION") {
    pState.currentLocation = data.locationId;
    state.recentActions.unshift(`${room.players[playerId].name} visited ${data.locationId.replace("_", " ")}.`);
    if (data.locationId === "BANK") {
      pState.cityCoins += 1500;
      state.cityStability = Math.max(10, state.cityStability - 5);
      room.players[playerId].score += 200;
    } else if (data.locationId === "CITY_HALL") {
      pState.reputation = Math.min(100, pState.reputation + 10);
      state.cityStability = Math.min(100, state.cityStability + 5);
      room.players[playerId].score += 250;
    } else if (data.locationId === "BLACK_MARKET") {
      pState.cityCoins += 3e3;
      state.cityStability = Math.max(5, state.cityStability - 15);
      pState.reputation = Math.max(10, pState.reputation - 15);
      room.players[playerId].score += 350;
    } else if (data.locationId === "NEWS_AGENCY") {
      state.revealedIntel.unshift(
        `Intel Leak: Confidential audit discovered shady transfers from ${room.players[playerId].name}\u2019s accounts.`
      );
      room.players[playerId].score += 300;
    }
  } else if (action === "VOTE_DECREE") {
    if (state.activeDecree) {
      if (data.vote === "YES") {
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
  } else if (action === "MAKE_PACT") {
    const pactText = `${room.players[playerId].name}: "${data.statement}"`;
    pState.publicPacts.push(pactText);
    state.recentActions.unshift(`Public Pact Declared: ${pactText}`);
  } else if (action === "ACCUSE_SUSPECT") {
    pState.hasInvestigated = true;
    const targetPlayer = room.players[data.targetId];
    state.recentActions.unshift(
      `${room.players[playerId].name} officially accused ${targetPlayer ? targetPlayer.name : "someone"} of being the Syndicate Criminal!`
    );
    const targetState = state.playerStates[data.targetId];
    if (targetState && targetState.role === "CRIMINAL") {
      room.players[playerId].score += 2500;
      targetState.reputation = Math.max(0, targetState.reputation - 40);
    } else {
      pState.reputation = Math.max(0, pState.reputation - 20);
    }
  }
}
function handleMurderMysteryAction(room, playerId, action, data) {
  const state = room.murderMysteryState;
  const pState = state.playerStates[playerId];
  if (!pState) return;
  if (action === "MOVE_ROOM") {
    pState.currentRoom = data.roomId;
  } else if (action === "SEARCH_ROOM") {
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
  } else if (action === "MURDERER_SABOTAGE") {
    if (pState.role === "MURDERER" && (pState.murdererActionPoints || 0) > 0) {
      pState.murdererActionPoints = (pState.murdererActionPoints || 1) - 1;
      if (data.sabotageType === "DESTROY_CLUE" && data.evidenceId) {
        delete state.evidenceBoard[data.evidenceId];
        room.eventLogs.unshift({
          id: `evt_${Date.now()}`,
          type: "SABOTAGE",
          description: `\u26A0\uFE0F Alert: A piece of evidence was destroyed or tampered with in ${pState.currentRoom}!`,
          timestamp: Date.now()
        });
      } else if (data.sabotageType === "BLOCK_DOOR" && data.roomId) {
        if (!state.escapePath?.blockedRooms.includes(data.roomId)) {
          state.escapePath?.blockedRooms.push(data.roomId);
        }
      }
    }
  } else if (action === "SUBMIT_ACCUSATION") {
    pState.hasAccused = true;
    pState.accusation = {
      suspectId: data.suspectId,
      evidenceId: data.evidenceId,
      confidence: data.confidence,
      reasoning: data.reasoning
    };
    const suspectState = state.playerStates[data.suspectId];
    const isCorrect = suspectState?.role === "MURDERER";
    if (isCorrect) {
      room.players[playerId].score += Math.round(3e3 * (data.confidence / 100));
    }
  } else if (action === "ESCAPE_MOVE") {
    if (pState.role === "MURDERER" && state.escapePath) {
      state.escapePath.currentRoom = data.targetRoom;
      if (state.escapePath.currentRoom === state.escapePath.targetExit) {
        state.murdererEscaped = true;
        finishGame(room, "MURDER_MYSTERY");
      }
    }
  }
}
function handleSecretAuctionAction(room, playerId, action, data) {
  const state = room.secretAuctionState;
  const pState = state.playerStates[playerId];
  if (!pState) return;
  if (action === "PLACE_BID") {
    const amount = Number(data.amount);
    const minBid = (state.currentHighBid?.amount || state.currentLot?.estimatedMin || 1e4) + 1e3;
    if (amount >= minBid && pState.cash >= amount) {
      const bid = {
        bidderId: playerId,
        bidderName: room.players[playerId].name,
        amount,
        timestamp: Date.now()
      };
      state.currentHighBid = bid;
      state.bidHistory.unshift(bid);
      const remainingTime = state.serverEndTime - Date.now();
      if (remainingTime < 5e3) {
        state.serverEndTime += 5e3;
        state.antiSnipeActive = true;
      }
    }
  } else if (action === "RESEARCH_ASSET") {
    const cost = 5e3;
    if (pState.cash >= cost && !pState.researchedAssetIds.includes(data.assetId)) {
      pState.cash -= cost;
      pState.researchedAssetIds.push(data.assetId);
      room.players[playerId].score += 300;
    }
  } else if (action === "TAKE_LOAN") {
    const loanAmount = 25e3;
    if (pState.debt <= 5e4) {
      pState.debt += loanAmount;
      pState.cash += loanAmount;
    }
  } else if (action === "REPAY_LOAN") {
    const repayAmount = Math.min(25e3, pState.debt);
    if (pState.cash >= repayAmount && repayAmount > 0) {
      pState.cash -= repayAmount;
      pState.debt -= repayAmount;
      room.players[playerId].score += 500;
    }
  }
}
function finishGame(room, gameType) {
  room.phase = "POST_GAME";
  const playersList = Object.values(room.players);
  let winnerIds = [];
  if (gameType === "BLUFF_CITY" && room.bluffCityState) {
    room.bluffCityState.phase = "RESOLUTION";
    const sorted = [...playersList].sort((a, b) => b.score - a.score);
    winnerIds = [sorted[0].id];
  } else if (gameType === "MURDER_MYSTERY" && room.murderMysteryState) {
    room.murderMysteryState.phase = "RESOLUTION";
    const murdererEntry = Object.entries(room.murderMysteryState.playerStates).find(
      ([_, st]) => st.role === "MURDERER"
    );
    const murdererId = murdererEntry ? murdererEntry[0] : "";
    room.murderMysteryState.murdererRevealed = murdererId;
    if (room.murderMysteryState.murdererEscaped) {
      winnerIds = [murdererId];
    } else {
      const correctAccusers = playersList.filter((p) => {
        const acc = room.murderMysteryState.playerStates[p.id]?.accusation;
        return acc && acc.suspectId === murdererId;
      });
      winnerIds = correctAccusers.length > 0 ? correctAccusers.map((p) => p.id) : [murdererId];
    }
  } else if (gameType === "SECRET_AUCTION" && room.secretAuctionState) {
    room.secretAuctionState.phase = "RESOLUTION";
    const scores = playersList.map((p) => {
      const pState = room.secretAuctionState.playerStates[p.id];
      const assetsVal = (pState?.assets || []).reduce((acc, a) => acc + (a.trueValue || a.estimatedMin), 0);
      const netWorth = (pState?.cash || 0) + assetsVal - (pState?.debt || 0);
      return { id: p.id, netWorth };
    });
    scores.sort((a, b) => b.netWorth - a.netWorth);
    winnerIds = [scores[0].id];
  }
  const winnerNames = winnerIds.map((id) => room.players[id]?.name || "Unknown");
  const summary = {
    gameType,
    winnerIds,
    winnerNames,
    durationSeconds: Math.round((Date.now() - (room.eventLogs[room.eventLogs.length - 1]?.timestamp || Date.now())) / 1e3),
    playersSummary: playersList.map((p) => {
      const isWinner = winnerIds.includes(p.id);
      const coinsEarned = isWinner ? 1500 : 500;
      const xpEarned = isWinner ? 1200 : 450;
      recordTransaction(p.id, room.roomCode, coinsEarned, "CREDIT", `Match Reward: ${gameType}`, gameType);
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
          investigation: Math.min(100, Math.max(50, Math.round(78 + Math.random() * 20)))
        },
        unlockedAchievements: isWinner ? ["victory_royale"] : ["first_blood"]
      };
    })
  };
  room.postGameSummary = summary;
  broadcastRoom(room.roomCode, { type: "MATCH_FINISHED", summary });
}
setInterval(() => {
  const now = Date.now();
  for (const [roomId, room] of rooms.entries()) {
    if (room.phase !== "PLAYING" || room.paused) continue;
    if (room.bluffCityState) {
      const state = room.bluffCityState;
      if (now >= state.serverEndTime) {
        if (state.phase === "ACTION") {
          state.phase = "DISCUSSION";
          state.serverStartTime = now;
          state.serverEndTime = now + 45 * 1e3;
        } else if (state.phase === "DISCUSSION") {
          state.phase = "COUNCIL_VOTE";
          state.serverStartTime = now;
          state.serverEndTime = now + 30 * 1e3;
        } else if (state.phase === "COUNCIL_VOTE") {
          if (state.round < state.maxRounds) {
            state.round += 1;
            state.phase = "ACTION";
            state.serverStartTime = now;
            state.serverEndTime = now + 60 * 1e3;
          } else {
            finishGame(room, "BLUFF_CITY");
          }
        }
        broadcastRoom(roomId);
      }
    }
    if (room.murderMysteryState) {
      const state = room.murderMysteryState;
      if (now >= state.serverEndTime) {
        if (state.phase === "EXPLORATION") {
          state.phase = "INTERROGATION";
          state.serverStartTime = now;
          state.serverEndTime = now + 60 * 1e3;
        } else if (state.phase === "INTERROGATION") {
          state.phase = "ACCUSATION";
          state.serverStartTime = now;
          state.serverEndTime = now + 45 * 1e3;
        } else if (state.phase === "ACCUSATION") {
          state.phase = "ESCAPE";
          state.serverStartTime = now;
          state.serverEndTime = now + 90 * 1e3;
          state.escapeCountdown = 90;
        } else if (state.phase === "ESCAPE") {
          finishGame(room, "MURDER_MYSTERY");
        }
        broadcastRoom(roomId);
      }
    }
    if (room.secretAuctionState) {
      const state = room.secretAuctionState;
      if (now >= state.serverEndTime) {
        if (state.phase === "BIDDING") {
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
          state.phase = "MARKET_EVENT";
          state.serverStartTime = now;
          state.serverEndTime = now + 20 * 1e3;
        } else if (state.phase === "MARKET_EVENT") {
          state.phase = "RESEARCH_AND_TRADE";
          state.serverStartTime = now;
          state.serverEndTime = now + 35 * 1e3;
        } else if (state.phase === "RESEARCH_AND_TRADE") {
          if (state.round < state.maxRounds && state.availableAssets.length > 0) {
            state.round += 1;
            state.phase = "BIDDING";
            state.currentLot = state.availableAssets.shift();
            state.currentHighBid = void 0;
            state.bidHistory = [];
            state.antiSnipeActive = false;
            state.serverStartTime = now;
            state.serverEndTime = now + 40 * 1e3;
          } else {
            finishGame(room, "SECRET_AUCTION");
          }
        }
        broadcastRoom(roomId);
      }
    }
  }
}, 1e3);
var PORT = 3e3;
async function startServer() {
  if (process.env.NODE_ENV === "production") {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  } else {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  }
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[Social Wars] Real-time game server running on port ${PORT}`);
  });
}
startServer();
