// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TestToken is ERC20, Ownable {
    address public faucetAddress;

    constructor(string memory name, string memory symbol, address _faucetAddress)
        ERC20(name, symbol)
        Ownable(msg.sender)
    {
        faucetAddress = _faucetAddress;
    }

    function mint(address _recipient, uint256 _amount) external {
        require(msg.sender == faucetAddress, "Not from faucet");
        _mint(_recipient, _amount);
    }

    function setFaucetAddress(address _faucetAddress) external onlyOwner {
        faucetAddress = _faucetAddress;
    }
}
