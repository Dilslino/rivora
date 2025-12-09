import { supabase } from '../lib/supabase';
import { User, UserStats, LeaderboardEntry } from '../types';
import { getUserByAddress } from '../lib/neynar';
import { v4 as uuidv4 } from 'uuid';

// Get or create user from wallet address
export async function getOrCreateUser(walletAddress: string): Promise<User | null> {
  // First check if user exists in database
  const { data: existingUser } = await supabase
    .from('users')
    .select('*')
    .eq('wallet_address', walletAddress.toLowerCase())
    .single();

  if (existingUser) {
    return {
      id: existingUser.id,
      fid: existingUser.fid,
      username: existingUser.username,
      displayName: existingUser.display_name,
      avatar: existingUser.avatar,
      walletAddress: existingUser.wallet_address,
      createdAt: new Date(existingUser.created_at).getTime(),
    };
  }

  // Try to get Farcaster profile from Neynar
  const neynarUser = await getUserByAddress(walletAddress);

  // Create new user
  const userId = uuidv4();
  const newUser = {
    id: userId,
    fid: neynarUser?.fid || 0,
    username: neynarUser?.username || `user_${walletAddress.slice(2, 8)}`,
    display_name: neynarUser?.display_name || `User ${walletAddress.slice(2, 8)}`,
    avatar: neynarUser?.pfp_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${walletAddress}`,
    wallet_address: walletAddress.toLowerCase(),
    total_spent: 0,
    total_earned: 0,
    games_played: 0,
    games_won: 0,
  };

  const { data, error } = await supabase
    .from('users')
    .insert(newUser)
    .select()
    .single();

  if (error) {
    console.error('Error creating user:', error);
    return null;
  }

  return {
    id: data.id,
    fid: data.fid,
    username: data.username,
    displayName: data.display_name,
    avatar: data.avatar,
    walletAddress: data.wallet_address,
    createdAt: new Date(data.created_at).getTime(),
  };
}

// Get user by ID
export async function getUserById(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    fid: data.fid,
    username: data.username,
    displayName: data.display_name,
    avatar: data.avatar,
    walletAddress: data.wallet_address,
    createdAt: new Date(data.created_at).getTime(),
  };
}

// Get user stats
export async function getUserStats(userId: string): Promise<UserStats | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  // Calculate win rate
  const winRate = data.games_played > 0 
    ? (data.games_won / data.games_played) * 100 
    : 0;

  // Get additional stats from participants table
  const { data: participantData } = await supabase
    .from('participants')
    .select('revived_count')
    .eq('user_id', userId);

  const timesRevived = (participantData || []).reduce(
    (sum: number, p: any) => sum + (p.revived_count || 0), 
    0
  );

  // Get last played
  const { data: lastGame } = await supabase
    .from('participants')
    .select('joined_at')
    .eq('user_id', userId)
    .order('joined_at', { ascending: false })
    .limit(1)
    .single();

  return {
    totalGamesPlayed: data.games_played,
    totalWins: data.games_won,
    totalEarned: data.total_earned,
    totalSpent: data.total_spent,
    winRate,
    longestSurvival: 0, // Would need to track this per game
    timesRevived,
    lastPlayed: lastGame ? new Date(lastGame.joined_at).getTime() : undefined,
  };
}

// Update user stats after game
export async function updateUserStats(
  userId: string, 
  earned: number = 0, 
  spent: number = 0, 
  won: boolean = false
): Promise<void> {
  const { data: currentUser } = await supabase
    .from('users')
    .select('total_earned, total_spent, games_played, games_won')
    .eq('id', userId)
    .single();

  if (!currentUser) return;

  await supabase
    .from('users')
    .update({
      total_earned: currentUser.total_earned + earned,
      total_spent: currentUser.total_spent + spent,
      games_played: currentUser.games_played + 1,
      games_won: won ? currentUser.games_won + 1 : currentUser.games_won,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
}

// Get leaderboard - top spenders
export async function getTopSpenders(limit: number = 10): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('total_spent', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching top spenders:', error);
    return [];
  }

  return (data || []).map((user: any, index: number) => ({
    rank: index + 1,
    user: {
      id: user.id,
      fid: user.fid,
      username: user.username,
      displayName: user.display_name,
      avatar: user.avatar,
      walletAddress: user.wallet_address,
      createdAt: new Date(user.created_at).getTime(),
    },
    value: user.total_spent,
    gamesPlayed: user.games_played,
    gamesWon: user.games_won,
  }));
}

// Get leaderboard - top earners
export async function getTopEarners(limit: number = 10): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('total_earned', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching top earners:', error);
    return [];
  }

  return (data || []).map((user: any, index: number) => ({
    rank: index + 1,
    user: {
      id: user.id,
      fid: user.fid,
      username: user.username,
      displayName: user.display_name,
      avatar: user.avatar,
      walletAddress: user.wallet_address,
      createdAt: new Date(user.created_at).getTime(),
    },
    value: user.total_earned,
    gamesPlayed: user.games_played,
    gamesWon: user.games_won,
  }));
}
