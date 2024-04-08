import { t } from 'i18next';
import React, { useContext, useState } from 'react';
import { TextInput } from 'react-native';
import AppImages from '../../../assets/images/appImages';
import Button from '../../components/v2/button';
import { ButtonType } from '../../constants/enum';
import {
  CyDFlatList,
  CyDImage,
  CyDImageBackground,
  CyDScrollView,
  CyDText,
  CyDTextInput,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindStyles';
import { v4 as uuidv4 } from 'uuid';
import { getToken } from '../../core/push';
import { hostWorker } from '../../global';
import axios from '../../core/Http';
import * as Sentry from '@sentry/react-native';
import {
  HdWalletContext,
  isValidEns,
  _NO_CYPHERD_CREDENTIAL_AVAILABLE_,
} from '../../core/util';
import { setReadOnlyWalletData } from '../../core/asyncStorage';
import { ChainBackendNames, QRScannerScreens } from '../../constants/server';
import { screenTitle } from '../../constants';
import { BarCodeReadEvent } from 'react-native-camera';
import Web3 from 'web3';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import useEns from '../../hooks/useEns';
import firebase from '@react-native-firebase/app';
import { intercomAnalyticsLog } from '../utilities/analyticsUtility';
import { ethToEvmos } from '@tharsis/address-converter';

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
    if (ethAddress && Web3.utils.isAddress(ethAddress)) {
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
            hdWalletContext.dispatch({
              type: 'LOAD_WALLET',
              value: {
                address: ethToEvmos(ethAddress),
                chain: 'evmos',
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
        <CyDImage
          className={'mt-[6px] h-[12px] w-[12px]'}
          source={AppImages.RIGHT_ARROW_BULLET}
          resizeMode='contain'
        />
        <CyDText className={'ml-[10px] text-[16px] font-semibold'}>
          {item}
        </CyDText>
      </CyDView>
    );
  };

  return (
    <CyDView className='flex-1 h-[100%] flex-col justify-between bg-white'>
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
            <CyDImage
              className={'h-[25px] w-[25px]'}
              source={
                address === ''
                  ? AppImages.QR_CODE_SCANNER
                  : AppImages.CLOSE_CIRCLE
              }
            />
          </CyDTouchView>
        </CyDView>
        <CyDView className='flex flex-row items-center self-start mt-[15px] ml-[5px]'>
          <CyDImage
            source={AppImages.INFO_CIRCLE}
            className='h-[16px] w-[16px]'
          />
          <CyDText className='ml-[7px]'>
            {t<string>('ONLY_ETHEREUM_SUPPORTED')}
          </CyDText>
        </CyDView>
        <Button
          title={t('TRACK')}
          image={AppImages.TRACK}
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
