/**
 * Example: Using useRewardsDistributor Hook in Claim Rewards Screen
 *
 * This example shows how to integrate the Rewards Distributor hook
 * into the claim rewards flow.
 */

import React, { useState } from 'react';
import {
  CyDView,
  CyDText,
  CyDTouchView,
} from '../../styles/tailwindComponents';
import Button from '../../components/v2/button';
import { ButtonType } from '../../constants/enum';
import useRewardsDistributor from '../../hooks/useRewardsDistributor';
import { showToast } from '../../containers/utilities/toastUtility';

/**
 * Example claim data structure
 * In production, this would come from your API/backend
 */
interface ClaimData {
  proofs: `0x${string}`[][];
  rootIds: string[];
  amounts: string[];
}

/**
 * Example Component showing integration
 */
const ClaimRewardsExample = () => {
  const { claimRewards, estimateClaimGas } = useRewardsDistributor();
  const [claiming, setClaiming] = useState(false);
  const [estimatedGas, setEstimatedGas] = useState<bigint | null>(null);

  // Example: This would typically come from your API
  // Format: Response from /v1/cypher-protocol/user/{address}/rewards/claim endpoint
  const claimData: ClaimData = {
    proofs: [
      // Each inner array is a Merkle proof for one claim
      [
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      ],
      [
        '0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba',
        '0xfedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210',
        '0x1111111111111111111111111111111111111111111111111111111111111111',
      ],
    ],
    rootIds: ['1', '2'], // Merkle root IDs
    amounts: ['1000000000000000000', '2500000000000000000'], // Amounts in Wei
  };

  // User's Ethereum address (from wallet context)
  const userAddress = '0xYourEthereumAddress' as `0x${string}`;

  /**
   * Estimate gas before claiming
   */
  const handleEstimateGas = async () => {
    try {
      const params = {
        proofs: claimData.proofs,
        rootIds: claimData.rootIds.map(id => BigInt(id)),
        values: claimData.amounts.map(amt => BigInt(amt)),
        fromAddress: userAddress,
      };

      const gas = await estimateClaimGas(params);
      setEstimatedGas(gas);

      showToast(`Estimated gas: ${gas.toString()} units`);
    } catch (error) {
      console.error('❌ Error estimating gas:', error);
      showToast('Failed to estimate gas');
    }
  };

  /**
   * Handle claim rewards button press
   */
  const handleClaimRewards = async () => {
    setClaiming(true);

    try {
      // Prepare parameters
      const params = {
        proofs: claimData.proofs,
        rootIds: claimData.rootIds.map(id => BigInt(id)),
        values: claimData.amounts.map(amt => BigInt(amt)),
        fromAddress: userAddress,
      };

      // Execute claim
      const result = await claimRewards(params);

      if (result.success) {
        showToast('Rewards claimed successfully! 🎉');

        // TODO: Refresh rewards data from API
        // TODO: Update UI to reflect claimed rewards
        // TODO: Navigate to success screen or show success modal
      } else {
        console.error('❌ Claim failed:', result.error);
        showToast('Failed to claim rewards. Please try again.');
      }
    } catch (error) {
      console.error('💥 Error in claim process:', error);
      showToast('An error occurred while claiming rewards');
    } finally {
      setClaiming(false);
    }
  };

  return (
    <CyDView className='p-4'>
      {/* Claim Information */}
      <CyDView className='mb-4'>
        <CyDText className='text-lg font-semibold mb-2'>
          Ready to Claim Rewards
        </CyDText>
        <CyDText className='text-n200 text-sm'>
          {claimData.proofs.length} reward(s) available to claim
        </CyDText>
      </CyDView>

      {/* Estimated Gas (Optional) */}
      {estimatedGas && (
        <CyDView className='mb-4 p-3 bg-n20 rounded-lg'>
          <CyDText className='text-sm text-n200'>
            Estimated Gas: {estimatedGas.toString()} units
          </CyDText>
        </CyDView>
      )}

      {/* Estimate Gas Button (Optional) */}
      <CyDTouchView
        onPress={handleEstimateGas}
        className='mb-3 p-3 bg-n40 rounded-lg'>
        <CyDText className='text-center text-sm'>Estimate Gas Cost</CyDText>
      </CyDTouchView>

      {/* Claim Button */}
      <Button
        title={claiming ? 'Claiming...' : 'Claim Rewards'}
        onPress={handleClaimRewards}
        type={ButtonType.PRIMARY}
        disabled={claiming}
      />
    </CyDView>
  );
};

/**
 * Integration with ClaimRewardsBottomSheetContent
 *
 * In the actual claimReward.tsx file, you would:
 *
 * 1. Import the hook:
 *    import useRewardsDistributor from '../../hooks/useRewardsDistributor';
 *
 * 2. Initialize in component:
 *    const { claimRewards } = useRewardsDistributor();
 *
 * 3. Modify handleClaimToWallet to use the hook:
 *    const handleClaimToWallet = async () => {
 *      try {
 *        // Get claim data from API (with proofs, rootIds, amounts)
 *        const claimData = await fetchClaimDataFromAPI();
 *
 *        // Execute claim
 *        const result = await claimRewards({
 *          proofs: claimData.proofs,
 *          rootIds: claimData.rootIds.map(id => BigInt(id)),
 *          values: claimData.amounts.map(amt => BigInt(amt)),
 *          fromAddress: userEthereumAddress,
 *        });
 *
 *        if (result.success) {
 *          // Show success message and refresh data
 *          showToast('Rewards claimed successfully! 🎉');
 *          // Refresh rewards data
 *        }
 *      } catch (error) {
 *        console.error('Error claiming rewards:', error);
 *      }
 *    };
 */

export default ClaimRewardsExample;
