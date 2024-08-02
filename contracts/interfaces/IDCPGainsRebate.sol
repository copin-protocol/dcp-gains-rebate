// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IDCPGainsRebate {
    enum EPOCH_STATUS {
        NOT_HAPPEN,
        ONGOING,
        ENDED,
        AWARDED
    }

    enum CLAIM_STATUS {
        CLAIMED,
        CLAIMABLE,
        WAITING
    }

    struct RebateData {
        address[] traders;
        uint256[] fees;
    }

    struct Epoch {
        uint256 epochStart;
        uint256 epochEnd;
        uint256 totalRewardPool;
        uint256 lastUpdated;
        EPOCH_STATUS status;
        RebateData rebateData;
    }

    event RewardsUpdated(uint256 indexed epochId, string checkSum);
    event TotalRewardClaimed(address indexed trader, uint256 reward);
    event RewardDeposited(uint256 indexed epochId, uint256 amount);
    event OperatorSet(address indexed operator);
    event PayerSet(address indexed payer);

    error ClaimFeeRebate_Failed();
    error DepositReward_Failed();
}
