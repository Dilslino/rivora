// ============================================
// RIVORA TYPES - Complete Type Definitions
// ============================================

// Game Phases
export enum GamePhase {
  HOME = 'HOME',
  CREATE_ROOM = 'CREATE_ROOM',
  ROOM_LOBBY = 'ROOM_LOBBY',
  BATTLE = 'BATTLE',
  WINNER = 'WINNER',
  PROFILE = 'PROFILE',
  LEADERBOARD = 'LEADERBOARD'
}

// Token Types for Rewards
export type TokenType = 'ETH' | 'USDC' | 'CUSTOM';

export interface Token {
  type: TokenType;
  symbol: string;
  address: string | null; // null for native ETH
  decimals: number;
  logoUrl?: string;
}

// Reward Configuration
export interface RewardConfig {
  token: Token;
  amount: string; // in token units (e.g., "15" for 15 USDC)
  amountWei: string; // in wei/smallest unit
  usdValue: number;
}

// User/Player
export interface User {
  id: string;
  fid: number; // Farcaster ID
  username: string;
  displayName: string;
  avatar: string;
  walletAddress: string;
  createdAt: number;
}

export interface Player extends User {
  isAlive: boolean;
  eliminatedAt?: number;
  eliminatedBy?: string;
  revivedCount: number;
  statusEffect?: 'REVIVED' | 'SHIELDED' | 'MARKED';
  joinTime: number;
}

// Room Status
export type RoomStatus = 'WAITING' | 'STARTING' | 'ACTIVE' | 'FINISHED' | 'CANCELLED';

// Room Configuration
export interface Room {
  id: string;
  name: string;
  host: User;
  reward: RewardConfig;
  rewardWalletAddress: string; // contract/escrow wallet holding reward
  status: RoomStatus;
  castHash?: string; // Farcaster cast hash for join verification
  castUrl?: string;
  
  // Timing
  createdAt: number;
  scheduledStartAt: number; // when game will start
  startedAt?: number;
  endedAt?: number;
  duration: number; // in minutes (10-60)
  
  // Participants
  participants: Player[];
  minParticipants: number; // default 2
  
  // Winner
  winner?: Player;
  rewardClaimed: boolean;
  
  // Fee info
  platformFeePercent: number; // e.g., 5 for 5%
}

// Battle Events
export type BattleEventType = 'ELIMINATION' | 'REVIVE' | 'ROUND_START' | 'ROUND_END' | 'WINNER' | 'SYSTEM';

export interface BattleEvent {
  id: string;
  roomId: string;
  timestamp: number;
  round: number;
  type: BattleEventType;
  message: string;
  involvedPlayerIds: string[];
  narrative?: string; // AI-generated dramatic narrative
}

// Round Info
export interface RoundInfo {
  number: number;
  startedAt: number;
  endedAt?: number;
  eliminatedCount: number;
  revivedCount: number;
  survivorCount: number;
}

// Chat Message
export interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  username: string;
  avatar: string;
  message: string;
  timestamp: number;
}

// Leaderboard Entry
export interface LeaderboardEntry {
  rank: number;
  user: User;
  value: number; // amount spent or earned
  gamesPlayed: number;
  gamesWon: number;
}

// User Stats
export interface UserStats {
  totalGamesPlayed: number;
  totalWins: number;
  totalEarned: number; // in USD
  totalSpent: number; // in USD
  winRate: number;
  longestSurvival: number; // rounds
  timesRevived: number;
  lastPlayed?: number;
}

// Transaction Types
export type TransactionType = 'DEPOSIT' | 'WITHDRAW' | 'CLAIM' | 'FEE';

export interface Transaction {
  id: string;
  type: TransactionType;
  userId: string;
  roomId?: string;
  amount: string;
  token: Token;
  txHash: string;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
  timestamp: number;
}

// Neynar Types
export interface NeynarUser {
  fid: number;
  username: string;
  display_name: string;
  pfp_url: string;
  custody_address: string;
  verifications: string[];
}

export interface CastEngagement {
  hasLiked: boolean;
  hasRecasted: boolean;
  fid: number;
}

// Wallet State
export interface WalletState {
  isConnected: boolean;
  address: string | null;
  chainId: number | null;
  balance: string;
  tokens: TokenBalance[];
}

export interface TokenBalance {
  token: Token;
  balance: string;
  balanceFormatted: string;
}

// App State
export interface AppState {
  phase: GamePhase;
  currentUser: User | null;
  currentRoom: Room | null;
  rooms: Room[];
  wallet: WalletState;
  isLoading: boolean;
  error: string | null;
}

// Constants
export const PLATFORM_FEE_PERCENT = 5; // 5% platform fee
export const WITHDRAW_FEE_PERCENT = 2; // 2% withdraw fee
export const MIN_PARTICIPANTS = 2;
export const MIN_DURATION_MINUTES = 10;
export const MAX_DURATION_MINUTES = 60;
export const MIN_ROUND_DELAY_MS = 60000; // 1 minute minimum between rounds
export const MAX_ROUND_DELAY_MS = 180000; // 3 minutes maximum between rounds

// Base Network Config
export const BASE_CHAIN_ID = 8453;
export const BASE_USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

// Default Tokens
export const DEFAULT_TOKENS: Token[] = [
  {
    type: 'ETH',
    symbol: 'ETH',
    address: null,
    decimals: 18,
    logoUrl: 'https://cryptologos.cc/logos/ethereum-eth-logo.png'
  },
  {
    type: 'USDC',
    symbol: 'USDC',
    address: BASE_USDC_ADDRESS,
    decimals: 6,
    logoUrl: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png'
  }
];
