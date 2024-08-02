import { ethers } from "hardhat";
import address from "../deploy/Address_DCPRebate.json";

async function main() {
  const dcpRebateContract = await ethers.getContractAt(
    "DCPGainsRebate",
    address.rebateFeeContract
  );

  const trader : string = "0xD22F5789FD68474F841f9742F0A68B834DC6943e"

  console.log("Claimed Fees : ",Number(await dcpRebateContract.getClaimedFees(trader)));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
