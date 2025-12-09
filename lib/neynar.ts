// Neynar API Integration for Farcaster
const NEYNAR_API_KEY = import.meta.env.VITE_NEYNAR_API_KEY || '';
const NEYNAR_BASE_URL = 'https://api.neynar.com/v2';

export interface NeynarUser {
  fid: number;
  username: string;
  display_name: string;
  pfp_url: string;
  custody_address: string;
  verifications: string[];
}

export interface Cast {
  hash: string;
  author: NeynarUser;
  text: string;
  timestamp: string;
  reactions: {
    likes: { fid: number }[];
    recasts: { fid: number }[];
  };
  embeds: { url: string }[];
}

// Get user by FID
export async function getUserByFid(fid: number): Promise<NeynarUser | null> {
  try {
    const response = await fetch(`${NEYNAR_BASE_URL}/farcaster/user/bulk?fids=${fid}`, {
      headers: {
        'api_key': NEYNAR_API_KEY,
      },
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    return data.users?.[0] || null;
  } catch (error) {
    console.error('Neynar getUserByFid error:', error);
    return null;
  }
}

// Get user by wallet address
export async function getUserByAddress(address: string): Promise<NeynarUser | null> {
  try {
    const response = await fetch(`${NEYNAR_BASE_URL}/farcaster/user/bulk-by-address?addresses=${address}`, {
      headers: {
        'api_key': NEYNAR_API_KEY,
      },
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const users = data[address.toLowerCase()];
    return users?.[0] || null;
  } catch (error) {
    console.error('Neynar getUserByAddress error:', error);
    return null;
  }
}

// Post a cast with embeds
export async function postCast(
  signerUuid: string,
  text: string,
  embeds?: { url: string }[]
): Promise<{ hash: string; url: string } | null> {
  try {
    const response = await fetch(`${NEYNAR_BASE_URL}/farcaster/cast`, {
      method: 'POST',
      headers: {
        'api_key': NEYNAR_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        signer_uuid: signerUuid,
        text,
        embeds: embeds || [],
      }),
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    return {
      hash: data.cast.hash,
      url: `https://warpcast.com/${data.cast.author.username}/${data.cast.hash.slice(0, 10)}`,
    };
  } catch (error) {
    console.error('Neynar postCast error:', error);
    return null;
  }
}

// Get cast by hash
export async function getCastByHash(hash: string): Promise<Cast | null> {
  try {
    const response = await fetch(`${NEYNAR_BASE_URL}/farcaster/cast?identifier=${hash}&type=hash`, {
      headers: {
        'api_key': NEYNAR_API_KEY,
      },
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    return data.cast || null;
  } catch (error) {
    console.error('Neynar getCastByHash error:', error);
    return null;
  }
}

// Check if user has liked and recasted
export async function checkEngagement(castHash: string, fid: number): Promise<{
  hasLiked: boolean;
  hasRecasted: boolean;
}> {
  try {
    const cast = await getCastByHash(castHash);
    if (!cast) {
      return { hasLiked: false, hasRecasted: false };
    }
    
    const hasLiked = cast.reactions.likes.some(like => like.fid === fid);
    const hasRecasted = cast.reactions.recasts.some(recast => recast.fid === fid);
    
    return { hasLiked, hasRecasted };
  } catch (error) {
    console.error('Neynar checkEngagement error:', error);
    return { hasLiked: false, hasRecasted: false };
  }
}

// Get all users who liked and recasted (for participant verification)
export async function getEngagedUsers(castHash: string): Promise<{
  likers: number[];
  recasters: number[];
  validParticipants: number[]; // users who both liked AND recasted
}> {
  try {
    const cast = await getCastByHash(castHash);
    if (!cast) {
      return { likers: [], recasters: [], validParticipants: [] };
    }
    
    const likers = cast.reactions.likes.map(l => l.fid);
    const recasters = cast.reactions.recasts.map(r => r.fid);
    const validParticipants = likers.filter(fid => recasters.includes(fid));
    
    return { likers, recasters, validParticipants };
  } catch (error) {
    console.error('Neynar getEngagedUsers error:', error);
    return { likers: [], recasters: [], validParticipants: [] };
  }
}

// Generate Farcaster Frame URL for room
export function generateFrameUrl(roomId: string): string {
  const baseUrl = import.meta.env.VITE_APP_URL || 'https://rivora.app';
  return `${baseUrl}/frame/${roomId}`;
}

// Generate embed image URL for room
export function generateRoomImageUrl(roomId: string, roomName: string, reward: string): string {
  const baseUrl = import.meta.env.VITE_APP_URL || 'https://rivora.app';
  return `${baseUrl}/api/og?roomId=${roomId}&name=${encodeURIComponent(roomName)}&reward=${encodeURIComponent(reward)}`;
}
