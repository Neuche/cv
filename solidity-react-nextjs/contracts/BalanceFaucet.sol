// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract BalanceFaucet {
    uint256 public constant FAUCET_AMOUNT = 0.0001 ether;
    uint256 public baseDifficulty = 4;
    
    address public owner;
    
    // Reentrancy protection
    bool private _locked;
    
    mapping(address => uint256) public lastClaimBlock;
    mapping(address => uint256) public totalClaimed;
    
    uint256 public totalClaims;
    uint256 public contractCreationBlock;
    
    // Track recent claims for global difficulty calculation
    uint256[] public recentClaimBlocks;
    uint256 public constant DIFFICULTY_WINDOW = 100;
    
    event FaucetClaimed(
        address indexed claimer, 
        uint256 amount, 
        uint256 nonce, 
        bytes32 hash, 
        uint256 balance
    );
    
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event BaseDifficultyChanged(uint256 oldDifficulty, uint256 newDifficulty);
    event FundsWithdrawn(address indexed owner, uint256 amount);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    modifier nonReentrant() {
        require(!_locked, "ReentrancyGuard: reentrant call");
        _locked = true;
        _;
        _locked = false;
    }
    
    constructor() {
        owner = msg.sender;
        contractCreationBlock = block.number;
        emit OwnershipTransferred(address(0), msg.sender);
    }
    
    function claimFaucet(uint256 nonce) external nonReentrant {
        require(nonce > 0 && nonce <= type(uint256).max / 2, "Invalid nonce value");
        require(address(this).balance >= FAUCET_AMOUNT, "Insufficient faucet balance");
        
        uint256 currentBalance = address(this).balance;
        uint256 difficulty = getCurrentDifficulty();
        
        // Hash includes: user address + contract balance + nonce
        bytes32 hash = keccak256(abi.encodePacked(msg.sender, currentBalance, nonce));
        
        require(meetsProofOfWork(hash, difficulty), "Invalid proof of work");
        
        // Update state before transfer to prevent reentrancy
        // Add overflow protection
        require(totalClaimed[msg.sender] <= type(uint256).max - FAUCET_AMOUNT, "Overflow protection");
        require(totalClaims < type(uint256).max, "Total claims overflow protection");
        
        lastClaimBlock[msg.sender] = block.number;
        totalClaimed[msg.sender] += FAUCET_AMOUNT;
        totalClaims++;
        
        // Track this claim for global difficulty calculation
        recentClaimBlocks.push(block.number);
        
        // Keep only claims from last 50 blocks to prevent unbounded growth
        _cleanupOldClaims();
        
        // Transfer funds using call for better gas handling
        (bool success, ) = payable(msg.sender).call{value: FAUCET_AMOUNT}("");
        require(success, "Transfer failed");
        
        emit FaucetClaimed(msg.sender, FAUCET_AMOUNT, nonce, hash, currentBalance);
    }
    
    function getCurrentDifficulty() public view returns (uint256) {
        // Difficulty based on total claims in last 50 blocks - global spam protection
        uint256 recentClaimsCount = getRecentClaimsCount();
        
        if (recentClaimsCount == 0) {
            return baseDifficulty; // No recent claims, base difficulty
        } else if (recentClaimsCount >= 20) {
            // Very high activity (20+ claims in 50 blocks)
            return baseDifficulty + 6; // ~64x harder mining
        } else if (recentClaimsCount >= 15) {
            // High activity (15-19 claims in 50 blocks)
            return baseDifficulty + 5; // ~32x harder mining
        } else if (recentClaimsCount >= 10) {
            // Moderate-high activity (10-14 claims in 50 blocks)
            return baseDifficulty + 4; // ~16x harder mining
        } else if (recentClaimsCount >= 7) {
            // Moderate activity (7-9 claims in 50 blocks)
            return baseDifficulty + 3; // ~8x harder mining
        } else if (recentClaimsCount >= 4) {
            // Low-moderate activity (4-6 claims in 50 blocks)
            return baseDifficulty + 2; // ~4x harder mining
        } else if (recentClaimsCount >= 2) {
            // Low activity (2-3 claims in 50 blocks)
            return baseDifficulty + 1; // ~2x harder mining
        } else {
            // Very low activity (1 claim in 50 blocks)
            return baseDifficulty;
        }
    }
    
    
    function getDifficultyInfo() public view returns (
        uint256 currentDifficulty,
        uint256 recentClaimsCount,
        uint256 expectedMiningTime,
        string memory difficultyDescription
    ) {
        currentDifficulty = getCurrentDifficulty();
        recentClaimsCount = getRecentClaimsCount();
        
        if (recentClaimsCount == 0) {
            difficultyDescription = "No recent activity - base difficulty";
        } else if (recentClaimsCount >= 20) {
            difficultyDescription = "Very high network activity - maximum difficulty";
        } else if (recentClaimsCount >= 15) {
            difficultyDescription = "High network activity - very hard mining";
        } else if (recentClaimsCount >= 10) {
            difficultyDescription = "Moderate-high network activity - hard mining";
        } else if (recentClaimsCount >= 7) {
            difficultyDescription = "Moderate network activity - increased difficulty";
        } else if (recentClaimsCount >= 4) {
            difficultyDescription = "Low-moderate network activity - slight increase";
        } else if (recentClaimsCount >= 2) {
            difficultyDescription = "Low network activity - minor increase";
        } else {
            difficultyDescription = "Minimal network activity - near base difficulty";
        }
        
        // Rough estimation: 2^(difficulty*4) iterations at ~50k iterations/second
        expectedMiningTime = (2 ** (currentDifficulty * 4)) / 50000;
    }
    
    function meetsProofOfWork(bytes32 hash, uint256 difficulty) internal pure returns (bool) {
        require(difficulty <= 20, "Difficulty too high"); // Prevent overflow
        require(difficulty * 4 <= 256, "Invalid difficulty calculation");
        
        // Require 'difficulty * 4' leading zero bits
        uint256 target = 2 ** (256 - difficulty * 4);
        return uint256(hash) < target;
    }
    
    function getHashForNonce(address user, uint256 nonce) external view returns (bytes32) {
        uint256 currentBalance = address(this).balance;
        return keccak256(abi.encodePacked(user, currentBalance, nonce));
    }
    
    function getHashForNonceWithBalance(address user, uint256 balance, uint256 nonce) external pure returns (bytes32) {
        require(user != address(0), "User cannot be zero address");
        require(nonce > 0 && nonce <= type(uint256).max / 2, "Invalid nonce value");
        return keccak256(abi.encodePacked(user, balance, nonce));
    }
    
    function estimateWork(uint256 difficulty) external pure returns (uint256) {
        require(difficulty > 0 && difficulty <= 20, "Invalid difficulty range");
        require(difficulty * 4 <= 256, "Difficulty calculation overflow");
        return 2 ** (difficulty * 4);
    }
    
    function getContractInfo() external view returns (
        uint256 balance,
        uint256 totalClaimsCount,
        uint256 creationBlock,
        uint256 currentBlock
    ) {
        return (
            address(this).balance,
            totalClaims,
            contractCreationBlock,
            block.number
        );
    }
    
    function getUserInfo(address user) external view returns (
        uint256 lastClaim,
        uint256 totalClaimedAmount,
        uint256 currentDifficulty,
        uint256 recentClaimsCount
    ) {
        return (
            lastClaimBlock[user],
            totalClaimed[user],
            getCurrentDifficulty(),
            getRecentClaimsCount()
        );
    }
    
    // Owner Functions
    function setBaseDifficulty(uint256 newDifficulty) external onlyOwner {
        require(newDifficulty >= 1 && newDifficulty <= 10, "Difficulty must be between 1 and 10");
        require(newDifficulty != baseDifficulty, "Same difficulty already set");
        
        // Additional validation for extreme values
        require(newDifficulty * 4 <= 256, "Difficulty calculation overflow protection");
        
        uint256 oldDifficulty = baseDifficulty;
        baseDifficulty = newDifficulty;
        emit BaseDifficultyChanged(oldDifficulty, newDifficulty);
    }
    
    function withdrawFunds(uint256 amount) external onlyOwner {
        require(amount > 0 && amount <= address(this).balance, "Invalid withdrawal amount");
        require(amount <= 10 ether, "Amount too large for single withdrawal");
        require(owner != address(0), "Owner cannot be zero address");
        
        uint256 contractBalance = address(this).balance;
        require(contractBalance >= amount, "Insufficient contract balance");
        
        (bool success, ) = payable(owner).call{value: amount}("");
        require(success, "Withdrawal failed");
        emit FundsWithdrawn(owner, amount);
    }
    
    function withdrawAllFunds() external onlyOwner {
        require(owner != address(0), "Owner cannot be zero address");
        
        uint256 amount = address(this).balance;
        require(amount > 0, "No funds to withdraw");
        require(amount <= 100 ether, "Use withdrawFunds for large amounts");
        
        (bool success, ) = payable(owner).call{value: amount}("");
        require(success, "Withdrawal failed");
        emit FundsWithdrawn(owner, amount);
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        require(newOwner != owner, "New owner must be different from current owner");
        
        address oldOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
    
    function renounceOwnership() external onlyOwner {
        address oldOwner = owner;
        owner = address(0);
        emit OwnershipTransferred(oldOwner, address(0));
    }
    
    // View functions for owner info
    function getOwnerInfo() external view returns (
        address contractOwner,
        uint256 currentBaseDifficulty,
        uint256 contractBalance,
        bool isCallerOwner
    ) {
        return (
            owner,
            baseDifficulty,
            address(this).balance,
            msg.sender == owner
        );
    }
    
    // Helper functions for global difficulty calculation
    function getRecentClaimsCount() public view returns (uint256) {
        uint256 count = 0;
        uint256 currentBlock = block.number;
        
        for (uint256 i = 0; i < recentClaimBlocks.length; i++) {
            if (currentBlock - recentClaimBlocks[i] <= DIFFICULTY_WINDOW) {
                count++;
            }
        }
        
        return count;
    }
    
    function _cleanupOldClaims() private {
        uint256 currentBlock = block.number;
        uint256 writeIndex = 0;
        
        // Gas limit protection: limit iterations to prevent DoS
        uint256 maxIterations = recentClaimBlocks.length > 1000 ? 1000 : recentClaimBlocks.length;
        
        // Remove claims older than DIFFICULTY_WINDOW blocks
        for (uint256 i = 0; i < maxIterations; i++) {
            if (currentBlock - recentClaimBlocks[i] <= DIFFICULTY_WINDOW) {
                if (writeIndex != i) {
                    recentClaimBlocks[writeIndex] = recentClaimBlocks[i];
                }
                writeIndex++;
            }
        }
        
        // Truncate array to remove old entries (limited iterations)
        uint256 removeCount = 0;
        while (recentClaimBlocks.length > writeIndex && removeCount < 100) {
            recentClaimBlocks.pop();
            removeCount++;
        }
    }
    
    function getRecentClaimBlocks() external view returns (uint256[] memory) {
        return recentClaimBlocks;
    }
    
    // Allow contract to receive ETH
    receive() external payable {
        // Contract can receive ETH for the faucet
    }
}