# Ethereum Faucet & Token Tracker

A Next.js web application featuring a proof-of-work Ethereum faucet on Sepolia testnet with real-time token price tracking.

## Features

### 🚰 Balance-Based Ethereum Faucet
- **Proof-of-work mining** for 0.0001 Sepolia ETH rewards
- **Global network difficulty scaling** - difficulty adjusts based on total network activity in the last 100 blocks
- **Balance-based hashing** for reliable mining without timing issues
- **Owner management** - withdraw funds and adjust base difficulty
- **Real-time mining progress** with hash rate and time estimates

### 📊 Token Price Tracker
- Live cryptocurrency price feeds from Binance API
- Real-time price change indicators
- Auto-refreshing data every 30 seconds

### 🔗 Wallet Integration
- Connect MetaMask wallet
- Seamless Sepolia testnet integration
- Real-time balance and transaction tracking

## Prerequisites

- Node.js 18.17.0 or higher
- MetaMask wallet
- Sepolia testnet ETH (for gas fees)

## Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Copy environment variables:

```bash
cp .env.example .env.local
```

4. Update `.env.local` with your contract addresses and RPC URLs

## Development

Start the development server:

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

## Smart Contracts

### BalanceFaucet.sol
- **Location**: `contracts/BalanceFaucet.sol`
- **Features**: Global difficulty scaling, balance-based PoW, owner functions
- **Network**: Sepolia testnet
- **Functionality**: Proof-of-work mining for ETH rewards with dynamic difficulty

## How the Faucet Works

1. **Connect Wallet**: Connect your MetaMask to Sepolia testnet
2. **Start Mining**: Click the mining button to begin proof-of-work
3. **Difficulty Scaling**: Mining difficulty increases with network activity:
   - 0-1 recent claims: Base difficulty
   - 2-3 recent claims: Base + 1
   - 4-6 recent claims: Base + 2
   - 7-9 recent claims: Base + 3
   - 10-14 recent claims: Base + 4
   - 15-19 recent claims: Base + 5
   - 20+ recent claims: Base + 6 (maximum)
4. **Submit Solution**: Once a valid hash is found, submit the transaction
5. **Receive ETH**: Get 0.0001 Sepolia ETH on successful claim

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run prettier` - Format code with Prettier

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Blockchain**: Ethers.js v6, Solidity ^0.8.19
- **APIs**: Binance API for price data
- **Development**: ESLint, Prettier

## Project Structure

```
├── app/
│   ├── components/         # React components
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Contract interfaces and utilities
│   └── page.tsx           # Main application page
├── contracts/             # Solidity smart contracts
├── public/               # Static assets
├── scripts/              # Deployment scripts
└── .env.example         # Environment variables template
```

## Environment Variables

```bash
# Faucet Contract Address
NEXT_PUBLIC_BALANCE_FAUCET_ADDRESS=your_faucet_address

# Network Configuration
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
NEXT_PUBLIC_SEPOLIA_CHAIN_ID=11155111

# Deployment (for scripts)
PRIVATE_KEY=your_private_key_here
SEPOLIA_RPC_URL=https://rpc.sepolia.org
```

## License

MIT