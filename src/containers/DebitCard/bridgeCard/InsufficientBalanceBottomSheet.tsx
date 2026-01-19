import React, { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, StyleSheet, Modal } from 'react-native';
import QRCode from '../../../components/v2/QRCode';
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

interface ChainSelectorProps {
  selectedChain: UserChain;
  setSelectedChain: (chain: UserChain) => void;
  showChainSelector: boolean;
  setShowChainSelector: (show: boolean) => void;
  dropdownPos: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  setDropdownPos: (pos: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => void;
  selectorRef: React.RefObject<any>;
  getChainDataWithAddress: (chain: Chain) => UserChain;
  availableChains: Chain[];
}

const ChainSelector: React.FC<ChainSelectorProps> = ({
  selectedChain,
  setSelectedChain,
  showChainSelector,
  setShowChainSelector,
  dropdownPos,
  setDropdownPos,
  selectorRef,
  getChainDataWithAddress,
  availableChains,
}) => {
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
              {availableChains.length > 0 ? (
                availableChains.map((chain: any, index: number) => {
                  const chainData = getChainDataWithAddress(chain);
                  const isSelected = selectedChain?.id === chain.id;
                  return (
                    <CyDTouchView
                      key={chain.id}
                      className={`flex-row items-center px-[18px] py-[14px] ${availableChains.length - 1 === index ? '' : 'border-b border-base150'}`}
                      onPress={() => {
                        setSelectedChain(chainData);
                        setShowChainSelector(false);
                      }}>
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
                })
              ) : (
                <CyDView className='px-[18px] py-[24px] items-center'>
                  <CyDText className='text-n200 text-[14px] text-center'>
                    No chains available for this wallet type
                  </CyDText>
                </CyDView>
              )}
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

  // Default to Ethereum if available, otherwise Solana if available
  const getDefaultChain = (): UserChain => {
    if (ethereumAddress) {
      return {
        ...CHAIN_ETH,
        address: ethereumAddress,
      };
    } else if (solanaAddress) {
      return {
        ...CHAIN_SOLANA,
        address: solanaAddress,
      };
    }
    // Fallback to Ethereum even if no address (will show as unavailable)
    return {
      ...CHAIN_ETH,
      address: '',
    };
  };

  const [selectedChain, setSelectedChain] =
    useState<UserChain>(getDefaultChain());

  const [showChainSelector, setShowChainSelector] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const selectorRef = React.useRef<any>(null);

  // Filter available chains - only show chains with addresses
  const [availableChains, setAvailableChains] = useState<Chain[]>([]);

  /**
   * Get chain data with address for a specific chain
   * Gracefully handles missing addresses (e.g., WalletConnect only has Ethereum)
   * @param chain - The chain to get address for
   * @returns UserChain object with address (empty string if not available)
   */
  function getChainDataWithAddress(chain: Chain): UserChain {
    let address = '';

    try {
      switch (chain.backendName) {
        case 'ETH':
        case 'POLYGON':
        case 'BSC':
        case 'AVALANCHE':
        case 'ARBITRUM':
        case 'OPTIMISM':
        case 'BASE':
        case 'ZKSYNC_ERA':
          // EVM chains all use the same Ethereum address
          address = ethereumAddress || '';
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
          // Default to Ethereum address for unknown chains
          address = ethereumAddress || '';
      }
    } catch (error) {
      address = '';
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
      'https://help.cypherhq.io/en/articles/13427680-how-to-send-funds-to-cypher-from-a-non-custodial-wallet';
    Linking.openURL(fundingGuideUrl).catch(err =>
      console.error('Error opening funding guide:', err),
    );
  };

  /**
   * Filter chains to only show those with available addresses
   * Prevents showing chains that aren't available (e.g., WalletConnect only has Ethereum)
   */
  const filterAvailableChains = (): Chain[] => {
    const chains: Chain[] = [];

    for (const chain of FUNDING_CHAINS) {
      const chainData = getChainDataWithAddress(chain);
      // Only include chains that have an address
      if (chainData.address && chainData.address.length > 0) {
        chains.push(chain);
      }
    }

    return chains;
  };

  useEffect(() => {
    // Filter available chains based on wallet context
    const filtered = filterAvailableChains();
    setAvailableChains(filtered);

    // Set connection type and default chain
    void getConnectionType().then(_connectionType => {
      if (_connectionType) {
        setConnectionType(_connectionType);

        if (
          _connectionType === ConnectionTypes.SOCIAL_LOGIN_SOLANA &&
          solanaAddress
        ) {
          // Social login Solana: default to Solana
          setSelectedChain({
            ...CHAIN_SOLANA,
            address: solanaAddress,
          });
        } else if (ethereumAddress) {
          // All other cases: default to Ethereum if available
          setSelectedChain({
            ...CHAIN_ETH,
            address: ethereumAddress,
          });
        } else if (filtered.length > 0) {
          // Fallback: use first available chain
          const firstChain = getChainDataWithAddress(filtered[0]);
          setSelectedChain(firstChain);
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

      {/* Chain Selector - Only show if multiple chains available and not Solana social login */}
      {connectionType !== ConnectionTypes.SOCIAL_LOGIN_SOLANA &&
        availableChains.length > 1 && (
          <ChainSelector
            selectedChain={selectedChain}
            setSelectedChain={setSelectedChain}
            showChainSelector={showChainSelector}
            setShowChainSelector={setShowChainSelector}
            dropdownPos={dropdownPos}
            setDropdownPos={setDropdownPos}
            selectorRef={selectorRef}
            getChainDataWithAddress={getChainDataWithAddress}
            availableChains={availableChains}
          />
        )}

      {/* Show chain name if only one chain available */}
      {availableChains.length === 1 && (
        <CyDView className='items-center mb-[6px]'>
          <CyDView className='flex-row items-center px-[12px] py-[8px]'>
            <CyDFastImage
              source={selectedChain?.logo_url}
              className='w-[20px] h-[20px] mr-[8px]'
            />
            <CyDText className='text-[16px] font-semibold'>
              {selectedChain?.name} Address
            </CyDText>
          </CyDView>
        </CyDView>
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

      {/* QR Code Section - Only show if address is available */}
      {selectedChain.address && selectedChain.address.length > 0 ? (
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
              logoSize={40}
            />
          </CyDView>

          <CyDView className='items-center'>
            <CyDText className='text-n200 text-[20px] font-bold text-center mb-[16px]'>
              {getMaskedAddress(selectedChain.address)}
            </CyDText>
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
      ) : (
        <CyDView className='items-center mb-[20px] py-[32px]'>
          <CyDMaterialDesignIcons
            name='wallet-outline'
            size={48}
            className='text-n200 mb-[16px]'
          />
          <CyDText className='text-n200 text-[16px] font-semibold text-center'>
            No wallet address available
          </CyDText>
          <CyDText className='text-n200 text-[14px] text-center mt-[8px] px-[24px]'>
            This wallet type doesn&apos;t support funding through these
            networks.
          </CyDText>
        </CyDView>
      )}

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
