import fs from "fs";
import { ethers } from "hardhat";
import address from "./Address_ARB.json";
async function deployContract() {
  let rebateFeeContract;

  const [owner] = await ethers.getSigners();
  const operator = "0xbd3726fc0B8411869aE8268345cFfF48747F39da";

  try {
    rebateFeeContract = await ethers.deployContract("DCPGainsRebate", [
      "0x912CE59144191C1204E64559FE8253a0e49E6548",
      owner,
      operator,
    ]);
    await rebateFeeContract.waitForDeployment();

    console.log("Contracts deployed successfully.");
    return rebateFeeContract;
  } catch (error) {
    console.error("Error deploying contracts:", error);
    throw error;
  }
}

async function saveContractAddress(rebateFeeContract: any) {
  try {
    const address = JSON.stringify(
      {
        rebateFeeContract: rebateFeeContract.target,
      },
      null,
      4
    );

    fs.writeFile(
      "./scripts/deploy/Address_DCPRebate.json",
      address,
      "utf8",
      (error) => {
        if (error) {
          console.error("Error saving contract address:", error);
        } else {
          console.log("Deployed contract address:", address);
        }
      }
    );
  } catch (error) {
    console.error("Error saving contract address:", error);
    throw error;
  }
}

async function main() {
  let contract;
  try {
    contract = await deployContract();
    // console.log(contract);
    await saveContractAddress(contract);

    console.log("Contract deployment completed successfully.");
  } catch (error) {
    console.error("Unhandled error:", error);
  }
}

main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exitCode = 1;
});
