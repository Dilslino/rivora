import React, { useState } from 'react';
import { useAccount, useBalance, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, parseUnits, encodeFunctionData } from 'viem';
import { Button } from './Button';
import { Token, RewardConfig, DEFAULT_TOKENS, MIN_DURATION_MINUTES, MAX_DURATION_MINUTES, BASE_USDC_ADDRESS } from '../types';
import { ERC20_ABI, RIVORA_ESCROW_ABI, RIVORA_ESCROW_ADDRESS } from '../lib/wagmi';
import { v4 as uuidv4 } from 'uuid';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRoomCreated: (roomId: string, reward: RewardConfig, duration: number, txHash: string) => void;
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({ isOpen, onClose, onRoomCreated }) => {
  const { address } = useAccount();
  const { data: ethBalance } = useBalance({ address });
  const { data: usdcBalance } = useBalance({ 
    address, 
    token: BASE_USDC_ADDRESS as `0x${string}` 
  });

  const [step, setStep] = useState<'token' | 'amount' | 'duration' | 'confirm'>('token');
  const [selectedToken, setSelectedToken] = useState<Token>(DEFAULT_TOKENS[0]);
  const [amount, setAmount] = useState('');
  const [duration, setDuration] = useState(30);
  const [roomName, setRoomName] = useState('');
  const [customTokenAddress, setCustomTokenAddress] = useState('');

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const handleTokenSelect = (token: Token) => {
    setSelectedToken(token);
    setStep('amount');
  };

  const handleCustomToken = () => {
    if (customTokenAddress && customTokenAddress.startsWith('0x')) {
      setSelectedToken({
        type: 'CUSTOM',
        symbol: 'TOKEN',
        address: customTokenAddress,
        decimals: 18,
      });
      setStep('amount');
    }
  };

  const handleAmountSubmit = () => {
    if (parseFloat(amount) > 0) {
      setStep('duration');
    }
  };

  const handleDurationSubmit = () => {
    setStep('confirm');
  };

  const handleCreateRoom = async () => {
    if (!address) return;

    const roomId = uuidv4();
    const roomIdBytes = `0x${roomId.replace(/-/g, '')}` as `0x${string}`;

    try {
      if (selectedToken.type === 'ETH') {
        // Create room with ETH
        writeContract({
          address: RIVORA_ESCROW_ADDRESS as `0x${string}`,
          abi: RIVORA_ESCROW_ABI,
          functionName: 'createRoomETH',
          args: [roomIdBytes],
          value: parseEther(amount),
        });
      } else {
        // First approve, then create room with token
        const tokenAddress = selectedToken.address as `0x${string}`;
        const amountWei = parseUnits(amount, selectedToken.decimals);

        // Approve
        writeContract({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [RIVORA_ESCROW_ADDRESS as `0x${string}`, amountWei],
        });
      }
    } catch (error) {
      console.error('Error creating room:', error);
    }
  };

  // When transaction succeeds
  React.useEffect(() => {
    if (isSuccess && txHash) {
      const amountWei = selectedToken.type === 'ETH' 
        ? parseEther(amount).toString()
        : parseUnits(amount, selectedToken.decimals).toString();

      const reward: RewardConfig = {
        token: selectedToken,
        amount,
        amountWei,
        usdValue: parseFloat(amount) * (selectedToken.type === 'USDC' ? 1 : 3000), // Rough estimate
      };

      const roomId = uuidv4();
      onRoomCreated(roomId, reward, duration, txHash);
      onClose();
    }
  }, [isSuccess, txHash]);

  if (!isOpen) return null;

  const getBalance = () => {
    if (selectedToken.type === 'ETH') {
      return ethBalance ? parseFloat(ethBalance.formatted).toFixed(4) : '0';
    }
    if (selectedToken.type === 'USDC') {
      return usdcBalance ? parseFloat(usdcBalance.formatted).toFixed(2) : '0';
    }
    return '0';
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-rivora-panel border border-rivora-violet/30 rounded-lg w-full max-w-md shadow-[0_0_50px_rgba(124,58,237,0.2)]">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex justify-between items-center">
          <h2 className="text-xl font-display font-bold text-white">CREATE ROOM</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Token Selection */}
          {step === 'token' && (
            <div className="space-y-4">
              <p className="text-slate-400 text-sm mb-4">Select reward token:</p>
              
              {DEFAULT_TOKENS.map((token) => (
                <button
                  key={token.symbol}
                  onClick={() => handleTokenSelect(token)}
                  className="w-full p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-rivora-cyan/50 rounded-lg flex items-center gap-4 transition-all"
                >
                  <img 
                    src={token.logoUrl} 
                    alt={token.symbol} 
                    className="w-10 h-10 rounded-full"
                  />
                  <div className="text-left">
                    <div className="text-white font-bold">{token.symbol}</div>
                    <div className="text-xs text-slate-400">Base Network</div>
                  </div>
                </button>
              ))}

              <div className="pt-4 border-t border-white/10">
                <p className="text-sm text-slate-400 mb-2">Or use custom token:</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Token contract address"
                    value={customTokenAddress}
                    onChange={(e) => setCustomTokenAddress(e.target.value)}
                    className="flex-1 bg-rivora-dark border border-white/20 rounded px-3 py-2 text-white text-sm"
                  />
                  <Button size="sm" onClick={handleCustomToken}>
                    Add
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Amount */}
          {step === 'amount' && (
            <div className="space-y-4">
              <button onClick={() => setStep('token')} className="text-rivora-cyan text-sm flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>

              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                <img 
                  src={selectedToken.logoUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${selectedToken.symbol}`} 
                  alt={selectedToken.symbol} 
                  className="w-8 h-8 rounded-full"
                />
                <div>
                  <div className="text-white font-bold">{selectedToken.symbol}</div>
                  <div className="text-xs text-slate-400">Balance: {getBalance()}</div>
                </div>
              </div>

              <div>
                <label className="text-sm text-slate-400 block mb-2">Reward Amount</label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-rivora-dark border border-white/20 rounded px-4 py-3 text-2xl text-white font-mono focus:outline-none focus:border-rivora-cyan"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                    {selectedToken.symbol}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  5% platform fee will be deducted at room creation
                </p>
              </div>

              <Button 
                onClick={handleAmountSubmit} 
                disabled={!amount || parseFloat(amount) <= 0}
                className="w-full"
              >
                Continue
              </Button>
            </div>
          )}

          {/* Step 3: Duration */}
          {step === 'duration' && (
            <div className="space-y-4">
              <button onClick={() => setStep('amount')} className="text-rivora-cyan text-sm flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>

              <div>
                <label className="text-sm text-slate-400 block mb-2">Room Name</label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="Enter room name..."
                  className="w-full bg-rivora-dark border border-white/20 rounded px-4 py-3 text-white focus:outline-none focus:border-rivora-cyan"
                />
              </div>

              <div>
                <label className="text-sm text-slate-400 block mb-2">
                  Start Timer: {duration} minutes
                </label>
                <input
                  type="range"
                  min={MIN_DURATION_MINUTES}
                  max={MAX_DURATION_MINUTES}
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                  className="w-full accent-rivora-violet"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>{MIN_DURATION_MINUTES} min</span>
                  <span>{MAX_DURATION_MINUTES} min</span>
                </div>
              </div>

              <p className="text-sm text-slate-400">
                The game will start {duration} minutes after room creation (or when you manually start if min participants joined).
              </p>

              <Button onClick={handleDurationSubmit} className="w-full">
                Review
              </Button>
            </div>
          )}

          {/* Step 4: Confirm */}
          {step === 'confirm' && (
            <div className="space-y-4">
              <button onClick={() => setStep('duration')} className="text-rivora-cyan text-sm flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>

              <div className="bg-white/5 rounded-lg p-4 space-y-3">
                <h3 className="font-display font-bold text-white text-lg">
                  {roomName || 'Unnamed Arena'}
                </h3>
                
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Reward</span>
                  <span className="text-rivora-gold font-bold">
                    {amount} {selectedToken.symbol}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Platform Fee (5%)</span>
                  <span className="text-slate-300">
                    -{(parseFloat(amount) * 0.05).toFixed(4)} {selectedToken.symbol}
                  </span>
                </div>
                
                <div className="flex justify-between items-center border-t border-white/10 pt-3">
                  <span className="text-slate-400">Prize Pool</span>
                  <span className="text-rivora-emerald font-bold">
                    {(parseFloat(amount) * 0.95).toFixed(4)} {selectedToken.symbol}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Start In</span>
                  <span className="text-white">{duration} minutes</span>
                </div>
              </div>

              <p className="text-xs text-slate-500">
                By creating this room, {amount} {selectedToken.symbol} will be transferred to the escrow contract. 
                The winner will be able to claim the prize after the game ends.
              </p>

              <Button 
                onClick={handleCreateRoom} 
                isLoading={isPending || isConfirming}
                className="w-full"
              >
                {isPending ? 'Confirm in Wallet...' : isConfirming ? 'Creating Room...' : 'Create Room & Deposit'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
