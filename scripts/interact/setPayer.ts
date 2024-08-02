import { ethers } from "hardhat";
import address from "../deploy/Address_DCPRebate.json";

async function main() {
  const dcpRebateContract = await ethers.getContractAt(
    "DCPGainsRebate",
    address.rebateFeeContract
  );

  const payer: string = "0xD22F5789FD68474F841f9742F0A68B834DC6943e"

  const tx = await dcpRebateContract.setPayer(payer);

  await tx.wait(); 
  console.log("Update successfully : ",tx.hash);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
