# Project Name

This repo contains the smart contracts and the test/deploy scripts for an Oracle-based spot DEX. Users can use this DEX to swap two supported tokens based on the prices from Oracles in two steps. First, they need to submit an order on-chain and then settle the submitted order after two minutes (but within 5 minutes after that order's submission).

The settlement price will use the latest prices from the oracles, so it might differ from when that order was submitted. The rationale behind this design is that users can't frontrun an Oracle price update.

You can use this repo to create a simulation trading competition where you have different news that impacts the market.

# Installation

First, install every dependencies with:

```bash
forge install
```

Then, create a `.env` file in the root, put your PRIVATE_KEY in the file, and transfer some ETH to the first address derived from that private key. For your reference, please check the `.env.example` file. By default, the project deploys smart contracts to Base's Sepolia testnet. You can change the `RPC_URL` to change the network.

Now, you're all set. Use the following command to test and deploy the smart contracts:

```bash
./test_and_deploy.sh
```

You will deploy 14 smart contracts with the command above. They're:

1. Five test tokens (wbtc, weth, usdt, usdc, dai)
2. Five oracles (one for each token)
3. One Faucet for participants to request test tokens
4. One UUPS Proxy
5. One proxied Exchange
6. One Exchange implementation

If you run into a permission denied error, use the command below first, then the one above:

```bash
chmod +x test_and_deploy.sh
```

# What's Next

This repo only contains the smart contracts.
To make this accessible, you can use Coinbase's [Build Onchain Apps Template](https://github.com/coinbase/build-onchain-apps) to build the UI and deploy an [Alchemy's subgraph](https://www.alchemy.com/subgraphs) to act as the API for on-chain activities. Besides the swap function, the UI also needs to allow users to request the test tokens from the Faucet contract; otherwise, they don't have tokens to swap.

Lastly, you need to create cron jobs that periodically update the Oracle prices on-chain for each token.
