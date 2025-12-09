-- ============================================
-- RIVORA DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fid INTEGER NOT NULL DEFAULT 0,
  username VARCHAR(255) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  avatar TEXT,
  wallet_address VARCHAR(42) NOT NULL UNIQUE,
  total_spent DECIMAL(20, 6) DEFAULT 0,
  total_earned DECIMAL(20, 6) DEFAULT 0,
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_wallet ON users(wallet_address);
CREATE INDEX idx_users_fid ON users(fid);

-- ============================================
-- ROOMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  host_id UUID NOT NULL REFERENCES users(id),
  
  -- Token/Reward info
  token_type VARCHAR(20) NOT NULL,
  token_symbol VARCHAR(20) NOT NULL,
  token_address VARCHAR(42),
  token_decimals INTEGER DEFAULT 18,
  reward_amount VARCHAR(78) NOT NULL,
  reward_amount_wei VARCHAR(78) NOT NULL,
  reward_usd_value DECIMAL(20, 2) DEFAULT 0,
  reward_wallet_address VARCHAR(42) NOT NULL,
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'WAITING',
  
  -- Farcaster integration
  cast_hash VARCHAR(255),
  cast_url TEXT,
  
  -- Timing
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  min_participants INTEGER DEFAULT 2,
  platform_fee_percent DECIMAL(5, 2) DEFAULT 5.00,
  scheduled_start_at TIMESTAMPTZ NOT NULL,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  
  -- Winner
  winner_id UUID REFERENCES users(id),
  reward_claimed BOOLEAN DEFAULT FALSE,
  reward_claim_tx VARCHAR(66),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rooms_status ON rooms(status);
CREATE INDEX idx_rooms_host ON rooms(host_id);
CREATE INDEX idx_rooms_created ON rooms(created_at DESC);

-- ============================================
-- PARTICIPANTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  
  is_alive BOOLEAN DEFAULT TRUE,
  eliminated_at TIMESTAMPTZ,
  eliminated_by UUID REFERENCES users(id),
  revived_count INTEGER DEFAULT 0,
  
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(room_id, user_id)
);

CREATE INDEX idx_participants_room ON participants(room_id);
CREATE INDEX idx_participants_user ON participants(user_id);
CREATE INDEX idx_participants_alive ON participants(room_id, is_alive);

-- ============================================
-- BATTLE EVENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS battle_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  
  round INTEGER NOT NULL,
  type VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  narrative TEXT,
  involved_player_ids UUID[] DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_battle_events_room ON battle_events(room_id);
CREATE INDEX idx_battle_events_created ON battle_events(room_id, created_at);

-- ============================================
-- CHAT MESSAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  
  message TEXT NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_room ON chat_messages(room_id);
CREATE INDEX idx_chat_created ON chat_messages(room_id, created_at);

-- ============================================
-- TRANSACTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(20) NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id),
  room_id UUID REFERENCES rooms(id),
  
  amount VARCHAR(78) NOT NULL,
  token_symbol VARCHAR(20) NOT NULL,
  token_address VARCHAR(42),
  
  tx_hash VARCHAR(66) NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_room ON transactions(room_id);
CREATE INDEX idx_transactions_hash ON transactions(tx_hash);

-- ============================================
-- REALTIME SUBSCRIPTIONS
-- Enable realtime for required tables
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE participants;
ALTER PUBLICATION supabase_realtime ADD TABLE battle_events;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE battle_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Users: Anyone can read, users can update their own
CREATE POLICY "Users are viewable by everyone" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own record" ON users FOR UPDATE USING (true);
CREATE POLICY "Anyone can insert users" ON users FOR INSERT WITH CHECK (true);

-- Rooms: Anyone can read and create
CREATE POLICY "Rooms are viewable by everyone" ON rooms FOR SELECT USING (true);
CREATE POLICY "Anyone can create rooms" ON rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update rooms" ON rooms FOR UPDATE USING (true);

-- Participants: Anyone can read and join
CREATE POLICY "Participants are viewable by everyone" ON participants FOR SELECT USING (true);
CREATE POLICY "Anyone can join rooms" ON participants FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update participants" ON participants FOR UPDATE USING (true);

-- Battle Events: Anyone can read, system can insert
CREATE POLICY "Events are viewable by everyone" ON battle_events FOR SELECT USING (true);
CREATE POLICY "Anyone can insert events" ON battle_events FOR INSERT WITH CHECK (true);

-- Chat: Anyone can read and send
CREATE POLICY "Chat is viewable by everyone" ON chat_messages FOR SELECT USING (true);
CREATE POLICY "Anyone can send messages" ON chat_messages FOR INSERT WITH CHECK (true);

-- Transactions: Users can see their own
CREATE POLICY "Users can view own transactions" ON transactions FOR SELECT USING (true);
CREATE POLICY "Anyone can insert transactions" ON transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update transactions" ON transactions FOR UPDATE USING (true);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to get room with participant count
CREATE OR REPLACE FUNCTION get_rooms_with_counts()
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  host_username VARCHAR,
  host_avatar TEXT,
  reward_amount VARCHAR,
  token_symbol VARCHAR,
  status VARCHAR,
  participant_count BIGINT,
  scheduled_start_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.name,
    u.username AS host_username,
    u.avatar AS host_avatar,
    r.reward_amount,
    r.token_symbol,
    r.status,
    COUNT(p.id) AS participant_count,
    r.scheduled_start_at,
    r.created_at
  FROM rooms r
  LEFT JOIN users u ON r.host_id = u.id
  LEFT JOIN participants p ON r.id = p.room_id
  WHERE r.status IN ('WAITING', 'ACTIVE')
  GROUP BY r.id, u.username, u.avatar
  ORDER BY r.created_at DESC;
END;
$$ LANGUAGE plpgsql;
