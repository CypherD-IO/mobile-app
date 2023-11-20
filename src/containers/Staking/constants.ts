export interface StakingVariables {
  totalClaimableRewards: string;
  availableToStake: string;
  currentlyStaked: string;
  totalUnboundings: string;
}

export const initialStakeVariables = {
  totalClaimableRewards: '0',
  availableToStake: '0',
  currentlyStaked: '0',
  totalUnboundings: '0',
};
