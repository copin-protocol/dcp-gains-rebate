// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IDCPGainsRebate} from "./interfaces/IDCPGainsRebate.sol";
import {Owned} from "./utils/Owned.sol";

contract DCPGainsRebate is IDCPGainsRebate, ReentrancyGuard, Owned {
    using Address for address;

    IERC20 public immutable ARB;

    address public operator;
    address public payer;
    uint256 public currentEpochId;
    uint256 public totalDistributedReward;

    uint256 public constant EPOCH_LENGTH = 1 weeks;
    uint256 public constant MAX_EPOCHS = 5;
    uint256 public constant MAX_REWARD = 10000 * 1e18;
    uint256 public constant EPOCH_START = 1722297600;

    mapping(uint256 => Epoch) public epochs;
    mapping(address => mapping(uint256 => uint256)) private traderRewards; // Mapping to track rewards by user per epoch
    mapping(address => mapping(uint256 => bool)) private rewardsClaimed; // Mapping to track claimed rewards by user per epoch

    modifier onlyOperator() {
        require(msg.sender == operator, "Only operator can call this function");

        _;
    }

    modifier onlyPayer() {
        require(msg.sender == payer, "Only payer can call this function");

        _;
    }

    constructor(address _arb, address _owner, address _operator) Owned(_owner) {
        ARB = IERC20(_arb);
        operator = _operator;
        payer = _owner;
        initializeEpochs();
    }

    function initializeEpochs() private {
        for (uint256 i = 1; i <= MAX_EPOCHS; i++) {
            Epoch storage epoch = epochs[i];

            epoch.epochStart = EPOCH_START + (i - 1) * EPOCH_LENGTH;
            epoch.epochEnd = epoch.epochStart + EPOCH_LENGTH - 1;

            if (i == 1) {
                epoch.status = EPOCH_STATUS.ONGOING;
            } else {
                epoch.status = EPOCH_STATUS.NOT_HAPPEN;
            }
        }
        currentEpochId = 1;
    }

    function updateRebate(
        uint256 epochId,
        RebateData calldata rebateData,
        string calldata checksum
    ) external onlyOperator {
        require(
            epochId <= MAX_EPOCHS && epochId <= currentEpochId,
            "Invalid epoch ID"
        );
        require(
            rebateData.traders.length == rebateData.fees.length,
            "Wrong rebate data"
        );

        Epoch storage epoch = epochs[epochId];

        require(block.timestamp >= epoch.epochStart, "Can't update");
        require(
            epoch.status == EPOCH_STATUS.ONGOING ||
                epoch.status == EPOCH_STATUS.ENDED,
            "Invalid Epoch Status"
        );

        if (
            block.timestamp > epoch.epochEnd &&
            epoch.status != EPOCH_STATUS.ENDED
        ) {
            epoch.status = EPOCH_STATUS.ENDED;
            currentEpochId++;

            if (currentEpochId <= MAX_EPOCHS) {
                epochs[currentEpochId].status = EPOCH_STATUS.ONGOING;
            }
        }

        epoch.rebateData = rebateData;
        epoch.lastUpdated = block.timestamp;

        for (uint256 i = 0; i < rebateData.traders.length; i++) {
            traderRewards[rebateData.traders[i]][epochId] = rebateData.fees[i];
        }

        emit RewardsUpdated(epochId, checksum);
    }

    function depositReward(uint256 epochId) external onlyPayer {
        Epoch storage epoch = epochs[epochId];

        require(epoch.status == EPOCH_STATUS.ENDED, "Invalid Epoch Status");

        uint256 totalReward = 0;

        for (uint256 i = 0; i < epoch.rebateData.traders.length; i++) {
            totalReward += epoch.rebateData.fees[i];
        }

        uint256 remainingReward = MAX_REWARD - totalDistributedReward;
        if (totalReward > remainingReward) {
            totalReward = remainingReward;
        }

        ARB.transferFrom(msg.sender, address(this), totalReward);

        epoch.totalRewardPool = totalReward;
        epoch.status = EPOCH_STATUS.AWARDED;

        totalDistributedReward += totalReward;

        emit RewardDeposited(epochId, totalReward);
    }

    function endEvent() external onlyOwner {
        require(totalDistributedReward >= MAX_REWARD, "Can't end");
        for (uint256 i = currentEpochId; i <= MAX_EPOCHS; i++) {
            if (
                epochs[i].status == EPOCH_STATUS.NOT_HAPPEN ||
                epochs[i].status == EPOCH_STATUS.ONGOING
            ) {
                epochs[i].status = EPOCH_STATUS.ENDED;
            }
        }
        currentEpochId = MAX_EPOCHS;
    }

    function claim() external nonReentrant {
        uint256 totalReward = getClaimableFees(msg.sender);

        require(totalReward > 0, "No reward to claim");

        for (uint256 epochId = 1; epochId <= currentEpochId; epochId++) {
            if (
                epochs[epochId].status == EPOCH_STATUS.AWARDED &&
                !rewardsClaimed[msg.sender][epochId] &&
                traderRewards[msg.sender][epochId] > 0
            ) {
                rewardsClaimed[msg.sender][epochId] = true;
            }
        }

        ARB.transfer(msg.sender, totalReward);

        emit TotalRewardClaimed(msg.sender, totalReward);
    }

    function getOngoingFees(address trader) public view returns (uint256) {
        uint256 totalUnclaimedFees = 0;

        for (uint256 i = 1; i <= currentEpochId; i++) {
            if (
                epochs[i].status == EPOCH_STATUS.ONGOING &&
                !rewardsClaimed[trader][i]
            ) {
                totalUnclaimedFees += traderRewards[trader][i];
            }
        }

        return totalUnclaimedFees;
    }

    function getClaimableFees(address trader) public view returns (uint256) {
        uint256 totalUnclaimedFees = 0;

        for (uint256 i = 1; i <= currentEpochId; i++) {
            if (
                epochs[i].status == EPOCH_STATUS.AWARDED &&
                !rewardsClaimed[trader][i] &&
                traderRewards[trader][i] > 0
            ) {
                totalUnclaimedFees += traderRewards[trader][i];
            }
        }

        return totalUnclaimedFees;
    }

    function getClaimedFees(address trader) public view returns (uint256) {
        uint256 totalClaimedFees = 0;

        for (uint256 i = 1; i <= currentEpochId; i++) {
            if (rewardsClaimed[trader][i]) {
                totalClaimedFees += traderRewards[trader][i];
            }
        }

        return totalClaimedFees;
    }

    function getClaimStatus(
        address trader,
        uint256 epochId
    ) public view returns (CLAIM_STATUS) {
        require(epochId > 0 && epochId <= currentEpochId, "Invalid epoch ID");

        Epoch storage epoch = epochs[epochId];

        if (rewardsClaimed[trader][epochId]) {
            return CLAIM_STATUS.CLAIMED;
        } else if (
            epoch.status == EPOCH_STATUS.AWARDED &&
            traderRewards[trader][epochId] > 0
        ) {
            return CLAIM_STATUS.CLAIMABLE;
        } else {
            return CLAIM_STATUS.WAITING;
        }
    }

    function setOperator(address _operator) public onlyOwner {
        require(_operator != address(0), "Invalid operator address");

        operator = _operator;

        emit OperatorSet(_operator);
    }

    function setPayer(address _payer) public onlyOwner {
        require(_payer != address(0), "Invalid payer address");

        payer = _payer;

        emit PayerSet(_payer);
    }
}
