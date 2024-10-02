# Overview

With this oracle-based spot DEX, users can swap two supported tokens based on the prices from Oracles in two steps. First, they need to submit an order on-chain and then settle the submitted order after two minutes (but within 5 minutes after that order's submission).

The settlement price will use the latest prices from the oracles, so it might differ from when that order was submitted. The rationale behind this design is that users can't frontrun an Oracle price update.

You can use this repo to create a simulation trading competition where you have different news that impacts the market. This project is designed to be deployed on Base's Sepolia testnet.

# Directory Layout

```
.
├── blockchain # Everything blockchain related
    |_ contracts # Contracts and the used interfaces
    |_ scripts # Deploy scripts
    |_ test # Automated tests
├── frontend # Frontend written in Next, wagmi, Rainbowkit
├── subgraph # The data source for the frontend
└── README.md
```

# Installation

This installation guide is grouped by each folder. It's recommended to follow the same sequence.

## Blockchain

Let's start with deploying the smart contracts we use for this project.
First, install every dependencies with:

```bash
cd ./blockchain && forge install
```

Then, create a `.env` file in the root of the `blockchain` folder, put your PRIVATE_KEY in the file, and transfer some ETH to the first address derived from that private key. For your reference, please check the `.env.example` in that folder. By default, the project deploys smart contracts to Base's Sepolia testnet. You can change the `RPC_URL` to change the network.

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

During the deployment, the scripts will show each one of them's address. Please write them down as we will use them in the following.

If you run into a permission denied error, use the command below first, then the one above:

```bash
chmod +x test_and_deploy.sh
```

## Subgraph

At this point you should have the address for your DEX. You can now deploy a subgraph that you can use as the API for your UI.

There are lots of subgraph providers on the market. In this guide, I will use Alchemy's.

First, install the Graph CLI (graph-cli) NPM package globally by running the command below in your terminal:

```bash
npm i -g @graphprotocol/graph-cli@0.73.0
```

Then change the directory to `subgraph` in your terminal and run `graph init oracle-based-spot-dex --allow-simple-name` to initialize the package's CLI wizard and select the following options:

1. Protocol: ethereum
2. Product for which to initialize: hosted-service
3. Subgraph name: oracle-based-spot-dex
4. Directory to create the subgraph in: ./v1
5. Ethereum network: base-sepolia
6. Contract address: [PUT YOUR EXCHANGE ADDRESS HERE]
7. Do you want to retry: N
8. ABI file (path): ../frontend/public/abis/exchange.json
9. Start Block: [Enter]
10. Contract Name: ExchangeV1
11. Index contract events as entities: true

## Frontend

```bash
npm install
```

// modify .env

// TODO: modifiy tokens.json

// TODO: modify subgraph urls

# What's Next

This repo only contains the smart contracts and the UI to swap on the DEX.
As such, you needs to allow users to request test tokens from the faucet with the `mint` function; otherwise, they don't have tokens to swap. Lastly, you need to create cron jobs that periodically update the Oracle prices on-chain for each token.
