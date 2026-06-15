export const demoTokens = {
  code: "0000",
  message: "demo",
  data: {
    chain: "monad",
    tokens: [
      {
        origin_token: {
          address: "0x534b2f3A21130d7a60830c2Df862319e593943A3",
          name: "USDC",
          symbol: "usdc",
          decimals: 6,
        },
        atoken: {
          address: "0xaC0893567D43C3E7e6e35a72803df05416C1f20D",
          name: "aUSDC",
          symbol: "ausdc",
          decimals: 6,
        },
        accesscore_address: "0x8F118338a1fa41E7Fa86Be19A4e8B99Ed58A6EcC",
        apass_address: "0xbA82D189540CaC9DC6FF46B6837CaC1BFdEC58B9",
      },
    ],
  },
};

export function demoVerification(address) {
  return {
    chain: "monad",
    atoken: demoTokens.data.tokens[0].atoken.address,
    address,
    code: 4,
    message: "A-Pass verified; transfer allowed",
    magickLink: "",
  };
}
