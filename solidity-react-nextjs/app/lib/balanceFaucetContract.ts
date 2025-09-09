import { ethers } from 'ethers';

const BALANCE_FAUCET_ABI = [
  "function claimFaucet(uint256 nonce) external",
  "function getCurrentDifficulty() external view returns (uint256)",
  "function getHashForNonce(address user, uint256 nonce) external view returns (bytes32)",
  "function getHashForNonceWithBalance(address user, uint256 balance, uint256 nonce) external pure returns (bytes32)",
  "function estimateWork(uint256 difficulty) external pure returns (uint256)",
  "function getContractInfo() external view returns (uint256 balance, uint256 totalClaimsCount, uint256 creationBlock, uint256 currentBlock)",
  "function getUserInfo(address user) external view returns (uint256 lastClaim, uint256 totalClaimedAmount, uint256 currentDifficulty, uint256 recentClaimsCount)",
  "function getOwnerInfo() external view returns (address contractOwner, uint256 currentBaseDifficulty, uint256 contractBalance, bool isCallerOwner)",
  "function getDifficultyInfo() external view returns (uint256 currentDifficulty, uint256 recentClaimsCount, uint256 expectedMiningTime, string memory difficultyDescription)",
  "function getRecentClaimsCount() external view returns (uint256)",
  "function getRecentClaimBlocks() external view returns (uint256[] memory)",
  "function setBaseDifficulty(uint256 newDifficulty) external",
  "function withdrawFunds(uint256 amount) external",
  "function withdrawAllFunds() external",
  "function transferOwnership(address newOwner) external",
  "function renounceOwnership() external",
  "function lastClaimBlock(address) external view returns (uint256)",
  "function totalClaimed(address) external view returns (uint256)",
  "function totalClaims() external view returns (uint256)",
  "function owner() external view returns (address)",
  "function baseDifficulty() external view returns (uint256)",
  "event FaucetClaimed(address indexed claimer, uint256 amount, uint256 nonce, bytes32 hash, uint256 balance)",
  "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)",
  "event BaseDifficultyChanged(uint256 oldDifficulty, uint256 newDifficulty)",
  "event FundsWithdrawn(address indexed owner, uint256 amount)"
];

export class BalanceFaucetContract {
  private contract: ethers.Contract;
  private provider: ethers.BrowserProvider;
  private signer?: ethers.Signer;

  constructor(contractAddress: string, provider: ethers.BrowserProvider) {
    this.provider = provider;
    this.contract = new ethers.Contract(contractAddress, BALANCE_FAUCET_ABI, provider);
  }

  async connect(): Promise<void> {
    this.signer = await this.provider.getSigner();
    this.contract = this.contract.connect(this.signer) as ethers.Contract;
  }

  async getCurrentDifficulty(): Promise<number> {
    try {
      const difficulty = await this.contract.getCurrentDifficulty();
      return Number(difficulty);
    } catch (error) {
      console.error('Error getting current difficulty:', error);
      throw error;
    }
  }

  async canClaim(userAddress: string): Promise<boolean> {
    try {
      const canClaim = await this.contract.canClaim(userAddress);
      return canClaim;
    } catch (error) {
      console.error('Error checking can claim:', error);
      throw error;
    }
  }

  async getBlocksUntilNextClaim(userAddress: string): Promise<number> {
    try {
      const blocks = await this.contract.getBlocksUntilNextClaim(userAddress);
      return Number(blocks);
    } catch (error) {
      console.error('Error getting blocks until next claim:', error);
      throw error;
    }
  }

