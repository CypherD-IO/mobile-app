/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable react-native/no-raw-text */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable array-callback-return */
import React, { useContext, useEffect, useState } from 'react';
import { CyDFastImage, CyDImage, CyDScrollView, CyDText, CyDTouchView, CyDView } from '../../../styles/tailwindStyles';
import { Animated, BackHandler, RefreshControl } from 'react-native';
import { AllNFTHoldings } from '../../../models/allNFTHoldings.interface';
import { groupBy, isEmpty, has } from 'lodash';
import { ALL_CHAINS_TYPE } from '../../../constants/type';
import AppImages from '../../../../assets/images/appImages';
import { NFTHolding } from '../../../models/NFTHolding.interface';
import Loading from '../../../components/v2/loading';
import Accordion from 'react-native-collapsible/Accordion';
import { verticalScale } from 'react-native-size-matters';
import clsx from 'clsx';
import { screenTitle } from '../../../constants';
import useAxios from '../../../core/HttpRequest';
import { getChain, HdWalletContext } from '../../../core/util';
import { t } from 'i18next';
import { RenderViewType } from '../../../constants/enum';
import { Chain } from '../../../constants/server';
import analytics from '@react-native-firebase/analytics';

interface RouteProps {
  selectedChain: string
  navigation: {
    goBack: () => void
    setOptions: ({ title }: { title: string }) => void
    navigate: (screen: string, params?: {}) => void
  }
}

