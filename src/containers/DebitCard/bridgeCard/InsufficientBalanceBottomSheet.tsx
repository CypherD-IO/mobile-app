import React, { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, StyleSheet, Modal } from 'react-native';
// @ts-expect-error - Type declaration not available for react-native-custom-qr-codes
import { QRCode } from 'react-native-custom-qr-codes';
import Share from 'react-native-share';
import Clipboard from '@react-native-clipboard/clipboard';
import { get } from 'lodash';
import {
  CyDView,
  CyDText,
  CyDTouchView,
  CyDMaterialDesignIcons,
  CyDFastImage,
  CyDScrollView,
} from '../../../styles/tailwindComponents';
import { AppImagesMap } from '../../../../assets/images/appImages';
import {
  CHAIN_ETH,
  CHAIN_POLYGON,
  CHAIN_BSC,
  CHAIN_AVALANCHE,
  CHAIN_ARBITRUM,
  CHAIN_OPTIMISM,
  CHAIN_BASE,
  CHAIN_ZKSYNC_ERA,
  CHAIN_SOLANA,
  CHAIN_COSMOS,
  CHAIN_OSMOSIS,
  CHAIN_NOBLE,
  CHAIN_COREUM,
  CHAIN_INJECTIVE,
  Chain,
} from '../../../constants/server';
import { HdWalletContext, getMaskedAddress } from '../../../core/util';
import { HdWalletContextDef } from '../../../reducers/hdwallet_reducer';
import { showToast } from '../../utilities/toastUtility';
import Button from '../../../components/v2/button';
import { ButtonType, ConnectionTypes } from '../../../constants/enum';
import { getConnectionType } from '../../../core/asyncStorage';

interface InsufficientBalanceBottomSheetContentProps {
  minAmount: number;
}

interface UserChain {
  id: number;
  name: string;
  logo_url: any;
  chainName: string;
  address: string;
  backendName: string;
}

// Available chains for funding
const FUNDING_CHAINS = [
  CHAIN_ETH,
  CHAIN_POLYGON,
  CHAIN_BSC,
  CHAIN_AVALANCHE,
  CHAIN_ARBITRUM,
  CHAIN_OPTIMISM,
  CHAIN_BASE,
  CHAIN_ZKSYNC_ERA,
  CHAIN_SOLANA,
  CHAIN_COSMOS,
  CHAIN_OSMOSIS,
  CHAIN_NOBLE,
  CHAIN_COREUM,
  CHAIN_INJECTIVE,
];

const modalDropdownStyles = StyleSheet.create({
  dropdown: {
    position: 'absolute',
    maxWidth: 320,
    zIndex: 100,
  },
});

const ChainSelector = ({
  selectedChain,
  setSelectedChain,
  showChainSelector,
  setShowChainSelector,
  dropdownPos,
  setDropdownPos,
  selectorRef,
  getChainDataWithAddress,
  FUNDING_CHAINS,
}: any) => {
  // When opening, measure the selector position on screen
  const openDropdown = () => {
    if (selectorRef.current) {
      selectorRef.current.measureInWindow(
        (x: number, y: number, width: number, height: number) => {
          setDropdownPos({ x, y, width, height });
          setShowChainSelector(true);
        },
      );
    }
  };

  // Close dropdown on backdrop press
  const closeDropdown = () => setShowChainSelector(false);

  return (
    <CyDView className='items-center mb-[6px]'>
      {/* Selector Button */}
      <CyDTouchView
        ref={selectorRef}
        className='flex flex-row items-center justify-between z-20 self-center px-[12px] py-[8px] rounded-[8px]'
        onPress={openDropdown}>
        <CyDView className='flex-row items-center'>
          <CyDFastImage
            source={selectedChain?.logo_url}
            className='w-[20px] h-[20px] mr-[8px]'
          />
          <CyDText className='text-[16px] font-semibold' numberOfLines={1}>
            {selectedChain?.name} Address
          </CyDText>
        </CyDView>
        <CyDMaterialDesignIcons
          name={showChainSelector ? 'chevron-up' : 'chevron-down'}
          size={18}
          className='ml-[8px] text-base400'
        />
      </CyDTouchView>

      {/* Dropdown Modal */}
      <Modal
        visible={showChainSelector}
        transparent
        animationType='fade'
        onRequestClose={closeDropdown}>
        <CyDTouchView
          className='absolute top-0 left-0 right-0 bottom-0 bg-black/10 z-40'
          onPress={closeDropdown}
          activeOpacity={1}>
          <CyDView
            style={[
              modalDropdownStyles.dropdown,
              {
                top: dropdownPos.y + dropdownPos.height + 4, // 4px gap
                left: dropdownPos.x,
                width: dropdownPos.width,
              },
            ]}
            className='bg-base200 rounded-[20px] border border-n60 py-[8px] max-h-[320px] overflow-hidden shadow-lg'>
            <CyDScrollView
              className='max-h-[320px]'
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}>
              {FUNDING_CHAINS.map((chain: any, index: number) => {
                const chainData = getChainDataWithAddress(chain);
                const hasAddress = Boolean(chainData.address);
                const isSelected = selectedChain?.id === chain.id;
                return (
                  <CyDTouchView
                    key={chain.id}
                    className={`flex-row items-center px-[18px] py-[14px] ${!hasAddress ? 'opacity-50' : ''} ${FUNDING_CHAINS.length - 1 === index ? '' : 'border-b border-base150'}`}
                    onPress={() => {
                      if (hasAddress) {
                        setSelectedChain(chainData);
                        setShowChainSelector(false);
                      }
                    }}
                    disabled={!hasAddress}>
                    <CyDFastImage
                      source={chain.logo_url}
                      className='w-[22px] h-[22px] mr-[12px]'
                    />
                    <CyDText
                      className='text-white text-[16px] flex-1'
                      numberOfLines={1}>
                      {chain.name}
                    </CyDText>
                    {isSelected && (
                      <CyDMaterialDesignIcons
                        name='check-circle'
                        size={20}
                        className='text-yellow-400 ml-[8px]'
                      />
                    )}
                  </CyDTouchView>
                );
              })}
            </CyDScrollView>
          </CyDView>
        </CyDTouchView>
      </Modal>
    </CyDView>
  );
};

