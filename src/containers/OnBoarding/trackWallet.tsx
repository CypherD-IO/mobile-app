import firebase from '@react-native-firebase/app';
import * as Sentry from '@sentry/react-native';
import { t } from 'i18next';
import React, { useContext, useState } from 'react';
import { BarCodeReadEvent } from 'react-native-camera';
import { v4 as uuidv4 } from 'uuid';
import { isAddress } from 'web3-validator';
import AppImages from '../../../assets/images/appImages';
import Button from '../../components/v2/button';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import { screenTitle } from '../../constants';
import { ButtonType } from '../../constants/enum';
import { ChainBackendNames, QRScannerScreens } from '../../constants/server';
import { setReadOnlyWalletData } from '../../core/asyncStorage';
import axios from '../../core/Http';
import { HdWalletContext, isValidEns } from '../../core/util';
import { hostWorker } from '../../global';
import useEns from '../../hooks/useEns';
import {
  CyDFlatList,
  CyDImageBackground,
  CyDMaterialDesignIcons,
  CyDText,
  CyDTextInput,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindStyles';
import { intercomAnalyticsLog } from '../utilities/analyticsUtility';

export default function TrackWallet({
  navigation,
}: {
  navigation: { navigate: () => {} };
}) {
  const [address, setAddress] = useState('');
  const ARCH_HOST: string = hostWorker.getHost('ARCH_HOST');
  const hdWalletContext = useContext<any>(HdWalletContext);
  const [loading, setLoading] = useState<boolean>(false);
  const { showModal, hideModal } = useGlobalModalContext();
  const [resolveAddress] = useEns();

  const registerObserver = async (ethAddress: string) => {
    if (isValidEns(ethAddress)) {
      ethAddress = await resolveAddress(ethAddress, ChainBackendNames.ETH);
    }
    if (ethAddress && isAddress(ethAddress)) {
      setLoading(true);
      const fcmToken: any = await firebase.messaging().getToken();
      if (fcmToken) {
        const payload = {
          fcmToken,
          observerId: uuidv4(),
        };
        try {
          const data = await axios.post(
            `${ARCH_HOST}/v1/configuration/address/${ethAddress}/observer`,
            payload,
          );
          if (data && data.status === 201) {
            const data = {
              address: ethAddress,
              observerId: payload.observerId,
            };
            void setReadOnlyWalletData(data);
            void intercomAnalyticsLog('track_wallet_event', data);
            setLoading(false);
            hdWalletContext.dispatch({
              type: 'SET_READ_ONLY_WALLET',
              value: {
                isReadOnlyWallet: true,
              },
            });
            hdWalletContext.dispatch({
              type: 'LOAD_WALLET',
              value: {
                address: ethAddress,
                chain: 'ethereum',
                publicKey: '',
                rawAddress: '',
                algo: '',
              },
            });
          }
        } catch (error) {
          setLoading(false);
          showModal('state', {
            type: 'error',
            title: '',
            description: t('UNABLE_TO_TRACK'),
            onSuccess: hideModal,
            onFailure: hideModal,
          });
          Sentry.captureException(error);
        }
      } else {
        showModal('state', {
          type: 'error',
          title: '',
          description: t('UNABLE_TO_TRACK'),
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      }
    } else {
      showModal('state', {
        type: 'error',
        title: t('INVALID_ADDRESS'),
        description: t('ONLY_ETHEREUM_SUPPORTED'),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    }
  };

  const onSuccess = async (readEvent: BarCodeReadEvent) => {
    const content = readEvent.data;
    // To handle metamask address: ethereum:0xBd1cD305900424CD4fAd1736a2B4d118c7CA935D@9001
    const regEx = content.match(/(\b0x[a-fA-F0-9]{40}\b)/g);
    const address = regEx && regEx.length > 0 ? regEx[0] : content;
    setAddress(address);
  };

  const RenderTrackWalletInfo = ({ item }) => {
    return (
      <CyDView className={'flex flex-row my-[18px]'} key={item}>
        <CyDMaterialDesignIcons
          name={'triangle'}
          size={14}
          className='text-p150 rotate-90 mt-[6px]'
        />
        <CyDText className={'ml-[10px] text-[16px] font-semibold'}>
          {item}
        </CyDText>
      </CyDView>
    );
  };

  return (
    <CyDView className='flex-1 h-[100%] flex-col justify-between bg-n0'>
      <CyDView className='px-[20px] flex flex-col items-center'>
        <CyDView
          className={
            'flex flex-row justify-between items-center self-center mt-[15px] border-[0.2px] border-black rounded-[5px] pl-[15px] pr-[10px] py-[5px]'
          }>
          <CyDTextInput
            className={'self-center py-[12px] w-[90%] pr-[10px]'}
            value={address}
            autoCapitalize='none'
            autoCorrect={false}
            onChangeText={text => {
              setAddress(text);
            }}
            placeholderTextColor={'#C5C5C5'}
            placeholder={t('ENTER_OR_SCAN_ETHEREUM_ADDRESS')}
          />
          <CyDTouchView
            onPress={() => {
              address === ''
                ? navigation.navigate(screenTitle.QR_CODE_SCANNER, {
                    fromPage: QRScannerScreens.TRACK_WALLET,
                    onSuccess,
                  })
                : setAddress('');
            }}>
            <CyDMaterialDesignIcons
              name={address === '' ? 'qrcode-scan' : 'close'}
              size={24}
              className='text-base400'
            />
          </CyDTouchView>
        </CyDView>
        <CyDView className='flex flex-row items-center self-start mt-[15px] ml-[5px]'>
          <CyDMaterialDesignIcons
            name='information-outline'
            size={16}
            className='text-base400 mr-[6px]'
          />
          <CyDText className='ml-[7px]'>
            {t<string>('ONLY_ETHEREUM_SUPPORTED')}
          </CyDText>
        </CyDView>
        <Button
          title={t('TRACK')}
          icon={
            <CyDMaterialDesignIcons
              name='target'
              size={24}
              className='text-base400'
            />
          }
          onPress={() => {
            void registerObserver(address);
          }}
          loading={loading}
          type={ButtonType.PRIMARY}
          style='mt-[30px] w-[100%] h-[50px]'
        />
      </CyDView>
      <CyDImageBackground
        className='flex flex-col justify-end rounded-t-[45px]'
        source={AppImages.DEBIT_CARD_BACKGROUND}
        imageStyle={{ height: 900 }}>
        <CyDFlatList
          className={'h-[60%] px-[20px]'}
          data={JSON.parse(t('TRACK_WALLET_INFO'))}
          renderItem={item => RenderTrackWalletInfo(item)}
          showsVerticalScrollIndicator={true}
        />
      </CyDImageBackground>
    </CyDView>
  );
}
