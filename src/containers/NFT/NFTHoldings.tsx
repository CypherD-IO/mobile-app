/* eslint-disable react-native/no-raw-text */
import React, { useEffect } from 'react';
import AppImages from '../../../assets/images/appImages';
import { NFTHolding } from '../../models/NFTHolding.interface';
import { CyDFastImage, CyDScrollView, CyDText, CyDTouchView, CyDView } from '../../styles/tailwindStyles';
import { Chain } from '../../constants/server';
import { screenTitle } from '../../constants';
import { getChain } from '../../core/util';
import analytics from '@react-native-firebase/analytics';

interface RouteProps {
  route: {
    params: {
      nftHoldings: NFTHolding[]
    }
  }
  navigation: {
    goBack: () => void
    setOptions: ({ title }: { title: string }) => void
    navigate: (screen: string, params?: {}) => void
  }
}

export function NFTHoldingsScreen ({ route, navigation }: RouteProps) {
  const { nftHoldings } = route.params;

  useEffect(() => {
    void analytics().logEvent('visited_nft_holdings_screen');
    const [nftHolding] = nftHoldings;
    navigation.setOptions({
      title: nftHolding.collectionName !== '' ? nftHolding.collectionName : nftHolding.contractAddress
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
        <CyDScrollView className={'h-full bg-whiteColor'}>
          <CyDView className={'flex flex-row flex-wrap flex-1 justify-around'}>
            {nftHoldings.map((holding, index) => {
              return (
                <CyDTouchView onPress={() => navigation.navigate(screenTitle.NFT_OVERVIEW_SCREEN, { nftHolding: holding })} className={'my-[8px] bg-[#f2f2f2] p-[8px]'} key={index}>
                  <CyDFastImage defaultSource={AppImages.DEFAULT_NFT} source={{ uri: holding.imageUrl }} className={'h-[150px] w-[150px] rounded-[12px] border-[1px] border-sepratorColor'} />
                  <CyDFastImage className={'absolute w-[30px] h-[30px] right-[16px] bottom-[40px] bg-white rounded-[50px]'} source={renderChainImage(holding.blockchain)} />
                  <CyDView>
                    <CyDText className={'font-bold text-center mt-[6px]'}>{renderHoldingName(holding)}</CyDText>
                  </CyDView>
                </CyDTouchView>
              );
            })}
          </CyDView>
        </CyDScrollView>
  );
}
