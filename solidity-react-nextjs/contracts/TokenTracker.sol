// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract TokenTracker {
    struct TokenInfo {
        string symbol;
        string name;
        uint256 price;
        uint256 lastUpdated;
        bool isActive;
    }
    
    mapping(string => TokenInfo) public tokens;
    string[] public tokenSymbols;
    address public owner;
    uint256 public totalTrackedTokens;
    
    event TokenAdded(string indexed symbol, string name, uint256 price);
    event TokenUpdated(string indexed symbol, uint256 oldPrice, uint256 newPrice);
    event TokenRemoved(string indexed symbol);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    modifier tokenExists(string memory _symbol) {
        require(tokens[_symbol].isActive, "Token does not exist or is inactive");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        totalTrackedTokens = 0;
    }
    
    function addToken(
        string memory _symbol, 
        string memory _name, 
        uint256 _price
    ) public onlyOwner {
        require(!tokens[_symbol].isActive, "Token already exists");
        require(bytes(_symbol).length > 0, "Symbol cannot be empty");
        require(bytes(_name).length > 0, "Name cannot be empty");
        
        tokens[_symbol] = TokenInfo({
            symbol: _symbol,
            name: _name,
            price: _price,
            lastUpdated: block.timestamp,
            isActive: true
        });
        
        tokenSymbols.push(_symbol);
        totalTrackedTokens++;
        
        emit TokenAdded(_symbol, _name, _price);
    }
    
    function updateTokenPrice(
        string memory _symbol, 
        uint256 _newPrice
    ) public onlyOwner tokenExists(_symbol) {
        uint256 oldPrice = tokens[_symbol].price;
        tokens[_symbol].price = _newPrice;
        tokens[_symbol].lastUpdated = block.timestamp;
        
        emit TokenUpdated(_symbol, oldPrice, _newPrice);
    }
    
    function removeToken(string memory _symbol) public onlyOwner tokenExists(_symbol) {
        tokens[_symbol].isActive = false;
        totalTrackedTokens--;
        
        // Remove from array
        for (uint256 i = 0; i < tokenSymbols.length; i++) {
            if (keccak256(abi.encodePacked(tokenSymbols[i])) == keccak256(abi.encodePacked(_symbol))) {
                tokenSymbols[i] = tokenSymbols[tokenSymbols.length - 1];
                tokenSymbols.pop();
                break;
            }
        }
        
        emit TokenRemoved(_symbol);
    }
    
    function getToken(string memory _symbol) public view tokenExists(_symbol) returns (
        string memory symbol,
        string memory name,
        uint256 price,
        uint256 lastUpdated
    ) {
        TokenInfo memory token = tokens[_symbol];
        return (token.symbol, token.name, token.price, token.lastUpdated);
    }
    
    function getAllTokens() public view returns (string[] memory) {
        return tokenSymbols;
    }
    
    function getTokenCount() public view returns (uint256) {
        return totalTrackedTokens;
    }
    
    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
    
    function batchUpdatePrices(
        string[] memory _symbols, 
        uint256[] memory _prices
    ) public onlyOwner {
        require(_symbols.length == _prices.length, "Arrays length mismatch");
        
        for (uint256 i = 0; i < _symbols.length; i++) {
            if (tokens[_symbols[i]].isActive) {
                uint256 oldPrice = tokens[_symbols[i]].price;
                tokens[_symbols[i]].price = _prices[i];
                tokens[_symbols[i]].lastUpdated = block.timestamp;
                emit TokenUpdated(_symbols[i], oldPrice, _prices[i]);
            }
        }
    }
}