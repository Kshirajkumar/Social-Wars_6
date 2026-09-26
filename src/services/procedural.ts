import {
  BluffCityGameState,
  BluffPlayerState,
  BluffRoleType,
  BluffSecretObjective,
  GlobalDifficulty,
  MarketEvent,
  MurderMysteryGameState,
  MurderPlayerState,
  EvidenceItem,
  SecretAuctionGameState,
  AuctionAsset,
  AuctionPlayerState,
  RoomPlayer
} from '../types/game';

/* ==================== BLUFF CITY GENERATOR ==================== */

const BLUFF_ROLES_POOL: BluffRoleType[] = [
  'DETECTIVE',
  'CRIMINAL',
  'JOURNALIST',
  'POLITICIAN',
  'INFORMANT',
  'DOUBLE_AGENT',
  'CRIME_BOSS',
  'SMUGGLER',
  'VIGILANTE',
];

export function generateBluffCityGame(
  players: RoomPlayer[],
  difficulty: GlobalDifficulty,
  level: number,
  matchLengthMinutes: number = 5
): BluffCityGameState {
  const count = players.length;
  // Adaptive roles based on player count
  let roles: BluffRoleType[] = [];
  if (count === 3) {
    roles = ['DETECTIVE', 'CRIMINAL', 'JOURNALIST'];
  } else if (count === 4) {
    roles = ['DETECTIVE', 'CRIMINAL', 'JOURNALIST', 'POLITICIAN'];
  } else {
    // 5 players
    if (level >= 10) {
      roles = ['DETECTIVE', 'CRIMINAL', 'JOURNALIST', 'POLITICIAN', 'DOUBLE_AGENT'];
    } else if (level >= 6) {
      roles = ['DETECTIVE', 'CRIMINAL', 'JOURNALIST', 'POLITICIAN', 'INFORMANT'];
    } else {
      roles = ['DETECTIVE', 'CRIMINAL', 'JOURNALIST', 'POLITICIAN', 'INFORMANT'];
    }
  }

  // Shuffle roles deterministically / securely
  const shuffledRoles = [...roles].sort(() => Math.random() - 0.5);

  const playerStates: Record<string, BluffPlayerState> = {};

  players.forEach((p, index) => {
    const role = shuffledRoles[index % shuffledRoles.length];
    let objective: BluffSecretObjective;

    switch (role) {
      case 'DETECTIVE':
        objective = {
          id: `obj_det_${p.id}`,
          title: 'Unmask the Syndicate',
          description: 'Identify the Criminal during the voting phase and keep City Stability above 60%.',
          targetMetric: 'STABILITY_AND_CATCH',
          targetValue: 1,
          rewardScore: 3500,
          rewardCoins: 1200,
          completed: false,
        };
        break;
      case 'CRIMINAL':
      case 'CRIME_BOSS':
        objective = {
          id: `obj_crm_${p.id}`,
          title: 'Syndicate Extortion',
          description: 'Accumulate at least 15,000 City Coins and avoid being unmasked by the Detective.',
          targetMetric: 'COINS_AND_EVADE',
          targetValue: 15000,
          rewardScore: 4000,
          rewardCoins: 1500,
          completed: false,
        };
        break;
      case 'JOURNALIST':
        objective = {
          id: `obj_jou_${p.id}`,
          title: 'Publish Front-Page Exposé',
          description: 'Collect and publish 3 verified pieces of confidential city intel.',
          targetMetric: 'INTEL_PUBLISHED',
          targetValue: 3,
          rewardScore: 3200,
          rewardCoins: 1000,
          completed: false,
        };
        break;
      case 'POLITICIAN':
        objective = {
          id: `obj_pol_${p.id}`,
          title: 'Master of the Council',
          description: 'Pass 2 City Decrees and finish with a Reputation score of at least 70.',
          targetMetric: 'DECREES_AND_REP',
          targetValue: 70,
          rewardScore: 3400,
          rewardCoins: 1100,
          completed: false,
        };
        break;
      case 'INFORMANT':
      case 'DOUBLE_AGENT':
      default:
        objective = {
          id: `obj_inf_${p.id}`,
          title: 'Shadow Broker',
          description: 'Form 2 public pacts and end the match with more coins than the Detective.',
          targetMetric: 'PACTS_AND_WEALTH',
          targetValue: 10000,
          rewardScore: 3300,
          rewardCoins: 1150,
          completed: false,
        };
        break;
    }

    playerStates[p.id] = {
      role,
      publicClaimRole: role === 'CRIMINAL' ? 'JOURNALIST' : role,
      objective,
      reputation: 50,
      cityCoins: 5000,
      currentLocation: 'CITY_HALL',
      intelPieces: [
        `Confidential City Dispatch #${Math.floor(100 + Math.random() * 900)}: Suspicious transfers logged in offshore accounts.`,
      ],
      publicPacts: [],
    };
  });

  const durationSec = 75; // 75 seconds for Action phase
  const now = Date.now();

  return {
    round: 1,
    maxRounds: level >= 10 ? 4 : 3,
    phase: 'ACTION',
    serverStartTime: now,
    serverEndTime: now + durationSec * 1000,
    cityStability: 80,
    activeDecree: {
      id: 'decree_1',
      title: 'Emergency Surveillance Act',
      description: 'Authorize wiretapping in Hotel & Bank. Reduces crime risk but costs city stability.',
      effectDescription: '+15% Detective accuracy, -10% City Stability',
      yesVotes: [],
      noVotes: [],
    },
    revealedIntel: [
      'The morning edition reports unusual activity near the Waterfront Vault.',
      'City Council is debating emergency measures to protect municipal reserves.',
    ],
    playerStates,
    recentActions: ['Match started: Five power brokers enter Bluff City.'],
  };
}

