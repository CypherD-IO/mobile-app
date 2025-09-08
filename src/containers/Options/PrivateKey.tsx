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
  CyDSafeAreaView,
  CyDIcons,
} from '../../styles/tailwindComponents';
import { useTranslation } from 'react-i18next';
import { AppImagesMap } from '../../../assets/images/appImages';
import {
  HdWalletContext,
  _NO_CYPHERD_CREDENTIAL_AVAILABLE_,
} from '../../core/util';
import { showToast } from '../../containers/utilities/toastUtility';
import Clipboard from '@react-native-clipboard/clipboard';
import { Alert, BackHandler, NativeModules } from 'react-native';
import { QRCode } from 'react-native-custom-qr-codes';
import { BlurView } from '@react-native-community/blur';
import PageHeader from '../../components/PageHeader';
import {
  CHAIN_COSMOS,
  CHAIN_ETH,
  CHAIN_OSMOSIS,
  CHAIN_NOBLE,
  CHAIN_COREUM,
  CHAIN_INJECTIVE,
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
import { Theme, useTheme } from '../../reducers/themeReducer';

function copyToClipboard(text: string) {
  Clipboard.setString(text);
}

const blurOverlayStyle = {
  position: 'absolute' as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  borderRadius: 8,
};

const modalStyle = {
  justifyContent: 'flex-end' as const,
  padding: 0,
};

export interface UserChain {
  id: number;
  name: string;
  logo_url: number;
  chainName: string;
  backendName: string;
}

interface PrivateKeyProps {
  navigation: any;
}

export default function PrivateKey(props: PrivateKeyProps) {
  const { t } = useTranslation();
  const isFocused = useIsFocused();
  const hdWalletContext = useContext<any>(HdWalletContext);
  const [showChainModal, setShowChainModal] = useState<boolean>(false);
  const [privateKey, setPrivateKey] = useState<string>(
    _NO_CYPHERD_CREDENTIAL_AVAILABLE_,
  );
  const { theme } = useTheme();
  const [showQR, setShowQR] = useState<boolean>(false);
  const [isBlurred, setIsBlurred] = useState<boolean>(true);
  const { connectionType } = useConnectionManager();
  const [connectionTypeValue, setConnectionTypeValue] =
    useState(connectionType);
  const [isLoading, setIsLoading] = useState<boolean>(false);

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
        ...CHAIN_NOBLE,
      },
      {
        ...CHAIN_COREUM,
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
      setIsLoading(true);
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
          const path = get(hdWalletContext, 'state.wallet.solana.path', '');

          const privKey = await generateSolanaPrivateKey(mnemonic, path);
          if (privKey && privKey !== _NO_CYPHERD_CREDENTIAL_AVAILABLE_) {
            setPrivateKey(privKey);
          }
        }
      }
      setIsLoading(false);
    };

    void loadPrivateKey();
  }, [selectedChain]);

  const handleBackButton = () => {
    props.navigation.goBack();
    return true;
  };

  const toggleQR = () => {
    if (!showQR) {
      Alert.alert(
        t('PRIVATE_KEY_QR_REVEAL_TITLE'),
        t('PRIVATE_KEY_QR_REVEAL_DESC'),
        [
          { text: t('CANCEL') ?? 'Cancel', style: 'cancel' },
          {
            text: t('PROCEED') ?? 'Proceed',
            style: 'destructive',
            onPress: () => setShowQR(true),
          },
        ],
      );
      return;
    }
    setShowQR(false);
  };

  const toggleBlur = () => {
    if (isBlurred) {
      Alert.alert(t('SEED_REVEAL_TITLE'), t('NO_ONE_IS_WATCHING_YOU'), [
        { text: t('CANCEL') ?? 'Cancel', style: 'cancel' },
        {
          text: t('PROCEED') ?? 'Proceed',
          style: 'destructive',
          onPress: () => setIsBlurred(false),
        },
      ]);
      return;
    }
    setIsBlurred(true);
  };

  useEffect(() => {
    if (isFocused) {
      if (isAndroid()) NativeModules.PreventScreenshotModule.forbid();
      setSelectedChain(hdWalletContext?.state.selectedChain);
    } else {
      if (isAndroid()) NativeModules.PreventScreenshotModule.allow();
    }

    BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    return () => {
      if (isAndroid()) NativeModules.PreventScreenshotModule.allow();
      BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
    };
  }, [isFocused]);

  return (
    <CyDSafeAreaView className='bg-n0 flex-1'>
      <ChooseChainModal
        isModalVisible={showChainModal}
        data={data}
        setModalVisible={setShowChainModal}
        title={t('CHOOSE_CHAIN')}
        onPress={({ item }) => {
          setSelectedChain(item);
        }}
        selectedItem={selectedChain.name}
        customStyle={modalStyle}
        animationIn={'slideInUp'}
        animationOut={'slideOutDown'}
        isClosable={true}
      />

      {/* Header */}
      <PageHeader title={'REVEAL_PRIVATE_KEY'} navigation={props.navigation} />

      <CyDScrollView
        className='flex-1 bg-n0'
        showsVerticalScrollIndicator={false}>
        <CyDView className='flex-1 px-6 py-6'>
          <CyDView className='items-center mb-8'>
            <CyDView className='w-[54px] h-[54px] bg-[#310072] rounded-[6px] items-center justify-center mb-6'>
              <CyDIcons name='key' size={36} className='text-white' />
            </CyDView>
            <CyDText className='text-[16px] text-center font-medium text-base400 leading-[140%] tracking-[-0.8px] px-4'>
              These key unlock your wallet,{'\n'}Keep them safe.
            </CyDText>
          </CyDView>

          {/* Private Key Container or QR Code */}
          {!showQR ? (
            <CyDView className='bg-n20 rounded-[8px] p-6 mb-6 relative'>
              {/* Chain Selection */}
              <CyDTouchView
                className='bg-n20 rounded-[8px] py-4 px-4 mb-6 flex-row items-center justify-center gap-x-[12px]'
                onPress={() => setShowChainModal(true)}>
                <CyDView className='flex-row items-center'>
                  <CyDImage
                    source={selectedChain.logo_url}
                    className='w-6 h-6 mr-3'
                  />
                  <CyDText className='text-[20px] font-normal text-base400'>
                    {selectedChain.name + 'Chain'}
                  </CyDText>
                </CyDView>
                <CyDIcons
                  name='chevron-down'
                  size={24}
                  className='text-base400'
                />
              </CyDTouchView>
              <CyDText className='text-center font-medium text-[14px] mb-[10px]'>{`${selectedChain.name} Private Key`}</CyDText>
              <CyDTouchView onPress={toggleBlur} className='relative'>
                {/* Private Key Display */}
                {isLoading && (
                  <CyDView className='py-4'>
                    <CyDText className='text-[14px] font-medium text-center text-base400 break-all'>
                      {`Securely fetching your ${selectedChain.name} private key...`}
                    </CyDText>
                  </CyDView>
                )}
                {!isLoading && (
                  <CyDView className='py-4'>
                    <CyDText className='text-[14px] font-medium text-center text-base400 break-all'>
                      {isBlurred ? '*****' : privateKey}
                    </CyDText>
                  </CyDView>
                )}
                {/* Blur Overlay */}
                {isBlurred && (
                  <CyDView className='absolute top-0 left-0 right-0 bottom-0 bg-n20 rounded-[8px] items-center justify-center'>
                    <BlurView
                      style={blurOverlayStyle}
                      blurType={theme === Theme.DARK ? 'light' : 'dark'}
                      blurAmount={4}
                    />
                    <CyDView className='items-center justify-center z-10'>
                      <CyDText className='text-base font-semibold text-base400 text-center'>
                        Click to show Private Key
                      </CyDText>
                    </CyDView>
                  </CyDView>
                )}
              </CyDTouchView>
            </CyDView>
          ) : (
            <CyDView className='bg-n20 rounded-[8px] p-6 mb-6 items-center'>
              <CyDTouchView
                className='bg-n20 rounded-[8px] py-4 px-4 mb-6 flex-row items-center justify-center gap-x-[12px]'
                onPress={() => setShowChainModal(true)}>
                <CyDView className='flex-row items-center'>
                  <CyDImage
                    source={selectedChain.logo_url}
                    className='w-6 h-6 mr-3'
                  />
                  <CyDText className='text-[20px] font-normal text-base400'>
                    {selectedChain.name + 'Chain'}
                  </CyDText>
                </CyDView>
                <CyDIcons
                  name='chevron-down'
                  size={24}
                  className='text-base400'
                />
              </CyDTouchView>
              <CyDText className='text-center font-medium text-[14px] mb-[10px]'>{`${selectedChain.name} Private Key`}</CyDText>
              <CyDView className='bg-n0 p-6 rounded-xl shadow-lg'>
                {isLoading && (
                  <CyDView className='py-4'>
                    <CyDText className='text-[14px] font-medium text-center text-base400 break-all'>
                      {`Securely fetching your ${selectedChain.name} private key...`}
                    </CyDText>
                  </CyDView>
                )}
                {!isLoading && (
                  <QRCode
                    content={privateKey}
                    codeStyle='dot'
                    logo={AppImagesMap.common.QR_LOGO}
                    logoSize={60}
                  />
                )}
              </CyDView>
            </CyDView>
          )}

          {/* Recommendation Message */}
          <CyDView className='bg-n20 rounded-xl p-5 mb-8 flex-row items-start'>
            <CyDIcons
              name='information'
              size={20}
              className='text-base400 mr-3'
            />
            <CyDText className='flex-1 text-[12px] font-medium text-n200 text-base400 leading-[150%]'>
              We recommend writing down this Key on paper and storing it
              securely in a place only you can access.
            </CyDText>
          </CyDView>

          {/* Action Buttons */}
          <CyDView className='flex-row justify-between mb-8 gap-x-[8px]'>
            <CyDTouchView
              onPress={toggleQR}
              className='flex-1 bg-n20 rounded-full p-[8px] flex-row items-center justify-center w-[156px]'>
              <CyDIcons
                name='qr-code'
                size={20}
                className='text-base400 mr-2'
              />
              <CyDText className='text-base font-semibold text-base400'>
                {showQR ? 'Show Key' : 'Show QR'}
              </CyDText>
            </CyDTouchView>

            <CyDTouchView
              onPress={() => {
                copyToClipboard(privateKey);
                showToast(t('PRIVATE_KEY_COPY'));
              }}
              className='flex-1 bg-n20 rounded-full p-[8px] flex-row items-center justify-center w-[156px]'>
              <CyDIcons name='copy' size={20} className='text-base400 mr-2' />
              <CyDText className='text-base font-semibold text-base400'>
                Copy Key
              </CyDText>
            </CyDTouchView>
          </CyDView>
        </CyDView>
      </CyDScrollView>
    </CyDSafeAreaView>
  );
}
