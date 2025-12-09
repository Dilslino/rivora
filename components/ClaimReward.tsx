import React, { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Room, User, WITHDRAW_FEE_PERCENT } from '../types';
import { Button } from './Button';
import { RIVORA_ESCROW_ABI, RIVORA_ESCROW_ADDRESS } from '../lib/wagmi';
import { markRewardClaimed } from '../services/roomService';
import { updateUserStats } from '../services/userService';

interface ClaimRewardProps {
  room: Room;
  winner: User;
  onClaimed: () => void;
  onBack: () => void;
}

export const ClaimReward: React.FC<ClaimRewardProps> = ({ room, winner, onClaimed, onBack }) => {
  const [isClaiming, setIsClaiming] = useState(false);

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  // Calculate amounts
  const prizeAmount = parseFloat(room.reward.amount) * 0.95; // After platform fee
  const withdrawFee = prizeAmount * (WITHDRAW_FEE_PERCENT / 100);
  const finalAmount = prizeAmount - withdrawFee;

  const handleClaim = async () => {
    setIsClaiming(true);

    const roomIdBytes = `0x${room.id.replace(/-/g, '')}` as `0x${string}`;

    try {
      writeContract({
        address: RIVORA_ESCROW_ADDRESS as `0x${string}`,
        abi: RIVORA_ESCROW_ABI,
        functionName: 'claimReward',
        args: [roomIdBytes],
      });
    } catch (error) {
      console.error('Error claiming reward:', error);
      setIsClaiming(false);
    }
  };

  // Handle successful claim
  React.useEffect(() => {
    if (isSuccess && txHash) {
      const finalizeClaim = async () => {
        await markRewardClaimed(room.id);
        await updateUserStats(winner.id, room.reward.usdValue * 0.95 * (1 - WITHDRAW_FEE_PERCENT / 100), 0, true);
        onClaimed();
      };
      finalizeClaim();
    }
  }, [isSuccess, txHash, room, winner, onClaimed]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-rivora-panel to-rivora-dark">
      <div className="w-full max-w-lg">
        {/* Winner Card */}
        <div className="text-center mb-8">
          <div className="text-rivora-gold font-display font-bold text-xl tracking-[0.3em] mb-4 animate-pulse">
            VICTORY
          </div>
          
          <div className="relative inline-block mb-6">
            <div className="absolute inset-0 bg-rivora-gold blur-[40px] opacity-30 animate-pulse"></div>
            <img 
              src={winner.avatar}
              alt={winner.username}
              className="relative w-28 h-28 rounded-xl border-4 border-rivora-gold shadow-lg"
            />
          </div>

          <h1 className="text-4xl font-display font-bold text-white mb-2">
            {winner.displayName || winner.username}
          </h1>
          <p className="text-slate-400">You conquered {room.name}!</p>
        </div>

        {/* Reward Card */}
        <div className="bg-rivora-panel border border-rivora-gold/30 rounded-xl p-6 mb-6 shadow-[0_0_30px_rgba(251,191,36,0.1)]">
          <h2 className="text-lg font-display font-bold text-white mb-4">CLAIM YOUR REWARD</h2>
          
          <div className="space-y-3 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Prize Pool</span>
              <span className="text-white font-bold">
                {room.reward.amount} {room.reward.token.symbol}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Platform Fee (5%)</span>
              <span className="text-slate-300">
                -{(parseFloat(room.reward.amount) * 0.05).toFixed(4)} {room.reward.token.symbol}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Withdrawal Fee ({WITHDRAW_FEE_PERCENT}%)</span>
              <span className="text-slate-300">
                -{withdrawFee.toFixed(4)} {room.reward.token.symbol}
              </span>
            </div>
            
            <div className="border-t border-white/10 pt-3">
              <div className="flex justify-between items-center">
                <span className="text-white font-bold">You Receive</span>
                <span className="text-2xl font-display font-bold text-rivora-gold">
                  {finalAmount.toFixed(4)} {room.reward.token.symbol}
                </span>
              </div>
              {room.reward.usdValue > 0 && (
                <div className="text-right text-sm text-slate-400">
                  ~${(room.reward.usdValue * 0.95 * (1 - WITHDRAW_FEE_PERCENT / 100)).toFixed(2)}
                </div>
              )}
            </div>
          </div>

          {room.rewardClaimed ? (
            <div className="bg-rivora-emerald/20 border border-rivora-emerald/30 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-rivora-emerald font-bold">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Reward Claimed Successfully!
              </div>
            </div>
          ) : (
            <Button 
              onClick={handleClaim}
              isLoading={isPending || isConfirming || isClaiming}
              className="w-full"
              size="lg"
            >
              {isPending ? 'Confirm in Wallet...' : 
               isConfirming ? 'Processing...' : 
               'CLAIM REWARD'}
            </Button>
          )}
        </div>

        {/* Info */}
        <p className="text-xs text-slate-500 text-center mb-6">
          The reward will be sent directly to your connected wallet.
          A small gas fee is required to process the transaction.
        </p>

        {/* Back Button */}
        <div className="text-center">
          <Button variant="ghost" onClick={onBack}>
            Back to Arena
          </Button>
        </div>
      </div>
    </div>
  );
};
