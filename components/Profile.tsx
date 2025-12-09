import React, { useState, useEffect } from 'react';
import { User, UserStats } from '../types';
import { getUserStats } from '../services/userService';
import { Button } from './Button';

interface ProfileProps {
  user: User;
  onBack: () => void;
}

export const Profile: React.FC<ProfileProps> = ({ user, onBack }) => {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      const data = await getUserStats(user.id);
      setStats(data);
      setIsLoading(false);
    };
    loadStats();
  }, [user.id]);

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={onBack}
          className="text-rivora-cyan text-sm flex items-center gap-1 hover:text-rivora-cyan/80"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Arena
        </button>
      </div>

      {/* Profile Card */}
      <div className="bg-rivora-panel border border-rivora-violet/30 rounded-xl p-8 mb-8 shadow-[0_0_30px_rgba(124,58,237,0.1)]">
        <div className="flex flex-col md:flex-row items-center gap-6">
          {/* Avatar */}
          <div className="relative">
            <div className="absolute inset-0 bg-rivora-violet blur-xl opacity-30 rounded-full"></div>
            <img 
              src={user.avatar}
              alt={user.username}
              className="relative w-32 h-32 rounded-xl border-4 border-rivora-violet/50 shadow-lg"
            />
          </div>

          {/* Info */}
          <div className="text-center md:text-left flex-1">
            <h1 className="text-4xl font-display font-bold text-white mb-1">
              {user.displayName || user.username}
            </h1>
            <p className="text-rivora-cyan text-lg mb-2">@{user.username}</p>
            <div className="flex flex-wrap gap-2 justify-center md:justify-start">
              {user.fid > 0 && (
                <span className="px-3 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full border border-purple-500/30">
                  FID: {user.fid}
                </span>
              )}
              <span className="px-3 py-1 bg-rivora-cyan/20 text-rivora-cyan text-xs rounded-full border border-rivora-cyan/30 font-mono">
                {user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-rivora-cyan border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-rivora-panel/50 border border-white/10 rounded-lg p-4 text-center hover:bg-white/5 transition-colors">
            <div className="text-3xl font-display font-bold text-white mb-1">
              {stats.totalGamesPlayed}
            </div>
            <div className="text-xs text-slate-400 uppercase tracking-wider">Games Played</div>
          </div>

          <div className="bg-rivora-panel/50 border border-white/10 rounded-lg p-4 text-center hover:bg-white/5 transition-colors">
            <div className="text-3xl font-display font-bold text-rivora-emerald mb-1">
              {stats.totalWins}
            </div>
            <div className="text-xs text-slate-400 uppercase tracking-wider">Wins</div>
          </div>

          <div className="bg-rivora-panel/50 border border-white/10 rounded-lg p-4 text-center hover:bg-white/5 transition-colors">
            <div className="text-3xl font-display font-bold text-rivora-gold mb-1">
              {stats.winRate.toFixed(1)}%
            </div>
            <div className="text-xs text-slate-400 uppercase tracking-wider">Win Rate</div>
          </div>

          <div className="bg-rivora-panel/50 border border-white/10 rounded-lg p-4 text-center hover:bg-white/5 transition-colors">
            <div className="text-3xl font-display font-bold text-rivora-cyan mb-1">
              {stats.timesRevived}
            </div>
            <div className="text-xs text-slate-400 uppercase tracking-wider">Times Revived</div>
          </div>
        </div>
      ) : null}

      {/* Earnings & Spending */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-gradient-to-br from-rivora-emerald/20 to-transparent border border-rivora-emerald/30 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-rivora-emerald/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-rivora-emerald" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <div className="text-sm text-slate-400">Total Earned</div>
                <div className="text-3xl font-display font-bold text-rivora-emerald">
                  ${stats.totalEarned.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-rivora-violet/20 to-transparent border border-rivora-violet/30 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-rivora-violet/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-rivora-violet" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <div className="text-sm text-slate-400">Total Spent</div>
                <div className="text-3xl font-display font-bold text-rivora-violet">
                  ${stats.totalSpent.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Last Played */}
      {stats?.lastPlayed && (
        <div className="text-center text-slate-500 text-sm">
          Last played: {new Date(stats.lastPlayed).toLocaleDateString()}
        </div>
      )}
    </div>
  );
};
