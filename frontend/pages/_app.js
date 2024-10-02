import "../styles/globals.css";
import "@rainbow-me/rainbowkit/styles.css";
import { ChakraProvider } from "@chakra-ui/react";
import Head from "next/head";

import {
  getDefaultWallets,
  RainbowKitProvider,
  connectorsForWallets,
} from "@rainbow-me/rainbowkit";
import { configureChains, createConfig, WagmiConfig } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { alchemyProvider } from "wagmi/providers/alchemy";
import { publicProvider } from "wagmi/providers/public";
import MainLayout from "../layout/mainLayout";

const { chains, publicClient, webSocketPublicClient } = configureChains(
  [baseSepolia],
  [publicProvider()]
);

const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID;
const { wallets } = getDefaultWallets({
  appName: "OBSD",
  projectId,
  chains,
});

const connectors = connectorsForWallets([...wallets]);

const wagmiClient = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
  webSocketPublicClient,
});

function MyApp({ Component, pageProps }) {
  return (
    <ChakraProvider>
      <Head>
        <title>OBSD</title>
        <meta
          name="description"
          content="This is a swap page for the oracle-based spot DEX."
        ></meta>
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="img/favicon-16x16.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="img/favicon-32x32.png"
        />
      </Head>
      <WagmiConfig config={wagmiClient}>
        <RainbowKitProvider
          modalSize="compact"
          initialChain={process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID}
          chains={chains}
        >
          <MainLayout>
            <Component {...pageProps} />
          </MainLayout>
        </RainbowKitProvider>
      </WagmiConfig>
    </ChakraProvider>
  );
}

export default MyApp;