  async claimFaucet(nonce: number): Promise<ethers.TransactionResponse> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    try {
      const tx = await this.contract.claimFaucet(nonce);
      return tx;
    } catch (error) {
      console.error('Error claiming faucet:', error);
      throw error;
    }
  }

  async getContractInfo(): Promise<{
    balance: string;
    totalClaims: number;
    creationBlock: number;
    currentBlock: number;
  }> {
    try {
      const [balance, totalClaims, creationBlock, currentBlock] = await this.contract.getContractInfo();
      return {
        balance: ethers.formatEther(balance),
        totalClaims: Number(totalClaims),
        creationBlock: Number(creationBlock),
        currentBlock: Number(currentBlock)
      };
    } catch (error) {
      console.error('Error getting contract info:', error);
      throw error;
    }
  }

  async getUserInfo(userAddress: string): Promise<{
    lastClaimBlock: number;
    totalClaimed: string;
    currentDifficulty: number;
    recentClaimsCount: number;
  }> {
    try {
      const [lastClaim, totalClaimed, difficulty, recentClaims] = await this.contract.getUserInfo(userAddress);
      return {
        lastClaimBlock: Number(lastClaim),
        totalClaimed: ethers.formatEther(totalClaimed),
        currentDifficulty: Number(difficulty),
        recentClaimsCount: Number(recentClaims)
      };
    } catch (error) {
      console.error('Error getting user info:', error);
      throw error;
    }
  }

  async getDifficultyInfo(): Promise<{
    currentDifficulty: number;
    recentClaimsCount: number;
    expectedMiningTime: number;
    difficultyDescription: string;
  }> {
    try {
      const [difficulty, recentClaims, miningTime, description] = await this.contract.getDifficultyInfo();
      return {
        currentDifficulty: Number(difficulty),
        recentClaimsCount: Number(recentClaims),
        expectedMiningTime: Number(miningTime),
        difficultyDescription: description
      };
    } catch (error) {
      console.error('Error getting difficulty info:', error);
      throw error;
    }
  }

  async getHashForNonce(userAddress: string, nonce: number): Promise<string> {
    try {
      const hash = await this.contract.getHashForNonce(userAddress, nonce);
      return hash;
    } catch (error) {
      console.error('Error getting hash for nonce:', error);
      throw error;
    }
  }

  async getHashForNonceWithBalance(userAddress: string, balance: bigint, nonce: number): Promise<string> {
    try {
      const hash = await this.contract.getHashForNonceWithBalance(userAddress, balance, nonce);
      return hash;
    } catch (error) {
      console.error('Error getting hash for nonce with balance:', error);
      throw error;
    }
  }

  async getCurrentBalance(): Promise<bigint> {
    try {
      return await this.provider.getBalance(await this.contract.getAddress());
    } catch (error) {
      console.error('Error getting current balance:', error);
      throw error;
    }
  }

  async getOwnerInfo(): Promise<{
    owner: string;
    baseDifficulty: number;
    contractBalance: string;
    isCallerOwner: boolean;
  }> {
    try {
      const [owner, baseDifficulty, contractBalance, isCallerOwner] = await this.contract.getOwnerInfo();
      return {
        owner: owner,
        baseDifficulty: Number(baseDifficulty),
        contractBalance: ethers.formatEther(contractBalance),
        isCallerOwner: isCallerOwner
      };
    } catch (error) {
      console.error('Error getting owner info:', error);
      throw error;
    }
  }

  async setBaseDifficulty(newDifficulty: number): Promise<ethers.TransactionResponse> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    try {
      const tx = await this.contract.setBaseDifficulty(newDifficulty);
      return tx;
    } catch (error) {
      console.error('Error setting base difficulty:', error);
      throw error;
    }
  }

  async withdrawFunds(amount: string): Promise<ethers.TransactionResponse> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    try {
      const amountWei = ethers.parseEther(amount);
      const tx = await this.contract.withdrawFunds(amountWei);
      return tx;
    } catch (error) {
      console.error('Error withdrawing funds:', error);
      throw error;
    }
  }

  async withdrawAllFunds(): Promise<ethers.TransactionResponse> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    try {
      const tx = await this.contract.withdrawAllFunds();
      return tx;
    } catch (error) {
      console.error('Error withdrawing all funds:', error);
      throw error;
    }
  }

  async transferOwnership(newOwner: string): Promise<ethers.TransactionResponse> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    try {
      const tx = await this.contract.transferOwnership(newOwner);
      return tx;
    } catch (error) {
      console.error('Error transferring ownership:', error);
      throw error;
    }
  }

  async renounceOwnership(): Promise<ethers.TransactionResponse> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    try {
      const tx = await this.contract.renounceOwnership();
      return tx;
    } catch (error) {
      console.error('Error renouncing ownership:', error);
      throw error;
    }
  }

  onFaucetClaimed(callback: (claimer: string, amount: string, nonce: number, hash: string, balance: string) => void): void {
    this.contract.on('FaucetClaimed', (claimer, amount, nonce, hash, balance) => {
      callback(claimer, ethers.formatEther(amount), Number(nonce), hash, ethers.formatEther(balance));
    });
  }

  onOwnershipTransferred(callback: (previousOwner: string, newOwner: string) => void): void {
    this.contract.on('OwnershipTransferred', (previousOwner, newOwner) => {
      callback(previousOwner, newOwner);
    });
  }

  onBaseDifficultyChanged(callback: (oldDifficulty: number, newDifficulty: number) => void): void {
    this.contract.on('BaseDifficultyChanged', (oldDifficulty, newDifficulty) => {
      callback(Number(oldDifficulty), Number(newDifficulty));
    });
  }

  onFundsWithdrawn(callback: (owner: string, amount: string) => void): void {
    this.contract.on('FundsWithdrawn', (owner, amount) => {
      callback(owner, ethers.formatEther(amount));
    });
  }

  async getRecentClaimsCount(): Promise<number> {
    try {
      const count = await this.contract.getRecentClaimsCount();
      return Number(count);
    } catch (error) {
      console.error('Error getting recent claims count:', error);
      throw error;
    }
  }

  async getRecentClaimBlocks(): Promise<number[]> {
    try {
      const blocks = await this.contract.getRecentClaimBlocks();
      return blocks.map((block: any) => Number(block));
    } catch (error) {
      console.error('Error getting recent claim blocks:', error);
      throw error;
    }
  }

  removeAllListeners(): void {
    this.contract.removeAllListeners();
  }
}