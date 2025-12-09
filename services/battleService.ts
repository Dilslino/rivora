import { Player, BattleEvent, RoundInfo, MIN_ROUND_DELAY_MS, MAX_ROUND_DELAY_MS } from '../types';
import { supabase } from '../lib/supabase';
import { eliminatePlayer, revivePlayer, setRoomWinner } from './roomService';
import { generateBattleNarrative, generateRevivalNarrative, generateVictoryNarrative } from './geminiService';
import { v4 as uuidv4 } from 'uuid';

// Battle narratives for different stages
const OPENING_NARRATIVES = [
  "The arena crackles with electric anticipation as {victim} steps into a hidden voltage trap!",
  "{attacker} makes the first move, catching {victim} completely off guard with a devastating ambush!",
  "The chaos begins! {victim} is overwhelmed by the arena's initial surge of energy!",
  "{attacker} wastes no time, eliminating {victim} with ruthless efficiency!",
  "A trap springs! {victim} never saw it coming as the floor gives way beneath them!"
];

const MID_GAME_NARRATIVES = [
  "{attacker} and {victim} clash in an epic duel, but only one walks away!",
  "The arena shifts violently! {victim} loses their footing and falls to {attacker}'s strike!",
  "{victim} thought they were safe in the shadows, but {attacker} had other plans!",
  "A massive explosion rocks the arena! When the smoke clears, {victim} is no more!",
  "{attacker} executes a perfect ambush, sending {victim} into the void!",
  "The walls close in! {victim} is crushed while {attacker} barely escapes!",
  "{victim}'s luck finally runs out as {attacker} delivers the finishing blow!"
];

const SHOWDOWN_NARRATIVES = [
  "In a heart-stopping moment, {attacker} lands the critical hit on {victim}!",
  "The final warriors clash! {victim} gives everything but falls to {attacker}'s superior skill!",
  "With the arena crumbling around them, {attacker} makes a desperate lunge and takes down {victim}!",
  "One final strike! {attacker} emerges victorious as {victim} collapses!",
  "The crowd roars as {attacker} defeats {victim} in an unforgettable showdown!"
];

const REVIVAL_NARRATIVES = [
  "IMPOSSIBLE! {victim} rises from the ashes like a phoenix!",
  "A glitch in the matrix! {victim} has been restored to the arena!",
  "The arena grants mercy! {victim} gets a second chance at glory!",
  "Against all odds, {victim} claws their way back from elimination!",
  "A miracle resurrection! {victim} is back in the fight!"
];

// Get random item from array
function sample<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Calculate round delay based on player count
export function calculateRoundDelay(playerCount: number): number {
  // More players = faster rounds, but minimum 1 minute
  const baseDelay = MAX_ROUND_DELAY_MS;
  const reduction = Math.min(playerCount * 5000, baseDelay - MIN_ROUND_DELAY_MS);
  return Math.max(MIN_ROUND_DELAY_MS, baseDelay - reduction);
}

// Calculate eliminations per round based on player count
export function calculateEliminationsPerRound(alivePlayers: number, totalPlayers: number): number {
  if (alivePlayers <= 2) return 1;
  
  // Early game: eliminate more players
  const ratio = alivePlayers / totalPlayers;
  
  if (ratio > 0.7) {
    // Opening: eliminate 10-20% of remaining players
    return Math.max(1, Math.floor(alivePlayers * 0.15));
  } else if (ratio > 0.3) {
    // Mid game: eliminate 5-15% of remaining players
    return Math.max(1, Math.floor(alivePlayers * 0.1));
  } else {
    // Final showdown: eliminate 1 at a time for drama
    return 1;
  }
}

// Determine if revival should happen
export function shouldRevive(alivePlayers: number, deadPlayers: number, totalPlayers: number): boolean {
  if (deadPlayers === 0) return false;
  if (alivePlayers <= 2) return false; // No revivals in final 2
  
  const ratio = alivePlayers / totalPlayers;
  
  // Higher chance of revival in mid-game
  if (ratio > 0.7) return Math.random() < 0.05; // 5% in opening
  if (ratio > 0.3) return Math.random() < 0.12; // 12% in mid-game
  return Math.random() < 0.03; // 3% in final showdown
}

// Get battle stage
export function getBattleStage(alivePlayers: number, totalPlayers: number): 'OPENING' | 'MID_BATTLE' | 'FINAL_SHOWDOWN' {
  const ratio = alivePlayers / totalPlayers;
  if (ratio > 0.7) return 'OPENING';
  if (ratio > 0.3) return 'MID_BATTLE';
  return 'FINAL_SHOWDOWN';
}

