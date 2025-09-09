const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

async function deployBalanceFaucet() {
  console.log('Starting Balance-Based Sepolia Faucet deployment...');

  const privateKey = process.env.PRIVATE_KEY;
  const rpcUrl = process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org';

  if (!privateKey) {
    console.error('Please set PRIVATE_KEY environment variable');
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log('Deploying from address:', wallet.address);

  const balance = await provider.getBalance(wallet.address);
  console.log('Account balance:', ethers.formatEther(balance), 'ETH');

  const contractPath = path.join(__dirname, '../contracts/BalanceFaucet.sol');
  const contractSource = fs.readFileSync(contractPath, 'utf8');

  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);

  try {
    console.log('Compiling contract with solc...');
    const { stdout, stderr } = await execAsync(`solc --combined-json abi,bin ${contractPath}`);
    
    if (stderr) {
      console.error('Compilation warnings/errors:', stderr);
    }

    const compiled = JSON.parse(stdout);
    const contractName = 'BalanceFaucet.sol:BalanceFaucet';
    const contractData = compiled.contracts[contractName];

    if (!contractData) {
      console.error('Contract not found in compilation output');
      console.log('Available contracts:', Object.keys(compiled.contracts));
      process.exit(1);
    }

    const abi = JSON.parse(contractData.abi);
    const bytecode = '0x' + contractData.bin;

    console.log('Deploying BalanceFaucet contract...');
    const factory = new ethers.ContractFactory(abi, bytecode, wallet);
    
    const contract = await factory.deploy({
      gasLimit: 3000000,
      gasPrice: ethers.parseUnits('20', 'gwei')
    });

    console.log('Transaction sent:', contract.deploymentTransaction().hash);
    console.log('Waiting for deployment...');

    await contract.waitForDeployment();
    const contractAddress = await contract.getAddress();

    console.log('BalanceFaucet deployed successfully!');
    console.log('Contract address:', contractAddress);

    // Fund the contract
    const fundingAmount = ethers.parseEther('0.1');
    console.log(`Funding contract with ${ethers.formatEther(fundingAmount)} ETH...`);
    
    const fundTx = await wallet.sendTransaction({
      to: contractAddress,
      value: fundingAmount,
      gasLimit: 21000
    });

    await fundTx.wait();
    console.log('Contract funded successfully!');

    // Test basic contract functions
    console.log('Testing contract functions...');
    
    const contractInfo = await contract.getContractInfo();
    console.log('Contract balance:', ethers.formatEther(contractInfo[0]), 'ETH');
    console.log('Total claims:', contractInfo[1].toString());
    console.log('Creation block:', contractInfo[2].toString());
    console.log('Current block:', contractInfo[3].toString());

    const userInfo = await contract.getUserInfo(wallet.address);
    console.log('User can claim:', userInfo[3]);
    console.log('User difficulty:', userInfo[2].toString());

    // Test mining a nonce
    console.log('Testing proof-of-work mining...');
    const difficulty = Number(userInfo[2]);
    const contractBalance = contractInfo[0];
    
    console.log(`Mining with difficulty ${difficulty} and balance ${ethers.formatEther(contractBalance)} ETH...`);
    
    const target = BigInt(2 ** (256 - difficulty * 4));
    let nonce = 0;
    let foundValid = false;
    
    for (nonce = 0; nonce < 100000 && !foundValid; nonce++) {
      const hash = ethers.keccak256(
        ethers.solidityPacked(
          ['address', 'uint256', 'uint256'],
          [wallet.address, contractBalance, nonce]
        )
      );
      
      if (BigInt(hash) < target) {
        console.log(`Found valid nonce: ${nonce}`);
        console.log(`Hash: ${hash}`);
        foundValid = true;
        
        // Test the hash with contract
        const contractHash = await contract.getHashForNonceWithBalance(wallet.address, contractBalance, nonce);
        console.log('Contract hash matches:', hash === contractHash);
        break;
      }
    }

    if (!foundValid) {
      console.log('Could not find valid nonce in 100,000 attempts (this is normal for higher difficulties)');
    }

    const deploymentInfo = {
      contractAddress,
      deploymentBlock: await provider.getBlockNumber(),
      deployer: wallet.address,
      transactionHash: contract.deploymentTransaction().hash,
      fundingTransactionHash: fundTx.hash,
      abi,
      contractType: 'BalanceFaucet',
      fundingAmount: ethers.formatEther(fundingAmount),
      testNonce: foundValid ? nonce : null,
      timestamp: new Date().toISOString()
    };

    const deploymentPath = path.join(__dirname, '../balance-faucet-deployment.json');
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log('Deployment info saved to balance-faucet-deployment.json');

    console.log('\nNext steps:');
    console.log('1. Add this to your .env.local file:');
    console.log(`NEXT_PUBLIC_BALANCE_FAUCET_ADDRESS=${contractAddress}`);
    console.log('2. The new balance-based faucet will appear in your UI');
    console.log('3. Test the improved mining system with no block timing issues!');

  } catch (error) {
    console.error('Deployment failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  deployBalanceFaucet().catch(console.error);
}

module.exports = { deployBalanceFaucet };