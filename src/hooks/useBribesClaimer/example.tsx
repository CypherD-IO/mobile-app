/**
 * Example: Using useBribesClaimer Hook in Rewards Screen
 *
 * This example shows how to integrate the Bribes Claimer hook
 * into the rewards/claim flow.
 */

import React, { useState, useEffect } from 'react';
import {
  CyDView,
  CyDText,
  CyDTouchView,
} from '../../styles/tailwindComponents';
import Button from '../../components/v2/button';
import { ButtonType } from '../../constants/enum';
import useBribesClaimer from '../../hooks/useBribesClaimer';
import { showToast } from '../../containers/utilities/toastUtility';
import useAxios from '../../core/HttpRequest';
import {
  IBribeClaimResponse,
  IMergedBribe,
} from '../../models/bribesClaim.interface';

/**
 * Example Component showing integration
 */
const ClaimBribesExample = () => {
  const { claimBribes, claimBribesBatch } = useBribesClaimer();
  const { getWithAuth } = useAxios();
  const [claiming, setClaiming] = useState(false);
  const [bribesData, setBribesData] = useState<IBribeClaimResponse | null>(
    null,
  );
  const [loadingBribes, setLoadingBribes] = useState(true);

  /**
   * Fetch bribe data from API
   */
  const fetchBribesData = async () => {
    try {
      setLoadingBribes(true);
      const response = await getWithAuth('/v1/cypher-protocol/bribes/claim');

      if (!response.isError && response.data) {
        setBribesData(response.data as IBribeClaimResponse);
      } else {
        console.error('Failed to fetch bribes:', response.error);
        showToast('Failed to load bribes data');
      }
    } catch (error) {
      console.error('Error fetching bribes:', error);
      showToast('Error loading bribes');
    } finally {
      setLoadingBribes(false);
    }
  };

  useEffect(() => {
    void fetchBribesData();
  }, []);

  /**
   * Handle claiming all bribes for all veNFTs
   */
  const handleClaimAllBribes = async () => {
    if (!bribesData?.mergedBribes || bribesData.mergedBribes.length === 0) {
      showToast('No bribes available to claim');
      return;
    }

    setClaiming(true);

    try {
      // Prepare claim parameters for all merged bribes
      const claimParams = bribesData.mergedBribes.map(bribe => ({
        tokenId: parseInt(bribe.veNFTId),
        bribeTokens: bribe.bribeTokens,
        candidates: bribe.candidates as string[],
        fromTimestamp: bribe.epochRange.from,
        untilTimestamp: bribe.epochRange.until,
        onStatusUpdate: (msg: string) => {},
      }));

      // Execute batch claim
      const results = await claimBribesBatch(claimParams);

      // Count successes
      const successCount = results.filter(r => !r.isError).length;

      if (successCount > 0) {
        showToast(
          `Successfully claimed bribes from ${successCount}/${results.length} veNFTs! 🎉`,
        );

        // Refresh bribes data
        await fetchBribesData();
      } else {
        showToast('Failed to claim bribes. Please try again.');
      }
    } catch (error) {
      console.error('Error in batch claim:', error);
      showToast('An error occurred while claiming bribes');
    } finally {
      setClaiming(false);
    }
  };

  /**
   * Handle claiming bribes for a single veNFT
   */
  const handleClaimSingleBribe = async (bribe: IMergedBribe) => {
    setClaiming(true);

    try {
      const result = await claimBribes({
        tokenId: parseInt(bribe.veNFTId),
        bribeTokens: bribe.bribeTokens,
        candidates: bribe.candidates as string[],
        fromTimestamp: bribe.epochRange.from,
        untilTimestamp: bribe.epochRange.until,
        onStatusUpdate: (msg: string) => {},
      });

      if (!result.isError) {
        showToast('Bribes claimed successfully! 🎉');
        await fetchBribesData();
      } else {
        console.error('Claim failed:', result.error);
        showToast('Failed to claim bribes. Please try again.');
      }
    } catch (error) {
      console.error('Error claiming bribes:', error);
      showToast('An error occurred while claiming bribes');
    } finally {
      setClaiming(false);
    }
  };

  if (loadingBribes) {
    return (
      <CyDView className='p-4'>
        <CyDText>Loading bribes data...</CyDText>
      </CyDView>
    );
  }

  if (!bribesData?.hasClaimableBribes) {
    return (
      <CyDView className='p-4'>
        <CyDText className='text-center text-n200'>
          No bribes available to claim at this time
        </CyDText>
      </CyDView>
    );
  }

  return (
    <CyDView className='p-4'>
      {/* Summary */}
      <CyDView className='mb-6'>
        <CyDText className='text-lg font-semibold mb-2'>
          Claimable Bribes
        </CyDText>
        {bribesData.summary && (
          <CyDView className='bg-n20 p-4 rounded-lg'>
            <CyDText className='text-sm text-n200 mb-1'>
              Total veNFTs: {bribesData.summary.totalVeNFTs}
            </CyDText>
            <CyDText className='text-sm text-n200 mb-1'>
              Total Candidates: {bribesData.summary.totalCandidates}
            </CyDText>
            <CyDText className='text-sm text-n200 mb-1'>
              Total Bribe Tokens: {bribesData.summary.totalBribeTokens}
            </CyDText>
            <CyDText className='text-base font-semibold mt-2'>
              Total Claimable: $
              {bribesData.summary.totalClaimableBribes.toFixed(2)}
            </CyDText>
          </CyDView>
        )}
      </CyDView>

      {/* Individual Bribes List */}
      <CyDView className='mb-6'>
        <CyDText className='text-base font-semibold mb-3'>
          Bribes by veNFT
        </CyDText>
        {bribesData.mergedBribes?.map((bribe, index) => (
          <CyDView
            key={`${bribe.veNFTId}-${index}`}
            className='bg-n20 p-4 rounded-lg mb-3'>
            <CyDText className='font-semibold mb-2'>
              veNFT #{bribe.veNFTId}
            </CyDText>
            <CyDText className='text-sm text-n200 mb-1'>
              {bribe.bribeTokens.length} token(s) from {bribe.candidates.length}{' '}
              candidate(s)
            </CyDText>
            <CyDText className='text-xs text-n200 mb-3'>
              {bribe.candidateNames.join(', ')}
            </CyDText>

            <Button
              title='Claim Bribes'
              onPress={() => void handleClaimSingleBribe(bribe)}
              type={ButtonType.SECONDARY}
              disabled={claiming}
            />
          </CyDView>
        ))}
      </CyDView>

      {/* Claim All Button */}
      <Button
        title={
          claiming
            ? 'Claiming...'
            : `Claim All Bribes (${bribesData.mergedBribes?.length ?? 0} veNFTs)`
        }
        onPress={() => void handleClaimAllBribes()}
        type={ButtonType.PRIMARY}
        disabled={claiming}
      />
    </CyDView>
  );
};

