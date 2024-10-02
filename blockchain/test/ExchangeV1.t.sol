// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import "../contracts/ExchangeV1.sol";
import "../contracts/ExchangeProxy.sol";
import "../contracts/TestOracle.sol";
import "../contracts/TestToken.sol";
import "../contracts/TestFaucet.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract ExchangeV1Test is Test {
    ExchangeV1 exchangeImpl;
    ExchangeProxy exchangeProxy;
    ExchangeV1 exchange;
    TestOracle testOracle;
    TestOracle testOracle2;
    TestFaucet testFaucet;

    address owner = address(1);
    address user1 = address(2);
    address user2 = address(3);

    address testTokenAddr; // from token
    address testToken2Addr; // to token
    address testToken3Addr;
    address testToken4Addr;
    address testToken5Addr;

    function setUp() public {
        // Deploy implementation
        exchangeImpl = new ExchangeV1();

        // Deploy proxy
        bytes memory initData = abi.encodeWithSelector(ExchangeV1.initialize.selector);
        exchangeProxy = new ExchangeProxy(address(exchangeImpl), initData);

        // Setup exchange as the proxied ExchangeV1
        exchange = ExchangeV1(payable(address(exchangeProxy)));

        owner = exchange.owner();

        vm.startPrank(owner);

        // Deploy five test tokens
        TestToken testToken = new TestToken("Ethereum", "ETH", address(0));
        TestToken testToken2 = new TestToken("Bitcoin", "BTC", address(0));
        TestToken testToken3 = new TestToken("Wrapped Staked ETH", "wstETH", address(0));
        TestToken testToken4 = new TestToken("Doge Coin", "DOGE", address(0));
        TestToken testToken5 = new TestToken("Synthetix", "SNX", address(0));

        testTokenAddr = address(testToken);
        testToken2Addr = address(testToken2);
        testToken3Addr = address(testToken3);
        testToken4Addr = address(testToken4);
        testToken5Addr = address(testToken5);

        // Set up test faucet
        testFaucet = new TestFaucet(
            [testTokenAddr, testToken2Addr, testToken3Addr, testToken4Addr, testToken5Addr], address(exchangeProxy)
        );

        // Set the correct faucet address for each token
        testToken.setFaucetAddress(address(testFaucet));
        testToken2.setFaucetAddress(address(testFaucet));
        testToken3.setFaucetAddress(address(testFaucet));
        testToken4.setFaucetAddress(address(testFaucet));
        testToken5.setFaucetAddress(address(testFaucet));

        // Deploy mock oracles
        testOracle = new TestOracle();
        testOracle2 = new TestOracle();

        // Add data to mock Oracle1
        uint8 oracleDecimals = testOracle.decimals();
        int256 scaledAnswer = 3000 * int256(10 ** oracleDecimals);
        TestOracle.RoundData memory newRoundData = TestOracle.RoundData({
            roundId: 1,
            answer: scaledAnswer,
            startedAt: block.timestamp,
            updatedAt: block.timestamp,
            answeredInRound: 1
        });
        testOracle.updateRoundData(newRoundData);

        uint8 oracle2Decimals = testOracle2.decimals();
        int256 scaledAnswer2 = 60000 * int256(10 ** oracle2Decimals); // 60000 USD
        TestOracle.RoundData memory newRoundData2 = TestOracle.RoundData({
            roundId: 1,
            answer: scaledAnswer2,
            startedAt: block.timestamp,
            updatedAt: block.timestamp,
            answeredInRound: 1
        });
        testOracle2.updateRoundData(newRoundData2);

        // Setup initial state
        exchange.setFaucet(address(testFaucet));
        exchange.setOracle(testTokenAddr, address(testOracle));
        exchange.setOracle(testToken2Addr, address(testOracle2));
        exchange.setSwapFee(testTokenAddr, testToken2Addr, 10); // 0.1%
        exchange.setStartingTime(uint32(block.timestamp - 1));
        exchange.setClosingTime(uint32(block.timestamp + 1 weeks));
        exchange.setIsPaused(false);
        vm.stopPrank();
    }

    function testSendEthToExchange() public {
        vm.startPrank(user2);
        vm.deal(user2, 1 ether);
        vm.expectRevert();
        payable(address(exchange)).transfer(1 ether);
        vm.stopPrank();
    }

    function testExchangeOwnership() public view {
        assertEq(exchange.owner(), owner);
    }

    function testMintFromFaucet() public {
        vm.startPrank(user1);
        uint256 testTokenBalanceInitial = ERC20(testTokenAddr).balanceOf(user1);
        testFaucet.mint();
        uint256 testTokenBalanceAfterMint = ERC20(testTokenAddr).balanceOf(user1);
        assertEq(
            testTokenBalanceAfterMint,
            testTokenBalanceInitial + testFaucet.getMintAmountPerToken(),
            "Mint is not successful"
        );
        vm.stopPrank();
    }

    function testPlaceAndSettleOrder() public {
        uint256 fromAmount = 1e16;

        vm.startPrank(user1);
        testFaucet.mint();

        uint256 testTokenAmountInitial = ERC20(testTokenAddr).balanceOf(user1);
        uint256 testToken2AmountInitial = ERC20(testToken2Addr).balanceOf(user1);

        ERC20(testTokenAddr).approve(address(exchangeProxy), 1e30);
        exchange.placeOrder(testTokenAddr, fromAmount, testToken2Addr);

        vm.warp(block.timestamp + 121); // Fast forward 2 minutes and 1 second
        exchange.settleOrder();

        uint256 testTokenAmountAfterOrderSettled = ERC20(testTokenAddr).balanceOf(user1);
        assertEq(
            testTokenAmountAfterOrderSettled, testTokenAmountInitial - fromAmount, "Used amount to trade is incorrect"
        );
        uint256 testToken2AmountAfterOrderSettled = ERC20(testToken2Addr).balanceOf(user1);
        uint256 testToken2ReceivedAmount = testToken2AmountAfterOrderSettled - testToken2AmountInitial;

        // Get the latest round data from testToken and testToken2
        (, int256 testTokenPrice,,,) = testOracle.latestRoundData();
        (, int256 testToken2Price,,,) = testOracle2.latestRoundData();

        require(testTokenPrice > 0 && testToken2Price > 0, "Negative prices not allowed");

        // Convert prices to uint256
        uint256 testTokenPriceUint = uint256(testTokenPrice);
        uint256 testToken2PriceUint = uint256(testToken2Price);

        // Calculate expected amount, considering potential fees
        uint256 fee = exchange.getSwapFee(testTokenAddr, testToken2Addr);
        uint256 fromAmountAfterFee = fromAmount * (10000 - fee) / 10000;
        uint256 testToken2ShouldReceivedAmount = fromAmountAfterFee * testTokenPriceUint / testToken2PriceUint;

        // Compare received amount with expected amount, allowing for some small deviation due to rounding
        uint256 tolerance = testToken2ShouldReceivedAmount / 100000; // 0.001% tolerance
        assertApproxEqAbs(
            testToken2ReceivedAmount, testToken2ShouldReceivedAmount, tolerance, "Received amount is not as expected"
        );
        vm.stopPrank();
    }

    function testPlaceOrderAfterClosingTime() public {
        // Change the closing time
        vm.startPrank(owner);
        exchange.setClosingTime(uint32(block.timestamp));
        vm.stopPrank();

        vm.warp(block.timestamp + 1);

        vm.startPrank(user1);
        testFaucet.mint();
        vm.expectRevert("Competition has concluded.");
        exchange.placeOrder(testTokenAddr, 1000000, testToken2Addr);
        vm.stopPrank();
    }

    function testSettleOrderPrematurely() public {
        testFaucet.mint();
        exchange.placeOrder(testTokenAddr, 1000000, testToken2Addr);
        vm.warp(block.timestamp + 1);
        vm.expectRevert("Haven't passed 2 minutes since order's submission");
        exchange.settleOrder();
    }

    function testUpgrade() public {
        // Deploy new implementation
        ExchangeV1 newImpl = new ExchangeV1();

        vm.prank(owner);
        (bool success,) =
            address(exchange).call(abi.encodeWithSignature("upgradeToAndCall(address,bytes)", address(newImpl), ""));
        require(success, "Upgrade failed");

        // Verify upgrade
        address currentImpl = address(
            uint160(
                uint256(vm.load(address(exchange), 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc))
            )
        );
        assertEq(currentImpl, address(newImpl), "Upgrade did not change the implementation address");
    }
}
