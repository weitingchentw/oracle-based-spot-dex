// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.17;

import {TestOracle} from "./TestOracle.sol";
import {ITestFaucet} from "./interfaces/ITestFaucet.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

/// @title Exchange contract
/// @author Weiting Chen
contract ExchangeV1 is ReentrancyGuard, Initializable, UUPSUpgradeable, OwnableUpgradeable {
    using SafeERC20 for IERC20;

    struct Order {
        address trader;
        address from;
        address to;
        uint256 fromAmount;
        bool settled;
        uint256 submissionTimeStamp;
    }

    address internal testFaucetAddr;
    bool public isPaused = true;
    uint32 competitionStartingTime;
    uint32 competitionClosingTime;

    function initialize() public initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    mapping(address => Order) internal traderOrder; // trader -> Order. One trader can only hold one orderID at a time.
    mapping(address => address) internal tokenOracleMapping;
    mapping(address => mapping(address => uint8)) internal pathFeesMapping; // _fromToken -> _toToken -> fee in 0.01%. e.g. fee = 4 then it means the fees is 0.04%, 10 means 0.1%

    event feeSet(address from, address to, uint8 fee);
    event oracleSet(address asset, address oracle);
    event OrderPlaced(
        address trader, address from, address to, uint256 fromAmount, int256 fromTokenPrice, int256 toTokenPrice
    );
    event OrderSettled(
        address trader,
        address from,
        address to,
        uint256 fromAmount,
        uint256 toAmount,
        int256 fromTokenPrice,
        int256 toTokenPrice,
        uint256 feeAmount
    );

    constructor() {}

    modifier duringCompetitionOnly() {
        _checkCompetitionOngoing();
        _;
    }

    modifier notIsPaused() {
        require(isPaused == false, "The system is paused.");
        _;
    }

    function _checkCompetitionOngoing() internal view virtual {
        require(block.timestamp > competitionStartingTime, "Competition hasn't started yet.");
        require(block.timestamp < competitionClosingTime, "Competition has concluded.");
    }

    function setOracle(address _asset, address _oracle) public onlyOwner {
        tokenOracleMapping[_asset] = _oracle;
    }

    function setStartingTime(uint32 _newStartingTime) public onlyOwner {
        competitionStartingTime = _newStartingTime;
    }

    function setClosingTime(uint32 _newClosingTime) public onlyOwner {
        competitionClosingTime = _newClosingTime;
    }

    function setFaucet(address _faucet) public onlyOwner {
        testFaucetAddr = _faucet;
    }

    function setIsPaused(bool _isPaused) public onlyOwner {
        isPaused = _isPaused;
    }

    function getOracle(address _asset) public view returns (address) {
        return tokenOracleMapping[_asset];
    }

    function setSwapFee(address _fromToken, address _toToken, uint8 fee) public onlyOwner {
        require(tokenOracleMapping[_fromToken] != address(0), "From token not supported");
        require(tokenOracleMapping[_toToken] != address(0), "To token not supported");
        pathFeesMapping[_fromToken][_toToken] = fee;
    }

    function getSwapFee(address _fromToken, address _toToken) public view returns (uint256) {
        return pathFeesMapping[_fromToken][_toToken];
    }

    function placeOrder(address _fromToken, uint256 _fromAmount, address _toToken)
        external
        nonReentrant
        duringCompetitionOnly
        notIsPaused
    {
        require(_fromAmount > 0, "Amount must be greater than 0");
        require(_fromToken != _toToken, "From and To must be different");
        require(tokenOracleMapping[_fromToken] != address(0), "From token not supported");
        require(tokenOracleMapping[_toToken] != address(0), "To token not supported");
        require(IERC20(_fromToken).balanceOf(msg.sender) >= _fromAmount, "Token balance too low");

        TestOracle fromPriceFeed = TestOracle(tokenOracleMapping[_fromToken]);
        TestOracle toPriceFeed = TestOracle(tokenOracleMapping[_toToken]);

        (
            /*uint80 roundID*/
            ,
            int256 fromTokenPrice,
            /*uint startedAt*/
            ,
            /*uint timeStamp*/
            ,
            /*uint80 answeredInRound*/
        ) = fromPriceFeed.latestRoundData();

        (
            /*uint80 roundID*/
            ,
            int256 toTokenPrice,
            /*uint startedAt*/
            ,
            /*uint timeStamp*/
            ,
            /*uint80 answeredInRound*/
        ) = toPriceFeed.latestRoundData();

        Order memory newOrder = Order(msg.sender, _fromToken, _toToken, _fromAmount, false, block.timestamp);

        traderOrder[msg.sender] = newOrder;
        emit OrderPlaced(msg.sender, _fromToken, _toToken, _fromAmount, fromTokenPrice, toTokenPrice);
    }

    function settleOrder() external nonReentrant duringCompetitionOnly notIsPaused {
        Order storage order = traderOrder[msg.sender];

        require(order.settled == false, "Order has been settled");
        require(IERC20(order.from).balanceOf(msg.sender) >= order.fromAmount, "Token balance too low");
        require(
            block.timestamp >= (order.submissionTimeStamp + 120), "Haven't passed 2 minutes since order's submission"
        );
        require((order.submissionTimeStamp + 300) >= block.timestamp, "This order has expired");

        TestOracle fromPriceFeed = TestOracle(tokenOracleMapping[order.from]);
        TestOracle toPriceFeed = TestOracle(tokenOracleMapping[order.to]);

        (
            /*uint80 roundID*/
            ,
            int256 fromTokenPrice,
            /*uint startedAt*/
            ,
            /*uint timeStamp*/
            ,
            /*uint80 answeredInRound*/
        ) = fromPriceFeed.latestRoundData();
        (
            /*uint80 roundID*/
            ,
            int256 toTokenPrice,
            /*uint startedAt*/
            ,
            /*uint timeStamp*/
            ,
            /*uint80 answeredInRound*/
        ) = toPriceFeed.latestRoundData();

        IERC20(order.from).safeTransferFrom(order.trader, address(this), order.fromAmount);
        uint256 fees = order.fromAmount * getSwapFee(order.from, order.to) / 10000;

        uint256 fromAmountFeesDeducted = order.fromAmount - fees;
        uint256 fromAmountFeesDeductedUSD = fromAmountFeesDeducted * uint256(fromTokenPrice);
        uint256 rawToTokenAmount = fromAmountFeesDeductedUSD / uint256(toTokenPrice); // This gives the amount in toToken's base unit without considering decimals

        uint256 decimalsDifference;
        uint256 returnedToTokenAmount;
        if (IERC20Metadata(order.from).decimals() > IERC20Metadata(order.to).decimals()) {
            decimalsDifference = IERC20Metadata(order.from).decimals() - IERC20Metadata(order.to).decimals();
            returnedToTokenAmount = rawToTokenAmount / (10 ** decimalsDifference);
        } else {
            decimalsDifference = IERC20Metadata(order.to).decimals() - IERC20Metadata(order.from).decimals();
            returnedToTokenAmount = rawToTokenAmount * (10 ** decimalsDifference);
        }

        ITestFaucet testFaucet = ITestFaucet(testFaucetAddr);
        testFaucet.exchangeMint(order.trader, order.to, returnedToTokenAmount);

        order.settled = true;
        emit OrderSettled(
            order.trader,
            order.from,
            order.to,
            order.fromAmount,
            returnedToTokenAmount,
            fromTokenPrice,
            toTokenPrice,
            fees
        );
    }

    function withraw(address _token) external onlyOwner {
        IERC20(_token).safeTransfer(owner(), IERC20(_token).balanceOf(address(this)));
    }

    fallback() external payable {
        revert("This contract does not accept Ether");
    }

    receive() external payable {
        revert("This contract does not accept Ether");
    }
}
