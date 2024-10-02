import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverBody,
  PopoverFooter,
  PopoverArrow,
  PopoverCloseButton,
  PopoverAnchor,
  Button,
  Portal,
  Flex,
  Text,
  useToast,
  Box,
  Link,
  Badge,
  SkeletonCircle,
  Center,
  ButtonGroup
} from '@chakra-ui/react';
import { useState, useEffect, useRef } from 'react';
import { TimeIcon } from '@chakra-ui/icons'
import axios from 'axios';
import erc20ABI from '../../public/abis/erc20.json'
import oracleABI from '../../public/abis/oracle.json'
import exchangeABI from '../../public/abis/exchange.json'
import { useAccount, usePrepareContractWrite, useContractWrite, useWaitForTransaction, useConnect } from 'wagmi';
import { readContract } from '@wagmi/core';

export default function OrdersPanel() {
  const SUBGRAPH_ENDPOINT = process.env.NEXT_PUBLIC_SUBGRAPH_ENDPOINT;
  const SUBGRAPH_HEADERS = {
    "content-type": "application/json",
  };

  const EXCHANGE_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_EXCHANGE_CONTRACT_ADDRESS;
  const toast = useToast()
  const [tokensDict, setTokensDict] = useState({})
  const [isAnyOrderValid, setIsAnyOrderValid] = useState(false)
  const [isTxSendable, setIsTxSendable] = useState(false)
  const [confirmedTimestamp, setConfirmedTimestamp] = useState(0);
  const [remainingCooldownSeconds, setRemainingCooldownSeconds] = useState(0);
  const [remainingConfirmingSeconds, setRemainingConfirmingSeconds] = useState(0);
  const [swapFee, setSwapFee] = useState(0) // in 0.01%, i.e. 10 = 0.1%
  const [validOrder, setValidOrder] = useState({ from: "", to: "", fromAmount: "", fromTokenPrice: "", toTokenPrice: "", id: "" })
  const [orderExchangeRate, setOrderExchangeRate] = useState(0.0)

  const initialFocusRef = useRef()
  // Declare state to hold provider
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

  const { address: traderAddress, isConnected } = useAccount();

  const getValidPlacedOrderByTraderAndTime = async (address, unixTime) => {
    const getValidPlacedOrderByTraderQuery = {
      "operationName": "fetchAuthor",
      "query": `{
          orderPlaceds(where:{trader:"${address}", blockTimestamp_gt:"${unixTime}"}, orderBy:blockTimestamp, orderDirection:desc, first:1){
            id
            trader
            from
            fromAmount
            fromTokenPrice
            toTokenPrice
            blockTimestamp
            to
          }
        }`,
      "variables": {}
    };

    try {
      const response = await axios({
        url: SUBGRAPH_ENDPOINT,
        method: 'post',
        headers: SUBGRAPH_HEADERS,
        data: JSON.stringify(getValidPlacedOrderByTraderQuery)
      });
      return response.data
    } catch (error) {
      console.log(error);
    }
  }

  const getFromToToExchangeRate = async (fromToken, toToken) => {
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

  const getPathSwapFee = async (fromToken, toToken) => {
    const swapFee = await readContract({
      address: EXCHANGE_CONTRACT_ADDRESS,
      abi: exchangeABI,
      functionName: 'getSwapFee',
      args: [tokensDict[fromToken]['address'], tokensDict[toToken]['address']]
    })
    return swapFee ? Number(swapFee) : 0.0;
  }

  useEffect(() => {
    const interval = setInterval(() => {
      let currentTime = Math.floor(Date.now() / 1000);
      let cooldownTimeLeft = confirmedTimestamp + 120 - currentTime;
      let confirmingTimeLeft = confirmedTimestamp + 300 - currentTime;
      setRemainingCooldownSeconds(cooldownTimeLeft > 0 ? cooldownTimeLeft : 0);
      setRemainingConfirmingSeconds(confirmingTimeLeft > 0 ? confirmingTimeLeft : 0);

      (cooldownTimeLeft <= 0 && confirmingTimeLeft > 0) ? setIsTxSendable(true) : setIsTxSendable(false);
    }, 1000);
    return () => clearInterval(interval);
  }, [confirmedTimestamp]);


  useEffect(() => {
    if (validOrder.from) {
      const interval = setInterval(async () => {
        let exchangeRate = await getFromToToExchangeRate(validOrder.from, validOrder.to)
        setOrderExchangeRate(exchangeRate)
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [confirmedTimestamp, validOrder.from, validOrder.to]);

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
    const fetchTrader = async (address) => {
      let currentTime = Math.floor(Date.now() / 1000);
      const data = await getValidPlacedOrderByTraderAndTime(
        address,
        currentTime - 300
      );

      if (data) {
        let orders = data.data.orderPlaceds
        if (orders.length > 0) {
          if (orders[0].id != validOrder.id) {
            let from = ''
            let to = ''

            for (let key in tokensDict) {
              if (tokensDict[key].address.toLowerCase() === orders[0].from.toLowerCase()) {
                from = key
              }
              else if (tokensDict[key].address.toLowerCase() === orders[0].to.toLowerCase()) {
                to = key
              }
            }

            setValidOrder({
              from: from,
              to: to,
              id: orders[0].id,
              fromAmount: orders[0].fromAmount,
              fromTokenPrice: orders[0].fromTokenPrice,
              toTokenPrice: orders[0].toTokenPrice
            });

            setConfirmedTimestamp(Number(orders[0].blockTimestamp))
            setIsAnyOrderValid(true)

            let exchangeRate = await getFromToToExchangeRate(from, to)
            let swapFee = await getPathSwapFee(from, to)
            setOrderExchangeRate(exchangeRate)
            setSwapFee(swapFee)
          }
        } else {
          setIsAnyOrderValid(false);
        }
      }
    }

    if (traderAddress && Object.keys(tokensDict).length > 0) {
      const interval = setInterval(() => fetchTrader(traderAddress), 15000);
      return () => clearInterval(interval);
    }
  }, [traderAddress, tokensDict]);

  const { config: settleOrderTxConfig } = usePrepareContractWrite({
    address: EXCHANGE_CONTRACT_ADDRESS,
    abi: exchangeABI,
    functionName: 'settleOrder',
    args: []
  })
  const { data: orderSettledTxData, isLoading: isSettleOrderTxLoading, isSuccess: isSettleOrderTxSuccess, write: writeSettleOrderTx } = useContractWrite(settleOrderTxConfig)
  const waitForOrderSettledTransaction = useWaitForTransaction({
    hash: orderSettledTxData?.hash,
    onSuccess() {
      toast({
        title: 'Order Settled',
        description: "You've settled an order with the latest exchange rate.",
        status: 'success',
        duration: 9000,
        isClosable: true,
      })
      setIsAnyOrderValid(false);
    }
  });


  return (
    <Popover
      initialFocusRef={initialFocusRef}
      placement='bottom'
      closeOnBlur={false}
    >
      <PopoverTrigger>
        <Button>
          Order
          <Box padding='1' boxShadow='lg' display={isAnyOrderValid ? '' : 'none'}>
            <SkeletonCircle size='2' />
          </Box>
        </Button>
      </PopoverTrigger>
      <PopoverContent color='white' bg='blue.800' borderColor='blue.800'>
        <PopoverHeader pt={4} fontWeight='bold' border='0'>
          Valid Order
        </PopoverHeader>
        <PopoverArrow />
        <PopoverCloseButton />
        <PopoverBody display={isAnyOrderValid ? 'none' : ''}>
          <Center mb='5%'>
            <Text>\_(ツ)_/¯</Text>
          </Center>
          You need to submit an order with the swap panel below and then send out a confirmation transaction within a window of time. Learn more <Link href='https://github.com/weitingchentw/oracle-based-spot-dex' target="_blank" >here</Link>.
        </PopoverBody>
        {
          isAnyOrderValid
            ?
            <PopoverBody display={isAnyOrderValid ? '' : 'none'}>
              <Flex minWidth='max-content' alignItems='center' gap='2'>
                <Text as='b' fontSize='sm'>Status</Text>
                <Badge colorScheme={isTxSendable ? 'green' : 'purple'}>{isTxSendable ? 'Ready' : 'Pending'}</Badge>
              </Flex>
              <Flex minWidth='max-content' alignItems='center' gap='2'>
                <Text as='b' fontSize='sm'>From Amount:</Text>
                <Text fontSize='sm'>{validOrder['fromAmount'] / 10 ** tokensDict[validOrder['from']]['tokenDecimal']} {validOrder['from']}</Text>
              </Flex>
              <Flex minWidth='max-content' alignItems='center' gap='2'>
                <Text as='b' fontSize='sm'>To Amount:</Text>
                <Text fontSize='sm'>{orderExchangeRate ? validOrder['fromAmount'] / 10 ** tokensDict[validOrder['from']]['tokenDecimal'] * orderExchangeRate * (1 - swapFee / 10000) : 0.0} {validOrder['to']}</Text>
              </Flex>
              <Flex minWidth='max-content' alignItems='center' gap='2'>
                <Text as='b' fontSize='sm'>Rate:</Text>
                <Text fontSize='sm'>{orderExchangeRate ? orderExchangeRate : 0.0} {validOrder['from']}/{validOrder['to']}</Text>
              </Flex>
            </PopoverBody>
            :
            <></>
        }
        <PopoverFooter
          border='0'
          display={isAnyOrderValid ? 'flex' : 'none'}
          alignItems='center'
          justifyContent='space-between'
          pb={4}
        >
          <Flex minWidth='max-content' alignItems='center' gap='2'>
            <Button onClick={writeSettleOrderTx} colorScheme='green' isDisabled={!isTxSendable}>Settle</Button>
            <TimeIcon />
            <Text fontSize='md'>{remainingCooldownSeconds ? remainingCooldownSeconds : remainingConfirmingSeconds} Seconds</Text>
          </Flex>
        </PopoverFooter>
      </PopoverContent>
    </Popover>
  )
}
