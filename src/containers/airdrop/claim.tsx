import React, { useContext, useState, useEffect, useCallback } from 'react';
import {
  CyDFastImage,
  CyDIcons,
  CyDMaterialDesignIcons,
  CyDScrollView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindComponents';
import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AirdropInfo } from '../../models/airdrop.interface';
import AppImages from '../../../assets/images/appImages';
import { GlobalContext, GlobalContextDef } from '../../core/globalContext';
import { HdWalletContext, parseErrorMessage } from '../../core/util';
import { CardProfile } from '../../models/cardProfile.model';
import GradientText from '../../components/gradientText';
import { CypherPlanId } from '../../constants/enum';
import { get, sum } from 'lodash';
import Button from '../../components/v2/button';
import MerchantBoostModal, {
  MerchantWithAllocation,
} from '../../components/v2/MerchantBoostModal';
import useAxios from '../../core/HttpRequest';
import useTransactionManager from '../../hooks/useTransactionManager';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import { SuccessTransaction } from '../../components/v2/StateModal';
import { CHAIN_BASE, CHAIN_BASE_SEPOLIA } from '../../constants/server';
import { t } from 'i18next';
import { screenTitle } from '../../constants';
import Loading from '../Loading';

interface RouteParams {
  airdropData: AirdropInfo;
}

