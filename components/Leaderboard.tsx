import React, { useState, useEffect } from 'react';
import { LeaderboardEntry } from '../types';
import { getTopSpenders, getTopEarners } from '../services/userService';

interface LeaderboardProps {
  onBack: () => void;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'spenders' | 'earners'>('earners');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadLeaderboard = async () => {
      setIsLoading(true);
      const data = activeTab === 'spenders' 
        ? await getTopSpenders(20) 
        : await getTopEarners(20);
      setEntries(data);
      setIsLoading(false);
    };
    loadLeaderboard();
  }, [activeTab]);

  const getRankBadge = (rank: number) => {
    if (rank === 1) return 'bg-rivora-gold text-black';
    if (rank === 2) return 'bg-slate-300 text-black';
    if (rank === 3) return 'bg-amber-700 text-white';
    return 'bg-slate-700 text-slate-300';
  };

  return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <button 
            onClick={onBack}
            className="text-rivora-cyan text-sm flex items-center gap-1 mb-2 hover:text-rivora-cyan/80"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <h1 className="text-4xl font-display font-bold text-white tracking-wider">LEADERBOARD</h1>
          <p className="text-slate-400 text-sm">Top warriors of the arena</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('earners')}
          className={`px-6 py-3 font-display font-bold rounded-lg transition-all ${
            activeTab === 'earners'
              ? 'bg-rivora-emerald text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]'
              : 'bg-white/5 text-slate-400 hover:bg-white/10'
          }`}
        >
          TOP EARNERS
        </button>
        <button
          onClick={() => setActiveTab('spenders')}
          className={`px-6 py-3 font-display font-bold rounded-lg transition-all ${
            activeTab === 'spenders'
              ? 'bg-rivora-violet text-white shadow-[0_0_20px_rgba(124,58,237,0.3)]'
              : 'bg-white/5 text-slate-400 hover:bg-white/10'
          }`}
        >
          TOP SPENDERS
        </button>
      </div>

      {/* Leaderboard List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-rivora-cyan border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          No data yet. Be the first to compete!
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div 
              key={entry.user.id}
              className={`flex items-center gap-4 p-4 bg-rivora-panel/80 border border-white/10 rounded-lg hover:border-rivora-violet/30 transition-all ${
                entry.rank <= 3 ? 'shadow-lg' : ''
              }`}
            >
              {/* Rank */}
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-display font-bold text-lg ${getRankBadge(entry.rank)}`}>
                {entry.rank}
              </div>

              {/* Avatar */}
              <img 
                src={entry.user.avatar}
                alt={entry.user.username}
                className={`w-12 h-12 rounded-lg border-2 ${
                  entry.rank === 1 ? 'border-rivora-gold' : 
                  entry.rank === 2 ? 'border-slate-300' :
                  entry.rank === 3 ? 'border-amber-700' :
                  'border-white/20'
                }`}
              />

              {/* User Info */}
              <div className="flex-1 min-w-0">
                <div className="font-display font-bold text-white text-lg truncate">
                  {entry.user.displayName || entry.user.username}
                </div>
                <div className="text-sm text-slate-400">
                  @{entry.user.username} • {entry.gamesPlayed} games • {entry.gamesWon} wins
                </div>
              </div>

              {/* Value */}
              <div className="text-right">
                <div className={`text-2xl font-display font-bold ${
                  activeTab === 'earners' ? 'text-rivora-emerald' : 'text-rivora-violet'
                }`}>
                  ${entry.value.toLocaleString()}
                </div>
                <div className="text-xs text-slate-500">
                  {activeTab === 'earners' ? 'Earned' : 'Spent'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
