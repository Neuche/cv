import { ethers } from 'ethers';

export class BalanceProofOfWorkMiner {
  private userAddress: string;
  private contractBalance: bigint;

  constructor(userAddress: string, contractBalance: bigint) {
    this.userAddress = userAddress;
    this.contractBalance = contractBalance;
  }

  async mineNonce(
    difficulty: number, 
    progressCallback?: (nonce: number, hash: string, iterations: number) => void
  ): Promise<{ nonce: number; hash: string; iterations: number }> {
    const target = BigInt(2 ** (256 - difficulty * 4));
    let nonce = 0;
    let iterations = 0;
    const startTime = Date.now();

    console.log(`Mining with balance: ${ethers.formatEther(this.contractBalance)} ETH`);
    console.log(`Target: ${target.toString(16)}`);
    console.log(`Difficulty: ${difficulty}`);

    while (true) {
      const hash = ethers.keccak256(
        ethers.solidityPacked(
          ['address', 'uint256', 'uint256'],
          [this.userAddress, this.contractBalance, nonce]
        )
      );

      iterations++;
      
      if (BigInt(hash) < target) {
        const endTime = Date.now();
        console.log(`Found valid nonce: ${nonce}`);
        console.log(`Hash: ${hash}`);
        console.log(`Time taken: ${endTime - startTime}ms`);
        console.log(`Iterations: ${iterations}`);
        return { nonce, hash, iterations };
      }

      nonce++;

      if (iterations % 1000 === 0) {
        progressCallback?.(nonce, hash, iterations);
        await new Promise(resolve => setTimeout(resolve, 1));
      }
    }
  }

  static calculateExpectedTime(difficulty: number): number {
    const expectedIterations = 2 ** (difficulty * 4);
    const iterationsPerSecond = 50000;
    return Math.round(expectedIterations / iterationsPerSecond);
  }

  static validateHash(userAddress: string, contractBalance: bigint, nonce: number, difficulty: number): boolean {
    const hash = ethers.keccak256(
      ethers.solidityPacked(
        ['address', 'uint256', 'uint256'],
        [userAddress, contractBalance, nonce]
      )
    );

    const target = BigInt(2 ** (256 - difficulty * 4));
    return BigInt(hash) < target;
  }

  static computeHash(userAddress: string, contractBalance: bigint, nonce: number): string {
    return ethers.keccak256(
      ethers.solidityPacked(
        ['address', 'uint256', 'uint256'],
        [userAddress, contractBalance, nonce]
      )
    );
  }

  // Helper method to test with specific balance
  static async testMiningWithBalance(
    userAddress: string,
    contractBalance: bigint,
    difficulty: number,
    maxAttempts: number = 10000
  ): Promise<{ nonce: number; hash: string } | null> {
    const target = BigInt(2 ** (256 - difficulty * 4));
    
    for (let nonce = 0; nonce < maxAttempts; nonce++) {
      const hash = ethers.keccak256(
        ethers.solidityPacked(
          ['address', 'uint256', 'uint256'],
          [userAddress, contractBalance, nonce]
        )
      );

      if (BigInt(hash) < target) {
        return { nonce, hash };
      }
    }
    
    return null;
  }
}