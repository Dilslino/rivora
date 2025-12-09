import { Player } from './types';

export const MOCK_PLAYERS: Player[] = [
  { id: 'p1', name: 'NeonViper', avatar: 'https://picsum.photos/seed/viper/200/200', isAlive: true, kills: 0, xp: 1250, joinTime: Date.now() },
  { id: 'p2', name: 'CyberGhost', avatar: 'https://picsum.photos/seed/ghost/200/200', isAlive: true, kills: 0, xp: 3400, joinTime: Date.now() },
  { id: 'p3', name: 'IronClad', avatar: 'https://picsum.photos/seed/iron/200/200', isAlive: true, kills: 0, xp: 800, joinTime: Date.now() },
  { id: 'p4', name: 'VoidWalker', avatar: 'https://picsum.photos/seed/void/200/200', isAlive: true, kills: 0, xp: 5000, joinTime: Date.now() },
  { id: 'p5', name: 'PixelFury', avatar: 'https://picsum.photos/seed/pixel/200/200', isAlive: true, kills: 0, xp: 2100, joinTime: Date.now() },
  { id: 'p6', name: 'DataRonin', avatar: 'https://picsum.photos/seed/ronin/200/200', isAlive: true, kills: 0, xp: 150, joinTime: Date.now() },
  { id: 'p7', name: 'GlitchWitch', avatar: 'https://picsum.photos/seed/witch/200/200', isAlive: true, kills: 0, xp: 9000, joinTime: Date.now() },
  { id: 'p8', name: 'NullPointer', avatar: 'https://picsum.photos/seed/null/200/200', isAlive: true, kills: 0, xp: 420, joinTime: Date.now() },
  { id: 'p9', name: 'StormRelic', avatar: 'https://picsum.photos/seed/storm/200/200', isAlive: true, kills: 0, xp: 1100, joinTime: Date.now() },
  { id: 'p10', name: 'EchoDrive', avatar: 'https://picsum.photos/seed/echo/200/200', isAlive: true, kills: 0, xp: 2900, joinTime: Date.now() },
  { id: 'p11', name: 'ShadowByte', avatar: 'https://picsum.photos/seed/byte/200/200', isAlive: true, kills: 0, xp: 600, joinTime: Date.now() },
  { id: 'p12', name: 'VaporMax', avatar: 'https://picsum.photos/seed/vapor/200/200', isAlive: true, kills: 0, xp: 4500, joinTime: Date.now() },
];

export const OPENING_NARRATIVES = [
  "{victim} stumbled into a high-voltage trap.",
  "{attacker} caught {victim} off guard with a logic bomb.",
  "{victim} was dereferenced by the system cleanup.",
  "{attacker} initiated a fatal handshake with {victim}.",
  "{victim} failed the initial ping check."
];

export const MID_GAME_NARRATIVES = [
  "{attacker} overloaded {victim}'s neural link.",
  "{victim} stepped into a singularity trap set by {attacker}.",
  "{attacker} shattered {victim} into raw pixels.",
  "{victim} was lost in the data stream during a firewall breach.",
  "{attacker} routed high voltage through {victim}.",
  "{victim}'s shield integrity collapsed under pressure.",
  "{attacker} executed a fatal command on {victim}."
];

export const SHOWDOWN_NARRATIVES = [
  "{victim} made a desperate move but was intercepted by {attacker}.",
  "{attacker} delivered the final blow to {victim} in a flash of neon.",
  "{victim} couldn't withstand the crushing pressure of the arena.",
  "{attacker} outmaneuvered {victim} in the final cycle.",
  "Only dust remains of {victim} after {attacker}'s strike."
];

export const REVIVAL_MESSAGES = [
  "A glitch in the system reassembled {victim}!",
  "{victim} found a backdoor and returned to the arena!",
  "System Mercy Protocol activated for {victim}.",
  "{victim}'s backup data was successfully restored!",
  "Miraculous recovery! {victim} is back online."
];

export const FALLBACK_ELIMINATIONS = [
  ...MID_GAME_NARRATIVES
];

export const AVATAR_COLORS = [
  'border-rivora-violet',
  'border-rivora-cyan',
  'border-rivora-emerald',
  'border-rivora-red',
  'border-rivora-gold'
];