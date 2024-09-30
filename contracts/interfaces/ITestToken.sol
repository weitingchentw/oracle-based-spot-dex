// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface ITestToken is IERC20 {
    function faucetAddress() external view returns (address);

    function mint(address _recipient, uint256 _amount) external;
}
