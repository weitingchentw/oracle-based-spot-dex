import { ConnectButton } from "@rainbow-me/rainbowkit";
import styles from "../../styles/Navbar.module.css";
import OrdersPanel from "./OrdersPanel";
import { Flex, useToast } from '@chakra-ui/react';
import { usePrepareContractWrite, useContractWrite, useWaitForTransaction, useAccount, useNetwork } from 'wagmi';
import faucetABI from '../../public/abis/faucet.json';
import { useState, useEffect } from 'react';

export default function Navbar() {
	const toast = useToast();
	const { address, isConnected } = useAccount();
	const { chain } = useNetwork();
	const [isFaucetEnabled, setIsFaucetEnabled] = useState(false);

	const { config: mintTxConfig } = usePrepareContractWrite({
		address: process.env.NEXT_PUBLIC_FAUCET_ADDRESS,
		abi: faucetABI,
		functionName: 'mint',
	})
	const { data: mintTxData, isLoading: isMintTxLoading, isSuccess: isMintTxSuccess, write: writeMintTx } = useContractWrite(mintTxConfig)

	const waitForFaucetMintTransaction = useWaitForTransaction({
		hash: mintTxData?.hash,
		onSuccess() {
			toast({
				title: 'Faucet Mint Succeeded',
				description: "You've successfully minted tokens from the faucet.",
				status: 'success',
				duration: 9000,
				isClosable: true,
			})
		}
	});

	useEffect(() => {
		setIsFaucetEnabled(isConnected && chain?.id === parseInt(process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID));
	}, [isConnected, chain]);

	const handleFaucetClick = () => {
		if (isFaucetEnabled && writeMintTx) {
			writeMintTx();
		} else if (!isConnected) {
			toast({
				title: 'Wallet not connected',
				description: "Please connect your wallet to use the faucet.",
				status: 'warning',
				duration: 5000,
				isClosable: true,
			});
		} else if (chain?.id !== parseInt(process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID)) {
			toast({
				title: 'Wrong network',
				description: "Please switch to the correct network to use the faucet.",
				status: 'warning',
				duration: 5000,
				isClosable: true,
			});
		}
	};

	return (
		<nav className={styles.navbar}>
			<a href="https://alchemy.com/?a=create-web3-dapp" target="_blank" rel="noopener noreferrer">
				<img className={styles.logo} src="img/obsd-logo.png" alt="OBSD Logo" />
			</a>
			<Flex gap={6} align="center">
				<img
					className={styles.faucet_icon}
					src={isFaucetEnabled ? "img/faucet-enabled.png" : "img/faucet-disabled.png"}
					alt="Faucet"
					onClick={handleFaucetClick}
					style={{ cursor: 'pointer' }}
					title={isFaucetEnabled ? "Click to request tokens" : "Connect wallet and switch to correct network to use faucet"}
				/>
				<OrdersPanel />
				<ConnectButton />
			</Flex>
		</nav>
	);
}