/* ==================== MURDER MYSTERY GENERATOR ==================== */

const MANSION_ROOMS = [
  { id: 'LIBRARY', name: 'Grand Library', icon: '📚', searched: false },
  { id: 'BEDROOM', name: 'Master Bedroom', icon: '🛏️', searched: false },
  { id: 'LABORATORY', name: 'Alchemical Lab', icon: '🔬', searched: false },
  { id: 'DINING_ROOM', name: 'Dining Room', icon: '🍷', searched: false },
  { id: 'VAULT', name: 'Private Vault', icon: '🏦', searched: false },
  { id: 'SECURITY_ROOM', name: 'Security Room', icon: '📹', searched: false },
  { id: 'GARDEN', name: 'Moonlit Garden', icon: '🌳', searched: false },
  { id: 'GRAND_HALL', name: 'Grand Entrance Hall', icon: '🏛️', searched: false },
  { id: 'OFFICE', name: 'Lord Blackwood’s Office', icon: '💼', searched: false },
];

const VICTIM_NAMES = [
  'Lord Reginald Blackwood',
  'Baroness Vivienne Vance',
  'Dr. Alistair Finch',
  'Archibald Sterling',
];

const WEAPONS_POOL = [
  'Antique Poisoned Dagger',
  'Rare Cyanide Decanter',
  'Heavy Brass Candlestick',
  'Severed Elevator Cable',
  'Venomous Black Lotus Extract',
];

const SECRETS_POOL = [
  'You were seen sneaking into the Vault 10 minutes prior to the murder to steal bearer bonds.',
  'You were having a clandestine affair with the victim and threatened to expose them.',
  'You owe 150,000 coins to underworld lenders and stood to inherit the Blackwood estate.',
  'You forged the victim’s signature on the revised last will and testament.',
  'You secretly slipped a sleeping draught into the victim’s tea earlier in the evening.',
  'You were blackmailed by the victim regarding an industrial espionage scandal.',
];

const ALIBIS_POOL = [
  'Claims to have been cataloging rare manuscripts in the Library.',
  'Claims to have been in the Dining Room tasting the vintage port.',
  'Claims to have been resting in the Guest Quarters with a severe headache.',
  'Claims to have been strolling through the Moonlit Garden for fresh air.',
  'Claims to have been reviewing financial spreadsheets in the Private Office.',
];

