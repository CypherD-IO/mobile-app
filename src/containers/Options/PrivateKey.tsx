/**
 * @format
 * @flow
 */
import React, { useContext, useEffect, useState } from 'react';
import {
  CyDView,
  CyDText,
  CyDTouchView,
  CyDImage,
  CyDScrollView,
  CyDMaterialDesignIcons,
} from '../../styles/tailwindStyles';
import { useTranslation } from 'react-i18next';
import AppImages from '../../../assets/images/appImages';
import {
  HdWalletContext,
  _NO_CYPHERD_CREDENTIAL_AVAILABLE_,
} from '../../core/util';
import { showToast } from '../../containers/utilities/toastUtility';
import Clipboard from '@react-native-clipboard/clipboard';
import { BackHandler, NativeModules } from 'react-native';
import { QRCode } from 'react-native-custom-qr-codes';
import {
  CHAIN_COSMOS,
  CHAIN_ETH,
  CHAIN_OSMOSIS,
  CHAIN_JUNO,
  CHAIN_STARGAZE,
  CHAIN_NOBLE,
  CHAIN_COREUM,
  CHAIN_KUJIRA,
  CHAIN_INJECTIVE,
  FundWalletAddressType,
  COSMOS_CHAINS,
  ChainNames,
  CHAIN_SOLANA,
} from '../../constants/server';
import ChooseChainModal from '../../components/v2/chooseChainModal';
import { useIsFocused } from '@react-navigation/native';
import { isAndroid } from '../../misc/checkers';
import { get, includes } from 'lodash';
import {
  loadPrivateKeyFromKeyChain,
  loadRecoveryPhraseFromKeyChain,
} from '../../core/Keychain';
import {
  generateCosmosPrivateKey,
  generateSolanaPrivateKey,
} from '../../core/Address';
import { cosmosConfig } from '../../constants/cosmosConfig';
import useConnectionManager from '../../hooks/useConnectionManager';
import { ConnectionTypes } from '../../constants/enum';

function copyToClipboard(text: string) {
  Clipboard.setString(text);
}

export interface UserChain {
  id: number;
  name: string;
  logo_url: number;
  chainName: string;
  backendName: string;
}

