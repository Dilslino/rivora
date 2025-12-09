import React from 'react';
import { Room } from '../types';
import { Button } from './Button';

interface RoomCardProps {
  room: Room;
  onJoin?: () => void;
  onView?: () => void;
}

export const RoomCard: React.FC<RoomCardProps> = ({ room, onJoin, onView }) => {
  const getStatusColor = () => {
    switch (room.status) {
      case 'WAITING': return 'bg-rivora-emerald/20 text-rivora-emerald border-rivora-emerald/30';
      case 'ACTIVE': return 'bg-rivora-red/20 text-rivora-red border-rivora-red/30';
      case 'STARTING': return 'bg-rivora-gold/20 text-rivora-gold border-rivora-gold/30';
      default: return 'bg-slate-700/20 text-slate-400 border-slate-600/30';
    }
  };

  const getStatusText = () => {
    switch (room.status) {
      case 'WAITING': return 'OPEN';
      case 'ACTIVE': return 'LIVE';
      case 'STARTING': return 'STARTING';
      default: return room.status;
    }
  };

  const timeUntilStart = () => {
    const diff = room.scheduledStartAt - Date.now();
    if (diff <= 0) return 'Starting...';
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m`;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  };

  return (
    <div className="bg-rivora-panel/80 border border-white/10 rounded-lg p-4 hover:border-rivora-violet/30 transition-all duration-300 group">
      {/* Host info */}
      <div className="flex items-center gap-2 mb-3">
        <img 
          src={room.host.avatar} 
          alt={room.host.username}
          className="w-6 h-6 rounded-full border border-white/20"
        />
        <span className="text-xs text-slate-400">@{room.host.username}</span>
      </div>

      {/* Room name */}
      <h3 className="text-lg font-display font-bold text-white mb-2 group-hover:text-rivora-cyan transition-colors">
        {room.name}
      </h3>

      {/* Reward */}
      <div className="flex items-center gap-2 mb-3">
        <div className="px-3 py-1 bg-rivora-gold/10 border border-rivora-gold/30 rounded text-rivora-gold text-sm font-bold">
          {room.reward.amount} {room.reward.token.symbol}
        </div>
        {room.reward.usdValue > 0 && (
          <span className="text-xs text-slate-500">~${room.reward.usdValue.toFixed(2)}</span>
        )}
      </div>

      {/* Stats row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {room.participants.length}
          </span>
          {room.status === 'WAITING' && (
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {timeUntilStart()}
            </span>
          )}
        </div>
        
        <div className={`px-2 py-1 text-xs rounded border ${getStatusColor()}`}>
          {getStatusText()}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        {room.status === 'WAITING' && onJoin && (
          <Button size="sm" onClick={onJoin} className="flex-1">
            JOIN
          </Button>
        )}
        {onView && (
          <Button size="sm" variant={room.status === 'WAITING' ? 'secondary' : 'primary'} onClick={onView} className="flex-1">
            {room.status === 'ACTIVE' ? 'WATCH' : 'VIEW'}
          </Button>
        )}
      </div>
    </div>
  );
};
