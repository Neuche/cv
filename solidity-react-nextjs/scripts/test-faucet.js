const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

class ProofOfWorkMiner {
  constructor(userAddress, blockNumber) {
    this.userAddress = userAddress;
    this.blockNumber = blockNumber;
  }

  async mineNonce(difficulty) {
    const target = BigInt(2) ** BigInt(256 - difficulty * 4);
    let nonce = 0;
    let iterations = 0;
    const startTime = Date.now();

    console.log(`Mining with difficulty ${difficulty}, target: ${target.toString(16)}`);

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
        console.log(`Hash: ${hash}`);
        console.log(`Time taken: ${endTime - startTime}ms`);
        console.log(`Iterations: ${iterations}`);
        return { nonce, hash, iterations };
      }

      nonce++;

      if (iterations % 10000 === 0) {
        process.stdout.write(`\rTested ${iterations} nonces...`);
      }
    }
  }
}

async function testFaucet() {
  console.log('Testing Sepolia Faucet...');

  const deploymentPath = path.join(__dirname, '../deployment.json');
  if (!fs.existsSync(deploymentPath)) {
    console.error('deployment.json not found. Please deploy the contract first.');
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  const contractAddress = deployment.contractAddress;
  const abi = deployment.abi;

  const privateKey = process.env.PRIVATE_KEY;
  const rpcUrl = process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org';

  if (!privateKey) {
    console.error('Please set PRIVATE_KEY environment variable');
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  const contract = new ethers.Contract(contractAddress, abi, wallet);

  console.log('Contract address:', contractAddress);
  console.log('Testing from address:', wallet.address);

  try {
    console.log('\n1. Getting contract state...');
    const [balance, difficulty, blockNumber] = await Promise.all([
      contract.getContractBalance(),
      contract.getCurrentDifficulty(),
      provider.getBlockNumber()
    ]);

    console.log('Contract balance:', ethers.formatEther(balance), 'ETH');
    console.log('Current difficulty:', difficulty.toString());
    console.log('Current block number:', blockNumber);

    console.log('\n2. Mining proof of work...');
    const miner = new ProofOfWorkMiner(wallet.address, blockNumber);
    const { nonce } = await miner.mineNonce(Number(difficulty));

    console.log('\n3. Validating hash locally...');
    const hash = ethers.keccak256(
      ethers.solidityPacked(
        ['address', 'uint256', 'uint256'],
        [wallet.address, blockNumber, nonce]
      )
    );
    console.log('Computed hash:', hash);

    const target = BigInt(2) ** BigInt(256 - Number(difficulty) * 4);
    const isValid = BigInt(hash) < target;
    console.log('Hash is valid:', isValid);

    if (!isValid) {
      console.error('Invalid hash! Something went wrong.');
      process.exit(1);
    }

    console.log('\n4. Submitting claim transaction...');
    const initialBalance = await provider.getBalance(wallet.address);
    console.log('Initial balance:', ethers.formatEther(initialBalance), 'ETH');

    const tx = await contract.claimFaucet(nonce, {
      gasLimit: 200000
    });

    console.log('Transaction hash:', tx.hash);
    console.log('Waiting for confirmation...');

    const receipt = await tx.wait();
    console.log('Transaction confirmed in block:', receipt.blockNumber);

    const finalBalance = await provider.getBalance(wallet.address);
    const gained = finalBalance - initialBalance;
    console.log('Final balance:', ethers.formatEther(finalBalance), 'ETH');
    console.log('Net gain (after gas):', ethers.formatEther(gained), 'ETH');

    console.log('\n5. Checking event logs...');
    const logs = receipt.logs;
    for (const log of logs) {
      try {
        const parsed = contract.interface.parseLog(log);
        if (parsed.name === 'FaucetClaimed') {
          console.log('FaucetClaimed event:');
          console.log('  Claimer:', parsed.args.claimer);
          console.log('  Amount:', ethers.formatEther(parsed.args.amount), 'ETH');
          console.log('  Nonce:', parsed.args.nonce.toString());
          console.log('  Hash:', parsed.args.hash);
        }
      } catch (e) {
        // Ignore unparseable logs
      }
    }

    console.log('\n✅ Faucet test completed successfully!');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    if (error.reason) {
      console.error('Reason:', error.reason);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  testFaucet().catch(console.error);
}

module.exports = { testFaucet };