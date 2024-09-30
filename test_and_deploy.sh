#!/bin/bash

# Load environment variables from .env file
if [ -f .env ]; then
  export $(echo $(cat .env | sed 's/#.*//g'| xargs) | envsubst)
fi

# Check if RPC_URL is set
if [ -z "$RPC_URL" ]; then
  echo "RPC_URL is not set in .env file"
  exit 1
fi

# Run tests
forge test

# If tests pass, deploy
if [ $? -eq 0 ]; then
  echo "Tests passed. Proceeding with deployment..."
  forge script scripts/InitializeFullExchangeEnvironment.s.sol --rpc-url $RPC_URL --broadcast --legacy
else
  echo "Tests failed. Aborting deployment."
  exit 1
fi