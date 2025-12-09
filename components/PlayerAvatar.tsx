import React from 'react';
import { Player } from '../types';

interface PlayerAvatarProps {
  player: Player;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showStatus?: boolean;
}

export const PlayerAvatar: React.FC<PlayerAvatarProps> = ({ player, size = 'md', showStatus = true }) => {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-20 h-20",
    xl: "w-32 h-32"
  };

  const isRevivedRecently = player.statusEffect === 'REVIVED';
  const displayName = player.displayName || player.username || 'Player';

  // Base border/effect styles for the avatar box
  let boxClasses = "border-slate-700 animate-shatter"; // Default to dead (shatter animation)
  
  if (player.isAlive) {
    if (isRevivedRecently) {
      boxClasses = "border-rivora-emerald border-2 shadow-[0_0_15px_rgba(16,185,129,0.6)] z-10";
    } else {
      boxClasses = "border-rivora-cyan border-2 shadow-[0_0_10px_rgba(6,182,212,0.3)]";
    }
  }

  return (
    <div className="relative group flex flex-col items-center justify-center">
      {/* External Aura Effects for Revived Players */}
      {player.isAlive && isRevivedRecently && (
        <>
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${sizeClasses[size]} border-2 border-rivora-emerald rounded-sm animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite] opacity-75 pointer-events-none z-0`}></div>
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${sizeClasses[size]} bg-rivora-emerald/40 blur-xl rounded-full scale-150 animate-pulse pointer-events-none z-0`}></div>
        </>
      )}

      {/* Main Avatar Container */}
      <div className={`relative ${sizeClasses[size]} rounded-sm ${boxClasses} overflow-hidden transition-all duration-500 bg-rivora-panel z-10`}>
        <img 
          src={player.avatar} 
          alt={displayName} 
          className="w-full h-full object-cover"
        />
        
        {/* Elimination Overlay */}
        {!player.isAlive && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <span className="text-rivora-red font-bold font-display tracking-widest -rotate-12 text-[8px]">OUT</span>
          </div>
        )}

        {/* Internal Revival Flash/Sheen */}
        {isRevivedRecently && (
          <div className="absolute inset-0 bg-gradient-to-tr from-rivora-emerald/30 via-transparent to-transparent animate-pulse pointer-events-none"></div>
        )}
      </div>
      
      {showStatus && (
        <div className="mt-1 text-center relative z-10">
          <div className={`font-display font-bold tracking-wide truncate max-w-[80px] mx-auto text-xs ${player.isAlive ? 'text-slate-200' : 'text-slate-600 line-through'}`}>
            {displayName}
          </div>
        </div>
      )}
    </div>
  );
};