import { supabase } from '../lib/supabase';
import { Room, Player, User, RewardConfig, RoomStatus, PLATFORM_FEE_PERCENT, MIN_PARTICIPANTS } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Convert DB room to Room type
function dbToRoom(dbRoom: any, participants: Player[] = []): Room {
  return {
    id: dbRoom.id,
    name: dbRoom.name,
    host: {
      id: dbRoom.host_id,
      fid: dbRoom.host?.fid || 0,
      username: dbRoom.host?.username || '',
      displayName: dbRoom.host?.display_name || '',
      avatar: dbRoom.host?.avatar || '',
      walletAddress: dbRoom.host?.wallet_address || '',
      createdAt: new Date(dbRoom.host?.created_at || Date.now()).getTime(),
    },
    reward: {
      token: {
        type: dbRoom.token_type,
        symbol: dbRoom.token_symbol,
        address: dbRoom.token_address,
        decimals: dbRoom.token_decimals,
      },
      amount: dbRoom.reward_amount,
      amountWei: dbRoom.reward_amount_wei,
      usdValue: dbRoom.reward_usd_value,
    },
    rewardWalletAddress: dbRoom.reward_wallet_address,
    status: dbRoom.status as RoomStatus,
    castHash: dbRoom.cast_hash,
    castUrl: dbRoom.cast_url,
    createdAt: new Date(dbRoom.created_at).getTime(),
    scheduledStartAt: new Date(dbRoom.scheduled_start_at).getTime(),
    startedAt: dbRoom.started_at ? new Date(dbRoom.started_at).getTime() : undefined,
    endedAt: dbRoom.ended_at ? new Date(dbRoom.ended_at).getTime() : undefined,
    duration: dbRoom.duration_minutes,
    participants,
    minParticipants: dbRoom.min_participants,
    winner: undefined, // Will be populated separately
    rewardClaimed: dbRoom.reward_claimed,
    platformFeePercent: dbRoom.platform_fee_percent,
  };
}

// Create a new room
export async function createRoom(
  host: User,
  name: string,
  reward: RewardConfig,
  durationMinutes: number,
  rewardWalletAddress: string
): Promise<Room | null> {
  const roomId = uuidv4();
  const scheduledStartAt = new Date(Date.now() + durationMinutes * 60 * 1000);

  const { data, error } = await supabase
    .from('rooms')
    .insert({
      id: roomId,
      name,
      host_id: host.id,
      token_type: reward.token.type,
      token_symbol: reward.token.symbol,
      token_address: reward.token.address,
      token_decimals: reward.token.decimals,
      reward_amount: reward.amount,
      reward_amount_wei: reward.amountWei,
      reward_usd_value: reward.usdValue,
      reward_wallet_address: rewardWalletAddress,
      status: 'WAITING',
      duration_minutes: durationMinutes,
      min_participants: MIN_PARTICIPANTS,
      platform_fee_percent: PLATFORM_FEE_PERCENT,
      scheduled_start_at: scheduledStartAt.toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating room:', error);
    return null;
  }

  return dbToRoom({ ...data, host });
}

// Get room by ID
export async function getRoomById(roomId: string): Promise<Room | null> {
  const { data: roomData, error: roomError } = await supabase
    .from('rooms')
    .select(`
      *,
      host:users!rooms_host_id_fkey(*)
    `)
    .eq('id', roomId)
    .single();

  if (roomError || !roomData) {
    console.error('Error fetching room:', roomError);
    return null;
  }

  // Get participants
  const { data: participantsData } = await supabase
    .from('participants')
    .select(`
      *,
      user:users(*)
    `)
    .eq('room_id', roomId);

  const participants: Player[] = (participantsData || []).map((p: any) => ({
    id: p.user.id,
    fid: p.user.fid,
    username: p.user.username,
    displayName: p.user.display_name,
    avatar: p.user.avatar,
    walletAddress: p.user.wallet_address,
    createdAt: new Date(p.user.created_at).getTime(),
    isAlive: p.is_alive,
    eliminatedAt: p.eliminated_at ? new Date(p.eliminated_at).getTime() : undefined,
    eliminatedBy: p.eliminated_by,
    revivedCount: p.revived_count,
    joinTime: new Date(p.joined_at).getTime(),
  }));

  return dbToRoom(roomData, participants);
}

// Get all active/waiting rooms
export async function getActiveRooms(): Promise<Room[]> {
  const { data, error } = await supabase
    .from('rooms')
    .select(`
      *,
      host:users!rooms_host_id_fkey(*)
    `)
    .in('status', ['WAITING', 'ACTIVE'])
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching rooms:', error);
    return [];
  }

  return (data || []).map((room: any) => dbToRoom(room));
}

