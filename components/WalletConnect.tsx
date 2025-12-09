import React from 'react';
import { useAccount, useConnect, useDisconnect, useBalance } from 'wagmi';
import { Button } from './Button';

export const WalletConnect: React.FC = () => {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({ address });

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        <div className="bg-rivora-panel border border-white/10 rounded px-3 py-2">
          <div className="text-xs text-slate-400">Balance</div>
          <div className="text-sm text-white font-mono">
            {balance ? `${parseFloat(balance.formatted).toFixed(4)} ${balance.symbol}` : '...'}
          </div>
        </div>
        <div className="bg-rivora-panel border border-rivora-cyan/30 rounded px-3 py-2">
          <div className="text-xs text-slate-400">Wallet</div>
          <div className="text-sm text-rivora-cyan font-mono">
            {address.slice(0, 6)}...{address.slice(-4)}
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => disconnect()}
        >
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      {connectors.map((connector) => (
        <Button
          key={connector.uid}
          onClick={() => connect({ connector })}
          isLoading={isPending}
          size="sm"
        >
          Connect {connector.name}
        </Button>
      ))}
    </div>
  );
};
