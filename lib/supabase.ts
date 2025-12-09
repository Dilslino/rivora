import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database Types
export interface DbUser {
  id: string;
  fid: number;
  username: string;
  display_name: string;
  avatar: string;
  wallet_address: string;
  total_spent: number;
  total_earned: number;
  games_played: number;
  games_won: number;
  created_at: string;
  updated_at: string;
}

export interface DbRoom {
  id: string;
  name: string;
  host_id: string;
  token_type: string;
  token_symbol: string;
  token_address: string | null;
  token_decimals: number;
  reward_amount: string;
  reward_amount_wei: string;
  reward_usd_value: number;
  reward_wallet_address: string;
  status: string;
  cast_hash: string | null;
  cast_url: string | null;
  duration_minutes: number;
  min_participants: number;
  platform_fee_percent: number;
  scheduled_start_at: string;
  started_at: string | null;
  ended_at: string | null;
  winner_id: string | null;
  reward_claimed: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbParticipant {
  id: string;
  room_id: string;
  user_id: string;
  is_alive: boolean;
  eliminated_at: string | null;
  eliminated_by: string | null;
  revived_count: number;
  joined_at: string;
}

export interface DbBattleEvent {
  id: string;
  room_id: string;
  round: number;
  type: string;
  message: string;
  narrative: string | null;
  involved_player_ids: string[];
  created_at: string;
}

export interface DbChatMessage {
  id: string;
  room_id: string;
  user_id: string;
  message: string;
  created_at: string;
}

export interface DbTransaction {
  id: string;
  type: string;
  user_id: string;
  room_id: string | null;
  amount: string;
  token_symbol: string;
  token_address: string | null;
  tx_hash: string;
  status: string;
  created_at: string;
}
