// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import {ITestToken} from "./interfaces/ITestToken.sol";

contract TestFaucet is Ownable {
    address public exchangeProxyAddress;
    mapping(address => uint256) mappingAddressMintBatch;
    uint256 testTokensBatch = 1;
    address[5] testTokens;
    uint256 mintAmountPerToken = 1e18;

    constructor(address[5] memory _testTokens, address _exchangeProxyAddress) Ownable(msg.sender) {
        testTokens = _testTokens;
        exchangeProxyAddress = _exchangeProxyAddress;
    }

    function exchangeMint(address _to, address _tokenAddr, uint256 _amount) external {
        require(msg.sender == exchangeProxyAddress, "Not from Exchange");
        ITestToken(_tokenAddr).mint(_to, _amount);
    }

    function mint() external {
        require(mappingAddressMintBatch[msg.sender] < testTokensBatch, "Have minted already");
        mappingAddressMintBatch[msg.sender] = testTokensBatch;
        for (uint8 i = 0; i < testTokens.length; i++) {
            ITestToken(testTokens[i]).mint(msg.sender, mintAmountPerToken);
        }
    }

    function getMintAmountPerToken() public view returns (uint256) {
        return mintAmountPerToken;
    }

    function setExchangeProxyAddress(address _exchangeProxyAddress) external onlyOwner {
        exchangeProxyAddress = _exchangeProxyAddress;
    }

    function setTestTokens(address[5] memory _testTokens) external onlyOwner {
        testTokens = _testTokens;
        testTokensBatch += 1;
    }
}
