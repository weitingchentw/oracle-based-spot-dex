// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "forge-std/Script.sol";
import "../contracts/ExchangeV1.sol";
import "../contracts/ExchangeProxy.sol";
import "../contracts/TestToken.sol";
import "../contracts/TestFaucet.sol";
import "../contracts/TestOracle.sol";

contract InitializeFullExchangeEnvironment is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address owner = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);
        console.log("Owner address:", owner);

        // ================================
        // Deploy Exchange and Its Proxy
        // ================================

        // Deploy implementation
        ExchangeV1 exchangeImpl = new ExchangeV1();
        console.log("ExchangeV1 implementation deployed at:", address(exchangeImpl));

        // Prepare initialization data
        bytes memory initData = abi.encodeWithSelector(ExchangeV1.initialize.selector);

        // Deploy proxy
        ExchangeProxy exchangeProxy = new ExchangeProxy(address(exchangeImpl), initData);
        console.log("ExchangeProxy deployed at:", address(exchangeProxy));

        // Setup exchange as the proxied ExchangeV1
        ExchangeV1 exchange = ExchangeV1(payable(address(exchangeProxy)));
        console.log("Exchange deployed at:", address(exchange));

        // ================================
        // Deploy Five Tokens
        // ================================

        // Deploy five tokens
        TestToken wbtc = new TestToken("Wrapped Bitcoin", "WBTC", 0x0000000000000000000000000000000000000000);
        TestToken usdc = new TestToken("Circle USD", "USDC", 0x0000000000000000000000000000000000000000);
        TestToken usdt = new TestToken("Tether", "USDT", 0x0000000000000000000000000000000000000000);
        TestToken dai = new TestToken("DAI", "DAI", 0x0000000000000000000000000000000000000000);
        TestToken weth = new TestToken("Wrapped ETH", "WETH", 0x0000000000000000000000000000000000000000);
        console.log("WBTC deployed at:", address(wbtc));
        console.log("USDC deployed at:", address(usdc));
        console.log("USDT deployed at:", address(usdt));
        console.log("DAI deployed at:", address(dai));
        console.log("WETH deployed at:", address(weth));

        // ================================
        // Deploy TestFaucet
        // ================================

        // Deploy a testFaucet
        TestFaucet testFaucet = new TestFaucet(
            [address(wbtc), address(usdc), address(usdt), address(dai), address(weth)], address(exchangeProxy)
        );
        console.log("Faucet deployed at:", address(testFaucet));

        // Set testFaucet's address to five tokens
        wbtc.setFaucetAddress(address(testFaucet));
        usdc.setFaucetAddress(address(testFaucet));
        usdt.setFaucetAddress(address(testFaucet));
        dai.setFaucetAddress(address(testFaucet));
        weth.setFaucetAddress(address(testFaucet));

        // ================================
        // Deploy & Set up Five Oracles
        // ================================
        TestOracle wbtcOracle = new TestOracle();
        TestOracle usdcOracle = new TestOracle();
        TestOracle usdtOracle = new TestOracle();
        TestOracle daiOracle = new TestOracle();
        TestOracle wethOracle = new TestOracle();

        console.log("WBTC's Oracle deployed at:", address(wbtcOracle));
        console.log("USDC's Oracle deployed at:", address(usdcOracle));
        console.log("USDT's Oracle deployed at:", address(usdtOracle));
        console.log("DAI's Oracle deployed at:", address(daiOracle));
        console.log("WETH's Oracle deployed at:", address(wethOracle));

        // Add a mock price to each oracle if it's for testing purpose
        if (vm.envBool("IS_TESTING")) {
            wbtcOracle.updateRoundData(
                TestOracle.RoundData({
                    roundId: 0,
                    answer: 6900000000000, // $69,000.00000000 (8 decimal places)
                    startedAt: block.timestamp,
                    updatedAt: block.timestamp,
                    answeredInRound: 0
                })
            );
            usdcOracle.updateRoundData(
                TestOracle.RoundData({
                    roundId: 0,
                    answer: 100000000, // $1.00000000 (8 decimal places)
                    startedAt: block.timestamp,
                    updatedAt: block.timestamp,
                    answeredInRound: 0
                })
            );
            usdtOracle.updateRoundData(
                TestOracle.RoundData({
                    roundId: 0,
                    answer: 100010000, // $1.00010000 (8 decimal places)
                    startedAt: block.timestamp,
                    updatedAt: block.timestamp,
                    answeredInRound: 0
                })
            );
            daiOracle.updateRoundData(
                TestOracle.RoundData({
                    roundId: 0,
                    answer: 100100000, // $1.00100000 (8 decimal places)
                    startedAt: block.timestamp,
                    updatedAt: block.timestamp,
                    answeredInRound: 0
                })
            );
            wethOracle.updateRoundData(
                TestOracle.RoundData({
                    roundId: 0,
                    answer: 420000000000, // $4,200.00000000 (8 decimal places)
                    startedAt: block.timestamp,
                    updatedAt: block.timestamp,
                    answeredInRound: 0
                })
            );
        }

        // ================================
        // Set up States on ExchangeImpl
        // ================================

        // Set TestFaucet's address
        exchange.setFaucet(address(testFaucet));

        // Set asset and oracle pairing
        exchange.setOracle(address(wbtc), address(wbtcOracle));
        exchange.setOracle(address(usdc), address(usdcOracle));
        exchange.setOracle(address(usdt), address(usdtOracle));
        exchange.setOracle(address(dai), address(daiOracle));
        exchange.setOracle(address(weth), address(wethOracle));

        // Set Exchange Fees for Every Possible Path - 0.1% (10) for non-stable pairs while 0.04% (4) for stable pairs
        exchange.setSwapFee(address(wbtc), address(usdc), 10);
        exchange.setSwapFee(address(wbtc), address(usdt), 10);
        exchange.setSwapFee(address(wbtc), address(dai), 10);
        exchange.setSwapFee(address(wbtc), address(weth), 10);

        exchange.setSwapFee(address(usdc), address(wbtc), 10);
        exchange.setSwapFee(address(usdc), address(usdt), 4);
        exchange.setSwapFee(address(usdc), address(dai), 4);
        exchange.setSwapFee(address(usdc), address(weth), 10);

        exchange.setSwapFee(address(usdt), address(wbtc), 10);
        exchange.setSwapFee(address(usdt), address(usdc), 4);
        exchange.setSwapFee(address(usdt), address(dai), 4);
        exchange.setSwapFee(address(usdt), address(weth), 10);

        exchange.setSwapFee(address(dai), address(wbtc), 10);
        exchange.setSwapFee(address(dai), address(usdc), 4);
        exchange.setSwapFee(address(dai), address(usdt), 4);
        exchange.setSwapFee(address(dai), address(weth), 10);

        exchange.setSwapFee(address(weth), address(wbtc), 10);
        exchange.setSwapFee(address(weth), address(usdc), 10);
        exchange.setSwapFee(address(weth), address(usdt), 10);
        exchange.setSwapFee(address(weth), address(dai), 10);

        if (vm.envBool("IS_TESTING")) {
            exchange.setStartingTime(uint32(block.timestamp));
            exchange.setClosingTime(uint32(block.timestamp + 2 weeks));

            exchange.setIsPaused(false);
        } else {
            exchange.setStartingTime(uint32(block.timestamp + 1 weeks));
            exchange.setClosingTime(uint32(block.timestamp + 2 weeks));

            exchange.setIsPaused(true);
        }

        vm.stopBroadcast();

        console.log("Deployment and initialization completed");
    }
}
