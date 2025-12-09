import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GamePhase, Player, BattleEvent, ArenaSettings } from './types';
import { MOCK_PLAYERS, OPENING_NARRATIVES, MID_GAME_NARRATIVES, SHOWDOWN_NARRATIVES, REVIVAL_MESSAGES } from './constants';
import { Button } from './components/Button';
import { PlayerAvatar } from './components/PlayerAvatar';
import { BattleLog } from './components/BattleLog';
import { fetchEliminationNarratives, generateArenaName } from './services/geminiService';

// -- Helper: Get random item
function sample<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function App() {
  const [phase, setPhase] = useState<GamePhase>(GamePhase.LOBBY);
  const [players, setPlayers] = useState<Player[]>([]);
  const [events, setEvents] = useState<BattleEvent[]>([]);
  const [settings, setSettings] = useState<ArenaSettings>({
    name: "Loading...",
    maxPlayers: 16,
    theme: 'CYBER',
    prize: ''
  });
  
  // Dynamic Narratives from AI
  const [dynamicNarratives, setDynamicNarratives] = useState<string[]>([]);
  
  // Battle State
  const [winner, setWinner] = useState<Player | null>(null);
  const [battleStage, setBattleStage] = useState<'OPENING' | 'MID BATTLE' | 'FINAL SHOWDOWN'>('OPENING');
  const timerRef = useRef<number | null>(null);
  
  // Track game active state in a ref to avoid closure staleness in timeouts
  const isGameActiveRef = useRef(false);

  // Mock Current User for Profile View
  const [currentUser] = useState<Player>({
    id: 'user_me',
    name: 'NeoStrider',
    avatar: 'https://picsum.photos/seed/neo/200/200',
    isAlive: true,
    kills: 42,
    xp: 8500,
    joinTime: Date.now()
  });

  // -- Initialization
  useEffect(() => {
    const init = async () => {
       const name = await generateArenaName();
       setSettings(s => ({ ...s, name }));
       // Fetch narratives for later use
       const narratives = await fetchEliminationNarratives(15);
       setDynamicNarratives(narratives);
    };
    init();
  }, []);

  // -- Action: Create Lobby
  const handleCreateLobby = () => {
    setPlayers(MOCK_PLAYERS.map(p => ({...p, isAlive: true, statusEffect: undefined})));
    setEvents([]);
    setWinner(null);
    setBattleStage('OPENING');
    setPhase(GamePhase.JOINING);
  };

  // -- Action: Start Battle
  const handleStartBattle = () => {
    if (players.length < 2) return;
    setPhase(GamePhase.BATTLE);
  };

  // -- Game Logic Function
  const runGameTick = useCallback(() => {
    if (!isGameActiveRef.current) return;

    setPlayers((currentPlayers) => {
      const alivePlayers = currentPlayers.filter(p => p.isAlive);
      const deadPlayers = currentPlayers.filter(p => !p.isAlive);
      const totalPlayers = currentPlayers.length;
      
      // Safety check
      if (alivePlayers.length <= 1) {
        return currentPlayers;
      }

      // 1. DETERMINE STAGE
      const aliveRatio = alivePlayers.length / totalPlayers;
      let currentStage: 'OPENING' | 'MID BATTLE' | 'FINAL SHOWDOWN' = 'MID BATTLE';
      if (aliveRatio > 0.7) currentStage = 'OPENING';
      else if (aliveRatio <= 0.3) currentStage = 'FINAL SHOWDOWN';
      
      setBattleStage(currentStage);

      // 2. DECIDE ACTION: ELIMINATE vs REVIVE
      let actionType: 'ELIMINATION' | 'REVIVE' = 'ELIMINATION';
      const reviveChance = (currentStage === 'MID BATTLE') ? 0.15 : (currentStage === 'FINAL SHOWDOWN' ? 0.05 : 0);
      
      if (deadPlayers.length > 0 && Math.random() < reviveChance) {
        actionType = 'REVIVE';
      }

      // 3. PROCESS LOGIC LOCALLY
      let nextPlayers = [...currentPlayers];
      let newEvent: BattleEvent | null = null;
      let delay = 4000; // Base delay increased

      if (actionType === 'REVIVE') {
        const luckySoul = sample<Player>(deadPlayers);
        const narrative = sample(REVIVAL_MESSAGES).replace('{victim}', luckySoul.name);
        
        newEvent = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          type: 'REVIVE',
          message: narrative,
          involvedPlayerIds: [luckySoul.id]
        };

        nextPlayers = currentPlayers.map(p => 
           p.id === luckySoul.id ? { ...p, isAlive: true, statusEffect: 'REVIVED' } : p
        );
        delay = 5000; // Slower for revive events

        // Schedule cleanup for status effect
        setTimeout(() => {
           if(isGameActiveRef.current) {
             setPlayers(curr => curr.map(p => p.id === luckySoul.id ? {...p, statusEffect: undefined} : p));
           }
        }, 3000);

      } else {
        // ELIMINATION
        const victimIndex = Math.floor(Math.random() * alivePlayers.length);
        const victim = alivePlayers[victimIndex];
        const potentialAttackers = alivePlayers.filter(p => p.id !== victim.id);
        const attacker = potentialAttackers.length > 0 && Math.random() > 0.3 
          ? sample<Player>(potentialAttackers) 
          : null;

        // Select Narrative
        let narrativePool = MID_GAME_NARRATIVES;
        if (dynamicNarratives.length > 0) {
           narrativePool = [...MID_GAME_NARRATIVES, ...dynamicNarratives];
        }

        if (currentStage === 'OPENING') narrativePool = OPENING_NARRATIVES;
        if (currentStage === 'FINAL SHOWDOWN') narrativePool = SHOWDOWN_NARRATIVES;

        let narrativeTemplate = sample(narrativePool);
        let message = narrativeTemplate
          .replace('{victim}', victim.name)
          .replace('{attacker}', attacker ? attacker.name : 'THE ARENA');

        newEvent = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          type: 'ELIMINATION',
          message: message,
          involvedPlayerIds: attacker ? [attacker.id, victim.id] : [victim.id]
        };

        nextPlayers = currentPlayers.map(p => 
          p.id === victim.id ? { ...p, isAlive: false } : p
        );

        // SLOW PACING SETTINGS
        if (currentStage === 'OPENING') delay = 3500;  // 3.5s (was 2s)
        if (currentStage === 'MID BATTLE') delay = 5000; // 5s (was 3s)
        if (currentStage === 'FINAL SHOWDOWN') delay = 8000; // 8s (was 5s) - High Tension
      }

      // 4. CHECK WIN CONDITION & HANDLE END GAME DELAY
      const nextAlive = nextPlayers.filter(p => p.isAlive);
      if (nextAlive.length === 1) {
        const champ = nextAlive[0];
        setWinner(champ);
        
        // Add the final elimination event immediately
        if (newEvent) {
           setEvents(prev => [...prev, newEvent!]);
        }
        
        isGameActiveRef.current = false; // Stop the loop

        // 2-second delay before announcing the winner in the log
        setTimeout(() => {
           setEvents(prev => [...prev, {
             id: (Date.now()+5).toString(),
             timestamp: Date.now(),
             type: 'WINNER' as any,
             message: `SEQUENCE COMPLETE. ${champ.name} SURVIVED.`,
             involvedPlayerIds: [champ.id]
           }]);
        }, 2000);

        // 8-second total delay before closing the screen to allow history reading
        setTimeout(() => {
           setPhase(GamePhase.WINNER);
        }, 8000);

        return nextPlayers;
      }

      // 5. UPDATE STATE AND SCHEDULE NEXT TICK
      if (newEvent) {
        setEvents(prev => [...prev, newEvent!]);
      }

      // Schedule next tick only if game still active
      if (isGameActiveRef.current) {
         timerRef.current = window.setTimeout(runGameTick, delay);
      }

      return nextPlayers;
    });
  }, [dynamicNarratives]);

  // -- Start Loop Effect
  useEffect(() => {
    if (phase === GamePhase.BATTLE) {
       isGameActiveRef.current = true;
       // Kick off the loop
       timerRef.current = window.setTimeout(runGameTick, 2000); // Initial start delay
    } else {
       isGameActiveRef.current = false;
       if (timerRef.current) clearTimeout(timerRef.current);
    }
    
    return () => {
      isGameActiveRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [phase, runGameTick]);

  const handleShare = () => {
    if (!winner) return;
    const text = `RIVORA CHAMPION: ${winner.name} survived the arena! #Rivora #Farcaster`;
    navigator.clipboard.writeText(text).then(() => {
      alert("Victory result copied to clipboard!");
    });
  };

  // -- RENDERERS --

  const renderLobby = () => (
    <div className="flex flex-col items-center justify-center h-screen p-6 space-y-8 overflow-hidden relative">
      <div className="text-center space-y-2 relative z-10">
        <h1 className="text-7xl md:text-8xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-rivora-violet via-rivora-cyan to-rivora-violet bg-[length:200%_auto] animate-rivora-entrance whitespace-nowrap pb-2">
          RIVORA
        </h1>
        {/* Replaced broken animate-in with opacity-0 + animate-fade-in-up */}
        <p className="text-rivora-cyan tracking-[0.2em] font-medium text-sm opacity-0 animate-fade-in-up delay-1000">ELIMINATION SEQUENCE READY</p>
      </div>

      {/* Replaced broken animate-in with opacity-0 + animate-zoom-in */}
      <div className="w-full max-w-md bg-rivora-panel/80 p-6 rounded-lg border border-rivora-violet/30 shadow-[0_0_30px_rgba(124,58,237,0.15)] backdrop-blur-md opacity-0 animate-zoom-in delay-500 z-10">
        <div className="space-y-4">
           <div className="flex justify-between items-center border-b border-white/10 pb-2">
              <span className="text-slate-400 font-display">ACTIVE ARENAS</span>
              <span className="text-rivora-emerald text-sm font-mono">ONLINE: 1,420</span>
           </div>
           
           <div className="space-y-2">
              <div className="flex justify-between items-center p-3 bg-white/5 rounded hover:bg-white/10 cursor-pointer transition-colors group">
                 <div>
                    <div className="font-bold text-slate-200 group-hover:text-rivora-cyan transition-colors">{settings.name}</div>
                    <div className="text-xs text-slate-500">Host: System • 16/16 Cap</div>
                 </div>
                 <div className="px-2 py-1 bg-rivora-violet/20 text-rivora-violet text-xs rounded border border-rivora-violet/30">OPEN</div>
              </div>
              <div className="flex justify-between items-center p-3 bg-white/5 rounded opacity-50">
                 <div>
                    <div className="font-bold text-slate-200">Neon Pit</div>
                    <div className="text-xs text-slate-500">Host: ZeroCool • 8/8 Cap</div>
                 </div>
                 <div className="px-2 py-1 bg-rivora-red/20 text-rivora-red text-xs rounded border border-rivora-red/30">LIVE</div>
              </div>
           </div>
        </div>

        <div className="mt-8 space-y-3">
           <Button size="lg" onClick={handleCreateLobby} className="w-full">
             ENTER ARENA
           </Button>
           <Button size="sm" variant="ghost" onClick={() => setPhase(GamePhase.PROFILE)} className="w-full text-xs tracking-widest opacity-70 hover:opacity-100">
             VIEW PROFILE
           </Button>
        </div>
      </div>
      
      <div className="absolute bottom-6 text-slate-600 text-xs text-center font-mono">
        POWERED BY GEMINI • FATE IS ALGORITHMIC
      </div>
    </div>
  );

  const renderProfile = () => (
    <div className="flex flex-col h-screen p-6 max-w-3xl mx-auto opacity-0 animate-slide-in-right">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-display font-bold text-white tracking-wider">OPERATIVE DATA</h2>
        <Button variant="ghost" onClick={() => setPhase(GamePhase.LOBBY)}>BACK TO LOBBY</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Profile Card */}
        <div className="bg-rivora-panel border border-rivora-violet/30 rounded-lg p-6 flex flex-col items-center text-center shadow-[0_0_20px_rgba(124,58,237,0.1)]">
           <div className="mb-4 transform hover:scale-105 transition-transform duration-300">
             <PlayerAvatar player={currentUser} size="xl" showStatus={false} />
           </div>
           <h3 className="text-2xl font-display font-bold text-white">{currentUser.name}</h3>
           <div className="mt-2 text-xs font-mono text-rivora-cyan bg-rivora-cyan/10 px-3 py-1 rounded-full border border-rivora-cyan/20">
             LVL {Math.floor(currentUser.xp / 1000)}
           </div>
           
           <div className="w-full mt-6 space-y-1">
             <div className="flex justify-between text-xs text-slate-400">
               <span>XP PROGRESS</span>
               <span>{currentUser.xp % 1000} / 1000</span>
             </div>
             <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
               <div className="h-full bg-gradient-to-r from-rivora-violet to-rivora-cyan w-[65%]"></div>
             </div>
           </div>
        </div>

        {/* Stats */}
        <div className="md:col-span-2 grid grid-cols-2 gap-4">
           <div className="bg-rivora-panel/50 border border-white/10 p-4 rounded flex flex-col justify-center items-center hover:bg-white/5 transition-colors">
              <span className="text-4xl font-display font-bold text-rivora-emerald">12</span>
              <span className="text-xs tracking-widest text-slate-500 mt-1">ARENA WINS</span>
           </div>
           <div className="bg-rivora-panel/50 border border-white/10 p-4 rounded flex flex-col justify-center items-center hover:bg-white/5 transition-colors">
              <span className="text-4xl font-display font-bold text-rivora-red">{currentUser.kills}</span>
              <span className="text-xs tracking-widest text-slate-500 mt-1">TOTAL ELIMINATIONS</span>
           </div>
           <div className="bg-rivora-panel/50 border border-white/10 p-4 rounded flex flex-col justify-center items-center hover:bg-white/5 transition-colors">
              <span className="text-4xl font-display font-bold text-rivora-gold">54</span>
              <span className="text-xs tracking-widest text-slate-500 mt-1">BATTLES JOINED</span>
           </div>
           <div className="bg-rivora-panel/50 border border-white/10 p-4 rounded flex flex-col justify-center items-center hover:bg-white/5 transition-colors">
              <span className="text-4xl font-display font-bold text-rivora-cyan">98%</span>
              <span className="text-xs tracking-widest text-slate-500 mt-1">LUCK RATING</span>
           </div>
        </div>
      </div>

      <div className="flex-1 bg-rivora-panel/30 border-t border-white/10 p-6 overflow-hidden flex flex-col">
         <h4 className="text-sm font-bold text-slate-400 mb-4 tracking-widest">RECENT ENGAGEMENTS</h4>
         <div className="space-y-2 overflow-y-auto pr-2">
            {[1,2,3,4,5].map((i) => (
              <div key={i} className="flex justify-between items-center p-3 bg-white/5 rounded border-l-2 border-transparent hover:border-rivora-violet transition-all">
                 <div className="flex flex-col">
                   <span className="text-slate-200 font-bold">Sector {i}9-Alpha</span>
                   <span className="text-xs text-slate-500">Eliminated by: VoidWalker</span>
                 </div>
                 <span className="text-rivora-red font-mono text-xs">+150 XP</span>
              </div>
            ))}
         </div>
      </div>
    </div>
  );

  const renderJoining = () => (
    <div className="flex flex-col h-screen p-4 max-w-4xl mx-auto">
      <header className="flex justify-between items-center py-4 border-b border-white/10">
        <div>
          <h2 className="text-2xl font-display font-bold text-white">{settings.name.toUpperCase()}</h2>
          <p className="text-rivora-cyan text-sm tracking-wider">LOBBY PHASE • {players.length}/{settings.maxPlayers}</p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => setPhase(GamePhase.LOBBY)}>LEAVE</Button>
      </header>

      <div className="flex-1 overflow-y-auto py-8">
         <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4 justify-items-center">
            {players.map(p => (
              <PlayerAvatar key={p.id} player={p} size="md" />
            ))}
            {/* Empty slots placeholders */}
            {Array.from({length: Math.max(0, settings.maxPlayers - players.length)}).map((_, i) => (
               <div key={`empty-${i}`} className="w-12 h-12 rounded-sm border-2 border-dashed border-white/10 flex items-center justify-center">
                  <span className="text-white/10 text-xl">+</span>
               </div>
            ))}
         </div>
      </div>

      <div className="py-6 border-t border-white/10 flex flex-col items-center gap-4">
        {settings.prize && (
          <div className="bg-rivora-gold/10 px-4 py-2 rounded text-rivora-gold border border-rivora-gold/30 text-sm">
            🏆 PRIZE: {settings.prize}
          </div>
        )}
        <div className="flex gap-4 w-full max-w-md">
           <input 
             type="text" 
             placeholder="Add Prize (Optional)" 
             className="flex-1 bg-rivora-panel border border-white/20 rounded px-4 py-2 text-white focus:outline-none focus:border-rivora-cyan font-display uppercase placeholder:normal-case"
             value={settings.prize || ''}
             onChange={(e) => setSettings({...settings, prize: e.target.value})}
           />
        </div>
        <Button size="lg" onClick={handleStartBattle} className="w-full max-w-md animate-pulse-fast">
          INITIATE SEQUENCE
        </Button>
      </div>
    </div>
  );

  const renderBattle = () => {
    const aliveCount = players.filter(p => p.isAlive).length;
    const progress = ((players.length - aliveCount) / (players.length - 1)) * 100;
    
    // Find latest event for showcase
    const latestEvent = events.length > 0 ? events[events.length - 1] : null;

    return (
      <div className="flex flex-col h-screen overflow-hidden bg-rivora-dark">
        {/* Cinematic Header */}
        <header className="bg-rivora-panel/90 backdrop-blur border-b border-rivora-violet/20 p-4 flex justify-between items-center z-20 sticky top-0 shadow-lg">
          <div className="flex items-center gap-4">
             <div className="w-3 h-3 bg-rivora-red rounded-full animate-ping"></div>
             <div>
               <div className="font-display font-bold text-white tracking-widest leading-none text-xl">{battleStage}</div>
               <div className="text-[10px] text-rivora-cyan tracking-[0.2em] font-mono">SEQUENCE ACTIVE</div>
             </div>
          </div>
          <div className="text-right">
             <div className="font-mono text-3xl text-white font-bold leading-none">{aliveCount}</div>
             <div className="text-[10px] text-slate-400 font-mono">SURVIVORS</div>
          </div>
        </header>

        {/* Progress Bar */}
        <div className="h-1.5 w-full bg-slate-900 relative">
          <div 
            className="h-full bg-gradient-to-r from-rivora-violet via-rivora-cyan to-rivora-violet bg-size-200 animate-shimmer transition-all duration-1000 ease-out"
            style={{ width: `${progress}%` }}
          />
          {/* Revival Chance Indicator */}
          <div className="absolute right-[20%] top-2 text-[9px] text-rivora-emerald/60 font-mono flex items-center gap-1 opacity-50">
             <span className="w-1 h-1 bg-rivora-emerald rounded-full"></span> REVIVAL PROTOCOL
          </div>
        </div>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
           
           {/* Center Stage (Visuals) */}
           <div className="flex-1 p-6 flex flex-col relative bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-rivora-panel to-rivora-dark">
              {/* Grid of Players */}
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 content-start overflow-y-auto scrollbar-hide pb-20">
                 {players.map(p => (
                   <div key={p.id} className={`transition-all duration-700 transform ${!p.isAlive ? 'scale-90' : 'scale-100'}`}>
                      <PlayerAvatar player={p} size="sm" showStatus={false} />
                   </div>
                 ))}
              </div>

              {/* Central Event Banner */}
              <div className="absolute bottom-10 left-0 right-0 flex items-center justify-center pointer-events-none px-4">
                 {latestEvent && (
                    <div key={latestEvent.id} className="text-center w-full max-w-2xl opacity-0 animate-zoom-in">
                       {latestEvent.type === 'ELIMINATION' && (
                         <h3 className="text-rivora-red font-display text-5xl mb-2 font-bold uppercase drop-shadow-[0_0_15px_rgba(239,68,68,0.6)] tracking-tighter">
                           ELIMINATED
                         </h3>
                       )}
                       {latestEvent.type === 'REVIVE' && (
                         <h3 className="text-rivora-emerald font-display text-5xl mb-2 font-bold uppercase drop-shadow-[0_0_15px_rgba(16,185,129,0.6)] tracking-tighter animate-pulse">
                           REVIVED
                         </h3>
                       )}
                       
                       <div className={`text-xl md:text-2xl text-white font-medium leading-relaxed bg-black/60 p-6 rounded-lg border backdrop-blur-md shadow-2xl ${
                         latestEvent.type === 'REVIVE' ? 'border-rivora-emerald/40' : 'border-rivora-red/40'
                       }`}>
                         {latestEvent.message}
                       </div>
                    </div>
                 )}
              </div>
           </div>

           {/* Battle Log Sidebar */}
           <div className="h-1/3 md:h-full md:w-96 border-t md:border-t-0 md:border-l border-white/10 z-10 bg-black/40 backdrop-blur-xl">
              <BattleLog events={events} />
           </div>
        </div>
      </div>
    );
  };

  const renderWinner = () => (
    <div className="h-screen flex flex-col items-center justify-center bg-[url('https://picsum.photos/seed/bg/1920/1080')] bg-cover bg-center relative">
       <div className="absolute inset-0 bg-rivora-dark/95 backdrop-blur-sm"></div>
       
       <div className="relative z-10 flex flex-col items-center space-y-8 p-8 opacity-0 animate-zoom-in w-full max-w-2xl">
          <div className="text-rivora-gold font-display font-bold text-2xl tracking-[0.5em] animate-pulse">FINAL SURVIVOR</div>
          
          {winner && (
            <div className="relative group">
              <div className="absolute inset-0 bg-rivora-gold blur-[60px] opacity-40 animate-pulse"></div>
              <div className="relative transform group-hover:scale-105 transition-transform duration-500">
                <PlayerAvatar player={winner} size="xl" />
              </div>
              <div className="mt-8 text-center">
                 <h1 className="text-7xl font-display font-bold text-white mb-2 text-shadow-lg tracking-tight">{winner.name}</h1>
                 <p className="text-slate-300 font-mono text-lg border-t border-white/10 pt-4 mt-4 inline-block px-8">
                    SURVIVED {events.length} ROUNDS • +1500 XP
                 </p>
              </div>
            </div>
          )}

          {settings.prize && (
            <div className="w-full bg-gradient-to-r from-transparent via-rivora-gold/20 to-transparent border-y border-rivora-gold/30 text-rivora-gold py-6 text-center animate-bounce-slow">
               <div className="text-sm font-mono opacity-70 mb-1">REWARD UNLOCKED</div>
               <div className="text-3xl font-bold">{settings.prize}</div>
            </div>
          )}

          <div className="flex flex-col gap-4 mt-8 w-full max-w-sm">
             <Button onClick={handleShare} variant="primary" className="w-full">
                COPY VICTORY RESULT
             </Button>
             <Button onClick={handleCreateLobby} variant="ghost" className="w-full">
                START NEW SEQUENCE
             </Button>
          </div>
       </div>
    </div>
  );

  return (
    <div className="min-h-screen font-sans text-slate-200 selection:bg-rivora-violet selection:text-white bg-rivora-dark">
      {phase === GamePhase.LOBBY && renderLobby()}
      {phase === GamePhase.PROFILE && renderProfile()}
      {phase === GamePhase.JOINING && renderJoining()}
      {phase === GamePhase.BATTLE && renderBattle()}
      {phase === GamePhase.WINNER && renderWinner()}
      
      {/* Background ambient effects */}
      <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
         <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-rivora-violet/5 rounded-full blur-[120px] animate-pulse"></div>
         <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-rivora-cyan/5 rounded-full blur-[120px] animate-pulse delay-700"></div>
      </div>
    </div>
  );
}

export default App;