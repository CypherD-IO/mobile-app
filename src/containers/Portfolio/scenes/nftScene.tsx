import React, { memo, useContext, useEffect, useState } from 'react';
import { ScrollView, RefreshControl, BackHandler } from 'react-native';
import {
  Extrapolate,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  CyDAnimatedView,
  CyDFastImage,
  CyDMaterialDesignIcons,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindComponents';
import Loading from '../../../components/v2/loading';
import clsx from 'clsx';
import { RenderViewType } from '../../../constants/enum';
import AppImages from '../../../../assets/images/appImages';
import { useTranslation } from 'react-i18next';
import { groupBy, has, isEmpty } from 'lodash';
import { HdWalletContextDef } from '../../../reducers/hdwallet_reducer';
import { HdWalletContext, getChain } from '../../../core/util';
import useAxios from '../../../core/HttpRequest';
import { AllNFTHoldings } from '../../../models/allNFTHoldings.interface';
import { NFTHolding } from '../../../models/NFTHolding.interface';
import Accordion from 'react-native-collapsible/Accordion';
import { screenTitle } from '../../../constants';
import { Chain } from '../../../constants/server';
import { intercomAnalyticsLog } from '../../utilities/analyticsUtility';
import { ALL_CHAINS_TYPE } from '../../../constants/type';
import { NavigationProp, ParamListBase } from '@react-navigation/native';

interface NFTSceneProps {
  selectedChain: string;
  navigation: NavigationProp<ParamListBase>;
}

const NFTScene = ({ navigation, selectedChain }: NFTSceneProps) => {
  const { t } = useTranslation();
  const { getWithAuth } = useAxios();

  const hdWalletContext = useContext<HdWalletContextDef | null>(
    HdWalletContext,
  );
  const ethereum = hdWalletContext?.state.wallet?.ethereum;

  const [loading, setLoading] = useState<boolean>(true);
  const [viewType, setViewType] = useState<string>(RenderViewType.GRID_VIEW);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [origNFTHoldings, setOrigNFTHoldings] = useState<AllNFTHoldings>();
  const [NFTHoldings, setNFTHoldings] = useState<AllNFTHoldings>();
  const [activeSections, setActiveSection] = useState<number[]>([]);

  const rotateAnimation = useSharedValue(0);

  useEffect(() => {
    void intercomAnalyticsLog('visited_nft_homescreen');
    void getNFTHoldings();
    BackHandler.addEventListener('hardwareBackPress', () => {
      navigation.goBack();
      return true;
    });
  }, []);

  useEffect(() => {
    void filterNFTHoldingsByChain();
  }, [selectedChain, origNFTHoldings]);

  const getNFTHoldings = async () => {
    setLoading(true);
    let NFTURL = '/v1/portfolio/nfts';
    if (ethereum?.wallets[0]?.address) {
      NFTURL += `?address[]=${ethereum?.wallets[0].address}`;
    }
    const { isError, data: allNFTs } = await getWithAuth(NFTURL);
    if (!isError) {
      setOrigNFTHoldings(allNFTs);
    }
    setLoading(false);
  };

  const onRefresh = () => {
    setRefreshing(true);
    void getNFTHoldings();
    setRefreshing(false);
  };

  const animatedStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      rotateAnimation.value,
      [0, 1],
      [0, 90],
      Extrapolate.CLAMP,
    );
    return {
      transform: [{ rotate: `${rotate}deg` }],
    };
  });

  const handleAnimation = (toValue: number) => {
    rotateAnimation.value = withTiming(toValue, {
      duration: 300,
    });
  };

  const renderHeader = (
    section: { name: string; content: NFTHolding[] },
    index: number,
    isActive: boolean,
  ) => {
    const [firstNFTInCollection] = section.content;
    return (
      <CyDView
        className={clsx('py-[15px]', {
          'border-b-[1px] border-n40': !isActive,
        })}>
        <CyDView
          className={'flex flex-row justify-between items-center w-full'}>
          <CyDView className='flex flex-row w-[90%]'>
            <CyDView className={'items-start flex flex-col mr-[10px]'}>
              <CyDFastImage
                defaultSource={AppImages.DEFAULT_NFT}
                source={{ uri: firstNFTInCollection.imageUrl }}
                className={
                  'h-[50px] w-[50px] rounded-[50px] border-[1px] border-n40'
                }
                resizeMode='contain'
              />
              <CyDFastImage
                className={
                  'absolute w-[18px] h-[18px] right-0 bottom-0 bg-n0 rounded-[50px]'
                }
                source={renderChainImage(firstNFTInCollection.blockchain)}
              />
            </CyDView>
            <CyDView className={'items-start flex flex-col justify-center'}>
              <CyDView className={'flex flex-col justify-start'}>
                <CyDText className={'text-[16px] font-bold'}>
                  {section.name}
                </CyDText>
                <CyDText>{section.content.length}</CyDText>
              </CyDView>
            </CyDView>
          </CyDView>
          <CyDView className='flex items-end w-[10%]'>
            {isActive && (
              <CyDAnimatedView style={animatedStyle}>
                <CyDMaterialDesignIcons
                  name='chevron-right'
                  size={20}
                  className='text-base400'
                />
              </CyDAnimatedView>
            )}
            {!isActive && (
              <CyDMaterialDesignIcons
                name='chevron-right'
                size={20}
                className='text-base400 opacity-70'
              />
            )}
          </CyDView>
        </CyDView>
      </CyDView>
    );
  };

  const renderContent = (
    section: { name: string; content: NFTHolding[] },
    index: number,
    isActive: boolean,
  ) => {
    return (
      <CyDView
        className={clsx('flex flex-row flex-wrap py-[25px] w-full', {
          'border-b-[1px] border-n40': isActive,
          'justify-around': section.content.length > 1,
        })}>
        {section.content.map((holding: NFTHolding, index) => {
          return (
            <CyDTouchView
              onPress={() =>
                navigation.navigate(screenTitle.NFT_OVERVIEW_SCREEN, {
                  nftHolding: holding,
                })
              }
              className={'mx-[2px] mb-[15px]'}
              key={index}>
              <CyDFastImage
                defaultSource={AppImages.DEFAULT_NFT}
                source={{ uri: holding.imageUrl }}
                className={
                  'h-[150px] w-[150px] border-[1px] border-n40 rounded-[12px]'
                }
              />
              <CyDFastImage
                className={
                  'absolute w-[30px] h-[30px] right-[8px] bottom-[30px] bg-n0 rounded-[50px]'
                }
                source={renderChainImage(holding.blockchain)}
              />
              <CyDText className='ml-[5px] mt-[5px] font-bold text-center'>
                {holding.name !== ''
                  ? `${holding.name.substring(0, 10)}...`
                  : `${holding.tokenId.substring(0, 10)}...`}
              </CyDText>
            </CyDTouchView>
          );
        })}
      </CyDView>
    );
  };

  const renderCollectionName = (holding: NFTHolding) => {
    if (holding.collectionName !== '') {
      if (holding.collectionName.length > 15) {
        return `${holding.collectionName.substring(0, 14)}...`;
      } else {
        return holding.collectionName;
      }
    } else {
      return `${holding.contractAddress.substring(0, 5)}....${holding.contractAddress.substring(holding.contractAddress.length - 5, holding.contractAddress.length)}`;
    }
  };

  const renderChainImage = (chainName: string) => {
    const chain: Chain = getChain(chainName);
    return chain?.logo_url;
  };

  const updateSections = (activeSections: number[]) => {
    setActiveSection(activeSections);
    if (activeSections.length > 0) {
      handleAnimation(1);
    } else {
      handleAnimation(0);
    }
  };

  const filterNFTHoldingsByChain = async () => {
    if (!isEmpty(origNFTHoldings)) {
      if (selectedChain === 'ALL CHAINS') {
        setNFTHoldings(origNFTHoldings);
      } else {
        const tempFilter: AllNFTHoldings = {
          ETH: [],
          POLYGON: [],
          AVALANCHE: [],
          ARBITRUM: [],
          OPTIMISM: [],
          BSC: [],
          COSMOS: [],
          OSMOSIS: [],
          NOBLE: [],
        };
        if (selectedChain === 'MATIC' || selectedChain === 'POLYGON') {
          if (has(origNFTHoldings, 'POLYGON')) {
            tempFilter[selectedChain as ALL_CHAINS_TYPE] =
              origNFTHoldings.POLYGON;
          }
        } else {
          if (has(origNFTHoldings, selectedChain)) {
            tempFilter[selectedChain as ALL_CHAINS_TYPE] =
              origNFTHoldings[selectedChain as ALL_CHAINS_TYPE];
          }
        }
        setNFTHoldings(tempFilter);
      }
    } else {
      setNFTHoldings({
        ETH: [],
        POLYGON: [],
        AVALANCHE: [],
        ARBITRUM: [],
        OPTIMISM: [],
        BSC: [],
        COSMOS: [],
        OSMOSIS: [],
        NOBLE: [],
      });
    }
  };

  const RenderNFTHoldings = () => {
    const holdings: NFTHolding[] = [];
    Object.entries(NFTHoldings ?? []).forEach(([chain, chainHoldings]) => {
      chainHoldings.forEach((holding: NFTHolding) => {
        if (holding) {
          holdings.push(holding);
        }
      });
    });
    const holdingsGrouped = groupBy(holdings, 'contractAddress');
    const holdingsSections: Array<{ name: string; content: NFTHolding[] }> = [];
    Object.keys(holdingsGrouped).forEach(group => {
      const [firstNFTInGrouped] = holdingsGrouped[group];
      if (firstNFTInGrouped) {
        holdingsSections.push({
          name: renderCollectionName(firstNFTInGrouped),
          content: holdingsGrouped[group],
        });
      }
    });
    return (
      <CyDView className='mx-[20px]'>
        <CyDView>
          {viewType === RenderViewType.LIST_VIEW && (
            <CyDView>
              <Accordion
                sections={holdingsSections}
                activeSections={activeSections}
                renderHeader={renderHeader}
                renderContent={renderContent}
                onChange={updateSections}
                underlayColor={'transparent'}
              />
            </CyDView>
          )}
          {viewType === RenderViewType.GRID_VIEW && (
            <CyDView
              className={'flex flex-row flex-wrap flex-1 justify-around'}>
              {holdingsSections.map((section, index) => {
                const [firstNFTInSection] = section.content;
                return (
                  <CyDView
                    className={'my-[8px] bg-blue20 rounded-[8px] p-[8px]'}
                    key={index}>
                    <CyDTouchView
                      onPress={() =>
                        navigation.navigate(screenTitle.NFT_HOLDINGS_SCREEN, {
                          nftHoldings: section.content,
                        })
                      }>
                      <CyDFastImage
                        defaultSource={AppImages.DEFAULT_NFT}
                        source={{ uri: firstNFTInSection?.imageUrl }}
                        className={
                          'h-[140px] w-[140px] rounded-[8px] border-[1px] border-n40'
                        }
                      />
                      <CyDFastImage
                        className={
                          'absolute w-[30px] h-[30px] right-[8px] bottom-[8px] bg-n0 rounded-[50px]'
                        }
                        source={renderChainImage(firstNFTInSection?.blockchain)}
                      />
                    </CyDTouchView>
                    <CyDView>
                      <CyDText className={'font-bold text-center mt-[6px] '}>
                        {renderCollectionName(firstNFTInSection)}
                      </CyDText>
                    </CyDView>
                  </CyDView>
                );
              })}
            </CyDView>
          )}
        </CyDView>
      </CyDView>
    );
  };

  return (
    <>
      {loading ? (
        <Loading />
      ) : (
        <CyDView className='mx-[10px]'>
          <ScrollView
            scrollEnabled={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }>
            <CyDView className=''>
              {(isEmpty(NFTHoldings) || isEmpty(origNFTHoldings)) && (
                <CyDView className={'mt-[30%] mb-5 flex items-center'}>
                  <CyDFastImage
                    className={'h-[120px] w-[240px]'}
                    source={AppImages.NO_ACTIVITIES}
                  />
                  <CyDText className={'text-center text-[24px] mt-[20px]'}>
                    {t<string>('NO_NFTS_YET')}
                  </CyDText>
                  <CyDText className={'text-center text-[12px]'}>
                    {t<string>('SWIPE_DOWN_TO_REFRESH_PASCAL_CASE')}
                  </CyDText>
                </CyDView>
              )}
              {!isEmpty(NFTHoldings) && !isEmpty(origNFTHoldings) && (
                <CyDView className='border border-n40 rounded-t-[24px]'>
                  <CyDView
                    className={
                      'flex flex-row my-[12px] justify-between items-center mx-[20px] w-[90%]'
                    }>
                    <CyDView>
                      <CyDText className={'text-[24px] font-extrabold'}>
                        {t('MY_COLLECTIONS')}
                      </CyDText>
                    </CyDView>
                    <CyDView className={'flex flex-row'}>
                      <CyDTouchView
                        className={clsx('p-[10px]', {
                          'border-[1px] border-gray-500 rounded-[6px]':
                            viewType === RenderViewType.GRID_VIEW,
                        })}
                        onPress={() => setViewType(RenderViewType.GRID_VIEW)}>
                        <CyDMaterialDesignIcons
                          name='view-grid-outline'
                          size={20}
                          className='text-base400'
                        />
                      </CyDTouchView>
                      <CyDTouchView
                        className={clsx('p-[10px]', {
                          'border-[1px] border-n40 rounded-[6px]':
                            viewType === RenderViewType.LIST_VIEW,
                        })}
                        onPress={() => setViewType(RenderViewType.LIST_VIEW)}>
                        <CyDMaterialDesignIcons
                          name='format-list-bulleted'
                          size={20}
                          className='text-base400'
                        />
                      </CyDTouchView>
                    </CyDView>
                  </CyDView>
                  <CyDView>
                    <RenderNFTHoldings />
                  </CyDView>
                </CyDView>
              )}
            </CyDView>
          </ScrollView>
        </CyDView>
      )}
    </>
  );
};

export default memo(NFTScene);
