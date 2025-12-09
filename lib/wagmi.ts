import { http, createConfig } from 'wagmi';
import { base } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '';

export const wagmiConfig = createConfig({
  chains: [base],
  connectors: [
    injected(),
    walletConnect({ projectId }),
  ],
  transports: {
    [base.id]: http(),
  },
});

// ERC20 ABI for token transfers
export const ERC20_ABI = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
] as const;

// Rivora Escrow Contract ABI
export const RIVORA_ESCROW_ABI = [
  {
    name: 'createRoom',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'roomId', type: 'bytes32' },
      { name: 'token', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'claimReward',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'roomId', type: 'bytes32' },
    ],
    outputs: [],
  },
  {
    name: 'cancelRoom',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'roomId', type: 'bytes32' },
    ],
    outputs: [],
  },
  {
    name: 'getRoomBalance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'roomId', type: 'bytes32' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'setWinner',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'roomId', type: 'bytes32' },
      { name: 'winner', type: 'address' },
    ],
    outputs: [],
  },
] as const;

// Contract address (to be deployed)
export const RIVORA_ESCROW_ADDRESS = import.meta.env.VITE_ESCROW_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000';
