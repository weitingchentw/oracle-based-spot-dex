import { ConnectButton } from "@rainbow-me/rainbowkit";
import styles from "../../styles/Navbar.module.css";
import OrdersPanel from "./OrdersPanel";
import { Flex } from '@chakra-ui/react';

export default function Navbar() {
	return (
		<nav className={styles.navbar}>
			<a href="https://alchemy.com/?a=create-web3-dapp" target={"_blank"}>
				<img className={styles.alchemy_logo} src="img/obsd-logo.png"></img>
			</a>
			<Flex gap={6}>
				<OrdersPanel />
				<ConnectButton></ConnectButton>
			</Flex>
		</nav>
	);
}
