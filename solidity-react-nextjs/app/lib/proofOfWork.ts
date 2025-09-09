import { ethers } from 'ethers';

export class ProofOfWorkMiner {
  private userAddress: string;
  private blockNumber: number;

  constructor(userAddress: string, blockNumber: number) {
    this.userAddress = userAddress;
    this.blockNumber = blockNumber;
  }

  async mineNonce(
    difficulty: number, 
    progressCallback?: (nonce: number, hash: string, iterations: number) => void
  ): Promise<{ nonce: number; hash: string; iterations: number }> {
    const target = BigInt(2 ** (256 - difficulty * 4));
    let nonce = 0;
    let iterations = 0;
    const startTime = Date.now();

    while (true) {
      const hash = ethers.keccak256(
        ethers.solidityPacked(
          ['address', 'uint256', 'uint256'],
          [this.userAddress, this.blockNumber, nonce]
        )
      );

      iterations++;
      
      if (BigInt(hash) < target) {
        const endTime = Date.now();
        console.log(`Found valid nonce: ${nonce}`);
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

  static validateHash(userAddress: string, blockNumber: number, nonce: number, difficulty: number): boolean {
    const hash = ethers.keccak256(
      ethers.solidityPacked(
        ['address', 'uint256', 'uint256'],
        [userAddress, blockNumber, nonce]
      )
    );

    const target = BigInt(2 ** (256 - difficulty * 4));
    return BigInt(hash) < target;
  }

  static async mineForMultipleBlocks(
    userAddress: string, 
    startBlock: number, 
    difficulty: number,
    maxBlocks: number = 3,
    progressCallback?: (blockNumber: number, nonce: number, hash: string, iterations: number) => void
  ): Promise<{ blockNumber: number; nonce: number; hash: string; iterations: number }> {
    const target = BigInt(2 ** (256 - difficulty * 4));
    const results: { [blockNumber: number]: { nonce: number; hash: string } } = {};
    
    let totalIterations = 0;
    const startTime = Date.now();

    // Mine in parallel for multiple potential blocks
    for (let blockOffset = 0; blockOffset < maxBlocks; blockOffset++) {
      const targetBlock = startBlock + blockOffset;
      let nonce = 0;

      while (nonce < 100000) { // Reasonable limit per block
        const hash = ethers.keccak256(
          ethers.solidityPacked(
            ['address', 'uint256', 'uint256'],
            [userAddress, targetBlock, nonce]
          )
        );

        totalIterations++;
        
        if (BigInt(hash) < target) {
          results[targetBlock] = { nonce, hash };
          progressCallback?.(targetBlock, nonce, hash, totalIterations);
          console.log(`Found valid nonce for block ${targetBlock}: ${nonce}`);
        }

        nonce++;

        // Progress callback every 1000 iterations
        if (totalIterations % 1000 === 0) {
          const currentHash = ethers.keccak256(
            ethers.solidityPacked(
              ['address', 'uint256', 'uint256'],
              [userAddress, startBlock, nonce]
            )
          );
          progressCallback?.(startBlock, nonce, currentHash, totalIterations);
          await new Promise(resolve => setTimeout(resolve, 1));
        }

        // If we have solutions for all blocks, we can stop
        if (Object.keys(results).length === maxBlocks) {
          break;
        }
      }
    }

    // If we have any results, return the first one found
    const availableBlocks = Object.keys(results).map(Number).sort();
    if (availableBlocks.length > 0) {
      const selectedBlock = availableBlocks[0];
      const result = results[selectedBlock];
      return {
        blockNumber: selectedBlock,
        nonce: result.nonce,
        hash: result.hash,
        iterations: totalIterations
      };
    }

    throw new Error(`No valid nonce found for blocks ${startBlock} to ${startBlock + maxBlocks - 1} after ${totalIterations} iterations`);
  }

  static getValidNonceForBlock(
    userAddress: string,
    blockNumber: number,
    precomputedResults: { [blockNumber: number]: { nonce: number; hash: string } }
  ): { nonce: number; hash: string } | null {
    return precomputedResults[blockNumber] || null;
  }
}