export default function PrivateKey(props) {
  const { t } = useTranslation();
  const isFocused = useIsFocused();
  const hdWalletContext = useContext<any>(HdWalletContext);
  const [showChainModal, setShowChainModal] = useState<boolean>(false);
  const [showPrivateKey, setShowPrivateKey] = useState<boolean>(false);
  const [privateKey, setPrivateKey] = useState<string>(
    _NO_CYPHERD_CREDENTIAL_AVAILABLE_,
  );
  const { connectionType } = useConnectionManager();
  const [connectionTypeValue, setConnectionTypeValue] =
    useState(connectionType);

  useEffect(() => {
    setConnectionTypeValue(connectionType);
  }, [connectionType]);

  let data: UserChain[] = [
    {
      ...CHAIN_ETH,
    },
    {
      ...CHAIN_INJECTIVE,
    },
  ];

  if (connectionTypeValue === ConnectionTypes.SEED_PHRASE) {
    data = [
      ...data,
      {
        ...CHAIN_COSMOS,
      },
      {
        ...CHAIN_OSMOSIS,
      },
      {
        ...CHAIN_JUNO,
      },
      {
        ...CHAIN_STARGAZE,
      },
      {
        ...CHAIN_NOBLE,
      },
      {
        ...CHAIN_COREUM,
      },
      {
        ...CHAIN_KUJIRA,
      },
      {
        ...CHAIN_SOLANA,
      },
    ];
  }

  const [selectedChain, setSelectedChain] = useState<UserChain>(data[0]);

  const bip44HDPath = {
    account: 0,
    change: 0,
    addressIndex: 0,
  };

  useEffect(() => {
    const loadPrivateKey = async () => {
      if (get(selectedChain, ['chainName']) === ChainNames.ETH) {
        const privKey = await loadPrivateKeyFromKeyChain(
          false,
          hdWalletContext.state.pinValue,
        );
        if (privKey && privKey !== _NO_CYPHERD_CREDENTIAL_AVAILABLE_) {
          setPrivateKey(privKey);
        }
      } else if (includes(COSMOS_CHAINS, get(selectedChain, ['chainName']))) {
        const mnemonic = await loadRecoveryPhraseFromKeyChain(
          false,
          hdWalletContext.pinValue,
        );
        if (mnemonic && mnemonic !== _NO_CYPHERD_CREDENTIAL_AVAILABLE_) {
          const privKey = await generateCosmosPrivateKey(
            cosmosConfig[selectedChain.chainName],
            mnemonic,
            bip44HDPath,
          );
          if (privKey && privKey !== _NO_CYPHERD_CREDENTIAL_AVAILABLE_) {
            setPrivateKey(privKey);
          }
        }
      } else if (get(selectedChain, ['chainName']) === ChainNames.SOLANA) {
        const mnemonic = await loadRecoveryPhraseFromKeyChain(
          false,
          hdWalletContext.pinValue,
        );
        if (mnemonic && mnemonic !== _NO_CYPHERD_CREDENTIAL_AVAILABLE_) {
          const path = `m/44'/501'/${String(
            hdWalletContext?.state?.choosenWalletIndex > 0
              ? hdWalletContext?.state?.choosenWalletIndex
              : 0,
          )}'/0'`;

          const privKey = await generateSolanaPrivateKey(mnemonic, path);
          if (privKey && privKey !== _NO_CYPHERD_CREDENTIAL_AVAILABLE_) {
            setPrivateKey(privKey);
          }
        }
      }
    };

    void loadPrivateKey();
  }, [selectedChain]);

  const handleBackButton = () => {
    props.navigation.goBack();
    return true;
  };

  const togglePrivateKey = () => {
    setShowPrivateKey(!showPrivateKey);
  };

  const RenderQRCode = (chain: { item: UserChain }) => {
    return selectedChain.backendName === chain.item.backendName ? (
      <QRCode
        content={privateKey}
        codeStyle='dot'
        logo={AppImages.QR_LOGO}
        logoSize={60}
      />
    ) : null;
  };

  useEffect(() => {
    if (isFocused) {
      if (isAndroid()) NativeModules.PreventScreenshotModule.forbid();
      const walletAddressType =
        hdWalletContext?.state.selectedChain.backendName;
      if (walletAddressType === FundWalletAddressType.COSMOS) {
        setSelectedChain(data[2]);
      } else if (walletAddressType === FundWalletAddressType.OSMOSIS) {
        setSelectedChain(data[3]);
      } else if (walletAddressType === FundWalletAddressType.JUNO) {
        setSelectedChain(data[4]);
      } else if (walletAddressType === FundWalletAddressType.STARGAZE) {
        setSelectedChain(data[5]);
      } else if (walletAddressType === FundWalletAddressType.COREUM) {
        setSelectedChain(data[6]);
      } else if (walletAddressType === FundWalletAddressType.INJECTIVE) {
        setSelectedChain(data[7]);
      } else if (walletAddressType === FundWalletAddressType.KUJIRA) {
        setSelectedChain(data[8]);
      } else if (walletAddressType === FundWalletAddressType.SOLANA) {
        setSelectedChain(data[9]);
      }
    } else {
      if (isAndroid()) NativeModules.PreventScreenshotModule.allow();
    }

    BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    return () => {
      if (isAndroid()) NativeModules.PreventScreenshotModule.allow();
      BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
    };
  }, [isFocused]);

  // NOTE: LIFE CYCLE METHOD 🍎🍎🍎🍎
  return (
    <CyDScrollView className={'bg-n20 h-full w-full relative'}>
      <ChooseChainModal
        isModalVisible={showChainModal}
        data={data}
        setModalVisible={setShowChainModal}
        title={t('CHOOSE_CHAIN')}
        onPress={({ item }) => {
          setSelectedChain(item);
        }}
        selectedItem={selectedChain.name}
        customStyle={{ justifyContent: 'flex-end', padding: 0 }}
        animationIn={'slideInUp'}
        animationOut={'slideOutDown'}
        isClosable={true}
      />
      <CyDView className={'flex justify-center items-center w-full'}>
        <CyDView
          className={
            'mt-[10px] bg-n0 rounded-[18px] mx-[20px] px-[20px] py-[15px]'
          }>
          <CyDText className={'text-[15px] text-center text-base200'}>
            {t('PRIVATE_KEY_SUBTITLE')}
          </CyDText>
        </CyDView>
        <CyDTouchView
          className={
            'bg-blue20 rounded-[36px] py-[8px] px-[20px] flex flex-row justify-between items-center my-5 mb-5 w-10/12 self-center'
          }
          onPress={() => {
            setShowChainModal(true);
          }}>
          <CyDView
            className={'flex flex-row justify-start items-center gap-[10px]'}>
            <CyDView className={'flex flex-row justify-center items-center'}>
              <CyDImage
                source={selectedChain.logo_url}
                className={'w-[22px] h-[22px] mr-[10px]'}
              />
              <CyDText className={'font-bold text-[18px]'}>
                {t('CHAIN') + ':'}
              </CyDText>
            </CyDView>
            <CyDText className={'text-[18px]'}>{selectedChain.name}</CyDText>
          </CyDView>
          <CyDMaterialDesignIcons
            name={'menu-down'}
            size={28}
            className={'text-base400'}
          />
        </CyDTouchView>
        <CyDView className={'flex items-center justify-center w-full'}>
          {data.map(item => (
            <RenderQRCode key={item.id} item={item} />
          ))}
          <CyDView className={'w-[85%] border-[0.5px] border-n40 mt-[20px]'} />
          <CyDTouchView
            className={'mt-[30px]'}
            onPress={() => togglePrivateKey()}>
            {showPrivateKey ? (
              <CyDView className={'flex flex-row justify-center items-center'}>
                <CyDText className={'text-[#1F1F1F] text-[22px] font-semibold'}>
                  {t('HIDE_PRIVATE_KEY')}
                </CyDText>
                <CyDMaterialDesignIcons
                  name='eye-outline'
                  size={27}
                  className='text-base400 ml-[7px]'
                />
              </CyDView>
            ) : (
              <CyDView className={'flex flex-row justify-center items-center'}>
                <CyDText className={'text-[15px] font-semibold'}>
                  {'\u2B24  \u2B24  \u2B24  \u2B24  \u2B24  \u2B24  \u2B24'}
                </CyDText>

                <CyDMaterialDesignIcons
                  name={'eye-off-outline'}
                  size={27}
                  className='text-base400 ml-[7px] mt-[5px]'
                />
              </CyDView>
            )}
            {!showPrivateKey && (
              <CyDText
                className={
                  'text-[#1F1F1F] text-[16px] font-semibold mt-[15px]'
                }>
                {t('TAP_REVEAL_PRIVATE_KEY')}
              </CyDText>
            )}
          </CyDTouchView>
          {showPrivateKey && (
            <CyDView
              className={
                'flex justify-center items-center mt-[15px] w-11/12 border-[1px] border-n40 px-[10px] py-[5px] rounded-[4px]'
              }>
              <CyDText
                className={
                  'text-addressColor text-[16px] text-center font-semibold'
                }>
                {privateKey}
              </CyDText>
            </CyDView>
          )}
        </CyDView>
        <CyDTouchView
          className={
            'flex flex-row items-center justify-center mt-[30px] h-[60px] w-3/4 border-[1px] border-n40 rounded-[12px]'
          }
          onPress={() => {
            copyToClipboard(privateKey);
            showToast(t('PRIVATE_KEY_COPY'));
          }}>
          <CyDMaterialDesignIcons
            name={'content-copy'}
            size={16}
            className='text-base400 absolute left-[20]'
          />
          <CyDText className={'text-[16px] font-extrabold'}>
            {t('COPY_TO_CLIPBOARD')}
          </CyDText>
        </CyDTouchView>
      </CyDView>
    </CyDScrollView>
  );
}
