export const MONAD_TESTNET = {
  chainId: 10143,
  chainIdHex: "0x279f",
  chainName: "Monad Testnet",
  nativeCurrency: {
    name: "Monad",
    symbol: "MON",
    decimals: 18,
  },
  rpcUrls: ["https://testnet-rpc.monad.xyz"],
  blockExplorerUrls: ["https://testnet.monadscan.com"],
};

export function publicChainConfig(tokenPair) {
  return {
    ...MONAD_TESTNET,
    contracts: tokenPair
      ? {
          usdc: tokenPair.origin_token,
          ausdc: tokenPair.atoken,
          accessCore: tokenPair.accesscore_address,
          apass: tokenPair.apass_address,
        }
      : null,
  };
}

