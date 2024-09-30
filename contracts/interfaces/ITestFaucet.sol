// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

interface ITestFaucet {
    function exchangeProxyAddress() external view returns (address);

    function exchangeMint(address _to, address _tokenAddr, uint256 _amount) external;

    function mint() external;

    function setExchangeProxyAddress(address _exchangeProxyAddress) external;

    function setTestTokens(address[5] memory _testTokens) external;
}
