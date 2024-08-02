import fs from "fs";
import { ethers } from "hardhat";

async function deployContract() {
  let arbContract: any;
  try {
    arbContract = await ethers.deployContract("MockERC20");

    await arbContract.waitForDeployment();

    console.log("Contracts deployed successfully.");
    return arbContract ;
  } catch (error) {
    console.error("Error deploying contracts:", error);
    throw error;
  }
}

async function saveContractAddress(arbContract: any) {
  try {
    const address = JSON.stringify(
      {
        arbContract: arbContract.target
      },
      null,
      4
    );

    fs.writeFile(
      "./scripts/deploy/Address_ARB.json",
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
