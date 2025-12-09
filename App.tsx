import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { GamePhase, Room, User, Player, RewardConfig } from './types';
import { WalletConnect } from './components/WalletConnect';
import { RoomCard } from './components/RoomCard';
import { CreateRoomModal } from './components/CreateRoomModal';
import { RoomLobby } from './components/RoomLobby';
import { BattleArena } from './components/BattleArena';
import { ClaimReward } from './components/ClaimReward';
import { Profile } from './components/Profile';
import { Leaderboard } from './components/Leaderboard';
import { Button } from './components/Button';
import { getActiveRooms, getRoomById, createRoom, subscribeToRooms, updateRoomCast } from './services/roomService';
import { getOrCreateUser } from './services/userService';
import { generateArenaName } from './services/geminiService';

function App() {
  const { address, isConnected } = useAccount();
  
  // App State
  const [phase, setPhase] = useState<GamePhase>(GamePhase.HOME);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [winner, setWinner] = useState<Player | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Load user when wallet connects
  useEffect(() => {
    const loadUser = async () => {
      if (isConnected && address) {
        const user = await getOrCreateUser(address);
        setCurrentUser(user);
      } else {
        setCurrentUser(null);
      }
    };
    loadUser();
  }, [isConnected, address]);

  // Load rooms on mount
  useEffect(() => {
    const loadRooms = async () => {
      setIsLoading(true);
      const activeRooms = await getActiveRooms();
      setRooms(activeRooms);
      setIsLoading(false);
    };
    loadRooms();

    // Subscribe to room updates
    const unsubscribe = subscribeToRooms((updatedRooms) => {
      setRooms(updatedRooms);
    });

    return () => unsubscribe();
  }, []);

  // Handle room creation
  const handleRoomCreated = async (
    roomId: string, 
    reward: RewardConfig, 
    duration: number, 
    txHash: string
  ) => {
    if (!currentUser) return;

    const roomName = await generateArenaName();
    const newRoom = await createRoom(
      currentUser,
      roomName,
      reward,
      duration,
      txHash // Using txHash as reward wallet temporarily
    );

    if (newRoom) {
      setCurrentRoom(newRoom);
      setPhase(GamePhase.ROOM_LOBBY);
    }
  };

  // Handle entering a room
  const handleEnterRoom = async (roomId: string) => {
    const room = await getRoomById(roomId);
    if (room) {
      setCurrentRoom(room);
      if (room.status === 'ACTIVE') {
        setPhase(GamePhase.BATTLE);
      } else {
        setPhase(GamePhase.ROOM_LOBBY);
      }
    }
  };

  // Handle game start
  const handleGameStart = () => {
    setPhase(GamePhase.BATTLE);
  };

  // Handle game end
  const handleGameEnd = (gameWinner: Player) => {
    setWinner(gameWinner);
    setPhase(GamePhase.WINNER);
  };

  // Handle back to home
  const handleBackToHome = () => {
    setCurrentRoom(null);
    setWinner(null);
    setPhase(GamePhase.HOME);
  };

  // Render Home Page
  const renderHome = () => (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-rivora-dark/90 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-3xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-rivora-violet to-rivora-cyan">
            RIVORA
          </h1>
          
          <nav className="flex items-center gap-4">
            <button 
              onClick={() => setPhase(GamePhase.LEADERBOARD)}
              className="text-slate-400 hover:text-white text-sm font-display tracking-wider"
            >
              LEADERBOARD
            </button>
            {currentUser && (
              <button 
                onClick={() => setPhase(GamePhase.PROFILE)}
                className="flex items-center gap-2 text-slate-400 hover:text-white"
              >
                <img 
                  src={currentUser.avatar} 
                  alt="" 
                  className="w-8 h-8 rounded-full border border-white/20"
                />
                <span className="text-sm font-display">{currentUser.username}</span>
              </button>
            )}
            <WalletConnect />
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <div className="relative py-20 px-6 text-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-rivora-violet/10 to-transparent"></div>
        
        <div className="relative z-10 max-w-3xl mx-auto">
          <h2 className="text-6xl md:text-7xl font-display font-bold text-white mb-4 animate-rivora-entrance">
            BATTLE ROYALE
            <span className="block text-rivora-gold">GIVEAWAYS</span>
          </h2>
          <p className="text-xl text-slate-400 mb-8">
            Host epic giveaways on Farcaster. Join the battle, survive the arena, claim the prize.
          </p>
          
          {isConnected ? (
            <Button size="lg" onClick={() => setShowCreateModal(true)}>
              CREATE GIVEAWAY ROOM
            </Button>
          ) : (
            <div className="inline-block">
              <p className="text-sm text-slate-500 mb-4">Connect wallet to create a room</p>
              <WalletConnect />
            </div>
          )}
        </div>
      </div>

      {/* Active Rooms */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-2xl font-display font-bold text-white flex items-center gap-3">
            <span className="w-3 h-3 bg-rivora-emerald rounded-full animate-pulse"></span>
            ACTIVE ARENAS
          </h3>
          <span className="text-sm text-slate-500">{rooms.length} rooms</span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-2 border-rivora-cyan border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : rooms.length === 0 ? (
          <div className="text-center py-20 bg-rivora-panel/50 rounded-xl border border-white/5">
            <div className="text-6xl mb-4 opacity-50">🏟️</div>
            <p className="text-slate-400 mb-6">No active rooms. Be the first to create one!</p>
            {isConnected && (
              <Button onClick={() => setShowCreateModal(true)}>
                CREATE ROOM
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                onJoin={() => handleEnterRoom(room.id)}
                onView={() => handleEnterRoom(room.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* How It Works */}
      <div className="max-w-7xl mx-auto px-6 py-12 border-t border-white/5">
        <h3 className="text-2xl font-display font-bold text-white text-center mb-12">
          HOW IT WORKS
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-rivora-violet/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl font-display font-bold text-rivora-violet">1</span>
            </div>
            <h4 className="font-bold text-white mb-2">Create Room</h4>
            <p className="text-sm text-slate-400">
              Host deposits prize (ETH/USDC) and shares to Farcaster
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-rivora-cyan/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl font-display font-bold text-rivora-cyan">2</span>
            </div>
            <h4 className="font-bold text-white mb-2">Join Battle</h4>
            <p className="text-sm text-slate-400">
              Like & recast to join. Free entry for participants
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-rivora-gold/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl font-display font-bold text-rivora-gold">3</span>
            </div>
            <h4 className="font-bold text-white mb-2">Survive</h4>
            <p className="text-sm text-slate-400">
              Random eliminations with dramatic narratives. Revivals possible!
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-rivora-emerald/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl font-display font-bold text-rivora-emerald">4</span>
            </div>
            <h4 className="font-bold text-white mb-2">Claim Prize</h4>
            <p className="text-sm text-slate-400">
              Last survivor wins and claims the prize directly
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 text-center text-slate-600 text-sm">
        <p>RIVORA - Battle Royale Giveaways on Farcaster</p>
        <p className="mt-2">Powered by Base Network</p>
      </footer>

      {/* Create Room Modal */}
      <CreateRoomModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onRoomCreated={handleRoomCreated}
      />
    </div>
  );

  // Render based on phase
  return (
    <div className="min-h-screen font-sans text-slate-200 bg-rivora-dark selection:bg-rivora-violet selection:text-white">
      {phase === GamePhase.HOME && renderHome()}
      
      {phase === GamePhase.ROOM_LOBBY && currentRoom && (
        <RoomLobby
          room={currentRoom}
          currentUser={currentUser}
          onGameStart={handleGameStart}
          onBack={handleBackToHome}
        />
      )}
      
      {phase === GamePhase.BATTLE && currentRoom && (
        <BattleArena
          room={currentRoom}
          currentUser={currentUser}
          onGameEnd={handleGameEnd}
          onBack={handleBackToHome}
        />
      )}
      
      {phase === GamePhase.WINNER && currentRoom && winner && currentUser && winner.id === currentUser.id && (
        <ClaimReward
          room={currentRoom}
          winner={currentUser}
          onClaimed={handleBackToHome}
          onBack={handleBackToHome}
        />
      )}
      
      {phase === GamePhase.PROFILE && currentUser && (
        <Profile
          user={currentUser}
          onBack={handleBackToHome}
        />
      )}
      
      {phase === GamePhase.LEADERBOARD && (
        <Leaderboard onBack={handleBackToHome} />
      )}

      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-rivora-violet/5 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-rivora-cyan/5 rounded-full blur-[120px] animate-pulse delay-700"></div>
      </div>
    </div>
  );
}

export default App;
