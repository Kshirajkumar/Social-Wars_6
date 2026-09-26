export type GameType = 'BLUFF_CITY' | 'MURDER_MYSTERY' | 'SECRET_AUCTION';

export type GlobalDifficulty = 'BEGINNER' | 'EASY' | 'INTERMEDIATE' | 'HARD' | 'MASTER';

export interface PlayerProfile {
  id: string;
  name: string;
  avatar: string;
  title: string;
  badgeFrame?: string;
  coins: number;
  xp: number;
  level: number;
  matchesPlayed: number;
  matchesWon: number;
  achievements: string[];
}

export interface RoomPlayer {
  id: string;
  name: string;
  avatar: string;
  title?: string;
  badgeFrame?: string;
  isHost: boolean;
  isReady: boolean;
  isConnected: boolean;
  score: number;
  sessionToken: string;
  lastActive: number;
  hintsUsed: number;
  // Game-specific sanitized state
  gameData?: any;
}

export interface WalletTransaction {
  transaction_id: string;
  player_id: string;
  room_id: string;
  game_id?: string;
  amount: number;
  type: 'CREDIT' | 'DEBIT';
  reason: string;
  timestamp: number;
  balance_after: number;
}

export interface HintTier {
  tier: 1 | 2 | 3 | 4 | 5;
  name: string;
  description: string;
  cost: number;
  scorePenalty: number;
}

export const HINT_TIERS: HintTier[] = [
  { tier: 1, name: 'Nudge', description: 'A subtle push in the right direction.', cost: 100, scorePenalty: 100 },
  { tier: 2, name: 'Direction', description: 'Eliminates one false option.', cost: 250, scorePenalty: 250 },
  { tier: 3, name: 'Strong Hint', description: 'Reveals a key piece of information.', cost: 500, scorePenalty: 500 },
  { tier: 4, name: 'Major Hint', description: 'Significantly clarifies the situation.', cost: 1000, scorePenalty: 1000 },
  { tier: 5, name: 'Emergency Hint', description: 'Practically solves this step of the puzzle.', cost: 2000, scorePenalty: 2000 },
];

export interface RoomSettings {
  selectedGame: GameType;
  difficulty: GlobalDifficulty;
  level: number; // 1 to 20
  matchLengthMinutes: number;
  hintsEnabled: boolean;
  privateMessagingEnabled: boolean;
  progressiveMode: boolean;
}

export type RoomPhase = 'LOBBY' | 'PLAYING' | 'POST_GAME';

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  recipientId?: string; // undefined = public, string = whisper
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface GameEventLog {
  id: string;
  type: string;
  description: string;
  timestamp: number;
  playerId?: string;
}

/* ==================== BLUFF CITY TYPES ==================== */
export type BluffRoleType =
  | 'DETECTIVE'
  | 'CRIMINAL'
  | 'JOURNALIST'
  | 'POLITICIAN'
  | 'INFORMANT'
  | 'CRIME_BOSS'
  | 'SMUGGLER'
  | 'DOUBLE_AGENT'
  | 'VIGILANTE';

export type BluffLocationId =
  | 'BANK'
  | 'CITY_HALL'
  | 'NEWS_AGENCY'
  | 'HOTEL'
  | 'MARKET'
  | 'BLACK_MARKET'
  | 'ESTATE'
  | 'PRECINCT';

