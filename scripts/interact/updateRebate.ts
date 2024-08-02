import { ethers } from "hardhat";
import address from "../deploy/Address_DCPRebate.json";

async function generateAccountsAndFees(numberOfAccounts: number) {
  const accounts = [];
  const fees = [];

  for (let i = 0; i < numberOfAccounts; i++) {
    const wallet = ethers.Wallet.createRandom();
    accounts.push(wallet.address);

    const feeRebate = Math.floor(Math.random() * 401) + 100;
    fees.push(feeRebate);
  }

  return { accounts, fees };
}

async function main() {
  const dcpRebateContract = await ethers.getContractAt(
    "DCPGainsRebate",
    address.rebateFeeContract
  );

  const { accounts, fees } = await generateAccountsAndFees(50);

  if (accounts.length !== fees.length) {
    return;
  }

  const params : any = {
    traders: accounts,
    fees: fees
  };

  const checksum = "0x1234567890";

  console.log("Params:", params);

  try {
    const tx = await dcpRebateContract.updateRebate(1n,params,checksum);
    await tx.wait(); 
    console.log("Update successfully : ",tx.hash);
  } catch (error) {
    console.error("Error:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
