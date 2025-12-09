import React, { useEffect, useRef } from 'react';
import { BattleEvent } from '../types';

interface BattleLogProps {
  events: BattleEvent[];
}

export const BattleLog: React.FC<BattleLogProps> = ({ events }) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events]);

  return (
    <div className="flex flex-col h-full bg-rivora-panel/50 border border-white/5 rounded-md backdrop-blur-sm overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-8 bg-gradient-to-b from-rivora-dark to-transparent z-10 pointer-events-none"></div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {events.length === 0 && (
          <div className="text-center text-slate-500 italic mt-10">
            Initializing battle sequence...
          </div>
        )}
        
        {events.map((event) => (
          <div key={event.id} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
             <div className={`p-3 rounded border-l-2 relative overflow-hidden ${
               event.type === 'ELIMINATION' ? 'bg-rivora-red/10 border-rivora-red' : 
               event.type === 'REVIVE' ? 'bg-rivora-emerald/10 border-rivora-emerald' :
               event.type === 'WINNER' ? 'bg-rivora-gold/10 border-rivora-gold' :
               'bg-slate-800/50 border-slate-600'
             }`}>
               {/* Subtle pulse for new events */}
               <div className={`absolute inset-0 opacity-20 animate-pulse-fast ${
                 event.type === 'REVIVE' ? 'bg-rivora-emerald' : 'bg-transparent'
               }`}></div>

               <div className="flex justify-between items-start relative z-10">
                  <span className={`text-sm font-medium leading-tight ${
                    event.type === 'ELIMINATION' ? 'text-slate-200' : 
                    event.type === 'REVIVE' ? 'text-rivora-emerald font-bold' :
                    event.type === 'WINNER' ? 'text-rivora-gold font-bold text-lg' :
                    'text-slate-400'
                  }`}>
                    {event.type === 'REVIVE' && <span className="mr-2">♻️</span>}
                    {event.message}
                  </span>
               </div>
               <span className="text-[10px] text-slate-600 font-mono uppercase mt-2 block relative z-10">
                  {new Date(event.timestamp).toLocaleTimeString([], { hour12: false, second: '2-digit', minute: '2-digit' })}
               </span>
             </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-rivora-dark to-transparent pointer-events-none"></div>
    </div>
  );
};