// Generate narrative based on stage
function getNarrativeTemplate(stage: 'OPENING' | 'MID_BATTLE' | 'FINAL_SHOWDOWN', isRevival: boolean): string {
  if (isRevival) return sample(REVIVAL_NARRATIVES);
  
  switch (stage) {
    case 'OPENING': return sample(OPENING_NARRATIVES);
    case 'MID_BATTLE': return sample(MID_GAME_NARRATIVES);
    case 'FINAL_SHOWDOWN': return sample(SHOWDOWN_NARRATIVES);
  }
}

// Process a single elimination
export async function processElimination(
  roomId: string,
  round: number,
  alivePlayers: Player[],
  stage: 'OPENING' | 'MID_BATTLE' | 'FINAL_SHOWDOWN'
): Promise<BattleEvent | null> {
  if (alivePlayers.length < 2) return null;
  
  // Select random victim
  const victimIndex = Math.floor(Math.random() * alivePlayers.length);
  const victim = alivePlayers[victimIndex];
  
  // Maybe select an attacker (70% chance)
  const potentialAttackers = alivePlayers.filter(p => p.id !== victim.id);
  const attacker = potentialAttackers.length > 0 && Math.random() < 0.7
    ? sample(potentialAttackers)
    : null;
  
  // Get narrative
  let narrativeTemplate = getNarrativeTemplate(stage, false);
  
  // Try to get AI-generated narrative
  try {
    const aiNarrative = await generateBattleNarrative(
      victim.displayName || victim.username,
      attacker ? (attacker.displayName || attacker.username) : 'THE ARENA',
      stage
    );
    if (aiNarrative) narrativeTemplate = aiNarrative;
  } catch (e) {
    // Use fallback template
  }
  
  const message = narrativeTemplate
    .replace('{victim}', victim.displayName || victim.username)
    .replace('{attacker}', attacker ? (attacker.displayName || attacker.username) : 'THE ARENA');
  
  // Update database
  await eliminatePlayer(roomId, victim.id, attacker?.id);
  
  // Create event
  const event: BattleEvent = {
    id: uuidv4(),
    roomId,
    timestamp: Date.now(),
    round,
    type: 'ELIMINATION',
    message,
    involvedPlayerIds: attacker ? [attacker.id, victim.id] : [victim.id],
  };
  
  // Save event to database
  await saveBattleEvent(event);
  
  return event;
}

// Process a revival
export async function processRevival(
  roomId: string,
  round: number,
  deadPlayers: Player[]
): Promise<BattleEvent | null> {
  if (deadPlayers.length === 0) return null;
  
  // Select random player to revive
  const luckySoul = sample(deadPlayers);
  
  // Get narrative
  let narrativeTemplate = getNarrativeTemplate('MID_BATTLE', true);
  
  // Try to get AI-generated narrative
  try {
    const aiNarrative = await generateRevivalNarrative(luckySoul.displayName || luckySoul.username);
    if (aiNarrative) narrativeTemplate = aiNarrative;
  } catch (e) {
    // Use fallback template
  }
  
  const message = narrativeTemplate.replace('{victim}', luckySoul.displayName || luckySoul.username);
  
  // Update database
  await revivePlayer(roomId, luckySoul.id);
  
  // Create event
  const event: BattleEvent = {
    id: uuidv4(),
    roomId,
    timestamp: Date.now(),
    round,
    type: 'REVIVE',
    message,
    involvedPlayerIds: [luckySoul.id],
  };
  
  // Save event to database
  await saveBattleEvent(event);
  
  return event;
}

// Process winner
export async function processWinner(
  roomId: string,
  round: number,
  winner: Player
): Promise<BattleEvent> {
  // Get victory narrative
  let message = `CHAMPION CROWNED! ${winner.displayName || winner.username} has survived the arena and claims the prize!`;
  
  try {
    const aiNarrative = await generateVictoryNarrative(winner.displayName || winner.username);
    if (aiNarrative) message = aiNarrative;
  } catch (e) {
    // Use fallback
  }
  
  // Update database
  await setRoomWinner(roomId, winner.id);
  
  // Create event
  const event: BattleEvent = {
    id: uuidv4(),
    roomId,
    timestamp: Date.now(),
    round,
    type: 'WINNER',
    message,
    involvedPlayerIds: [winner.id],
  };
  
  // Save event to database
  await saveBattleEvent(event);
  
  return event;
}

