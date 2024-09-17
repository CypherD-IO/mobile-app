import React, { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { SkipApiChainInterface } from '../../models/skipApiChains.interface';
import { SkipApiToken } from '../../models/skipApiTokens.interface';
import {
  CyDFastImage,
  CyDFlatList,
  CyDImage,
  CyDInputAccessoryView,
  CyDScrollView,
  CyDText,
  CyDTextInput,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindStyles';
import clsx from 'clsx';
import { capitalize, endsWith, get, isString } from 'lodash';
import { SvgUri } from 'react-native-svg';
import AppImages from '../../../assets/images/appImages';
import CyDModalLayout from '../../components/v2/modal';
import {
  Animated,
  Dimensions,
  InputAccessoryView,
  Keyboard,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Colors } from '../../constants/theme';
import Fuse from 'fuse.js';
import Loading from '../../components/v2/loading';
import { t } from 'i18next';
import { verticalScale } from 'react-native-size-matters';
import Accordion from 'react-native-collapsible/Accordion';
import { SwapBridgeChainData, SwapBridgeTokenData } from '.';
import { gasFeeReservation } from '../../constants/data';

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
              className={'w-[28px] h-[28px] mr-[18px]'}
            />
          )}
          <CyDText
            className={'text-black text-[18px] font-nunito font-regular'}>
            {item.recommendedSymbol}
          </CyDText>
        </CyDView>

        {item.recommendedSymbol === selected?.recommendedSymbol && (
          <CyDImage
            source={AppImages.CORRECT}
            className={'w-[16px] h-[12px] ml-[16px]'}
            // eslint-disable-next-line react-native/no-inline-styles
            style={{ tintColor: '#58ADAB' }}
          />
        )}
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
  const [hasText, setHasText] = useState(false);
  const [searchText, setSearchText] = useState<string>('');
  const [filteredData, setFilteredData] = useState<
    SwapBridgeChainData[] | SwapBridgeTokenData[]
  >(data);
  const [rotateAnimation] = useState(new Animated.Value(0));
  const [activeSections, setActiveSections] = useState([]);

  const handleClearSearch = () => {
    setSearchText('');
    searchTokens('');
    setHasText(false);
  };
  const handleSearchTextChange = (text: string) => {
    setSearchText(text);
    searchTokens(text);
    setHasText(text.trim().length > 0);
  };

  useEffect(() => {
    setFilteredData(data);

    return () => {
      handleClearSearch();
    };
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
      // Ensure to trim whitespace
      const filteredTokens = fuse.search(tokenName).map(token => token.item);
      setFilteredData(filteredTokens);
    } else {
      setFilteredData(data);
    }
  };

  const interpolateRotating = rotateAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const animatedStyle = {
    transform: [
      {
        rotate: interpolateRotating,
      },
    ],
    height: verticalScale(18),
    width: 14,
    resizeMode: 'contain',
  };

  const handleAnimation = (toValue: number) => {
    Animated.timing(rotateAnimation, {
      toValue,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const setSections = (sections: any) => {
    setActiveSections(sections.includes(undefined) ? [] : sections);
    if (sections.length) handleAnimation(1);
    else handleAnimation(0);
  };

  const renderHeader = (name: string, index: number, isActive: boolean) => {
    return (
      <CyDView
        className={clsx(
          'flex flex-row justify-between items-center w-[100%] p-[12px]',
          { 'border-b-[1px] border-sepratorColor': isActive },
        )}
        key={index}>
        <CyDView className='flex flex-row gap-x-[8px] items-center'>
          {endsWith(selectedChain?.logoUrl, '.svg') ? (
            <SvgUri
              width='32'
              height='32'
              className='mr-[18px] rounded-full'
              uri={selectedChain.logoUrl ?? ''}
            />
          ) : (
            <CyDFastImage
              source={
                isString(selectedChain?.logoUrl)
                  ? { uri: selectedChain?.logoUrl ?? '' }
                  : selectedChain?.logoUrl
              }
              className='w-[32px] h-[32px] rounded-full'
            />
          )}
          <CyDText>{capitalize(selectedChain?.chainName)}</CyDText>
        </CyDView>
        <Animated.Image
          style={isActive ? (animatedStyle as any) : ''}
          source={AppImages.UP_ARROW}
        />
      </CyDView>
    );
  };
  const renderContent = () => {
    const { width, height } = Dimensions.get('window');
    return (
      <CyDScrollView className='h-[240px]'>
        <CyDView
          className={clsx(
            'flex flex-wrap flex-row items-start justify-between py-[24px] px-[8px] gap-[8px] w-full',
            {
              'px-[10px] gap-[20px]': width >= 428 && height >= 926,
            },
          )}>
          {chainData?.map((item, index) => {
            if (endsWith(item?.logoUrl, '.svg'))
              return (
                <CyDTouchView
                  onPress={() => {
                    setActiveSections([]);
                    setSelectedChain(item);
                  }}
                  key={index}
                  className={clsx(
                    'border-[1px] border-[#E6E6E6] rounded-[12px] p-[12px] flex flex-col items-center justify-center',
                    {
                      'bg-appColor': selectedChain?.chainId === item.chainId,
                    },
                  )}>
                  <SvgUri
                    width='50'
                    height='24'
                    uri={item.logoUrl ?? ''}
                    className='rounded-full'
                  />
                  <CyDText className='text-[10px] mt-[6px]'>
                    {capitalize(item.chainName)}
                  </CyDText>
                </CyDTouchView>
              );
            else
              return (
                <CyDTouchView
                  onPress={() => {
                    setActiveSections([]);
                    setSelectedChain(item);
                  }}
                  key={index}
                  className={clsx(
                    'border-[1px] border-[#E6E6E6] rounded-[12px] p-[8px] flex flex-col items-center justify-center w-[75px]',
                    {
                      'bg-appColor': selectedChain?.chainId === item.chainId,
                    },
                  )}>
                  <CyDFastImage
                    source={
                      isString(item.logoUrl)
                        ? { uri: item.logoUrl ?? '' }
                        : item.logoUrl
                    }
                    className='w-[32px] h-[32px] rounded-full'
                  />
                  <CyDText className='text-[10px] mt-[6px]'>
                    {capitalize(item.chainName)}
                  </CyDText>
                </CyDTouchView>
              );
          })}
        </CyDView>
      </CyDScrollView>
    );
  };

  return (
    <CyDModalLayout
      setModalVisible={setModalVisible}
      isModalVisible={isModalVisible}
      style={styles.modalLayout}>
      <CyDView
        className={
          'bg-white border-1 rounded-t-[36px] border-[#E6E6E6] p-[12px] pb-[22px] h-[80%] relative'
        }>
        <CyDTouchView
          onPress={() => {
            handleClearSearch();
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
            'text-center pt-[24px] pb-[14px] text-[22px] font-nunito font-bold '
          }>
          {'Select Token'}
        </CyDText>

        <CyDView className='mb-0 mx-[8px]'>
          <Accordion
            align='bottom'
            activeSections={activeSections}
            sections={['']}
            touchableComponent={TouchableOpacity}
            expandMultiple={false}
            renderHeader={renderHeader}
            renderContent={renderContent}
            duration={400}
            onChange={setSections}
            renderAsFlatList={false}
            sectionContainerStyle={styles.sectionContainerSendTo}
          />
        </CyDView>

        <CyDView
          className={clsx(
            'my-[16px] flex flex-row justify-between items-center self-center border-[0.5px] w-[353px] h-[60px] rounded-[8px] px-[20px] border-sepratorColor',
            {
              'border-[#434343]': hasText,
            },
          )}>
          <CyDTextInput
            className={clsx(
              'self-center py-[15px] w-[95%] text-textInputBackground',
              {
                'text-textInputFocussedBackground': hasText,
              },
            )}
            value={searchText}
            autoCapitalize='none'
            autoCorrect={false}
            onChangeText={handleSearchTextChange}
            onFocus={() => setHasText(searchText.trim().length > 0)} // Update hasText on focus
            onBlur={() => setHasText(false)} // Reset hasText on blur
            placeholderTextColor={hasText ? '#434343' : '#C5C5C5'}
            placeholder='Search Token'
          />
          {hasText ? (
            <CyDTouchView onPress={handleClearSearch}>
              <CyDImage className={''} source={AppImages.CLOSE_CIRCLE} />
            </CyDTouchView>
          ) : (
            <></>
          )}
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
          showsVerticalScrollIndicator={true}
        />
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
        <CyDView className='mx-[16px] bg-white rounded-[8px] p-[12px]'>
          <CyDText className='text-center font-medium'>
            {t('BIRDGE_SWAP_AVAILABLE')}{' '}
          </CyDText>
        </CyDView>
        <CyDView className='mx-[16px] mt-[16px] bg-white rounded-[8px] p-[12px]'>
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
              <CyDText
                className={clsx(
                  'font-semibold text-center  font-nunito text-[30px]',
                )}>
                {Number(amountOut).toFixed(6)}
              </CyDText>
              <CyDText
                className={clsx(
                  'font-semibold text-center  font-nunito text-[12px]',
                )}>
                {`$${Number(usdAmountOut).toFixed(6)}`}
              </CyDText>
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

  sectionContainerSendTo: {
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: Colors.sepratorColor,
    borderRadius: 8,
    marginBottom: 0,
  },
});