export default function NFTScreen ({ selectedChain, navigation }: RouteProps) {
  const { getWithAuth } = useAxios();
  const hdWalletContext = useContext<any>(HdWalletContext);
  const ethereum = hdWalletContext.state.wallet?.ethereum;
  const stargaze = hdWalletContext.state.wallet?.stargaze;
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [origNFTHoldings, setOrigNFTHoldings] = useState<AllNFTHoldings>();
  const [NFTHoldings, setNFTHoldings] = useState<AllNFTHoldings>();
  const [activeSections, setActiveSection] = useState<number[]>([]);
  const [rotateAnimation] = useState(new Animated.Value(0));
  const [viewType, setViewType] = useState<string>(RenderViewType.GRID_VIEW);

  useEffect(() => {
    void analytics().logEvent('visited_nft_homescreen');
    void getNFTHoldings();
    BackHandler.addEventListener('hardwareBackPress', handleBackButton);
  }, []);

  useEffect(() => {
    void filterNFTHoldingsByChain();
  }, [selectedChain, origNFTHoldings]);

  const onRefresh = async () => {
    setRefreshing(true);
    await getNFTHoldings();
    setRefreshing(false);
  };

  const interpolateRotating = rotateAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg']
  });

  const animatedStyle = {
    transform: [
      {
        rotate: interpolateRotating
      }
    ],
    height: verticalScale(11),
    width: '25%',
    resizeMode: 'contain'
  };

  const handleAnimation = (toValue: number) => {
    Animated.timing(rotateAnimation, {
      toValue,
      duration: 200,
      useNativeDriver: true
    }).start();
  };

  const renderChainImage = (chainName: string) => {
    const chain: Chain = getChain(chainName);
    return chain?.logo_url;
  };

  const filterNFTHoldingsByChain = async () => {
    if (!isEmpty(origNFTHoldings)) {
      if (selectedChain === 'ALL CHAINS') {
        setNFTHoldings(origNFTHoldings);
      } else {
        const tempFilter: AllNFTHoldings = {};
        if (selectedChain === 'STARS' || selectedChain === 'STARGAZE') {
          if (has(origNFTHoldings, 'STARGAZE')) {
            tempFilter[selectedChain as ALL_CHAINS_TYPE] = origNFTHoldings.STARGAZE;
          }
        } else if (selectedChain === 'MATIC' || selectedChain === 'POLYGON') {
          if (has(origNFTHoldings, 'POLYGON')) {
            tempFilter[selectedChain as ALL_CHAINS_TYPE] = origNFTHoldings.POLYGON;
          }
        } else {
          if (has(origNFTHoldings, selectedChain)) {
            tempFilter[selectedChain as ALL_CHAINS_TYPE] = origNFTHoldings[selectedChain as ALL_CHAINS_TYPE];
          }
        }
        setNFTHoldings(tempFilter);
      }
    } else {
      setNFTHoldings({});
    }
  };

  const getNFTHoldings = async () => {
    setLoading(true);
    let NFTsUrl = `/v1/portfolio/nfts?address[]=${ethereum?.wallets[0].address}`;
    if (stargaze?.wallets[0]?.address) {
      NFTsUrl += `&address[]=${stargaze?.wallets[0].address}`;
    }
    const { isError, data: allNFTs } = await getWithAuth(NFTsUrl);
    if (!isError) {
      setOrigNFTHoldings(allNFTs);
    }
    setLoading(false);
  };

  const handleBackButton = () => {
    navigation.goBack();
    return true;
  };

  const EmptyView = () => {
    return (
        <CyDView className={'mt-[50%] flex items-center'}>
            <CyDImage className={'h-[120px] w-[240px]'} source={AppImages.NFT_EMPTY_ILLUSTATION} />
            <CyDText className={'text-center text-[24px] mt-[20px]'}>{t<string>('NO_NFTS_YET')}</CyDText>
            <CyDText className={'text-center'}>{`(${t<string>('PULL_DOWN_TO_REFRESH_PASCAL_CASE')})`}</CyDText>
        </CyDView>
    );
  };

  const updateSections = (activeSections: number[]) => {
    setActiveSection(activeSections);
    if (activeSections.length > 0) {
      handleAnimation(1);
    } else {
      handleAnimation(0);
    }
  };

  const renderHeader = (section: {name: string, content: NFTHolding[]}, index: number, isActive: boolean) => {
    const [firstNFTInCollection] = section.content;
    return (
        <CyDView className={clsx('py-[15px]', { 'border-b-[1px] border-sepratorColor': !isActive })}>
            <CyDView className={'flex flex-row justify-between items-center w-full'}>
                <CyDView className='flex flex-row w-[90%]'>
                    <CyDView className={'items-start flex flex-col mr-[10px]'}>
                        <CyDFastImage defaultSource={AppImages.DEFAULT_NFT} source={{ uri: firstNFTInCollection.imageUrl }} className={'h-[50px] w-[50px] rounded-[50px] border-[1px] border-sepratorColor'} resizeMode='contain' />
                        <CyDFastImage className={'absolute w-[18px] h-[18px] right-0 bottom-0 bg-white rounded-[50px]'} source={renderChainImage(firstNFTInCollection.blockchain)} />
                    </CyDView>
                    <CyDView className={'items-start flex flex-col justify-center'}>
                        <CyDView className={'flex flex-col justify-start'}>
                            <CyDText className={'text-[16px] font-bold'}>{section.name}</CyDText>
                            <CyDText>{section.content.length}</CyDText>
                        </CyDView>
                    </CyDView>
                </CyDView>
                <CyDView className='flex items-end w-[10%]'>
                    {isActive && <Animated.Image style={animatedStyle} source={AppImages.OPTIONS_ARROW} />}
                    {!isActive && <CyDImage className={'h-[12px] w-[12px] opacity-70'} source={AppImages.OPTIONS_ARROW} />}
                </CyDView>
            </CyDView>
        </CyDView>
    );
  };

  const renderContent = (section: {name: string, content: NFTHolding[]}, index: number, isActive: boolean) => {
    return (
        <CyDView className={clsx('flex flex-row flex-wrap py-[25px] w-full', { 'border-b-[1px] border-sepratorColor': isActive, 'justify-around': section.content.length > 1 })}>
            {section.content.map((holding: NFTHolding, index) => {
              return (
                <CyDTouchView onPress={() => navigation.navigate(screenTitle.NFT_OVERVIEW_SCREEN, { nftHolding: holding }) } className={'mx-[2px] mb-[15px]'} key={index}>
                    <CyDFastImage defaultSource={AppImages.DEFAULT_NFT} source={{ uri: holding.imageUrl }} className={'h-[150px] w-[150px] border-[1px] border-sepratorColor rounded-[12px]'} />
                    <CyDFastImage className={'absolute w-[30px] h-[30px] right-[8px] bottom-[30px] bg-white rounded-[50px]'} source={renderChainImage(holding.blockchain)} />
                    <CyDText className='ml-[5px] mt-[5px] font-bold text-center'>{holding.name !== '' ? `${holding.name.substring(0, 10)}...` : `${holding.tokenId.substring(0, 10)}...`}</CyDText>
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

  const RenderNFTHoldings = () => {
    const holdings: NFTHolding[] = [];
    Object.keys(NFTHoldings).map((chain) => {
      NFTHoldings[chain as ALL_CHAINS_TYPE].map((holding: NFTHolding) => {
        if (holding) {
          holdings.push(holding);
        }
      });
    });
    const holdingsGrouped = groupBy(holdings, 'contractAddress');
    const holdingsSections: Array<{ name: string, content: NFTHolding[] }> = [];
    Object.keys(holdingsGrouped).map((group) => {
      const [firstNFTInGrouped] = holdingsGrouped[group];
      if (firstNFTInGrouped) {
        holdingsSections.push({ name: renderCollectionName(firstNFTInGrouped), content: holdingsGrouped[group] });
      }
    });
    return (
        <CyDView className='mx-[20px]'>
            <CyDView>
                {viewType === RenderViewType.LIST_VIEW && <CyDView>
                    <Accordion
                        sections={holdingsSections}
                        activeSections={activeSections}
                        renderHeader={renderHeader}
                        renderContent={renderContent}
                        onChange={updateSections}
                        underlayColor={'transparent'}
                    />
                </CyDView>}
                {viewType === RenderViewType.GRID_VIEW && <CyDView className={'flex flex-row flex-wrap flex-1 justify-around'}>
                    {holdingsSections.map((section, index) => {
                      const [firstNFTInSection] = section.content;
                      return (
                            <CyDView className={'my-[8px] bg-privacyMessageBackgroundColor p-[8px]'} key={index}>
                                <CyDTouchView onPress={() => navigation.navigate(screenTitle.NFT_HOLDINGS_SCREEN, { nftHoldings: section.content }) }>
                                    <CyDFastImage defaultSource={AppImages.DEFAULT_NFT} source={{ uri: firstNFTInSection?.imageUrl }} className={'h-[140px] w-[140px] rounded-[12px] border-[1px] border-sepratorColor'} />
                                    <CyDFastImage className={'absolute w-[30px] h-[30px] right-[8px] bottom-[8px] bg-white rounded-[50px]'} source={renderChainImage(firstNFTInSection?.blockchain)} />
                                </CyDTouchView>
                              <CyDView>
                                <CyDText className={'font-bold text-center mt-[6px]'}>{renderCollectionName(firstNFTInSection)}</CyDText>
                              </CyDView>
                            </CyDView>
                      );
                    })}
                </CyDView>}
            </CyDView>
        </CyDView>
    );
  };

  return (
    loading
      ? <Loading />
      : <CyDScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> }>
            {isEmpty(NFTHoldings) && <EmptyView />}
            {!isEmpty(NFTHoldings) && <CyDView>
                <CyDView className={'flex flex-row my-[12px] justify-between items-center mx-[20px] w-[90%]'}>
                    <CyDView>
                        <CyDText className={'text-[24px] font-extrabold'}>{t('MY_COLLECTIONS')}</CyDText>
                    </CyDView>
                    <CyDView className={'flex flex-row'}>
                        <CyDTouchView className={clsx('p-[10px]', { 'border-[1px] border-gray-500 rounded-[6px]': viewType === RenderViewType.GRID_VIEW })} onPress={() => setViewType(RenderViewType.GRID_VIEW)}><CyDFastImage className={'h-[15px] w-[15px]'} source={AppImages.GRID_ICON} /></CyDTouchView>
                        <CyDTouchView className={clsx('p-[10px]', { 'border-[1px] border-gray-500 rounded-[6px]': viewType === RenderViewType.LIST_VIEW })} onPress={() => setViewType(RenderViewType.LIST_VIEW)}><CyDFastImage className={'h-[15px] w-[15px]'} source={AppImages.LIST_ICON} /></CyDTouchView>
                    </CyDView>
                </CyDView>
                <CyDView>
                      <RenderNFTHoldings />
                </CyDView>
            </CyDView>}
        </CyDScrollView>
  );
}
