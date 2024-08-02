import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
import "dotenv/config";
import { HardhatUserConfig } from "hardhat/config";
import { arbscanApiKey, coinMcApiKey, mainnetNodeUrl, privKey, testnetNodeUrl } from "./config";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 800,
      },
      viaIR: true,
      metadata: {
        bytecodeHash: "none",
      },
    },
  },
  gasReporter: {
    enabled: true,
    currency: "USD",
    coinmarketcap: coinMcApiKey,
    gasPrice: 1,
  },
  networks: {
    testnet: {
      url: testnetNodeUrl,
      accounts: [privKey],
    },
    mainnet: {
      url: mainnetNodeUrl,
      accounts: [privKey],
    },
    hardhat: {
      blockGasLimit: 50000000,
      accounts: {
        count: 30,
      },
    },
  },
  etherscan: {
    apiKey: {
      mainnet : arbscanApiKey,
    },
    customChains: [
      {
        network: "testnet",
        chainId: 11155420,
        urls: {
          apiURL: "https://api-sepolia.arbiscan.io/api",
          browserURL: "https://sepolia.arbiscan.io/",
        },
      },
      {
        network: "mainnet",
        chainId: 42161,
        urls: {
          apiURL: "https://api.arbiscan.io/api",
          browserURL: "https://arbiscan.io/",
        }
      },
    ],
  },
  sourcify: {
    enabled: true,
    apiUrl: "https://api-sepolia.arbiscan.io/api",
    browserUrl: "https://sepolia.arbiscan.io/",
  },  
  mocha: {
    timeout: 20000000,
  },
};

export default config;