// Save battle event to database
async function saveBattleEvent(event: BattleEvent): Promise<void> {
  const { error } = await supabase
    .from('battle_events')
    .insert({
      id: event.id,
      room_id: event.roomId,
      round: event.round,
      type: event.type,
      message: event.message,
      narrative: event.narrative,
      involved_player_ids: event.involvedPlayerIds,
    });
  
  if (error) {
    console.error('Error saving battle event:', error);
  }
}

// Get battle events for a room
export async function getBattleEvents(roomId: string): Promise<BattleEvent[]> {
  const { data, error } = await supabase
    .from('battle_events')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('Error fetching battle events:', error);
    return [];
  }
  
  return (data || []).map(e => ({
    id: e.id,
    roomId: e.room_id,
    timestamp: new Date(e.created_at).getTime(),
    round: e.round,
    type: e.type as BattleEvent['type'],
    message: e.message,
    narrative: e.narrative,
    involvedPlayerIds: e.involved_player_ids,
  }));
}

// Subscribe to battle events
export function subscribeToBattleEvents(roomId: string, callback: (event: BattleEvent) => void) {
  const channel = supabase
    .channel(`battle:${roomId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'battle_events',
        filter: `room_id=eq.${roomId}`,
      },
      (payload) => {
        const e = payload.new as any;
        callback({
          id: e.id,
          roomId: e.room_id,
          timestamp: new Date(e.created_at).getTime(),
          round: e.round,
          type: e.type,
          message: e.message,
          narrative: e.narrative,
          involvedPlayerIds: e.involved_player_ids,
        });
      }
    )
    .subscribe();
  
  return () => {
    supabase.removeChannel(channel);
  };
}

// Run a complete battle round
export async function runBattleRound(
  roomId: string,
  round: number,
  players: Player[]
): Promise<{ events: BattleEvent[]; isComplete: boolean; winner?: Player }> {
  const alivePlayers = players.filter(p => p.isAlive);
  const deadPlayers = players.filter(p => !p.isAlive);
  const totalPlayers = players.length;
  
  // Check for winner
  if (alivePlayers.length === 1) {
    const winnerEvent = await processWinner(roomId, round, alivePlayers[0]);
    return { events: [winnerEvent], isComplete: true, winner: alivePlayers[0] };
  }
  
  if (alivePlayers.length === 0) {
    return { events: [], isComplete: true };
  }
  
  const events: BattleEvent[] = [];
  const stage = getBattleStage(alivePlayers.length, totalPlayers);
  
  // Round start event
  const roundStartEvent: BattleEvent = {
    id: uuidv4(),
    roomId,
    timestamp: Date.now(),
    round,
    type: 'ROUND_START',
    message: `ROUND ${round} BEGINS! ${alivePlayers.length} warriors remain!`,
    involvedPlayerIds: [],
  };
  await saveBattleEvent(roundStartEvent);
  events.push(roundStartEvent);
  
  // Check for revival first
  if (shouldRevive(alivePlayers.length, deadPlayers.length, totalPlayers)) {
    const revivalEvent = await processRevival(roomId, round, deadPlayers);
    if (revivalEvent) {
      events.push(revivalEvent);
    }
  }
  
  // Calculate eliminations
  const eliminationCount = calculateEliminationsPerRound(alivePlayers.length, totalPlayers);
  let currentAlivePlayers = [...alivePlayers];
  
  for (let i = 0; i < eliminationCount && currentAlivePlayers.length > 1; i++) {
    const eliminationEvent = await processElimination(roomId, round, currentAlivePlayers, stage);
    if (eliminationEvent) {
      events.push(eliminationEvent);
      // Remove eliminated player from current alive list
      const eliminatedId = eliminationEvent.involvedPlayerIds[eliminationEvent.involvedPlayerIds.length - 1];
      currentAlivePlayers = currentAlivePlayers.filter(p => p.id !== eliminatedId);
    }
  }
  
  // Check for winner after eliminations
  if (currentAlivePlayers.length === 1) {
    const winnerEvent = await processWinner(roomId, round, currentAlivePlayers[0]);
    events.push(winnerEvent);
    return { events, isComplete: true, winner: currentAlivePlayers[0] };
  }
  
  // Round end event
  const roundEndEvent: BattleEvent = {
    id: uuidv4(),
    roomId,
    timestamp: Date.now(),
    round,
    type: 'ROUND_END',
    message: `Round ${round} complete. ${currentAlivePlayers.length} survivors advance to the next round!`,
    involvedPlayerIds: [],
  };
  await saveBattleEvent(roundEndEvent);
  events.push(roundEndEvent);
  
  return { events, isComplete: false };
}