export interface BluffLocation {
  id: BluffLocationId;
  name: string;
  icon: string;
  description: string;
  actionName: string;
  actionCost: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface BluffSecretObjective {
  id: string;
  title: string;
  description: string;
  targetMetric: string;
  targetValue: number;
  rewardScore: number;
  rewardCoins: number;
  completed: boolean;
}

export interface BluffPlayerState {
  role?: BluffRoleType; // Hidden from others!
  publicClaimRole?: BluffRoleType;
  objective?: BluffSecretObjective; // Hidden from others!
  reputation: number; // 0 - 100
  cityCoins: number;
  currentLocation: BluffLocationId;
  intelPieces: string[];
  publicPacts: string[];
  votesCast?: string;
  hasInvestigated?: boolean;
}

export interface BluffCityGameState {
  round: number;
  maxRounds: number;
  phase: 'PREPARATION' | 'ACTION' | 'DISCUSSION' | 'COUNCIL_VOTE' | 'RESOLUTION';
  serverStartTime: number;
  serverEndTime: number;
  cityStability: number; // 0 - 100
  activeDecree?: {
    id: string;
    title: string;
    description: string;
    effectDescription: string;
    yesVotes: string[];
    noVotes: string[];
  };
  revealedIntel: string[];
  playerStates: Record<string, BluffPlayerState>;
  recentActions: string[];
}

/* ==================== MURDER MYSTERY TYPES ==================== */
export type EvidenceType = 'PHYSICAL' | 'DIGITAL' | 'DOCUMENTARY' | 'WITNESS';

export interface EvidenceItem {
  id: string;
  name: string;
  type: EvidenceType;
  locationId: string;
  description: string;
  isAuthentic: boolean; // Server secret!
  discoveredBy: string[]; // player IDs
  revealsKillerConnection: boolean; // Server secret!
  clueSummary: string;
}

export interface MurderPlayerState {
  role?: 'MURDERER' | 'INVESTIGATOR'; // Hidden from others!
  secret: string; // Personal dark secret (e.g. "You stole jewelry earlier")
  alibi: string; // Public alibi
  currentRoom: string;
  evidenceCollected: string[];
  hasAccused: boolean;
  accusation?: {
    suspectId: string;
    evidenceId: string;
    confidence: number;
    reasoning: string;
  };
  murdererActionPoints?: number; // Only for murderer
  isTrappedInEscape?: boolean;
}

export interface MurderMysteryGameState {
  caseTitle: string;
  caseDifficulty: GlobalDifficulty;
  victimName: string;
  victimProfession: string;
  crimeSceneRoom: string;
  murderWeapon: string;
  timeOfMurder: string;
  phase: 'EXPLORATION' | 'INTERROGATION' | 'ACCUSATION' | 'ESCAPE' | 'RESOLUTION';
  serverStartTime: number;
  serverEndTime: number;
  currentRoomLocations: { id: string; name: string; icon: string; searched: boolean }[];
  evidenceBoard: Record<string, EvidenceItem>;
  playerStates: Record<string, MurderPlayerState>;
  murdererEscaped?: boolean;
  escapeCountdown?: number;
  escapePath?: { currentRoom: string; targetExit: string; blockedRooms: string[] };
  murdererRevealed?: string; // At resolution
}

/* ==================== SECRET AUCTION TYPES ==================== */
export interface AuctionAsset {
  id: string;
  name: string;
  category: 'TECH' | 'REAL_ESTATE' | 'LUXURY' | 'LOGISTICS' | 'ENERGY';
  icon: string;
  estimatedMin: number;
  estimatedMax: number;
  trueValue?: number; // Hidden from clients unless researched!
  risk: number; // 1-10
  growth: number; // 1-10
  liquidity: number; // 1-10
  incomePerRound: number;
  operatingCost: number;
  marketSensitivity: 'TECH' | 'REAL_ESTATE' | 'LUXURY' | 'LOGISTICS' | 'ENERGY';
  ownerId?: string;
  purchasePrice?: number;
  shares?: { ownerId: string; percentage: number }[];
}

export interface AuctionBid {
  bidderId: string;
  bidderName: string;
  amount: number;
  timestamp: number;
}

export interface MarketEvent {
  id: string;
  title: string;
  description: string;
  affectedCategory: 'TECH' | 'REAL_ESTATE' | 'LUXURY' | 'LOGISTICS' | 'ENERGY' | 'ALL';
  multiplier: number; // e.g. 1.35 or 0.75
  icon: string;
}

export interface TradeOffer {
  id: string;
  senderId: string;
  recipientId: string;
  offeredAssetId?: string;
  offeredCash: number;
  requestedAssetId?: string;
  requestedCash: number;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
}

export interface AuctionPlayerState {
  cash: number;
  debt: number;
  interestRate: number;
  assets: AuctionAsset[];
  researchedAssetIds: string[];
  pendingTrades: TradeOffer[];
}

export interface SecretAuctionGameState {
  round: number;
  maxRounds: number;
  phase: 'BIDDING' | 'MARKET_EVENT' | 'RESEARCH_AND_TRADE' | 'RESOLUTION';
  serverStartTime: number;
  serverEndTime: number;
  currentLot?: AuctionAsset;
  currentHighBid?: AuctionBid;
  bidHistory: AuctionBid[];
  antiSnipeActive: boolean;
  currentMarketEvent?: MarketEvent;
  playerStates: Record<string, AuctionPlayerState>;
  availableAssets: AuctionAsset[];
}

/* ==================== GENERAL GAME CONTAINER ==================== */
export interface RoomState {
  roomCode: string;
  phase: RoomPhase;
  hostId: string;
  settings: RoomSettings;
  players: Record<string, RoomPlayer>;
  playerOrder: string[];
  eventLogs: GameEventLog[];
  paused: boolean;
  seed: number;
  // One of the active game states
  bluffCityState?: BluffCityGameState;
  murderMysteryState?: MurderMysteryGameState;
  secretAuctionState?: SecretAuctionGameState;
  postGameSummary?: PostGameSummary;
}

export interface PostGameSummary {
  gameType: GameType;
  winnerIds: string[];
  winnerNames: string[];
  playersSummary: {
    playerId: string;
    playerName: string;
    avatar: string;
    score: number;
    coinsEarned: number;
    xpEarned: number;
    performance: {
      accuracy: number;
      decisions: number;
      economy: number;
      deception: number;
      investigation: number;
    };
    unlockedAchievements: string[];
    roleTitle?: string;
  }[];
  durationSeconds: number;
}
