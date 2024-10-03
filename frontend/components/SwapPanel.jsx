import styles from "../styles/SwapPanel.module.css";
import React, { useEffect, useState } from 'react'
import Router, { useRouter } from "next/router";
import {
  InputGroup,
  InputRightElement,
  Input,
  Menu,
  MenuButton,
  IconButton,
  Button,
  MenuList,
  MenuItem,
  Flex,
  Text,
  Box,
  Center,
  NumberInputField,
  NumberInput,
  Portal,
  useToast,
  Divider,
  Grid,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
} from '@chakra-ui/react';
import { ChevronDownIcon } from '@chakra-ui/icons';
import { useAccount, suseContractRead, usePrepareContractWrite, useContractWrite, useWaitForTransaction, useConnect, useWalletClient } from 'wagmi';
import { getContract, fetchBalance, getPublicClient, readContract } from '@wagmi/core';
import erc20ABI from '../public/abis/erc20.json'
import oracleABI from '../public/abis/oracle.json'
import exchangeABI from '../public/abis/exchange.json'
import { createPublicClient, http } from 'viem'
import { sepolia } from 'viem/chains'

export default function SwapPanel() {
  const toast = useToast()
  const [tokensDict, setTokensDict] = useState({})
  const [buttonCopy, setButtonCopy] = useState('')
  const [isApproved, setIsApproved] = useState(false)
  const [isSwappable, setIsSwappable] = useState(false)
  const [isMainButtonDisabled, setIsMainButtonDisabled] = useState(true)
  const [isInsufficient, setIsInsufficient] = useState(false)
  const [feeRateInPercent, setFeeRateInPercent] = useState(0.0)
  const [exchangeRate, setExchangeRate] = useState(0.0)

  const EXCHANGE_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_EXCHANGE_CONTRACT_ADDRESS;

  const [fromTokenDict, setFromTokenDict] = useState({
    balance: 0.0,
    amount: '0',
    name: 'WETH',
    decimal: 0,
  });

  const [toTokenDict, setToTokenDict] = useState({
    balance: 0.0,
    amount: '0',
    name: '',
    decimal: 0,
  });

  const client = createPublicClient({
    chain: sepolia,
    transport: http()
  })

  const { address: traderAddress, isConnected } = useAccount();
  const { connector } = useConnect()

  const [provider, setProvider] = useState(null);
  useEffect(() => {
    const fetchProvider = async () => {
      if (connector) { // Check if connector is defined before calling getProvider()
        const prov = await connector.getProvider();
        setProvider(prov);
      }
    }
    fetchProvider();
  }, [connector]);


  const isValidNonNegativeNumber = (str) => {
    const nonNegativeNumberRegex = /^(\d+\.?\d*|\.\d+)$/;
    return nonNegativeNumberRegex.test(str);
  }

  const fetchTokenBalance = async (traderAddress, tokenAddress) => {
    if (traderAddress) {
      const balance = await fetchBalance({
        address: traderAddress,
        token: tokenAddress,
      })

      return balance['formatted'];
    }
    return 0.0;
  };

  const getFees = async (fromToken = fromTokenDict.name, toToken = toTokenDict.name) => {
    // fee in 0.01%, i.e. 10 = 0.1%
    const feeRate = await readContract({
      address: EXCHANGE_CONTRACT_ADDRESS,
      abi: exchangeABI,
      functionName: 'getSwapFee',
      args: [tokensDict[fromToken]['address'], tokensDict[toToken]['address']]
    })
    const feeRateInPercent = parseFloat(Number(feeRate).toString()) * 0.01;
    return feeRateInPercent ? feeRateInPercent : 0.0;
  }

  const getFromToToExchangeRate = async (fromToken = fromTokenDict.name, toToken = toTokenDict.name) => {
    // Data structure of the Oracle Data (array of): uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound
    const fromTokenOracleData = await readContract({
      address: tokensDict[fromToken]['oracleAddress'],
      abi: oracleABI,
      functionName: 'latestRoundData',
    })
    const toTokenOracleData = await readContract({
      address: tokensDict[toToken]['oracleAddress'],
      abi: oracleABI,
      functionName: 'latestRoundData',
    })

    let exchangeRate = 0.0
    exchangeRate = ((Number(BigInt(fromTokenOracleData[1]).toString())) / 10 ** 8) / (Number(BigInt(toTokenOracleData[1]).toString()) / 10 ** 8)

    return exchangeRate ? exchangeRate : 0.0;
  }

  const handleChangeFromToken = async (token) => {
    const fetchedFromTokenBalance = await fetchTokenBalance(traderAddress, tokensDict[token].address);
    let fromTokenBalance = parseFloat(fetchedFromTokenBalance);

    setFromTokenDict((prevState) => ({
      ...prevState,
      name: token,
      balance: fromTokenBalance
    }));

    if (fromTokenDict['name'].length && toTokenDict['name'].length) {
      setToTokenDict((prevState) => ({
        ...prevState,
        amount: (parseFloat(fromTokenDict['amount']) * (1 - feeRateInPercent / 100) * exchangeRate).toString()
      }));
    }
  };
  const handleFromTokenAmountChange = (event) => {
    let inputFromTokenAmount = event.target.value;
    inputFromTokenAmount = isValidNonNegativeNumber(inputFromTokenAmount) ? inputFromTokenAmount : '0';

    setFromTokenDict((prevState) => ({
      ...prevState,
      amount: inputFromTokenAmount,
    }));
    if (fromTokenDict['name'].length && toTokenDict['name'].length) {
      setToTokenDict((prevState) => ({
        ...prevState,
        amount: (parseFloat(inputFromTokenAmount) * (1 - feeRateInPercent / 100) * exchangeRate).toString()
      }));
    }
  };

  const handleFromTokenMaxAmount = () => {
    const mockEvent = {
      target: {
        value: fromTokenDict.balance.toString(),
      },
    };
    handleFromTokenAmountChange(mockEvent);
  }

  const handleChangeToToken = async (token) => {
    const fetchedToTokenBalance = await fetchTokenBalance(traderAddress, tokensDict[token].address);
    let toTokenBalance = parseFloat(fetchedToTokenBalance);

    if (fromTokenDict.amount == '0') {
      setToTokenDict((prevState) => ({
        ...prevState,
        name: token,
        amount: '0',
        balance: toTokenBalance
      }));
    }
    else {
      getFromToToExchangeRate(fromTokenDict.name, token).then(exchangeRate => {
        setToTokenDict((prevState) => ({
          ...prevState,
          name: token,
          amount: (exchangeRate * parseFloat(fromTokenDict.amount) * (1 - feeRateInPercent / 100)).toString(),
          balance: toTokenBalance
        }));
      });
    }
  };
  const handleToTokenAmountChange = (event) => {
    let inputToTokenAmount = event.target.value;
    inputToTokenAmount = isValidNonNegativeNumber(inputToTokenAmount) ? inputToTokenAmount : '0';

    setToTokenDict((prevState) => ({
      ...prevState,
      amount: inputToTokenAmount,
    }));
    setFromTokenDict((prevState) => ({
      ...prevState,
      amount: (parseFloat(inputToTokenAmount) / exchangeRate).toString(),
    }));
  };

  const { config: approvalTxConfig } = usePrepareContractWrite({
    address: tokensDict && fromTokenDict && fromTokenDict['name'] && tokensDict[fromTokenDict['name']] ? tokensDict[fromTokenDict['name']].address : '',
    abi: erc20ABI,
    functionName: 'approve',
    args: [EXCHANGE_CONTRACT_ADDRESS, (fromTokenDict['amount'] * 10 ** (tokensDict && fromTokenDict && fromTokenDict['name'] && tokensDict[fromTokenDict['name']] ? tokensDict[fromTokenDict['name']].tokenDecimal : 10)).toString()]
  })
  const { data: approvalTxData, isLoading: isApprovalTxLoading, isSuccess: isApprovalTxSubmitted, write: writeApprovalTx } = useContractWrite(approvalTxConfig)
  const waitForApprovalTransaction = useWaitForTransaction({
    hash: approvalTxData?.hash,
    onSuccess() {
      toast({
        title: 'Approval Succeeded',
        description: "You've approved to usage of your token on our smart contract.",
        status: 'success',
        duration: 9000,
        isClosable: true,
      })
    }
  });

  const { config: placeOrderTxConfig } = usePrepareContractWrite({
    address: EXCHANGE_CONTRACT_ADDRESS,
    abi: exchangeABI,
    functionName: 'placeOrder',
    args: [
      (tokensDict && fromTokenDict && fromTokenDict['name'] && tokensDict[fromTokenDict['name']] ? tokensDict[fromTokenDict['name']].address : ''),
      (fromTokenDict['amount'] * 10 ** (tokensDict && fromTokenDict && fromTokenDict['name'] && tokensDict[fromTokenDict['name']] ? tokensDict[fromTokenDict['name']].tokenDecimal : 0)).toString(),
      (tokensDict && toTokenDict && toTokenDict['name'] && tokensDict[toTokenDict['name']] ? tokensDict[toTokenDict['name']].address : '')]
  })
  const { data: orderPlacedTxData, isLoading: isPlaceOrderTxLoading, isSuccess: isPlaceOrderTxSuccess, write: writePlaceOrderTx } = useContractWrite(placeOrderTxConfig)
  const waitForOrderPlacedTransaction = useWaitForTransaction({
    hash: orderPlacedTxData?.hash,
    onSuccess() {
      toast({
        title: 'Submission Succeeded',
        description: "You've submitted an order. You can settle the order in the Order panel at the top-right corner after 2 mins.",
        status: 'success',
        duration: 9000,
        isClosable: true,
      })
    }
  });

  const isApprovalNeeded = async (traderAddress) => {
    try {
      const allowance = await readContract({
        address: tokensDict[fromTokenDict['name']].address,
        abi: erc20ABI,
        functionName: 'allowance',
        args: [traderAddress, EXCHANGE_CONTRACT_ADDRESS]
      })

      const allowanceFormatted = parseFloat(allowance.toString());
      const amountFormatted = fromTokenDict['amount'] * 10 ** (tokensDict[fromTokenDict['name']].tokenDecimal);

      if (allowanceFormatted < amountFormatted) {
        return true
      }
      else {
        return false
      }
    } catch (error) {
      console.error('Error getting allowance:', error);
    }
  }

  useEffect(() => {
    if (toTokenDict.name) {
      getFromToToExchangeRate().then(exchangeRate => {
        setExchangeRate(exchangeRate)
      });
      getFees().then(feeRateInPercent => {
        setFeeRateInPercent(feeRateInPercent)
      })
    }
  }, [fromTokenDict.name, toTokenDict.name]);

  useEffect(() => {
    const fetchTokensList = async () => {
      try {
        const tokensFetchRes = await fetch('/tokens.json');
        const tokens = await tokensFetchRes.json();
        setTokensDict(tokens);
      } catch (error) {
        console.error('Error fetching JSON data:', error);
      }
    };
    fetchTokensList();
  }, []);

  useEffect(() => {
    const fetchWETHBalance = async () => {
      try {
        const fetchedWETHTokenBalance = await fetchTokenBalance(traderAddress, tokensDict[fromTokenDict.name].address);
        const wETHBalance = parseFloat(fetchedWETHTokenBalance);

        setFromTokenDict((prevState) => ({
          ...prevState,
          balance: wETHBalance
        }));
      } catch (error) {
        console.error('Error fetching JSON data:', error);
      }
    };

    const checkApprovalAndSetButtonCopy = async () => {
      setIsSwappable(false);
      if (!isConnected) {
        setButtonCopy('Connect Wallet');
        setIsMainButtonDisabled(true);
      }
      else if (toTokenDict.name.length == 0) {
        await fetchWETHBalance();
        setButtonCopy('Select a Token');
        setIsMainButtonDisabled(true);
      }
      else if (parseFloat(fromTokenDict.amount) == 0) {
        setButtonCopy('Enter Amount');
        setIsMainButtonDisabled(true);
      }
      else if (parseFloat(fromTokenDict.amount) > fromTokenDict.balance) {
        setIsInsufficient(true);
        setButtonCopy('Insufficient Balance');
        setIsMainButtonDisabled(true);
      }
      else if (parseFloat(fromTokenDict.amount) <= fromTokenDict.balance) {
        setIsInsufficient(false);
        if (await isApprovalNeeded(traderAddress)) {
          setIsMainButtonDisabled(false);
          setIsApproved(false);
          setButtonCopy('Approve');
        } else {
          setIsMainButtonDisabled(false);
          setIsApproved(true);
          setIsSwappable(true);
          setButtonCopy('Submit Order');
        }
      }
    }

    checkApprovalAndSetButtonCopy();
  }, [isConnected, fromTokenDict, toTokenDict, tokensDict])

  return (
    <>
      <Box bg='#0E111C' borderRadius='lg' px='2%' paddingBottom='3%' w='30%'>
        <Center py='10%'>
          <Text as='b' fontSize="3xl" color="white">Swap</Text>
        </Center>
        <InputGroup paddingBottom='1%'>
          <NumberInput color="white" w="100%" value={fromTokenDict.amount}>
            <NumberInputField id="fromTokenAmountField" variant='filled' placeholder='0' bg='#13192A' h='150px' onChange={handleFromTokenAmountChange} inputMode="decimal" />
          </NumberInput>
          <InputRightElement width="7rem" height="150px" alignItems="center">
            <Menu>
              <MenuButton as={Button} rightIcon={<ChevronDownIcon />}>
                {fromTokenDict.name}
              </MenuButton>
              <Portal>
                <MenuList>
                  {
                    Object.keys(tokensDict).map((token) => (
                      <MenuItem key={token} onClick={() => handleChangeFromToken(token)}>
                        {token}
                      </MenuItem>
                    ))
                  }
                </MenuList>
              </Portal>
            </Menu>
            <Flex
              position="absolute"
              bottom="10%"
              left="0"
              right="0"
              justifyContent="center"
            >
              <Text fontSize="xs" color="white" marginRight={1}>
                Balance:
              </Text>
              <Text fontSize="xs" color="white" marginRight={1}>
                {fromTokenDict.balance.toFixed(3)}
              </Text>
              <Text fontSize="xs" color="white" marginRight={5} id="fromTokenMaxButton" onClick={() => handleFromTokenMaxAmount()}>
                Max
              </Text>
            </Flex>
          </InputRightElement>
        </InputGroup>
        <InputGroup paddingBottom='5%'>
          <NumberInput color="white" w="100%" value={toTokenDict.amount}>
            <NumberInputField id="toTokenAmountField" variant='filled' placeholder='0' bg='#13192A' h='150px' onChange={handleToTokenAmountChange} />
          </NumberInput>
          <InputRightElement width="7rem" height="150px" alignItems="center">
            <Menu>
              <MenuButton as={Button} rightIcon={<ChevronDownIcon />}>
                {toTokenDict.name}
              </MenuButton>
              <Portal>
                <MenuList>
                  {
                    Object.keys(tokensDict).map((token) => (
                      <MenuItem key={token} onClick={() => handleChangeToToken(token)}>
                        {token}
                      </MenuItem>
                    ))
                  }
                </MenuList>
              </Portal>
            </Menu>
            <Flex
              position="absolute"
              bottom="10%"
              left="0"
              right="0"
              justifyContent="center"
            >
              <Text fontSize="xs" color="white">
                Balance: {toTokenDict.balance.toFixed(3)}
              </Text>
            </Flex>
          </InputRightElement>
        </InputGroup>
        <Button
          bg='#4C82FB' py='5%' w='100%' borderRadius='20px'
          isDisabled={isMainButtonDisabled}
          onClick={(isApproved && isSwappable) ? writePlaceOrderTx : writeApprovalTx}>{buttonCopy}</Button>
        <Accordion allowMultiple paddingY='5%'>
          <AccordionItem>
            <h2>
              <AccordionButton>
                <Box color="white" as="span" flex='1' textAlign='left'>
                  Summary
                </Box>
                <AccordionIcon color="white" />
              </AccordionButton>
            </h2>
            <AccordionPanel pb={4}>
              <Text color="white" fontSize='md'>Exchange Fees: {feeRateInPercent * Number(fromTokenDict.amount) / 100} {fromTokenDict.name}</Text>
              <Text color="white" fontSize='md'>Exchange Fee Rate: {feeRateInPercent} %</Text>
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
      </Box>
    </>
  )
}
