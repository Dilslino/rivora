import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Room, Player, BattleEvent, User } from '../types';
import { PlayerAvatar } from './PlayerAvatar';
import { BattleLog } from './BattleLog';
import { Chat } from './Chat';
import { Button } from './Button';
import { 
  runBattleRound, 
  calculateRoundDelay, 
  getBattleStage,
  getBattleEvents,
  subscribeToBattleEvents
} from '../services/battleService';
import { subscribeToRoom } from '../services/roomService';

interface BattleArenaProps {
  room: Room;
  currentUser: User | null;
  onGameEnd: (winner: Player) => void;
  onBack: () => void;
}

export const BattleArena: React.FC<BattleArenaProps> = ({ 
  room: initialRoom, 
  currentUser, 
  onGameEnd,
  onBack 
}) => {
  const [room, setRoom] = useState<Room>(initialRoom);
  const [events, setEvents] = useState<BattleEvent[]>([]);
  const [currentRound, setCurrentRound] = useState(1);
  const [battleStage, setBattleStage] = useState<'OPENING' | 'MID_BATTLE' | 'FINAL_SHOWDOWN'>('OPENING');
  const [isRunning, setIsRunning] = useState(false);
  const [winner, setWinner] = useState<Player | null>(null);
  const [showChat, setShowChat] = useState(true);
  
  const timerRef = useRef<number | null>(null);
  const isGameActiveRef = useRef(false);

  // Load initial events
  useEffect(() => {
    const loadEvents = async () => {
      const existingEvents = await getBattleEvents(room.id);
      setEvents(existingEvents);
    };
    loadEvents();
  }, [room.id]);

  // Subscribe to room updates
  useEffect(() => {
    const unsubscribe = subscribeToRoom(room.id, (updatedRoom) => {
      setRoom(updatedRoom);
      if (updatedRoom.winner) {
        const winnerPlayer = updatedRoom.participants.find(p => p.id === updatedRoom.winner?.id);
        if (winnerPlayer) {
          setWinner(winnerPlayer);
        }
      }
    });
    return () => unsubscribe();
  }, [room.id]);

  // Subscribe to battle events
  useEffect(() => {
    const unsubscribe = subscribeToBattleEvents(room.id, (newEvent) => {
      setEvents(prev => {
        if (prev.some(e => e.id === newEvent.id)) return prev;
        return [...prev, newEvent];
      });
      
      if (newEvent.type === 'ROUND_START') {
        setCurrentRound(newEvent.round);
      }
    });
    return () => unsubscribe();
  }, [room.id]);

  // Game loop
  const runGameLoop = useCallback(async () => {
    if (!isGameActiveRef.current) return;

    const alivePlayers = room.participants.filter(p => p.isAlive);
    const totalPlayers = room.participants.length;

    // Update battle stage
    const stage = getBattleStage(alivePlayers.length, totalPlayers);
    setBattleStage(stage);

    // Run round
    const result = await runBattleRound(room.id, currentRound, room.participants);

    if (result.isComplete && result.winner) {
      setWinner(result.winner);
      isGameActiveRef.current = false;
      
      // Delay before showing winner screen
      setTimeout(() => {
        onGameEnd(result.winner!);
      }, 5000);
      return;
    }

    // Schedule next round
    if (isGameActiveRef.current) {
      const delay = calculateRoundDelay(alivePlayers.length);
      setCurrentRound(prev => prev + 1);
      timerRef.current = window.setTimeout(runGameLoop, delay);
    }
  }, [room, currentRound, onGameEnd]);

  // Start game when room becomes active
  useEffect(() => {
    if (room.status === 'ACTIVE' && !isRunning) {
      setIsRunning(true);
      isGameActiveRef.current = true;
      
      // Initial delay before first round
      timerRef.current = window.setTimeout(runGameLoop, 3000);
    }

    return () => {
      isGameActiveRef.current = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [room.status, isRunning, runGameLoop]);

  const alivePlayers = room.participants.filter(p => p.isAlive);
  const deadPlayers = room.participants.filter(p => !p.isAlive);
  const progress = ((room.participants.length - alivePlayers.length) / Math.max(room.participants.length - 1, 1)) * 100;

  // Latest event for showcase
  const latestEvent = events.length > 0 ? events[events.length - 1] : null;

  const stageColors = {
    OPENING: 'text-rivora-cyan',
    MID_BATTLE: 'text-rivora-gold',
    FINAL_SHOWDOWN: 'text-rivora-red'
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-rivora-dark">
      {/* Header */}
      <header className="bg-rivora-panel/90 backdrop-blur border-b border-rivora-violet/20 p-4 flex justify-between items-center z-20 sticky top-0 shadow-lg">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="text-slate-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-rivora-red rounded-full animate-ping"></div>
            <div>
              <div className={`font-display font-bold tracking-widest leading-none text-xl ${stageColors[battleStage]}`}>
                {battleStage.replace('_', ' ')}
              </div>
              <div className="text-[10px] text-slate-400 font-mono">ROUND {currentRound}</div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          {/* Prize */}
          <div className="text-center">
            <div className="text-xs text-slate-400">PRIZE</div>
            <div className="text-rivora-gold font-bold">
              {room.reward.amount} {room.reward.token.symbol}
            </div>
          </div>
          
          {/* Survivors */}
          <div className="text-right">
            <div className="font-mono text-3xl text-white font-bold leading-none">{alivePlayers.length}</div>
            <div className="text-[10px] text-slate-400 font-mono">SURVIVORS</div>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="h-2 w-full bg-slate-900 relative">
        <div 
          className="h-full bg-gradient-to-r from-rivora-violet via-rivora-cyan to-rivora-violet bg-[length:200%_auto] animate-shimmer transition-all duration-1000 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Battle Area */}
        <div className="flex-1 flex flex-col relative">
          {/* Player Grid */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4">
              {room.participants.map(player => (
                <div 
                  key={player.id} 
                  className={`transition-all duration-500 ${!player.isAlive ? 'opacity-50 scale-90' : ''}`}
                >
                  <PlayerAvatar 
                    player={player} 
                    size="md" 
                    showStatus={true}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Latest Event Banner */}
          {latestEvent && (latestEvent.type === 'ELIMINATION' || latestEvent.type === 'REVIVE' || latestEvent.type === 'WINNER') && (
            <div className="absolute bottom-20 left-0 right-0 flex items-center justify-center pointer-events-none px-4">
              <div key={latestEvent.id} className="text-center w-full max-w-2xl animate-zoom-in">
                <h3 className={`font-display text-4xl mb-2 font-bold uppercase tracking-tighter ${
                  latestEvent.type === 'ELIMINATION' ? 'text-rivora-red drop-shadow-[0_0_15px_rgba(239,68,68,0.6)]' :
                  latestEvent.type === 'REVIVE' ? 'text-rivora-emerald drop-shadow-[0_0_15px_rgba(16,185,129,0.6)] animate-pulse' :
                  'text-rivora-gold drop-shadow-[0_0_15px_rgba(251,191,36,0.6)]'
                }`}>
                  {latestEvent.type === 'ELIMINATION' ? 'ELIMINATED' : 
                   latestEvent.type === 'REVIVE' ? 'REVIVED' : 'CHAMPION'}
                </h3>
                <div className={`text-lg text-white font-medium bg-black/60 p-4 rounded-lg border backdrop-blur-md ${
                  latestEvent.type === 'REVIVE' ? 'border-rivora-emerald/40' : 
                  latestEvent.type === 'WINNER' ? 'border-rivora-gold/40' :
                  'border-rivora-red/40'
                }`}>
                  {latestEvent.message}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-80 border-l border-white/10 flex flex-col bg-black/40 backdrop-blur-xl">
          {/* Toggle */}
          <div className="flex border-b border-white/10">
            <button
              onClick={() => setShowChat(false)}
              className={`flex-1 py-3 text-sm font-display ${!showChat ? 'text-white bg-white/10' : 'text-slate-400'}`}
            >
              BATTLE LOG
            </button>
            <button
              onClick={() => setShowChat(true)}
              className={`flex-1 py-3 text-sm font-display ${showChat ? 'text-white bg-white/10' : 'text-slate-400'}`}
            >
              CHAT
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {showChat ? (
              <Chat roomId={room.id} currentUser={currentUser} />
            ) : (
              <BattleLog events={events} />
            )}
          </div>
        </div>
      </div>

      {/* Winner Overlay */}
      {winner && (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center animate-fade-in">
          <div className="text-center">
            <div className="text-rivora-gold font-display font-bold text-2xl tracking-[0.5em] mb-8 animate-pulse">
              CHAMPION
            </div>
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-rivora-gold blur-[60px] opacity-40 animate-pulse"></div>
              <img 
                src={winner.avatar}
                alt={winner.displayName || winner.username}
                className="relative w-40 h-40 rounded-xl border-4 border-rivora-gold shadow-lg mx-auto"
              />
            </div>
            <h1 className="text-5xl font-display font-bold text-white mb-4">
              {winner.displayName || winner.username}
            </h1>
            <div className="text-rivora-gold text-2xl font-bold mb-8">
              WINS {room.reward.amount} {room.reward.token.symbol}!
            </div>
            <Button onClick={onBack} size="lg">
              BACK TO ARENA
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