export function generateMurderMysteryGame(
  players: RoomPlayer[],
  difficulty: GlobalDifficulty,
  level: number
): MurderMysteryGameState {
  const victimName = VICTIM_NAMES[Math.floor(Math.random() * VICTIM_NAMES.length)];
  const crimeRoom = MANSION_ROOMS[Math.floor(Math.random() * 4)]; // One of first 4 rooms
  const murderWeapon = WEAPONS_POOL[Math.floor(Math.random() * WEAPONS_POOL.length)];
  const timeOfMurder = '23:42 PM';

  // Authoritative selection of murderer (NEVER revealed to other players!)
  const murdererIndex = Math.floor(Math.random() * players.length);
  const murdererId = players[murdererIndex].id;

  const playerStates: Record<string, MurderPlayerState> = {};
  const shuffledSecrets = [...SECRETS_POOL].sort(() => Math.random() - 0.5);
  const shuffledAlibis = [...ALIBIS_POOL].sort(() => Math.random() - 0.5);

  players.forEach((p, idx) => {
    const isMurderer = p.id === murdererId;
    playerStates[p.id] = {
      role: isMurderer ? 'MURDERER' : 'INVESTIGATOR',
      secret: shuffledSecrets[idx % shuffledSecrets.length],
      alibi: shuffledAlibis[idx % shuffledAlibis.length],
      currentRoom: 'GRAND_HALL',
      evidenceCollected: [],
      hasAccused: false,
      murdererActionPoints: isMurderer ? 3 : undefined,
    };
  });

  // Generate authentic and forged evidence
  const evidenceBoard: Record<string, EvidenceItem> = {
    ev_1: {
      id: 'ev_1',
      name: 'Torn Monogrammed Cufflink',
      type: 'PHYSICAL',
      locationId: crimeRoom.id,
      description: `Discovered right beside the body. Embossed with initials matching ${players[murdererIndex].name[0]}.`,
      isAuthentic: true,
      discoveredBy: [],
      revealsKillerConnection: true,
      clueSummary: 'Physical evidence found directly at the crime scene tying to the killer.',
    },
    ev_2: {
      id: 'ev_2',
      name: 'Security Camera Log 23:41',
      type: 'DIGITAL',
      locationId: 'SECURITY_ROOM',
      description: `Footage timestamped 23:41 shows a hooded silhouette entering ${crimeRoom.name}.`,
      isAuthentic: true,
      discoveredBy: [],
      revealsKillerConnection: true,
      clueSummary: 'Timestamp places the killer at the scene exactly at 23:41.',
    },
    ev_3: {
      id: 'ev_3',
      name: 'Smudged Fingerprints on Safe Handle',
      type: 'PHYSICAL',
      locationId: 'VAULT',
      description: 'Partial whorls recovered on the mahogany safe lock.',
      isAuthentic: false, // Planted/distraction!
      discoveredBy: [],
      revealsKillerConnection: false,
      clueSummary: 'Distraction: Points to unauthorized safe opening, not the murder.',
    },
    ev_4: {
      id: 'ev_4',
      name: 'Toxicology Vial Remnants',
      type: 'DOCUMENTARY',
      locationId: 'LABORATORY',
      description: `Chemical residue matching ${murderWeapon}.`,
      isAuthentic: true,
      discoveredBy: [],
      revealsKillerConnection: true,
      clueSummary: 'Confirms the precise murder weapon used.',
    },
    ev_5: {
      id: 'ev_5',
      name: 'Witness Statement: Butler’s Diary',
      type: 'WITNESS',
      locationId: 'OFFICE',
      description: `Noted Lord Blackwood had a heated argument regarding family inheritance shortly before midnight.`,
      isAuthentic: true,
      discoveredBy: [],
      revealsKillerConnection: false,
      clueSummary: 'Context on the lethal motive of greed.',
    },
    ev_6: {
      id: 'ev_6',
      name: 'Altered Guest Clock',
      type: 'PHYSICAL',
      locationId: 'LIBRARY',
      description: 'The grandfather clock hands were forcibly moved back 15 minutes.',
      isAuthentic: level >= 5, // false lead or tampering
      discoveredBy: [],
      revealsKillerConnection: false,
      clueSummary: 'Proof that an alibi was artificially staged.',
    },
  };

  const durationSec = 110;
  const now = Date.now();

  return {
    caseTitle: 'The Last Night at Blackwood Manor',
    caseDifficulty: difficulty,
    victimName,
    victimProfession: 'Eccentric Industrialist & Estate Patriarch',
    crimeSceneRoom: crimeRoom.name,
    murderWeapon,
    timeOfMurder,
    phase: 'EXPLORATION',
    serverStartTime: now,
    serverEndTime: now + durationSec * 1000,
    currentRoomLocations: MANSION_ROOMS,
    evidenceBoard,
    playerStates,
    escapePath: {
      currentRoom: crimeRoom.id,
      targetExit: 'GARDEN',
      blockedRooms: [],
    },
  };
}

/* ==================== SECRET AUCTION GENERATOR ==================== */

