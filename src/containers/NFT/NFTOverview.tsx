import { t } from 'i18next';
import React, { useEffect, useState } from 'react';
import Tooltip from 'react-native-walkthrough-tooltip';
import AppImages from '../../../assets/images/appImages';
import CyDModalLayout from '../../components/v2/modal';
import { NFTHolding } from '../../models/NFTHolding.interface';
import { StyleSheet } from 'react-native';
import {
  CyDFastImage,
  CyDImage,
  CyDScrollView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindStyles';
import clsx from 'clsx';
import { getChain } from '../../core/util';
import analytics from '@react-native-firebase/analytics';
import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';

interface RouteParams {
  nftHolding: NFTHolding;
}

export function NFTOverviewScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();

  const { nftHolding } = route.params;
  const [showContractAddressTooltip, setContractAddressTooltip] =
    useState<boolean>(false);
  const [imageZoomIn, setImageZoomIn] = useState<boolean>(false);

  useEffect(() => {
    void analytics().logEvent('visited_nft_overview_screen');
    navigation.setOptions({
      title: nftHolding.name,
    });
  }, []);

  const holdingChain = getChain(nftHolding.blockchain);

  return (
    <CyDView className={'h-full bg-whiteColor'}>
      <CyDModalLayout
        setModalVisible={setImageZoomIn}
        isModalVisible={imageZoomIn}
        style={styles.modalLayout}
        animationIn={'zoomIn'}
        animationInTiming={10}
        animationOut={'zoomOut'}
        animationOutTiming={10}>
        <CyDView className={'rounded-t-[20px] relative'}>
          <CyDTouchView
            onPress={() => setImageZoomIn(false)}
            className={'z-[50] bg-white'}>
            <CyDImage
              source={AppImages.CLOSE}
              className={
                ' w-[22px] h-[22px] z-[50] absolute mt-[10px] right-[10px] '
              }
            />
          </CyDTouchView>
          <CyDTouchView onPress={() => setImageZoomIn(false)}>
            <CyDImage
              className={'w-[100%] h-[90%]'}
              source={{ uri: nftHolding.imageUrl }}
            />
          </CyDTouchView>
        </CyDView>
      </CyDModalLayout>
      <CyDTouchView
        onPress={() => {
          setImageZoomIn(true);
        }}
        className={'z-10'}>
        <CyDImage
          className={
            'absolute w-[36px] h-[36px] right-[10px] top-[10px] bg-black rounded-[40px]'
          }
          source={AppImages.EXPAND_ICON}
        />
      </CyDTouchView>
      <CyDFastImage
        defaultSource={AppImages.DEFAULT_NFT}
        className={'h-[50%] w-[100%]'}
        source={{ uri: nftHolding.imageUrl }}
      />
      <CyDScrollView
        className={'bg-white rounded-t-[32px] mt-[-32px] p-[20px] z-10'}>
        <CyDText className={'text-[22px] font-extrabold'}>
          {nftHolding.name}
        </CyDText>
        <CyDView
          className={
            'flex flex-row items-center mt-[10px] rounded-[10px] py-[16px] px-[10px] bg-lightGrey'
          }>
          <CyDImage
            resizeMode={'contain'}
            className={'h-[20px] w-[20px] mr-[6px]'}
            source={AppImages.DETAILS_ICON}
          />
          <CyDText className={'text-[18px] font-bold'}>
            {t<string>('DETAILS_INIT_CAPS')}
          </CyDText>
        </CyDView>
        <CyDView
          className={
            'flex flex-row justify-between py-[18px] border-b-[1px] border-sepratorColor px-[4px]'
          }>
          <CyDText className={'text-[18px]'}>
            {t<string>('COLLECTION_NAME_PASCAL_CASE')}
          </CyDText>
          <CyDText className={'text-[16px] font-bold w-[50%] text-right'}>
            {nftHolding.collectionName}
          </CyDText>
        </CyDView>
        <CyDView
          className={
            'flex flex-row justify-between py-[18px] border-b-[1px] border-sepratorColor px-[4px]'
          }>
          <CyDText className={'text-[18px]'}>{t<string>('TOKEN_ID')}</CyDText>
          <CyDText className={'text-[16px] font-bold w-[50%] text-right'}>
            {nftHolding.tokenId}
          </CyDText>
        </CyDView>
        {holdingChain && (
          <CyDView
            className={
              'flex flex-row justify-between py-[18px] border-b-[1px] border-sepratorColor px-[4px]'
            }>
            <CyDText className={'text-[18px]'}>
              {t<string>('NETWORK_INIT_CAPS')}
            </CyDText>
            <CyDView
              className={'flex flex-row items-center w-[50%] justify-end'}>
              <CyDImage
                className={'h-[24px] w-[24px] mr-[8px]'}
                source={holdingChain?.logo_url}
              />
              <CyDText className={'text-[16px] font-bold text-right'}>
                {holdingChain?.name}
              </CyDText>
            </CyDView>
          </CyDView>
        )}
        <CyDView
          className={clsx(
            'flex flex-row justify-between py-[18px] border-b-[1px] border-sepratorColor px-[4px]',
            {
              'mb-[50px]': !(
                nftHolding.description && nftHolding.description !== ''
              ),
            },
          )}>
          <CyDText className={'text-[18px]'}>
            {t<string>('CONTRACT_ADDRESS_PASCAL_CASE')}
          </CyDText>
          <CyDView>
            <Tooltip
              isVisible={showContractAddressTooltip}
              disableShadow={true}
              content={
                <CyDView className={'p-[5px]'}>
                  <CyDView>
                    <CyDText className={'mb-[5px] font-bold text-[15px]'}>
                      {nftHolding.contractAddress}
                    </CyDText>
                  </CyDView>
                </CyDView>
              }
              onClose={() => setContractAddressTooltip(false)}
              placement='top'>
              <CyDTouchView onPress={() => setContractAddressTooltip(true)}>
                <CyDText
                  className={
                    'text-[16px] font-bold underline'
                  }>{`${nftHolding.contractAddress.substring(0, 8)}.....${nftHolding.contractAddress.substring(nftHolding.contractAddress.length - 5, nftHolding.contractAddress.length)}`}</CyDText>
              </CyDTouchView>
            </Tooltip>
          </CyDView>
        </CyDView>
        {nftHolding.description && nftHolding.description !== '' && (
          <CyDView>
            <CyDView
              className={
                'flex flex-row items-center mt-[10px] rounded-[10px] py-[16px] px-[10px] bg-lightGrey'
              }>
              <CyDImage
                resizeMode={'contain'}
                className={'h-[20px] w-[20px] mr-[6px]'}
                source={AppImages.DESCRIPTION_ICON}
              />
              <CyDText className={'text-[18px] font-bold'}>
                {t<string>('DESCRIPTION_INIT_CAPS')}
              </CyDText>
            </CyDView>
            <CyDView className={'mt-[10px] mb-[50px]'}>
              <CyDText className={'text-[16px]'}>
                {nftHolding.description}
              </CyDText>
            </CyDView>
          </CyDView>
        )}
      </CyDScrollView>
    </CyDView>
  );
}

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end',
  },
});
