import "@nomiclabs/hardhat-ethers";
import { ethers } from "hardhat";

export async function completeFixture() {

  const wallets = await ethers.getSigners();

  const DCPGainsRebateContract = await ethers.getContractFactory("DCPGainsRebate");
  const ARBContract = await ethers.getContractFactory("MockERC20");

  const arbContract = await ARBContract.deploy();
  const dcpGainsRebateContract = await DCPGainsRebateContract.deploy(arbContract.target, wallets[0].address, wallets[1].address);

  return {
    arbContract,
    dcpGainsRebateContract,
  };
}