/**
 * Integration with ClaimReward Screen
 *
 * In the actual ClaimReward component, you would:
 *
 * 1. Import both hooks:
 *    import useRewardsDistributor from '../../hooks/useRewardsDistributor';
 *    import useBribesClaimer from '../../hooks/useBribesClaimer';
 *
 * 2. Initialize both hooks:
 *    const { claimRewards } = useRewardsDistributor();
 *    const { claimBribes, claimBribesBatch } = useBribesClaimer();
 *
 * 3. Fetch both rewards and bribes data:
 *    const [rewardsData, setRewardsData] = useState(...);
 *    const [bribesData, setBribesData] = useState(...);
 *
 * 4. Implement combined claim function:
 *    const handleClaimAll = async () => {
 *      try {
 *        // Claim protocol rewards first
 *        if (rewardsData?.isEligible && rewardsData.claimInfo) {
 *          await claimRewards({
 *            proofs: rewardsData.claimInfo.proof,
 *            rootIds: rewardsData.claimInfo.rootId.map(id => BigInt(id)),
 *            values: rewardsData.claimInfo.amount.map(amt => BigInt(amt)),
 *            fromAddress: userAddress,
 *          });
 *        }
 *
 *        // Then claim bribes if available
 *        if (bribesData?.hasClaimableBribes && bribesData.mergedBribes) {
 *          const claimParams = bribesData.mergedBribes.map(bribe => ({
 *            tokenId: parseInt(bribe.veNFTId),
 *            bribeTokens: bribe.bribeTokens,
 *            candidates: bribe.candidates,
 *            fromTimestamp: bribe.epochRange.from,
 *            untilTimestamp: bribe.epochRange.until,
 *          }));
 *
 *          await claimBribesBatch(claimParams);
 *        }
 *
 *        showToast('All rewards and bribes claimed successfully! 🎉');
 *      } catch (error) {
 *        console.error('Error in combined claim:', error);
 *      }
 *    };
 */

export default ClaimBribesExample;
