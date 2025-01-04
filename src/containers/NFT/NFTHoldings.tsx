import React, { useEffect } from 'react';
import AppImages from '../../../assets/images/appImages';
import { NFTHolding } from '../../models/NFTHolding.interface';
import {
  CyDFastImage,
  CyDScrollView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindStyles';
import { Chain } from '../../constants/server';
import { screenTitle } from '../../constants';
import { getChain } from '../../core/util';
import analytics from '@react-native-firebase/analytics';
import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface RouteParams {
  nftHoldings: NFTHolding[];
}

export function NFTHoldingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const { nftHoldings } = route.params;

  useEffect(() => {
    void analytics().logEvent('visited_nft_holdings_screen');
    const [nftHolding] = nftHoldings;
    navigation.setOptions({
      title:
        nftHolding.collectionName !== ''
          ? nftHolding.collectionName
          : nftHolding.contractAddress,
    });
  }, []);

  const renderChainImage = (chainName: string) => {
    const chain: Chain = getChain(chainName);
    return chain?.logo_url;
  };

  const renderHoldingName = (holding: NFTHolding) => {
    if (holding.name !== '') {
      if (holding.name.length > 15) {
        return `${holding.name.substring(0, 14)}...`;
      } else {
        return holding.name;
      }
    }
  };

  return (
    <CyDScrollView className={'h-full bg-n20'}>
      <CyDView
        className='flex-row justify-between'
        style={{ paddingTop: insets.top }}>
        <CyDTouchView
          className='px-[12px]'
          onPress={() => {
            navigation.goBack();
          }}>
          <CyDFastImage
            className={'w-[32px] h-[32px]'}
            resizeMode='cover'
            source={AppImages.BACK_ARROW_GRAY}
          />
        </CyDTouchView>
        <CyDText className='text-base400 text-[20px] font-extrabold mr-[44px]'>
          {nftHoldings[0].collectionName !== ''
            ? nftHoldings[0].collectionName
            : nftHoldings[0].contractAddress}
        </CyDText>
        <CyDView className='' />
      </CyDView>
      <CyDView className={'flex flex-row flex-wrap flex-1 justify-around'}>
        {nftHoldings.map((holding, index) => {
          return (
            <CyDTouchView
              onPress={() =>
                navigation.navigate(screenTitle.NFT_OVERVIEW_SCREEN, {
                  nftHolding: holding,
                })
              }
              className={'my-[8px] bg-n30 p-[8px]'}
              key={index}>
              <CyDFastImage
                defaultSource={AppImages.DEFAULT_NFT}
                source={{ uri: holding.imageUrl }}
                className={
                  'h-[150px] w-[150px] rounded-[12px] border-[1px] border-n40'
                }
              />
              <CyDFastImage
                className={
                  'absolute w-[30px] h-[30px] right-[16px] bottom-[40px] rounded-[50px]'
                }
                source={renderChainImage(holding.blockchain)}
              />
              <CyDView>
                <CyDText className={'font-bold text-center mt-[6px]'}>
                  {renderHoldingName(holding)}
                </CyDText>
              </CyDView>
            </CyDTouchView>
          );
        })}
      </CyDView>
    </CyDScrollView>
  );
}
