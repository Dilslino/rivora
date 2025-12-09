import React, { useState, useEffect } from 'react';
import { Room, User, Player } from '../types';
import { PlayerAvatar } from './PlayerAvatar';
import { Chat } from './Chat';
import { Button } from './Button';
import { subscribeToRoom, updateRoomStatus, joinRoom } from '../services/roomService';
import { checkEngagement } from '../lib/neynar';

interface RoomLobbyProps {
  room: Room;
  currentUser: User | null;
  onGameStart: () => void;
  onBack: () => void;
}

export const RoomLobby: React.FC<RoomLobbyProps> = ({ 
  room: initialRoom, 
  currentUser, 
  onGameStart,
  onBack 
}) => {
  const [room, setRoom] = useState<Room>(initialRoom);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [hasJoined, setHasJoined] = useState(false);
  const [isHost, setIsHost] = useState(false);

  // Check if current user is host or has joined
  useEffect(() => {
    if (currentUser) {
      setIsHost(room.host.id === currentUser.id);
      setHasJoined(room.participants.some(p => p.id === currentUser.id));
    }
  }, [currentUser, room]);

  // Subscribe to room updates
  useEffect(() => {
    const unsubscribe = subscribeToRoom(room.id, (updatedRoom) => {
      setRoom(updatedRoom);
      if (updatedRoom.status === 'ACTIVE') {
        onGameStart();
      }
    });
    return () => unsubscribe();
  }, [room.id, onGameStart]);

  // Countdown timer
  useEffect(() => {
    const updateTimer = () => {
      const diff = room.scheduledStartAt - Date.now();
      if (diff <= 0) {
        setTimeLeft('Starting...');
        return;
      }
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [room.scheduledStartAt]);

  // Handle join
  const handleJoin = async () => {
    if (!currentUser) {
      setJoinError('Please connect your wallet first');
      return;
    }

    setIsJoining(true);
    setJoinError(null);

    try {
      // Check if room has cast requirement
      if (room.castHash && currentUser.fid > 0) {
        const engagement = await checkEngagement(room.castHash, currentUser.fid);
        if (!engagement.hasLiked || !engagement.hasRecasted) {
          setJoinError('You must like and recast the announcement to join!');
          setIsJoining(false);
          return;
        }
      }

      // Join room
      const success = await joinRoom(room.id, currentUser);
      if (success) {
        setHasJoined(true);
      } else {
        setJoinError('Failed to join room. Please try again.');
      }
    } catch (error) {
      setJoinError('An error occurred. Please try again.');
    }

    setIsJoining(false);
  };

  // Handle start game (host only)
  const handleStartGame = async () => {
    if (!isHost) return;
    if (room.participants.length < room.minParticipants) {
      setJoinError(`Need at least ${room.minParticipants} participants to start`);
      return;
    }

    await updateRoomStatus(room.id, 'ACTIVE');
    onGameStart();
  };

  // Copy cast URL
  const handleShare = () => {
    if (room.castUrl) {
      navigator.clipboard.writeText(room.castUrl);
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <header className="bg-rivora-panel/90 backdrop-blur border-b border-rivora-violet/20 p-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="text-slate-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <img src={room.host.avatar} alt="" className="w-4 h-4 rounded-full" />
              @{room.host.username}
            </div>
            <h1 className="text-2xl font-display font-bold text-white">{room.name}</h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Timer */}
          <div className="text-center">
            <div className="text-xs text-slate-400">STARTS IN</div>
            <div className="text-2xl font-mono font-bold text-rivora-cyan">{timeLeft}</div>
          </div>

          {/* Participants */}
          <div className="text-center">
            <div className="text-xs text-slate-400">JOINED</div>
            <div className="text-2xl font-mono font-bold text-white">{room.participants.length}</div>
          </div>

          {/* Status */}
          <div className="px-3 py-1 bg-rivora-emerald/20 text-rivora-emerald border border-rivora-emerald/30 rounded text-sm font-bold">
            OPEN
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Participants */}
        <div className="flex-1 p-6 overflow-y-auto">
          {/* Prize Banner */}
          <div className="bg-gradient-to-r from-rivora-gold/20 to-transparent border border-rivora-gold/30 rounded-lg p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-rivora-gold/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-rivora-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <div className="text-sm text-slate-400">Prize Pool</div>
                <div className="text-2xl font-display font-bold text-rivora-gold">
                  {room.reward.amount} {room.reward.token.symbol}
                </div>
              </div>
            </div>
            {room.reward.usdValue > 0 && (
              <div className="text-right">
                <div className="text-sm text-slate-400">~USD Value</div>
                <div className="text-xl font-bold text-white">${room.reward.usdValue.toFixed(2)}</div>
              </div>
            )}
          </div>

          {/* Participants Grid */}
          <h2 className="text-lg font-display font-bold text-white mb-4 flex items-center gap-2">
            <span>WARRIORS</span>
            <span className="text-rivora-cyan">({room.participants.length})</span>
          </h2>

          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4 mb-6">
            {room.participants.map(participant => (
              <PlayerAvatar 
                key={participant.id} 
                player={participant} 
                size="md"
                showStatus={false}
              />
            ))}
            {/* Empty slots */}
            {Array.from({ length: Math.max(0, 16 - room.participants.length) }).map((_, i) => (
              <div 
                key={`empty-${i}`}
                className="w-12 h-12 rounded-lg border-2 border-dashed border-white/10 flex items-center justify-center"
              >
                <span className="text-white/20 text-xl">+</span>
              </div>
            ))}
          </div>

          {/* Join Requirements */}
          {room.castHash && (
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-3 mb-2">
                <svg className="w-5 h-5 text-purple-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                <span className="text-purple-400 font-bold">Farcaster Requirement</span>
              </div>
              <p className="text-sm text-slate-400 mb-3">
                You must LIKE and RECAST the announcement to join this room.
              </p>
              {room.castUrl && (
                <a 
                  href={room.castUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-purple-400 hover:text-purple-300 underline"
                >
                  View Cast on Warpcast
                </a>
              )}
            </div>
          )}

          {/* Error Message */}
          {joinError && (
            <div className="bg-rivora-red/10 border border-rivora-red/30 rounded-lg p-4 mb-6 text-rivora-red">
              {joinError}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            {!hasJoined && !isHost && (
              <Button 
                onClick={handleJoin} 
                isLoading={isJoining}
                className="flex-1"
                size="lg"
              >
                JOIN BATTLE
              </Button>
            )}

            {hasJoined && !isHost && (
              <div className="flex-1 bg-rivora-emerald/20 border border-rivora-emerald/30 rounded-lg p-4 text-center">
                <span className="text-rivora-emerald font-bold">You're in! Waiting for game to start...</span>
              </div>
            )}

            {isHost && (
              <Button 
                onClick={handleStartGame}
                disabled={room.participants.length < room.minParticipants}
                className="flex-1"
                size="lg"
              >
                {room.participants.length < room.minParticipants 
                  ? `NEED ${room.minParticipants - room.participants.length} MORE`
                  : 'START BATTLE'}
              </Button>
            )}

            {room.castUrl && (
              <Button variant="secondary" onClick={handleShare}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </Button>
            )}
          </div>
        </div>

        {/* Right: Chat */}
        <div className="w-80 border-l border-white/10">
          <Chat roomId={room.id} currentUser={currentUser} />
        </div>
      </div>
    </div>
  );
};
