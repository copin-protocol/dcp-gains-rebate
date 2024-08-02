import { ethers } from "hardhat";
import address from "../deploy/Address_DCPRebate.json";

async function main() {
  const dcpRebateContract = await ethers.getContractAt(
    "DCPGainsRebate",
    address.rebateFeeContract
  );

  const trader : string = "0x03A442a8d44ba1C79eC98B2a8700b765DeE45b91"

  console.log("UnClaimed Fees Ongoing : ",Number(await dcpRebateContract.getOngoingFees(trader)));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
