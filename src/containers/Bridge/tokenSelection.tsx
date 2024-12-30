import clsx from 'clsx';
import Fuse from 'fuse.js';
import { t } from 'i18next';
import { capitalize, endsWith, get, isString } from 'lodash';
import React, { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { Dimensions, Keyboard, StyleSheet } from 'react-native';
import { SvgUri } from 'react-native-svg';
import { SwapBridgeChainData, SwapBridgeTokenData } from '.';
import AppImages from '../../../assets/images/appImages';
import Loading from '../../components/v2/loading';
import CyDModalLayout from '../../components/v2/modal';
import CyDSkeleton from '../../components/v2/skeleton';
import {
  CyDFastImage,
  CyDFlatList,
  CyDImage,
  CyDScrollView,
  CyDText,
  CyDTextInput,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindStyles';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

function RenderToken({
  item,
  selected,
  setSelected,
  setModalVisible,
  type,
}: {
  item: SwapBridgeTokenData;
  selected: SwapBridgeTokenData;
  setSelected: Dispatch<SetStateAction<SwapBridgeTokenData>>;
  setModalVisible: Dispatch<SetStateAction<boolean>>;
  type: 'from' | 'to';
}) {
  return (
    <CyDTouchView
      key={item.chainId}
      className={clsx(
        'flex flex-row py-[12px] px-[24px] items-center justify-between',
        {
          'bg-[#58ADAB17] rounded-[18px]':
            item.recommendedSymbol === selected?.recommendedSymbol,
        },
      )}
      onPress={() => {
        setModalVisible(false);

        setSelected(item);
      }}>
      <CyDView className={'flex flex-row items-center'}>
        <CyDView className={'flex flex-row items-center '}>
          {endsWith(item.logoUrl, '.svg') ? (
            <SvgUri
              width='28'
              height='28'
              className='w-[28px] h-[28px] mr-[18px]'
              uri={item.logoUrl}
            />
          ) : (
            <CyDFastImage
              source={{
                uri: item.logoUrl,
              }}
              className={'w-[40px] h-[40px] mr-[18px]'}
            />
          )}
          <CyDView className=''>
            <CyDText
              className={'text-base400 text-[16px] font-nunito font-semibold'}>
              {item.recommendedSymbol}
            </CyDText>
            <CyDText
              className={'text-n200 text-[12px] font-nunito font-regular'}>
              {item.name}
            </CyDText>
          </CyDView>
        </CyDView>
      </CyDView>

      {type === 'from' ? (
        <CyDView>
          <CyDText
            className={
              'font-semibold text-subTextColor text-[16px] text-right'
            }>
            {new Intl.NumberFormat('en-US', {
              maximumSignificantDigits: 4,
            }).format(item.balance ?? 0)}
          </CyDText>
          <CyDText
            className={
              'font-semibold text-subTextColor text-[12px] text-right mr-[2px]'
            }>
            {currencyFormatter.format(item.balanceInNumbers ?? 0)}
          </CyDText>
        </CyDView>
      ) : (
        <CyDView />
      )}
    </CyDTouchView>
  );
}

function ChooseTokenModal({
  setModalVisible,
  isModalVisible,
  data,
  selected,
  setSelected,
  selectedChain,
  setSelectedChain,
  chainData,
  type,
}: {
  isModalVisible: boolean;
  setModalVisible: Dispatch<SetStateAction<boolean>>;
  data: SwapBridgeTokenData[];
  selected: SwapBridgeTokenData;
  setSelected: Dispatch<SetStateAction<SwapBridgeTokenData>>;
  selectedChain: SwapBridgeChainData;
  setSelectedChain: Dispatch<SetStateAction<SwapBridgeChainData>>;
  chainData: SwapBridgeChainData[];
  type: 'from' | 'to';
}) {
  const [searchText, setSearchText] = useState<string>('');
  const [filteredData, setFilteredData] = useState<SwapBridgeTokenData[]>(data);
  const [chainModalVisible, setChainModalVisible] = useState(false);

  const handleSearchTextChange = (text: string) => {
    setSearchText(text);
    searchTokens(text);
  };

  useEffect(() => {
    setFilteredData(data);
  }, [data]);

  if (!data || !chainData) return <Loading />;

  const searchOptions = {
    isCaseSensitive: false,
    includeScore: true,
    shouldSort: true,
    threshold: 0.1,
    keys: ['chainName', 'recommendedSymbol'],
  };
  const fuse = new Fuse(data, searchOptions);

  const searchTokens = (tokenName: string) => {
    if (tokenName.trim() !== '') {
      const filteredTokens = fuse.search(tokenName).map(token => token.item);
      setFilteredData(filteredTokens);
    } else {
      setFilteredData(data);
    }
  };

  return (
    <>
      <CyDModalLayout
        setModalVisible={setModalVisible}
        isModalVisible={isModalVisible}
        style={styles.modalLayout}>
        <ChainSelectionModal
          isModalVisible={chainModalVisible}
          setModalVisible={setChainModalVisible}
          chainData={chainData}
          selectedChain={selectedChain}
          setSelectedChain={setSelectedChain}
          onChainSelect={() => {
            // Any additional logic needed after chain selection
          }}
        />

        <CyDView className={'bg-[#F1F3F5] border-1 rounded-t-[16px] h-[80%]'}>
          <CyDView className=''>
            <CyDTouchView
              onPress={() => {
                setModalVisible(false);
              }}
              className={'absolute z-[50] top-[20px] right-[24px]'}>
              <CyDImage
                source={AppImages.CLOSE}
                className={' w-[20px] h-[20px] '}
              />
            </CyDTouchView>
            <CyDText
              className={
                'text-center pt-[24px] pb-[8px] text-[22px] font-nunito font-bold '
              }>
              {'Select Token'}
            </CyDText>

            <CyDView className='flex flex-row items-center justify-evenly py-[12px]'>
              {(() => {
                const displayChains = [...chainData];
                const selectedIndex = displayChains.findIndex(
                  chain => chain.chainId === selectedChain?.chainId,
                );

                if (selectedIndex >= 5) {
                  const _selected = displayChains[selectedIndex];
                  displayChains.splice(selectedIndex, 1);
                  displayChains.unshift(_selected);
                }

                return displayChains.slice(0, 5).map((chain, index) => (
                  <CyDTouchView
                    onPress={() => setSelectedChain(chain)}
                    key={chain.chainId}
                    className={clsx('p-[10px] rounded-[8px] bg-n0', {
                      'bg-p20': selectedChain?.chainId === chain.chainId,
                    })}>
                    {endsWith(chain.logoUrl, '.svg') ? (
                      <SvgUri
                        width='36'
                        height='36'
                        className='rounded-full'
                        uri={chain.logoUrl ?? ''}
                      />
                    ) : (
                      <CyDFastImage
                        source={
                          isString(chain.logoUrl)
                            ? { uri: chain.logoUrl ?? '' }
                            : chain.logoUrl
                        }
                        className='w-[36px] h-[36px] rounded-full'
                      />
                    )}
                  </CyDTouchView>
                ));
              })()}

              {chainData.length > 5 && (
                <CyDTouchView
                  onPress={() => setChainModalVisible(true)}
                  className='p-[10px] rounded-[8px] bg-n0'>
                  <CyDView className='w-[40px] h-[40px] rounded-full bg-[#E6E6E6] items-center justify-center'>
                    <CyDText className='text-[12px] font-medium'>
                      +{chainData.length - 5}
                    </CyDText>
                  </CyDView>
                </CyDTouchView>
              )}
            </CyDView>
          </CyDView>

          <CyDView className='bg-n0 p-[12px] flex-1'>
            <CyDView
              className={clsx(
                'my-[16px] flex flex-row justify-between items-center self-center border-[1px] w-full rounded-[8px] px-[12px] py-[0px] border-n50',
              )}>
              <CyDTextInput
                className={clsx('self-center py-[12px] w-[95%] text-base400')}
                value={searchText}
                autoCapitalize='none'
                autoCorrect={false}
                onChangeText={handleSearchTextChange}
                placeholderTextColor={'#6B788E'}
                placeholder='Search Token'
              />
            </CyDView>

            <CyDFlatList
              data={filteredData}
              renderItem={({ item }: any) => (
                <RenderToken
                  item={item}
                  selected={selected}
                  setSelected={setSelected}
                  setModalVisible={setModalVisible}
                  type={type}
                />
              )}
              // className='mb-[150px]'
              showsVerticalScrollIndicator={true}
            />
          </CyDView>
        </CyDView>
      </CyDModalLayout>
    </>
  );
}

interface ChainSelectionModalProps {
  isModalVisible: boolean;
  setModalVisible: (visible: boolean) => void;
  chainData: SwapBridgeChainData[];
  selectedChain: SwapBridgeChainData;
  setSelectedChain: Dispatch<SetStateAction<SwapBridgeChainData>>;
  onChainSelect: () => void;
}

function ChainSelectionModal({
  isModalVisible,
  setModalVisible,
  chainData,
  selectedChain,
  setSelectedChain,
  onChainSelect,
}: ChainSelectionModalProps) {
  return (
    <CyDModalLayout
      backdropOpacity={0.7}
      backdropTransitionInTiming={300}
      backdropTransitionOutTiming={300}
      hideModalContentWhileAnimating={true}
      useNativeDriver={true}
      setModalVisible={setModalVisible}
      isModalVisible={isModalVisible}
      style={styles.chainModalLayout}>
      <CyDView className='bg-[#F1F3F5] border-1 rounded-[16px] h-[72%] pb-[20px]'>
        <CyDTouchView
          onPress={() => setModalVisible(false)}
          className='absolute z-[50] top-[20px] right-[24px]'>
          <CyDImage source={AppImages.CLOSE} className='w-[20px] h-[20px]' />
        </CyDTouchView>

        <CyDText className='text-center pt-[24px] pb-[14px] text-[22px] font-nunito font-bold'>
          Select Chain
        </CyDText>

        <CyDScrollView className='rounded-[36px] px-[17px]'>
          <CyDView
            className={clsx(
              'flex flex-wrap flex-row items-start justify-evenly',
              {},
            )}>
            {chainData?.map((item, index) => (
              <CyDTouchView
                onPress={() => {
                  setSelectedChain(item);
                  onChainSelect();
                  setModalVisible(false);
                }}
                key={index}
                className={clsx(
                  'border-[1px] border-[#E6E6E6] rounded-[6px] flex flex-col items-center justify-center bg-n0 h-[74px] w-[90px] mb-[12px]',
                  {
                    'bg-20': selectedChain?.chainId === item.chainId,
                  },
                )}>
                <CyDView className='flex flex-col items-center h-[50px] w-[46px]'>
                  {endsWith(item?.logoUrl, '.svg') ? (
                    <SvgUri
                      width='32'
                      height='32'
                      uri={item.logoUrl ?? ''}
                      className='rounded-full'
                    />
                  ) : (
                    <CyDFastImage
                      source={
                        isString(item.logoUrl)
                          ? { uri: item.logoUrl ?? '' }
                          : item.logoUrl
                      }
                      className='w-[32px] h-[32px] rounded-full'
                    />
                  )}
                  <CyDText className='text-[10px] mt-[6px] font-normal text-center w-[60px]'>
                    {capitalize(item.prettyName.split(' ')[0])}
                  </CyDText>
                </CyDView>
              </CyDTouchView>
            ))}
          </CyDView>
        </CyDScrollView>
      </CyDView>
    </CyDModalLayout>
  );
}

export default function TokenSelectionV2({
  selectedFromChain,
  setSelectedFromChain,
  fromChainData,
  selectedFromToken,
  setSelectedFromToken,
  fromTokenData,
  selectedToChain,
  setSelectedToChain,
  toChainData,
  selectedToToken,
  setSelectedToToken,
  toTokenData,
  cryptoAmount,
  usdAmount,
  setCryptoAmount,
  setUsdAmount,
  amountOut,
  usdAmountOut,
  onClickMax,
  onToggle,
  loading,
}: {
  selectedFromChain: SwapBridgeChainData | null;
  setSelectedFromChain: Dispatch<SetStateAction<SwapBridgeChainData | null>>;
  fromChainData: SwapBridgeChainData[];
  selectedFromToken: SwapBridgeTokenData | null;
  setSelectedFromToken: Dispatch<SetStateAction<SwapBridgeTokenData | null>>;
  fromTokenData: SwapBridgeTokenData[];
  selectedToChain: SwapBridgeChainData | null;
  setSelectedToChain: Dispatch<SetStateAction<SwapBridgeChainData | null>>;
  toChainData: SwapBridgeChainData[];
  selectedToToken: SwapBridgeTokenData | null;
  setSelectedToToken: Dispatch<SetStateAction<SwapBridgeTokenData | null>>;
  toTokenData: SwapBridgeTokenData[];
  cryptoAmount: string;
  usdAmount: string;
  setCryptoAmount: Dispatch<SetStateAction<string>>;
  setUsdAmount: Dispatch<SetStateAction<string>>;
  amountOut: string;
  usdAmountOut: string;
  onClickMax: () => void;
  onToggle: () => void;
  loading: boolean;
}) {
  const [fromTokenModalVisible, setFromTokenModalVisible] =
    useState<boolean>(false);
  const [toTokenModalVisible, setToTokenModalVisible] =
    useState<boolean>(false);

  return (
    <CyDView className={''}>
      <ChooseTokenModal
        setModalVisible={setFromTokenModalVisible}
        isModalVisible={fromTokenModalVisible}
        data={fromTokenData}
        setSelected={
          setSelectedFromToken as Dispatch<SetStateAction<SwapBridgeTokenData>>
        }
        selected={selectedFromToken as SwapBridgeTokenData}
        selectedChain={selectedFromChain as SwapBridgeChainData}
        setSelectedChain={
          setSelectedFromChain as Dispatch<SetStateAction<SwapBridgeChainData>>
        }
        chainData={fromChainData}
        type={'from'}
      />
      <ChooseTokenModal
        setModalVisible={setToTokenModalVisible}
        isModalVisible={toTokenModalVisible}
        data={toTokenData}
        setSelected={
          setSelectedToToken as Dispatch<SetStateAction<SwapBridgeTokenData>>
        }
        selected={selectedToToken as SwapBridgeTokenData}
        selectedChain={selectedToChain as SwapBridgeChainData}
        setSelectedChain={
          setSelectedToChain as Dispatch<SetStateAction<SwapBridgeChainData>>
        }
        chainData={toChainData}
        type={'to'}
      />

      <CyDView className='mt-[24px]'>
        <CyDView className='mx-[16px] bg-n0 rounded-[8px] p-[12px]'>
          <CyDText className='text-center font-medium'>
            {t('BIRDGE_SWAP_AVAILABLE')}{' '}
          </CyDText>
        </CyDView>
        <CyDView className='mx-[16px] mt-[16px] bg-n0 rounded-[8px] p-[12px]'>
          <CyDView className='flex flex-row justify-between items-center mb-[12px]'>
            <CyDText className='text-[14px] font-medium'>{t('FROM')}</CyDText>
            <CyDTouchView
              onPress={onClickMax}
              className='flex flex-row items-center'>
              <CyDText className='text-[14px] font-normal'>
                {get(selectedFromToken, 'balance', 0)?.toFixed(6)}
              </CyDText>
              <CyDView className='bg-[#EBEDF0] py-[4px] px-[9px] rounded-[4px] ml-[12px]'>
                <CyDText className='text-[10px] font-bold'>{t('MAX')}</CyDText>
              </CyDView>
            </CyDTouchView>
          </CyDView>

          <CyDView className='flex flex-row justify-between items-center'>
            <CyDView className='flex flex-col items-start w-[60%]'>
              <CyDTextInput
                className={clsx(
                  'font-semibold text-start  font-nunito text-[30px] w-[100%] p-[4px] ',
                )}
                keyboardType='numeric'
                onChangeText={text => {
                  setCryptoAmount(text);
                  setUsdAmount(
                    String(Number(text) * Number(selectedFromToken?.price)),
                  );
                }}
                returnKeyType='done'
                placeholder='0.0'
                value={cryptoAmount}
                autoFocus={true}
                onSubmitEditing={() => {
                  Keyboard.dismiss();
                }}
              />

              <CyDText
                className={clsx(
                  'font-semibold text-center  font-nunito text-[12px]',
                )}>
                {`$${Number(usdAmount).toFixed(6)}`}
              </CyDText>
            </CyDView>
            <CyDTouchView
              className='w-[40%]'
              onPress={() => {
                setFromTokenModalVisible(true);
              }}>
              <CyDView className='flex flex-row items-center justify-end'>
                <CyDView className={' relative'}>
                  <CyDView className={'flex flex-row items-center'}>
                    {endsWith(selectedFromToken?.logoUrl, '.svg') ? (
                      <SvgUri
                        width='40'
                        height='40'
                        className='mr-[18px] rounded-full'
                        uri={selectedFromToken?.logoUrl ?? ''}
                      />
                    ) : (
                      <CyDFastImage
                        source={
                          isString(selectedFromToken?.logoUrl)
                            ? { uri: selectedFromToken.logoUrl ?? '' }
                            : selectedFromToken?.logoUrl
                        }
                        className={'w-[48px] h-[48px] mr-[18px] rounded-full'}
                      />
                    )}
                  </CyDView>
                  <CyDView className='absolute right-[8px] bottom-0 '>
                    <CyDView className={'flex flex-row items-center '}>
                      {endsWith(selectedFromChain?.logoUrl, '.svg') ? (
                        <SvgUri
                          width='20'
                          height='20'
                          className='mr-[8px] border border-white rounded-full'
                          uri={selectedFromChain?.logoUrl ?? ''}
                        />
                      ) : (
                        <CyDFastImage
                          source={
                            isString(selectedFromChain?.logoUrl)
                              ? { uri: selectedFromChain.logoUrl ?? '' }
                              : selectedFromChain?.logoUrl
                          }
                          className={
                            'w-[20px] h-[20px] mr-[8px] border border-white rounded-full'
                          }
                        />
                      )}
                    </CyDView>
                  </CyDView>
                </CyDView>
                <CyDImage source={AppImages.DOWN_ARROW} />
              </CyDView>
            </CyDTouchView>
          </CyDView>

          <CyDView className='flex flex-row items-center justify-between'>
            <CyDView className='bg-[#DFE2E6] h-[1px] w-[45%] my-[24px]' />
            <CyDTouchView onPress={onToggle}>
              <CyDImage
                source={AppImages.CIRCULAR_ARROWS_ICON}
                className='p-[3px] h-[32px] w-[32px] rounded-full'
              />
            </CyDTouchView>
            <CyDView className='bg-[#DFE2E6] h-[1px] w-[45%] my-[24px]' />
          </CyDView>

          <CyDView className='flex flex-row justify-between items-center mb-[12px]'>
            <CyDText className='text-[14px] font-medium'>{t('TO')}</CyDText>
          </CyDView>

          <CyDView className='flex flex-row justify-between items-center'>
            <CyDView className='flex flex-col items-start'>
              <CyDSkeleton width={100} height={30} value={!loading}>
                <CyDText
                  className={clsx(
                    'font-semibold text-center font-nunito text-[30px]',
                  )}>
                  {Number(amountOut).toFixed(6)}
                </CyDText>
              </CyDSkeleton>
              <CyDSkeleton
                width={100}
                height={20}
                value={!loading}
                className='mt-[8px]'>
                <CyDText
                  className={clsx(
                    'font-semibold text-center font-nunito text-[12px]',
                  )}>
                  {`$${Number(usdAmountOut).toFixed(6)}`}
                </CyDText>
              </CyDSkeleton>
            </CyDView>
            <CyDTouchView
              onPress={() => {
                setToTokenModalVisible(true);
              }}>
              <CyDView className='flex flex-row items-center'>
                <CyDView className={' relative'}>
                  <CyDView className={'flex flex-row items-center'}>
                    {endsWith(selectedToToken?.logoUrl, '.svg') ? (
                      <SvgUri
                        width='40'
                        height='40'
                        className='mr-[18px] rounded-full'
                        uri={selectedToToken?.logoUrl ?? ''}
                      />
                    ) : (
                      <CyDFastImage
                        source={
                          isString(selectedToToken?.logoUrl)
                            ? { uri: selectedToToken.logoUrl ?? '' }
                            : selectedToToken?.logoUrl
                        }
                        className={'w-[48px] h-[48px] mr-[18px] rounded-full'}
                      />
                    )}
                  </CyDView>
                  <CyDView className='absolute right-[8px] bottom-0'>
                    {endsWith(selectedToChain?.logoUrl, '.svg') ? (
                      <SvgUri
                        width='20'
                        height='20'
                        className='mr-[8px] border border-white rounded-full'
                        uri={selectedToChain?.logoUrl ?? ''}
                      />
                    ) : (
                      <CyDFastImage
                        source={
                          isString(selectedToChain?.logoUrl)
                            ? { uri: selectedToChain.logoUrl ?? '' }
                            : selectedToChain?.logoUrl
                        }
                        className={
                          'w-[20px] h-[20px] mr-[8px] border border-white rounded-full'
                        }
                      />
                    )}
                  </CyDView>
                </CyDView>
                <CyDImage source={AppImages.DOWN_ARROW} />
              </CyDView>
            </CyDTouchView>
          </CyDView>
        </CyDView>
      </CyDView>
    </CyDView>
  );
}

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  chainModalLayout: {
    marginBottom: 32,
    marginHorizontal: 12,
    zIndex: 1000,
    justifyContent: 'flex-end',
  },
});