const InsufficientBalanceBottomSheetContent: React.FC<
  InsufficientBalanceBottomSheetContentProps
> = ({ minAmount }) => {
  const { t } = useTranslation();
  const hdWalletContext = useContext(HdWalletContext) as HdWalletContextDef;
  const [connectionType, setConnectionType] = useState<ConnectionTypes | null>(
    ConnectionTypes.SEED_PHRASE,
  );
  const ethereumAddress = get(
    hdWalletContext,
    'state.wallet.ethereum.address',
    '',
  );
  const solanaAddress = get(
    hdWalletContext,
    'state.wallet.solana.wallets[0].address',
    '',
  );

  // Synchronously set the default selectedChain to Ethereum
  const [selectedChain, setSelectedChain] = useState<UserChain>({
    ...CHAIN_SOLANA,
    address: solanaAddress,
  });

  const [showChainSelector, setShowChainSelector] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const selectorRef = React.useRef<any>(null);

  function getChainDataWithAddress(chain: Chain): UserChain {
    let address = '';

    switch (chain.backendName) {
      case 'ETH':
      case 'POLYGON':
      case 'BSC':
      case 'AVALANCHE':
      case 'ARBITRUM':
      case 'OPTIMISM':
      case 'BASE':
      case 'ZKSYNC_ERA':
        address = ethereumAddress;
        break;
      case 'SOLANA':
        address = get(
          hdWalletContext,
          'state.wallet.solana.wallets[0].address',
          '',
        );
        break;
      case 'COSMOS':
        address = get(
          hdWalletContext,
          'state.wallet.cosmos.wallets[0].address',
          '',
        );
        break;
      case 'OSMOSIS':
        address = get(
          hdWalletContext,
          'state.wallet.osmosis.wallets[0].address',
          '',
        );
        break;
      case 'NOBLE':
        address = get(
          hdWalletContext,
          'state.wallet.noble.wallets[0].address',
          '',
        );
        break;
      case 'COREUM':
        address = get(
          hdWalletContext,
          'state.wallet.coreum.wallets[0].address',
          '',
        );
        break;
      case 'INJECTIVE':
        address = get(
          hdWalletContext,
          'state.wallet.injective.wallets[0].address',
          '',
        );
        break;
      default:
        address = ethereumAddress;
    }

    return {
      ...chain,
      address,
      chainName: chain.chainName,
    };
  }

  const copyToClipboard = (text: string) => {
    Clipboard.setString(text);
    showToast(t('ADDRESS_COPY'));
  };

  const shareAddress = async () => {
    if (!selectedChain?.address) return;

    try {
      await Share.open({
        title: 'Share Address',
        message: selectedChain.address,
      });
    } catch (error) {
      console.error('Error sharing address:', error);
    }
  };

  const openFundingGuide = () => {
    // You can replace this with your actual funding guide URL
    const fundingGuideUrl =
      'https://docs.cypherwallet.io/how-to-fund-your-wallet';
    Linking.openURL(fundingGuideUrl).catch(err =>
      console.error('Error opening funding guide:', err),
    );
  };

  useEffect(() => {
    void getConnectionType().then(_connectionType => {
      if (_connectionType) {
        setConnectionType(_connectionType);
        if (_connectionType === ConnectionTypes.SOCIAL_LOGIN_SOLANA) {
          setSelectedChain({
            ...CHAIN_SOLANA,
            address: solanaAddress,
          });
        } else {
          setSelectedChain({
            ...CHAIN_SOLANA,
            address: solanaAddress,
          });
        }
      }
    });
  }, []);

  return (
    <CyDScrollView className='flex-1 px-[16px]'>
      {/* Warning Banner */}
      <CyDView className='bg-red400 rounded-[12px] mt-4 p-[16px] mb-[32px] flex-row items-center'>
        <CyDView className='flex-1'>
          <CyDView className='flex-row items-center mb-3'>
            <CyDMaterialDesignIcons
              name='alert-circle-outline'
              size={20}
              className='text-white mr-[8px]'
            />
            <CyDText className='text-white flex-1 text-[16px] font-bold'>
              Insufficient Wallet balance
            </CyDText>
          </CyDView>
          <CyDText className='text-white text-[14px]'>
            Your wallet currently have low balance, which is insufficient to
            load your card. A minimum balance of ${minAmount} is required to
            proceed with the loading process.
          </CyDText>
        </CyDView>
      </CyDView>

      {/* Chain Selector */}
      {connectionType !== ConnectionTypes.SOCIAL_LOGIN_SOLANA && (
        <ChainSelector
          selectedChain={selectedChain}
          setSelectedChain={setSelectedChain}
          showChainSelector={showChainSelector}
          setShowChainSelector={setShowChainSelector}
          dropdownPos={dropdownPos}
          setDropdownPos={setDropdownPos}
          selectorRef={selectorRef}
          getChainDataWithAddress={getChainDataWithAddress}
          FUNDING_CHAINS={FUNDING_CHAINS}
        />
      )}

      {/* Info Message */}
      <CyDView className='flex-row items-center justify-center mb-[32px]'>
        <CyDMaterialDesignIcons
          name='information-outline'
          size={16}
          className='text-n200 mr-[8px]'
        />
        <CyDText className='text-n200 text-[12px] font-semibold'>
          Assets can only be sent within the same network.
        </CyDText>
      </CyDView>

      {/* QR Code Section */}
      <CyDView className='items-center mb-[20px]'>
        <CyDView className='bg-white p-[12px] rounded-[12px] mb-8'>
          <QRCode
            content={selectedChain.address}
            codeStyle='dot'
            size={180}
            logo={get(
              AppImagesMap.common,
              [selectedChain?.logo_url],
              AppImagesMap.common.QR_LOGO,
            )}
            // logo={get(AppImages, selectedChain.logo_url, AppImages.QR_LOGO)}
            logoSize={40}
          />
        </CyDView>

        <CyDView className='items-center'>
          <CyDText className='text-n200 text-[20px] font-bold text-center mb-[16px]'>
            {getMaskedAddress(selectedChain.address)}
          </CyDText>

          {/* Address breakdown */}
          {/* <CyDView className='flex-row mb-[16px]'>
            <CyDText className='text-blue-400 text-[12px] font-bold'>
              {selectedChain.address.slice(0, 8)}
            </CyDText>
            <CyDText className='text-n200 text-[12px]'>
              {selectedChain.address.slice(8, -6)}
            </CyDText>
            <CyDText className='text-blue-400 text-[12px] font-bold'>
              {selectedChain.address.slice(-6)}
            </CyDText>
          </CyDView> */}
        </CyDView>

        {/* Copy and Share buttons */}
        <CyDView className='flex-row space-x-[10px]'>
          <Button
            onPress={() => {
              shareAddress().catch(console.error);
            }}
            icon={
              <CyDMaterialDesignIcons
                name='share-variant'
                size={20}
                className='text-base400'
              />
            }
            style='bg-n40 border border-n40 rounded-full px-[16px] py-[8px] mr-[8px]'
            title='Share Address'
            type={ButtonType.SECONDARY}
            titleStyle='text-[14px] ml-[8px]'
          />
          <Button
            onPress={() => copyToClipboard(selectedChain.address)}
            icon={
              <CyDMaterialDesignIcons
                name='content-copy'
                size={20}
                className='text-base400'
              />
            }
            style='bg-n40 border border-n40 rounded-full px-[16px] py-[8px]'
            title={'Copy Address'}
            type={ButtonType.SECONDARY}
            titleStyle='text-[14px] ml-[8px]'
          />
        </CyDView>
      </CyDView>

      {/* Learn More Link */}
      <CyDTouchView
        className='flex-row items-center justify-center py-[16px]'
        onPress={openFundingGuide}>
        <CyDText className='text-blue-400 text-[14px] mr-[4px]'>
          Learn how to fund your wallet?
        </CyDText>
        <CyDMaterialDesignIcons
          name='open-in-new'
          size={16}
          className='text-blue-400'
        />
      </CyDTouchView>
    </CyDScrollView>
  );
};

export default InsufficientBalanceBottomSheetContent;
