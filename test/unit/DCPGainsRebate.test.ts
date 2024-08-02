import { loadFixture as loadFixtureToolbox } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import "@nomiclabs/hardhat-ethers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { completeFixture } from "../utils/fixtures";

describe("Incentive", function () {
  let arbContract: any;
  let arbAdress: any;
  let dcpGainsRebateContract: any;
  let dcpGainsRebateAddress: any;
  let wallets: any;
  let rebateData: any;

  const fixture = async () => {
    const { arbContract, dcpGainsRebateContract } = await completeFixture();
    const arbAdress = arbContract.target;
    const dcpGainsRebateAddress = dcpGainsRebateContract.target;

    wallets = await ethers.getSigners();

    const rebateData = {
      traders: [wallets[1].address],
      fees: [ethers.parseEther("1")],
    };

    return {
      arbContract,
      dcpGainsRebateContract,
      arbAdress,
      dcpGainsRebateAddress,
      wallets,
      rebateData,
    };
  };

  beforeEach("load fixture", async () => {
    ({
      arbContract,
      dcpGainsRebateContract,
      arbAdress,
      dcpGainsRebateAddress,
      wallets,
      rebateData,
    } = await loadFixtureToolbox(fixture));
  });

  describe("Deployment", function () {
    it("Should initialize fee rebate claim contract with correct initial values", async () => {
      expect(await dcpGainsRebateContract.ARB()).to.equal(arbAdress);
      expect(await dcpGainsRebateContract.operator()).to.equal(
        wallets[1].address
      );
      expect(await dcpGainsRebateContract.payer()).to.equal(wallets[0].address);
    });
  });

  // ==============================================================================================================
  // update rebate

  describe("updateRebate", function () {
    it("Should revert if epochId is invalid", async () => {
      await expect(
        dcpGainsRebateContract
          .connect(wallets[1])
          .updateRebate(6, rebateData, "checksum")
      ).to.be.revertedWith("Invalid epoch ID");
    });

    it("Should revert if rebate data length mismatch", async () => {
      const invalidRebateData = {
        traders: [wallets[1].address],
        fees: [ethers.parseEther("100"), ethers.parseEther("200")],
      };
      await expect(
        dcpGainsRebateContract
          .connect(wallets[1])
          .updateRebate(1, invalidRebateData, "checksum")
      ).to.be.revertedWith("Wrong rebate data");
    });

    it("Revert if not operator", async function () {
      const epochId = 1;
      const checksum = "0x1234567890";

      await expect(
        dcpGainsRebateContract
          .connect(wallets[2])
          .updateRebate(epochId, rebateData, checksum)
      ).to.be.reverted;
    });

    it("Should update rebate successfully", async () => {
      const epochId = 1;
      const checksum = "0x1234567890";

      const rebate = await dcpGainsRebateContract
        .connect(wallets[1])
        .updateRebate(epochId, rebateData, checksum);

      await expect(rebate)
        .to.emit(dcpGainsRebateContract, "RewardsUpdated")
        .withArgs(epochId, checksum);
    });

    it("Should update rebate successfully ( last Epoch )", async () => {
      const epochId = 1;
      const checksum = "0x1234567890";

      await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60]); // 1 week
      await ethers.provider.send("evm_mine", []);
      const rebate = await dcpGainsRebateContract
        .connect(wallets[1])
        .updateRebate(epochId, rebateData, checksum);

      await expect(rebate)
        .to.emit(dcpGainsRebateContract, "RewardsUpdated")
        .withArgs(epochId, checksum);
    });

    it("Update rebate with 1000 traders", async function () {
      const epochId = 1;
      const numberOfTraders = 1000;
      const traders = [];
      const fees = [];
      const checksum = "0x1234567890";

      for (let i = 0; i < numberOfTraders; i++) {
        traders.push(wallets[1].address);
        fees.push(ethers.parseEther("1"));
      }

      const rebateData = {
        traders: traders,
        fees: fees,
      };

      const tx = await dcpGainsRebateContract
        .connect(wallets[1])
        .updateRebate(epochId, rebateData, checksum);
      const receipt = await tx.wait();

      console.log("Actual Gas Used: ", receipt.gasUsed.toString());

      const epoch = await dcpGainsRebateContract.epochs(epochId);

      expect(epoch.rebateData.traders.length).to.equal(numberOfTraders);
      expect(epoch.rebateData.fees.length).to.equal(numberOfTraders);

      for (let i = 0; i < numberOfTraders; i++) {
        expect(epoch.rebateData.traders[i]).to.equal(traders[i]);
        expect(epoch.rebateData.fees[i]).to.equal(fees[i]);
      }
    });
  });

  // ==============================================================================================================
  // deposit Reward

  describe("depositReward", function () {
    const startNewEpochAndPrepare = async (epochId: number, amount: string) => {
      const checksum = "0x1234567890";

      await arbContract.transfer(wallets[0].address, ethers.parseEther(amount));
      await dcpGainsRebateContract
        .connect(wallets[1])
        .updateRebate(epochId, { traders: [], fees: [] }, checksum);
      // increate Time evm
      await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60]); // 1 week
      await ethers.provider.send("evm_mine", []);
      await dcpGainsRebateContract
        .connect(wallets[1])
        .updateRebate(epochId, { traders: [], fees: [] }, checksum);
    };

    it("Should deposit reward successfully after epoch ends", async () => {
      const epochId = 1;
      const amount = ethers.parseEther("0");

      await startNewEpochAndPrepare(epochId, "10");

      await arbContract.approve(dcpGainsRebateAddress, amount);

      await expect(
        dcpGainsRebateContract.connect(wallets[0]).depositReward(epochId)
      )
        .to.emit(dcpGainsRebateContract, "RewardDeposited")
        .withArgs(epochId, amount);

      const epoch = await dcpGainsRebateContract.epochs(epochId);

      expect(epoch.totalRewardPool).to.equal(0);
      expect(epoch.status).to.equal(3); // AWARDED
    });

    it("Revert if not operator", async function () {
      const epochId = 1;

      await startNewEpochAndPrepare(epochId, "10");

      await expect(
        dcpGainsRebateContract.connect(wallets[2]).depositReward(epochId)
      ).to.be.reverted;
    });

    it("Revert if epoch has not ended yet", async function () {
      const epochId = 1;

      await expect(
        dcpGainsRebateContract.connect(wallets[0]).depositReward(epochId)
      ).to.be.rejected;
    });

    it("Revert if deposit failed", async function () {
      const epochId = 1;

      await startNewEpochAndPrepare(epochId, "10");
      await arbContract.setTransferFromSuccess(false);

      await expect(
        dcpGainsRebateContract.connect(wallets[0]).depositReward(epochId)
      ).to.be.reverted;
    });

    it("Emit RewardDeposited event", async function () {
      const epochId = 1;
      const amount = ethers.parseEther("0");

      await startNewEpochAndPrepare(epochId, "10");
      await arbContract.approve(dcpGainsRebateAddress, amount);

      await expect(dcpGainsRebateContract.depositReward(epochId))
        .to.emit(dcpGainsRebateContract, "RewardDeposited")
        .withArgs(epochId, amount);
    });
  });

  // ==============================================================================================================
  // Claim reward

  describe("claimReward", function () {
    it("Should claim reward successfully", async () => {
      const epochId = 1;
      const trader = wallets[0].address;
      const amount = ethers.parseEther("1.123");
      const checksum = "0x1234567890";

      await dcpGainsRebateContract
        .connect(wallets[1])
        .updateRebate(epochId, { traders: [trader], fees: [amount] }, checksum);

      await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60]); // 1 week
      await ethers.provider.send("evm_mine", []);

      await dcpGainsRebateContract
        .connect(wallets[1])
        .updateRebate(epochId, { traders: [trader], fees: [amount] }, checksum);

      await arbContract.approve(dcpGainsRebateAddress, amount);
      await dcpGainsRebateContract.connect(wallets[0]).depositReward(epochId);

      console.log(await dcpGainsRebateContract.getClaimableFees(trader));

      await expect(dcpGainsRebateContract.claim())
        .to.emit(dcpGainsRebateContract, "TotalRewardClaimed")
        .withArgs(trader, amount);
    });

    it("Revert if epoch is not awarded", async function () {
      const trader = wallets[0].address;
      const epochId = 1;
      const checksum = "0x1234567890";
      const amount = ethers.parseEther("1.123");

      await dcpGainsRebateContract
        .connect(wallets[1])
        .updateRebate(epochId, { traders: [trader], fees: [amount] }, checksum);

      await expect(dcpGainsRebateContract.claim()).to.be.revertedWith(
        "No reward to claim"
      );
    });

    // No reward to claim
    it("Revert if no reward to claim", async function () {
      const epochId = 1;
      const trader = wallets[0].address;
      const amount = ethers.parseEther("0");
      const checksum = "0x1234567890";

      await dcpGainsRebateContract
        .connect(wallets[1])
        .updateRebate(epochId, { traders: [trader], fees: [amount] }, checksum);

      await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60]); // 1 week
      await ethers.provider.send("evm_mine", []);
      await dcpGainsRebateContract
        .connect(wallets[1])
        .updateRebate(epochId, { traders: [trader], fees: [amount] }, checksum);

      await arbContract.approve(dcpGainsRebateAddress, amount);
      await dcpGainsRebateContract.connect(wallets[0]).depositReward(epochId);

      await expect(dcpGainsRebateContract.claim()).to.be.revertedWith(
        "No reward to claim"
      );
    });

    it("Revert if claim failed", async function () {
      const epochId = 1;
      const trader = wallets[0].address;
      const amount = ethers.parseEther("1.123");
      const checksum = "0x1234567890";

      await dcpGainsRebateContract
        .connect(wallets[1])
        .updateRebate(epochId, { traders: [trader], fees: [amount] }, checksum);

      await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60]); // 1 week
      await ethers.provider.send("evm_mine", []);
      await dcpGainsRebateContract
        .connect(wallets[1])
        .updateRebate(epochId, { traders: [trader], fees: [amount] }, checksum);

      await arbContract.approve(dcpGainsRebateAddress, amount);
      await dcpGainsRebateContract.connect(wallets[0]).depositReward(epochId);

      await arbContract.setTransferSuccess(false);

      await expect(dcpGainsRebateContract.claim()).to.be.reverted;
    });
  });

  // ==============================================================================================================
  // getOngoingFees

  describe("getOngoingFees", function () {
    it("Should return total unclaimed fees for ongoing epochs", async () => {
      const oneWeekInSeconds = 7 * 24 * 60 * 60;
      const trader = wallets[2].address;
      const amount = ethers.parseEther("1");

      await ethers.provider.send("evm_increaseTime", [oneWeekInSeconds]); // 1 week
      await ethers.provider.send("evm_mine", []);

      await dcpGainsRebateContract
        .connect(wallets[1])
        .updateRebate(1, { traders: [trader], fees: [amount] }, "checksum");

      await arbContract.approve(dcpGainsRebateAddress, amount);
      await dcpGainsRebateContract.connect(wallets[0]).depositReward(1);

      await dcpGainsRebateContract
        .connect(wallets[1])
        .updateRebate(
          2,
          { traders: [trader], fees: [amount + 2n] },
          "checksum"
        );

      const ongoingFees = await dcpGainsRebateContract.getOngoingFees(
        wallets[2].address
      );
      expect(ongoingFees).to.equal(amount + 2n);
    });
  });

  // ==============================================================================================================
  // getClaimableFees

  describe("getClaimableFees", function () {
    it("Should return total unclaimed fees for ongoing epochs", async () => {
      const oneWeekInSeconds = 7 * 24 * 60 * 60;
      const trader = wallets[2].address;
      const amount = ethers.parseEther("1");

      await ethers.provider.send("evm_increaseTime", [oneWeekInSeconds]); // 1 week
      await ethers.provider.send("evm_mine", []);

      await dcpGainsRebateContract
        .connect(wallets[1])
        .updateRebate(1, { traders: [trader], fees: [amount] }, "checksum");

      await arbContract.approve(dcpGainsRebateAddress, amount);
      await dcpGainsRebateContract.connect(wallets[0]).depositReward(1);

      await dcpGainsRebateContract
        .connect(wallets[1])
        .updateRebate(
          2,
          { traders: [trader], fees: [amount + 2n] },
          "checksum"
        );

      const ongoingFees = await dcpGainsRebateContract.getClaimableFees(
        wallets[2].address
      );
      expect(ongoingFees).to.equal(amount);
    });
  });

  // ==============================================================================================================
  // getClaimedFees

  describe("getClaimableFees", function () {
    it("Should return total unclaimed fees for ongoing epochs", async () => {
      const oneWeekInSeconds = 7 * 24 * 60 * 60;
      const trader = wallets[2].address;
      const amount = ethers.parseEther("1");

      await ethers.provider.send("evm_increaseTime", [oneWeekInSeconds]); // 1 week
      await ethers.provider.send("evm_mine", []);

      await dcpGainsRebateContract
        .connect(wallets[1])
        .updateRebate(1, { traders: [trader], fees: [amount] }, "checksum");

      await arbContract.approve(dcpGainsRebateAddress, amount);
      await dcpGainsRebateContract.connect(wallets[0]).depositReward(1);

      dcpGainsRebateContract.connect(wallets[2]).claim();

      await dcpGainsRebateContract
        .connect(wallets[1])
        .updateRebate(
          2,
          { traders: [trader], fees: [amount + 2n] },
          "checksum"
        );

      const ongoingFees = await dcpGainsRebateContract.getClaimedFees(
        wallets[2].address
      );
      expect(ongoingFees).to.equal(amount);
    });
  });

  // ==============================================================================================================
  // getClaimStatus

  describe("getClaimStatus", function () {
    it("CLAIM_STATUS == CLAIMED", async () => {
      const oneWeekInSeconds = 7 * 24 * 60 * 60;
      const trader = wallets[2].address;
      const amount = ethers.parseEther("1");

      await ethers.provider.send("evm_increaseTime", [oneWeekInSeconds]); // 1 week
      await ethers.provider.send("evm_mine", []);

      await dcpGainsRebateContract
        .connect(wallets[1])
        .updateRebate(1, { traders: [trader], fees: [amount] }, "checksum");

      await arbContract.approve(dcpGainsRebateAddress, amount);
      await dcpGainsRebateContract.connect(wallets[0]).depositReward(1);

      dcpGainsRebateContract.connect(wallets[2]).claim();

      await dcpGainsRebateContract
        .connect(wallets[1])
        .updateRebate(
          2,
          { traders: [trader], fees: [amount + 2n] },
          "checksum"
        );

      const ongoingFees = await dcpGainsRebateContract.getClaimedFees(
        wallets[2].address
      );

      expect(ongoingFees).to.equal(amount);
      expect(await dcpGainsRebateContract.getClaimStatus(trader, 1)).to.equal(
        0
      );
    });

    it("CLAIM_STATUS == CLAIMABLE", async () => {
      const oneWeekInSeconds = 7 * 24 * 60 * 60;
      const trader = wallets[2].address;
      const amount = ethers.parseEther("1");

      await ethers.provider.send("evm_increaseTime", [oneWeekInSeconds]); // 1 week
      await ethers.provider.send("evm_mine", []);

      await dcpGainsRebateContract
        .connect(wallets[1])
        .updateRebate(1, { traders: [trader], fees: [amount] }, "checksum");

      await arbContract.approve(dcpGainsRebateAddress, amount);
      await dcpGainsRebateContract.connect(wallets[0]).depositReward(1);

      dcpGainsRebateContract.connect(wallets[2]).claim();

      await dcpGainsRebateContract
        .connect(wallets[1])
        .updateRebate(
          2,
          { traders: [trader], fees: [amount + 2n] },
          "checksum"
        );

      const ongoingFees = await dcpGainsRebateContract.getClaimedFees(
        wallets[2].address
      );

      expect(ongoingFees).to.equal(amount);
      expect(await dcpGainsRebateContract.getClaimStatus(trader, 2)).to.equal(
        2
      );
    });
  });

  // ==============================================================================================================
  // setOperator

  describe("setOperator", function () {
    it("Should set operator successfully", async () => {
      await dcpGainsRebateContract
        .connect(wallets[0])
        .setOperator(wallets[2].address);

      expect(await dcpGainsRebateContract.operator()).to.equal(
        wallets[2].address
      );
    });

    it("Emit OperatorSet event", async () => {
      const setOperator = await dcpGainsRebateContract
        .connect(wallets[0])
        .setOperator(wallets[2].address);

      await expect(setOperator)
        .to.emit(dcpGainsRebateContract, "OperatorSet")
        .withArgs(wallets[2].address);
    });
  });

  // ==============================================================================================================
  // setPayer

  describe("setPayer", function () {
    it("Should set operator successfully", async () => {
      await dcpGainsRebateContract
        .connect(wallets[0])
        .setPayer(wallets[2].address);

      expect(await dcpGainsRebateContract.payer()).to.equal(wallets[2].address);
    });

    it("Emit setPayer event", async () => {
      const setPayer = await dcpGainsRebateContract
        .connect(wallets[0])
        .setPayer(wallets[2].address);

      await expect(setPayer)
        .to.emit(dcpGainsRebateContract, "PayerSet")
        .withArgs(wallets[2].address);
    });
  });
});
