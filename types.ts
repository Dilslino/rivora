export enum GamePhase {
  LOBBY = 'LOBBY',
  JOINING = 'JOINING',
  BATTLE = 'BATTLE',
  WINNER = 'WINNER',
  PROFILE = 'PROFILE'
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  isAlive: boolean;
  kills: number;
  xp: number;
  statusEffect?: string;
  joinTime: number;
}

export interface BattleEvent {
  id: string;
  timestamp: number;
  type: 'ELIMINATION' | 'EVENT' | 'REVIVE';
  message: string;
  involvedPlayerIds: string[]; // [aggressor, victim] or just [victim]
}

export interface ArenaSettings {
  name: string;
  prize?: string;
  maxPlayers: number;
  theme: 'CYBER' | 'WASTELAND' | 'VOID';
}

export interface AppState {
  phase: GamePhase;
  players: Player[];
  events: BattleEvent[];
  settings: ArenaSettings;
  winner: Player | null;
  currentUser: Player | null; // Simulating the local user
}