// Join a room
export async function joinRoom(roomId: string, user: User): Promise<boolean> {
  const { error } = await supabase
    .from('participants')
    .insert({
      room_id: roomId,
      user_id: user.id,
      is_alive: true,
      revived_count: 0,
    });

  if (error) {
    console.error('Error joining room:', error);
    return false;
  }

  return true;
}

// Update room status
export async function updateRoomStatus(roomId: string, status: RoomStatus): Promise<boolean> {
  const updates: any = { status };
  
  if (status === 'ACTIVE') {
    updates.started_at = new Date().toISOString();
  } else if (status === 'FINISHED') {
    updates.ended_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('rooms')
    .update(updates)
    .eq('id', roomId);

  if (error) {
    console.error('Error updating room status:', error);
    return false;
  }

  return true;
}

// Update room cast info
export async function updateRoomCast(roomId: string, castHash: string, castUrl: string): Promise<boolean> {
  const { error } = await supabase
    .from('rooms')
    .update({ cast_hash: castHash, cast_url: castUrl })
    .eq('id', roomId);

  if (error) {
    console.error('Error updating room cast:', error);
    return false;
  }

  return true;
}

// Set winner
export async function setRoomWinner(roomId: string, winnerId: string): Promise<boolean> {
  const { error } = await supabase
    .from('rooms')
    .update({ 
      winner_id: winnerId,
      status: 'FINISHED',
      ended_at: new Date().toISOString()
    })
    .eq('id', roomId);

  if (error) {
    console.error('Error setting winner:', error);
    return false;
  }

  return true;
}

// Mark reward as claimed
export async function markRewardClaimed(roomId: string): Promise<boolean> {
  const { error } = await supabase
    .from('rooms')
    .update({ reward_claimed: true })
    .eq('id', roomId);

  if (error) {
    console.error('Error marking reward claimed:', error);
    return false;
  }

  return true;
}

// Eliminate player
export async function eliminatePlayer(roomId: string, playerId: string, eliminatedBy?: string): Promise<boolean> {
  const { error } = await supabase
    .from('participants')
    .update({
      is_alive: false,
      eliminated_at: new Date().toISOString(),
      eliminated_by: eliminatedBy || null,
    })
    .eq('room_id', roomId)
    .eq('user_id', playerId);

  if (error) {
    console.error('Error eliminating player:', error);
    return false;
  }

  return true;
}

// Revive player
export async function revivePlayer(roomId: string, playerId: string): Promise<boolean> {
  const { data: participant, error: fetchError } = await supabase
    .from('participants')
    .select('revived_count')
    .eq('room_id', roomId)
    .eq('user_id', playerId)
    .single();

  if (fetchError) {
    console.error('Error fetching participant:', fetchError);
    return false;
  }

  const { error } = await supabase
    .from('participants')
    .update({
      is_alive: true,
      eliminated_at: null,
      eliminated_by: null,
      revived_count: (participant?.revived_count || 0) + 1,
    })
    .eq('room_id', roomId)
    .eq('user_id', playerId);

  if (error) {
    console.error('Error reviving player:', error);
    return false;
  }

  return true;
}

// Subscribe to room updates
export function subscribeToRoom(roomId: string, callback: (room: Room) => void) {
  const channel = supabase
    .channel(`room:${roomId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'rooms',
        filter: `id=eq.${roomId}`,
      },
      async () => {
        const room = await getRoomById(roomId);
        if (room) callback(room);
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'participants',
        filter: `room_id=eq.${roomId}`,
      },
      async () => {
        const room = await getRoomById(roomId);
        if (room) callback(room);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// Subscribe to all rooms (for home page)
export function subscribeToRooms(callback: (rooms: Room[]) => void) {
  const channel = supabase
    .channel('rooms')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'rooms',
      },
      async () => {
        const rooms = await getActiveRooms();
        callback(rooms);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