export default function AirdropClaim() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const { airdropData } = route.params;
  const { top } = useSafeAreaInsets();
  const { globalState } = useContext(GlobalContext) as GlobalContextDef;
  const cardProfile = globalState.cardProfile as CardProfile;
  const planId = cardProfile.planInfo.planId;
  const { getWithAuth } = useAxios();
  const { showModal, hideModal } = useGlobalModalContext();

  const [isMerchantBoostModalVisible, setIsMerchantBoostModalVisible] =
    useState(false);
  const [selectedMerchants, setSelectedMerchants] = useState<
    MerchantWithAllocation[]
  >([]);
  const [isTransactionLoading, setIsTransactionLoading] = useState(false);

  // Get transaction manager and wallet context
  const { executeAirdropClaimContract } = useTransactionManager();
  const hdWalletContext = useContext<any>(HdWalletContext);

  // Load default merchants on component mount
  useEffect(() => {
    let isMounted = true;
    const loadDefaultMerchants = async () => {
      try {
        const params = {
          limit: 3,
          offset: undefined,
          search: undefined,
        };

        const res = await getWithAuth(`/v1/cypher-protocol/merchants`, params);
        if (isMounted && !res.isError && res.data.items.length >= 3) {
          const defaultMerchants: MerchantWithAllocation[] = [
            { ...res.data.items[0], allocation: 50 }, // First merchant gets 50%
            { ...res.data.items[1], allocation: 25 }, // Second merchant gets 25%
            { ...res.data.items[2], allocation: 25 }, // Third merchant gets 25%
          ];
          setSelectedMerchants(defaultMerchants);
        }
      } catch (error) {
        if (!isMounted) return;
        showModal('state', {
          type: 'error',
          title: 'Airdrop claim failed',
          description: 'Failed to load merchants',
          onSuccess: () => {
            hideModal();
            navigation.goBack();
          },
          onFailure: () => {
            hideModal();
            navigation.goBack();
          },
        });
      }
    };

    if (selectedMerchants.length === 0) {
      void loadDefaultMerchants();
    }

    return () => {
      isMounted = false;
    };
  }, [selectedMerchants.length, getWithAuth]);

  const renderSuccessTransaction = (hash: string, isTestnet: boolean) => {
    const chain = isTestnet ? CHAIN_BASE_SEPOLIA : CHAIN_BASE;
    return (
      <>
        <SuccessTransaction
          hash={hash}
          symbol={chain?.symbol ?? ''}
          name={chain?.name ?? ''}
          navigation={navigation}
          hideModal={hideModal}
        />
      </>
    );
  };

  // --- Execute airdrop claim transaction ---
  const handleSignTransaction = useCallback(async () => {
    if (
      !airdropData ||
      selectedMerchants.length === 0 ||
      !airdropData.claimInfo?.isClaimActive ||
      airdropData.claimInfo?.isClaimed ||
      !airdropData.claimInfo?.contractAddress
    ) {
      showModal('state', {
        type: 'error',
        title: 'Airdrop claim failed',
        description: 'Airdrop information is not available',
        onSuccess: hideModal,
        onFailure: hideModal,
      });
      return;
    }

    setIsTransactionLoading(true);
    try {
      // Get merkle tree data
      const merkleTree = airdropData.merkleTree;
      if (!merkleTree) {
        showModal('state', {
          type: 'error',
          title: 'Airdrop claim failed',
          description: 'Merkle tree data not available',
          onSuccess: hideModal,
          onFailure: hideModal,
        });
        return;
      }

      // Extract data from leafTuple: [evmAddress, totalTokenValue, totalNftValue]
      const [leafEvmAddress, leafTokenValue, leafNftValue] =
        merkleTree.leafTuple;

      // Validate that current wallet address matches the leaf address
      const currentWalletAddress =
        hdWalletContext.state.wallet?.ethereum?.address;
      if (!currentWalletAddress) {
        showModal('state', {
          type: 'error',
          title: 'Airdrop claim failed',
          description: 'Airdrop address mismatch',
          onSuccess: hideModal,
          onFailure: hideModal,
        });
        return;
      }

      if (currentWalletAddress.toLowerCase() !== leafEvmAddress.toLowerCase()) {
        throw new Error('Wallet address mismatch');
      }

      // Use values from leafTuple instead of calculating
      const totalTokenValue = BigInt(leafTokenValue);
      const totalNftValue = BigInt(leafNftValue);

      // Prepare candidates and weights from selected merchants
      const candidates = selectedMerchants.map(
        merchant => merchant.candidateId,
      );
      const weights = selectedMerchants.map(
        merchant => merchant.allocation * 100,
      );

      // Execute the contract call
      const result = await executeAirdropClaimContract({
        contractAddress: get(airdropData, 'claimInfo.contractAddress', ''),
        proof: merkleTree.merkleProof,
        rootId: merkleTree.rootId,
        tokenAirdropValue: totalTokenValue,
        nftTokenValue: totalNftValue,
        candidates,
        weights,
        isTestnet: get(airdropData, 'claimInfo.isTestnet', true),
      });

      if (result.isError) {
        showModal('state', {
          type: 'error',
          title: 'Airdrop claim failed',
          description: parseErrorMessage(result.error),
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      } else {
        showModal('state', {
          type: 'success',
          title: t('CLAIM_SUCCESS'),
          modalImage: AppImages.CYPHER_SUCCESS,
          description: renderSuccessTransaction(
            result?.hash,
            get(airdropData, 'claimInfo.isTestnet', true),
          ),
          onSuccess: () => {
            hideModal();
            navigation.navigate(screenTitle.PORTFOLIO);
          },
        });
      }
    } catch (error) {
      showModal('state', {
        type: 'error',
        title: 'Airdrop claim failed',
        description: parseErrorMessage(error),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    } finally {
      setIsTransactionLoading(false);
    }
  }, [
    airdropData,
    selectedMerchants,
    executeAirdropClaimContract,
    hdWalletContext.state.selectedChain,
  ]);

  if (!airdropData) {
    return (
      <>
        <Loading backgroundColor='bg-black' loadingText='Loading...' />
      </>
    );
  }

  const totalCyprAirdropValue = sum([
    airdropData.tokenAllocation?.cypherCardRewards[0],
    airdropData.tokenAllocation?.cypherOGRewards[0],
    airdropData.tokenAllocation?.influencerRewards[0],
    airdropData.tokenAllocation?.baseCommunityRewards[0],
  ]);

  const totalVeNftAirdropValue = sum([
    airdropData.tokenAllocation?.cypherCardRewards[1],
    airdropData.tokenAllocation?.cypherOGRewards[1],
    airdropData.tokenAllocation?.influencerRewards[1],
    airdropData.tokenAllocation?.baseCommunityRewards[1],
  ]);

  const totalAirdropValue = sum([
    totalCyprAirdropValue,
    totalVeNftAirdropValue,
  ]);

  if (!airdropData) {
    return (
      <CyDView
        className='!bg-[#0D0E12] flex-1 p-[24px]'
        style={{ paddingTop: top }}>
        <CyDText className='text-white font-normal !text-[32px] leading-[120%] tracking-[-0.5px]'>
          No airdrop data
        </CyDText>
      </CyDView>
    );
  }
  return (
    <>
      <MerchantBoostModal
        isVisible={isMerchantBoostModalVisible}
        setIsVisible={setIsMerchantBoostModalVisible}
        initialSelectedMerchants={selectedMerchants}
        onConfirm={merchants => {
          setSelectedMerchants(merchants);
        }}
      />
      <CyDView
        className='!bg-[#0D0E12] flex-1 p-[24px]'
        style={{ paddingTop: top }}>
        <CyDScrollView>
          <CyDView className='flex flex-row gap-x-[12px] items-center'>
            <CyDTouchView
              onPress={() => navigation.goBack()}
              className='w-[24px] h-[24px] !bg-[#6B788E] rounded-full flex items-center justify-center'>
              <CyDMaterialDesignIcons
                name='arrow-left'
                size={16}
                className='text-white'
              />
            </CyDTouchView>
            <CyDText className='text-white font-medium !text-[18px] leading-[140%] tracking-[-0.8px]'>
              {t('AIRDROP')}
            </CyDText>
          </CyDView>
          <CyDText className='text-white font-normal !text-[32px] leading-[120%] tracking-[-0.5px] mt-[12px]'>
            {t('AIRDROP_HEADER')}
          </CyDText>

          <CyDView className='p-[16px] bg-black rounded-[16px] border-[0.5px] border-[#4B4B4B] mt-[24px]'>
            {/* Spend Reward */}
            {sum(airdropData.tokenAllocation?.cypherCardRewards) > 0 && (
              <CyDView className='flex flex-row items-center justify-between'>
                <CyDView className='flex-1'>
                  <CyDView className='flex flex-row items-center gap-x-[4px]'>
                    {planId === CypherPlanId.PRO_PLAN && (
                      <GradientText
                        textElement={
                          <CyDText className='font-semibold !text-[16px] leading-[145%] tracking-[-0.6px]'>
                            {t('PREMIUM')}
                          </CyDText>
                        }
                        gradientColors={['#FA9703', '#F89408', '#F6510A']}
                      />
                    )}
                    <CyDText className='text-white font-semibold !text-[14px] leading-[145%] tracking-[-0.6px]'>
                      {t('SPEND_REWARD')}
                    </CyDText>
                  </CyDView>
                  <CyDText className='font-medium !text-[12px] leading-[145%] tracking-[-0.6px] mt-[4px] text-n200'>
                    {'for spending with card'}
                  </CyDText>
                </CyDView>
                <CyDView>
                  <CyDView className='flex flex-row items-center justify-end gap-x-[4px] flex-1'>
                    <CyDFastImage
                      source={AppImages.CYPR_TOKEN_WITH_BASE_CHAIN}
                      className='w-[32px] h-[30px]'
                    />
                    <CyDText className='text-white font-semibold !text-[16px] leading-[145%] tracking-[-0.6px]'>
                      {sum(
                        airdropData.tokenAllocation?.cypherCardRewards,
                      ).toLocaleString()}
                    </CyDText>
                    <CyDText className='font-medium !text-[14px] leading-[145%] tracking-[-0.6px] !text-base150'>
                      {t('CYPR')}
                    </CyDText>
                  </CyDView>

                  {planId === CypherPlanId.PRO_PLAN &&
                    sum(airdropData.tokenAllocation?.cypherCardRewards) >
                      sum(
                        airdropData.tokenAllocation
                          ?.cypherCardRewardsBfMultiplier,
                      ) && (
                      <CyDText className='!text-base150 font-medium !text-[14px] text-right line-through'>
                        {` ${sum(
                          airdropData.tokenAllocation
                            ?.cypherCardRewardsBfMultiplier,
                        )} ${t('CYPR')}`}
                      </CyDText>
                    )}
                </CyDView>
              </CyDView>
            )}

            {/* OG Reward */}
            {sum(airdropData.tokenAllocation?.cypherOGRewards) > 0 && (
              <CyDView className='flex flex-row items-center justify-between mt-[16px]'>
                <CyDView className='flex-1'>
                  <CyDText className='text-white font-semibold !text-[14px] leading-[145%] tracking-[-0.6px]'>
                    {t('CYPHER_OG_REWARDS')}
                  </CyDText>
                  <CyDText className='text-n200 font-medium !text-[12px] leading-[145%] tracking-[-0.6px] mt-[4px]'>
                    {t('CYPHER_OG_REWARDS_DESCRIPTION')}
                  </CyDText>
                </CyDView>
                <CyDView className='flex flex-row items-center justify-end gap-x-[4px] flex-1'>
                  <CyDFastImage
                    source={AppImages.CYPR_TOKEN_WITH_BASE_CHAIN}
                    className='w-[32px] h-[30px]'
                  />
                  <CyDText className='text-white font-semibold !text-[16px] leading-[145%] tracking-[-0.6px]'>
                    {sum(
                      airdropData.tokenAllocation?.cypherOGRewards,
                    ).toLocaleString()}
                  </CyDText>
                  <CyDText className='!text-base150 font-medium !text-[14px] leading-[145%] tracking-[-0.6px]'>
                    {t('CYPR')}
                  </CyDText>
                </CyDView>
              </CyDView>
            )}

            {/* Influencer Reward */}
            {sum(airdropData.tokenAllocation?.influencerRewards) > 0 && (
              <CyDView className='flex flex-row items-center justify-between mt-[16px]'>
                <CyDView className='flex-1'>
                  <CyDText className='text-white font-semibold !text-[14px] leading-[145%] tracking-[-0.6px]'>
                    {t('INFLUENCER_REWARD')}
                  </CyDText>
                  <CyDText className='text-n200 font-medium !text-[12px] leading-[145%] tracking-[-0.6px] mt-[4px]'>
                    {t('INFLUENCER_REWARD_DESCRIPTION')}
                  </CyDText>
                </CyDView>
                <CyDView className='flex flex-row items-center justify-end gap-x-[4px] flex-1'>
                  <CyDFastImage
                    source={AppImages.CYPR_TOKEN_WITH_BASE_CHAIN}
                    className='w-[32px] h-[30px]'
                  />
                  <CyDText className='text-white font-semibold !text-[16px] leading-[145%] tracking-[-0.6px]'>
                    {sum(
                      airdropData.tokenAllocation?.influencerRewards,
                    ).toLocaleString()}
                  </CyDText>
                  <CyDText className='!text-base150 font-medium !text-[14px] leading-[145%] tracking-[-0.6px]'>
                    {t('CYPR')}
                  </CyDText>
                </CyDView>
              </CyDView>
            )}

            {/* Base Community Reward */}
            {sum(airdropData.tokenAllocation?.baseCommunityRewards) > 0 && (
              <CyDView className='flex flex-row items-center justify-between mt-[16px]'>
                <CyDView className='flex-1'>
                  <CyDText className='text-white font-semibold !text-[14px] leading-[145%] tracking-[-0.6px]'>
                    {t('BASE_COMMUNITY_REWARD')}
                  </CyDText>
                  <CyDText className='text-n200 font-medium !text-[12px] leading-[145%] tracking-[-0.6px] mt-[4px]'>
                    {t('BASE_COMMUNITY_REWARD_DESCRIPTION')}
                  </CyDText>
                </CyDView>
                <CyDView className='flex flex-row items-center justify-end gap-x-[4px] flex-1'>
                  <CyDFastImage
                    source={AppImages.CYPR_TOKEN_WITH_BASE_CHAIN}
                    className='w-[32px] h-[30px]'
                  />
                  <CyDText className='text-white font-semibold !text-[16px] leading-[145%] tracking-[-0.6px]'>
                    {sum(
                      airdropData.tokenAllocation?.baseCommunityRewards,
                    ).toLocaleString()}
                  </CyDText>
                  <CyDText className='!text-base150 font-medium !text-[14px] leading-[145%] tracking-[-0.6px]'>
                    {t('CYPR')}
                  </CyDText>
                </CyDView>
              </CyDView>
            )}

            <CyDView className='h-[1px] !bg-[#2F3139] my-[24px] w-full' />

            <CyDView className='flex flex-row items-center justify-between'>
              <CyDView className='basis-[35%] flex flex-row items-center gap-x-[4px]'>
                <CyDMaterialDesignIcons
                  name='parachute'
                  size={32}
                  color='#FFFFFF'
                />
                <CyDText className='text-white font-semibold !text-[14px] leading-[145%] tracking-[-0.6px]'>
                  {'Total\nAirdrop Value'}
                </CyDText>
              </CyDView>
              <CyDView className='basis-[65%] flex flex-row items-center justify-end gap-x-[4px]'>
                <CyDFastImage
                  source={AppImages.CYPR_TOKEN_WITH_BASE_CHAIN}
                  className='w-[32px] h-[30px]'
                />
                <CyDText className='text-white font-semibold !text-[16px] leading-[145%] tracking-[-0.6px]'>
                  {totalAirdropValue.toLocaleString()}
                </CyDText>
                <CyDText className='!text-base150 font-medium !text-[14px] leading-[145%] tracking-[-0.6px]'>
                  $CYPR
                </CyDText>
              </CyDView>
            </CyDView>
          </CyDView>

          <CyDView className='px-[16px] py-[24px] bg-black rounded-[16px] border-[0.5px] border-[#4B4B4B] mt-[24px]'>
            <CyDView className='flex flex-row items-center justify-between'>
              <CyDView className='basis-[35%] flex flex-row items-center gap-x-[4px]'>
                <CyDIcons name='coins-stacked' size={42} color='#FFFFFF' />
                <CyDText className='text-white font-semibold !text-[14px] leading-[145%] tracking-[-0.6px]'>
                  {'Claim as\nCYPR token'}
                </CyDText>
              </CyDView>
              <CyDView className='basis-[65%] flex flex-row items-center justify-end gap-x-[4px]'>
                <CyDFastImage
                  source={AppImages.CYPR_TOKEN_WITH_BASE_CHAIN}
                  className='w-[32px] h-[30px]'
                />
                <CyDText className='text-white font-semibold !text-[16px] leading-[145%] tracking-[-0.6px]'>
                  {totalCyprAirdropValue.toLocaleString()}
                </CyDText>
                <CyDText className='!text-base150 font-medium !text-[14px] leading-[145%] tracking-[-0.6px]'>
                  {t('CYPR')}
                </CyDText>
              </CyDView>
            </CyDView>

            <CyDView className='h-[1px] !bg-[#2F3139] my-[24px] w-full' />

            <CyDView className='flex flex-row items-center justify-between'>
              <CyDView className='basis-[35%] flex flex-row items-center gap-x-[4px]'>
                <CyDIcons name='nft-icon' size={42} color='#FFFFFF' />
                <CyDText className='text-white font-semibold !text-[14px] leading-[145%] tracking-[-0.6px]'>
                  {'Claim as\nveCYPR'}
                </CyDText>
              </CyDView>
              <CyDView>
                <CyDView className='basis-[65%] flex flex-row items-center justify-end gap-x-[4px]'>
                  <CyDFastImage
                    source={AppImages.CYPR_TOKEN_LOCKED}
                    className='w-[32px] h-[30px]'
                  />
                  <CyDText className='text-white font-semibold !text-[16px] leading-[145%] tracking-[-0.6px]'>
                    {totalVeNftAirdropValue.toLocaleString()}
                  </CyDText>
                  <CyDText className='!text-base150 font-medium !text-[14px] leading-[145%] tracking-[-0.6px]'>
                    {t('CYPR')}
                  </CyDText>
                </CyDView>
                <CyDText className='!text-base150 font-medium !text-[12px] text-right leading-[145%] tracking-[-0.6px]'>
                  {t('LOCKED_2_YRS')}
                </CyDText>
              </CyDView>
            </CyDView>

            {airdropData?.claimInfo?.isClaimActive && (
              <>
                <CyDView className='h-[1px] !bg-[#2F3139] my-[24px] w-full' />

                <CyDView className='flex flex-row items-center justify-between'>
                  <CyDView className='basis-[35%] flex flex-row items-center gap-x-[4px]'>
                    <CyDIcons name='zap' size={32} color='#F38200' />
                    <CyDText className='text-white font-medium !text-[16px] leading-[145%] tracking-[-0.6px]'>
                      {'Merchant Boost'}
                    </CyDText>
                  </CyDView>
                  <CyDView className='basis-[65%] flex flex-row items-center justify-end gap-x-[4px]'>
                    <Button
                      title='Edit Boost'
                      onPress={() => setIsMerchantBoostModalVisible(true)}
                      style='rounded-full px-[16px] py-[6px] !bg-[#6B788E]'
                      titleStyle='!text-[14px] font-semibold text-white'
                    />
                  </CyDView>
                </CyDView>
              </>
            )}

            {/* Merchant List */}
            {airdropData.claimInfo?.isClaimActive &&
              selectedMerchants.length > 0 && (
                <CyDView className='mt-[16px]'>
                  {selectedMerchants.map((merchant, index) => (
                    <CyDView
                      key={merchant.candidateId}
                      className='flex-row items-center justify-between py-[12px] border-b border-[#202020]'>
                      <CyDView className='flex-row items-center flex-1 gap-x-[12px]'>
                        {merchant.logoUrl ? (
                          <CyDFastImage
                            source={{ uri: merchant.logoUrl }}
                            className='w-[32px] h-[32px] rounded-full bg-blue20'
                          />
                        ) : (
                          <CyDView className='w-[32px] h-[32px] rounded-full bg-blue20' />
                        )}
                        <CyDText className='!text-[16px] font-semibold text-white'>
                          {merchant.brand ?? merchant.canonicalName}
                        </CyDText>
                      </CyDView>
                      <CyDView className='flex-row items-center gap-x-[8px]'>
                        <CyDText className='!text-[14px] font-medium !text-[#F1FDF7]'>
                          Boosting
                        </CyDText>
                        <CyDText className='!text-[16px] font-bold !text-[#F1FDF7]'>
                          - {merchant.allocation}%
                        </CyDText>
                      </CyDView>
                    </CyDView>
                  ))}
                </CyDView>
              )}

            {/* Information Section */}
            {airdropData.claimInfo?.isClaimActive && (
              <CyDView className='mt-[16px] mb-[16px]'>
                <CyDView className='flex-row items-start gap-x-[8px]'>
                  <CyDMaterialDesignIcons
                    name='information'
                    size={20}
                    color='#C2C7D0'
                  />
                  <CyDText className='!text-[14px] !text-base80 flex-1 leading-[20px]'>
                    {t('MERCHANT_BOOST_DESCRIPTION')}
                  </CyDText>
                </CyDView>
              </CyDView>
            )}

            {/* Sign Transaction Button */}
            <CyDView className='mt-[16px]'>
              {airdropData.claimInfo?.isClaimActive &&
                !airdropData.claimInfo?.isClaimed && (
                  <CyDTouchView
                    className='!bg-[#F9D26C] rounded-full py-2 px-3 items-center flex-row justify-between'
                    onPress={() => {
                      void handleSignTransaction();
                    }}
                    disabled={isTransactionLoading}>
                    <CyDText className='text-[18px] font-semibold text-black'>
                      {isTransactionLoading ? 'Signing...' : 'Claim Airdrop'}
                    </CyDText>
                    <CyDMaterialDesignIcons
                      name='arrow-right'
                      size={20}
                      color='#000000'
                    />
                  </CyDTouchView>
                )}
            </CyDView>
          </CyDView>
        </CyDScrollView>
      </CyDView>
    </>
  );
}