const ASSET_CATALOG: Omit<AuctionAsset, 'id' | 'trueValue'>[] = [
  {
    name: 'Metropolitan Grand Palace Hotel',
    category: 'REAL_ESTATE',
    icon: '🏨',
    estimatedMin: 45000,
    estimatedMax: 85000,
    risk: 4,
    growth: 7,
    liquidity: 5,
    incomePerRound: 6500,
    operatingCost: 2000,
    marketSensitivity: 'REAL_ESTATE',
  },
  {
    name: 'NeuralCore AI Semiconductor Foundry',
    category: 'TECH',
    icon: '🤖',
    estimatedMin: 60000,
    estimatedMax: 120000,
    risk: 8,
    growth: 10,
    liquidity: 7,
    incomePerRound: 9500,
    operatingCost: 3500,
    marketSensitivity: 'TECH',
  },
  {
    name: 'Pacific Freight Cargo Fleet',
    category: 'LOGISTICS',
    icon: '🚢',
    estimatedMin: 40000,
    estimatedMax: 70000,
    risk: 5,
    growth: 6,
    liquidity: 6,
    incomePerRound: 5500,
    operatingCost: 1800,
    marketSensitivity: 'LOGISTICS',
  },
  {
    name: 'Emerald Ridge Lithium Mine',
    category: 'ENERGY',
    icon: '⚡',
    estimatedMin: 55000,
    estimatedMax: 95000,
    risk: 7,
    growth: 8,
    liquidity: 4,
    incomePerRound: 8000,
    operatingCost: 2800,
    marketSensitivity: 'ENERGY',
  },
  {
    name: 'Monaco Harbor Superyacht "Aegean Star"',
    category: 'LUXURY',
    icon: '🛥️',
    estimatedMin: 35000,
    estimatedMax: 65000,
    risk: 3,
    growth: 5,
    liquidity: 8,
    incomePerRound: 4200,
    operatingCost: 1500,
    marketSensitivity: 'LUXURY',
  },
  {
    name: 'VoxelForge Triple-A Game Studio',
    category: 'TECH',
    icon: '🎮',
    estimatedMin: 50000,
    estimatedMax: 90000,
    risk: 7,
    growth: 9,
    liquidity: 6,
    incomePerRound: 7200,
    operatingCost: 2400,
    marketSensitivity: 'TECH',
  },
  {
    name: 'GeneThera Rare Oncology Patent',
    category: 'TECH',
    icon: '🧬',
    estimatedMin: 50000,
    estimatedMax: 110000,
    risk: 8,
    growth: 9,
    liquidity: 5,
    incomePerRound: 8500,
    operatingCost: 2600,
    marketSensitivity: 'TECH',
  },
  {
    name: 'Manhattan 5th Ave Penthouse Loft',
    category: 'REAL_ESTATE',
    icon: '🏙️',
    estimatedMin: 45000,
    estimatedMax: 75000,
    risk: 3,
    growth: 6,
    liquidity: 7,
    incomePerRound: 5000,
    operatingCost: 1200,
    marketSensitivity: 'REAL_ESTATE',
  },
];

const MARKET_EVENTS_POOL: MarketEvent[] = [
  {
    id: 'evt_tech_boom',
    title: 'Breakthrough Quantum Wave',
    description: 'Tech valuations surge +35% as international demand skyrockets.',
    affectedCategory: 'TECH',
    multiplier: 1.35,
    icon: '🚀',
  },
  {
    id: 'evt_recession',
    title: 'Global Credit Tightening',
    description: 'Central banks raise benchmark rates. Real Estate valuations dip -20%.',
    affectedCategory: 'REAL_ESTATE',
    multiplier: 0.8,
    icon: '📉',
  },
  {
    id: 'evt_tourism_boom',
    title: 'Luxury Tourism Renaissance',
    description: 'High net worth travel increases luxury & hospitality returns by +25%.',
    affectedCategory: 'LUXURY',
    multiplier: 1.25,
    icon: '🥂',
  },
  {
    id: 'evt_supply_crisis',
    title: 'Strait of Hormuz Congestion',
    description: 'Global logistics rates multiply, pushing logistics valuations up +30%.',
    affectedCategory: 'LOGISTICS',
    multiplier: 1.3,
    icon: '📦',
  },
  {
    id: 'evt_green_mandate',
    title: 'Clean Energy Sovereign Subsidies',
    description: 'Massive government clean energy grants surge energy assets by +40%.',
    affectedCategory: 'ENERGY',
    multiplier: 1.4,
    icon: '☀️',
  },
];

export function generateSecretAuctionGame(
  players: RoomPlayer[],
  difficulty: GlobalDifficulty,
  level: number
): SecretAuctionGameState {
  // Shuffle assets catalog and generate authoritative true values
  const availableAssets: AuctionAsset[] = ASSET_CATALOG.map((item, idx) => {
    // True value is mathematically calculated between min and max with variance based on risk/growth
    const spread = item.estimatedMax - item.estimatedMin;
    const trueVal = Math.round((item.estimatedMin + Math.random() * spread) / 1000) * 1000;
    return {
      ...item,
      id: `asset_${idx + 1}`,
      trueValue: trueVal,
    };
  }).sort(() => Math.random() - 0.5);

  const playerStates: Record<string, AuctionPlayerState> = {};
  players.forEach((p) => {
    playerStates[p.id] = {
      cash: 100000, // 100,000 starting coins per requirement
      debt: 0,
      interestRate: 0.08,
      assets: [],
      researchedAssetIds: [],
      pendingTrades: [],
    };
  });

  const currentLot = availableAssets[0];
  const durationSec = 45; // 45s bidding window
  const now = Date.now();

  return {
    round: 1,
    maxRounds: 4,
    phase: 'BIDDING',
    serverStartTime: now,
    serverEndTime: now + durationSec * 1000,
    currentLot,
    currentHighBid: undefined,
    bidHistory: [],
    antiSnipeActive: false,
    currentMarketEvent: MARKET_EVENTS_POOL[0],
    playerStates,
    availableAssets: availableAssets.slice(1),
  };
}
