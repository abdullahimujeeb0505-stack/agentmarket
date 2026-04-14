import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  networks: {
    zerogTestnet: {
      url: "https://evmrpc-testnet.0g.ai",
      accounts: [process.env.STORAGE_PRIVATE_KEY!],
      chainId: 16600,
    },
  },
};

export default config;
