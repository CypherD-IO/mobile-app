import React, { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { SkipApiChainInterface } from '../../models/skipApiChains.interface';
import { SkipApiToken } from '../../models/skipApiTokens.interface';
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
import clsx from 'clsx';
import { capitalize, endsWith, get } from 'lodash';
import { SvgUri } from 'react-native-svg';
import AppImages from '../../../assets/images/appImages';
import CyDModalLayout from '../../components/v2/modal';
import { Animated, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../../constants/theme';
import Fuse from 'fuse.js';
import Loading from '../../components/v2/loading';
import { t } from 'i18next';
import { verticalScale } from 'react-native-size-matters';
import Accordion from 'react-native-collapsible/Accordion';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

function RenderToken({
  item,
  selected,
  setSelected,
  setModalVisible,
}: {
  item: SkipApiToken;
  selected: SkipApiToken;
  setSelected: Dispatch<SetStateAction<SkipApiToken>>;
  setModalVisible: Dispatch<SetStateAction<boolean>>;
}) {
  return (
    <CyDTouchView
      key={item.chain_id}
      className={clsx(
        'flex flex-row py-[12px] px-[24px] items-center justify-between',
        {
          'bg-[#58ADAB17] rounded-[18px]':
            item.recommended_symbol === selected.recommended_symbol,
        },
      )}
      onPress={() => {
        setModalVisible(false);
        setSelected(item);
      }}>
      <CyDView className={'flex flex-row items-center'}>
        <CyDView className={'flex flex-row items-center '}>
          {endsWith(item.logo_uri, '.svg') ? (
            <SvgUri
              width='28'
              height='28'
              className='w-[28px] h-[28px] mr-[18px]'
              uri={item.logo_uri}
            />
          ) : (
            <CyDFastImage
              source={{
                uri: item.logo_uri,
              }}
              className={'w-[28px] h-[28px] mr-[18px]'}
            />
          )}
          <CyDText
            className={'text-black text-[18px] font-nunito font-regular'}>
            {item.recommended_symbol}
          </CyDText>
        </CyDView>

        {item.recommended_symbol === selected.recommended_symbol && (
          <CyDImage
            source={AppImages.CORRECT}
            className={'w-[16px] h-[12px] ml-[16px]'}
            // eslint-disable-next-line react-native/no-inline-styles
            style={{ tintColor: '#58ADAB' }}
          />
        )}
      </CyDView>

      <CyDView>
        <CyDText
          className={'font-semibold text-subTextColor text-[16px] text-right'}>
          {new Intl.NumberFormat('en-US', {
            maximumSignificantDigits: 4,
          }).format(item.balanceInNumbers ?? 0)}
        </CyDText>
        <CyDText
          className={
            'font-semibold text-subTextColor text-[12px] text-right mr-[2px]'
          }>
          {currencyFormatter.format(item.totalValue ?? 0)}
        </CyDText>
      </CyDView>
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
}: {
  isModalVisible: boolean;
  setModalVisible: Dispatch<SetStateAction<boolean>>;
  data: SkipApiToken[];
  selected: SkipApiToken;
  setSelected: Dispatch<SetStateAction<SkipApiToken>>;
  selectedChain: SkipApiChainInterface;
  setSelectedChain: Dispatch<SetStateAction<SkipApiChainInterface>>;
  chainData: SkipApiChainInterface[];
}) {
  const [hasText, setHasText] = useState(false);
  const [searchText, setSearchText] = useState<string>('');
  const [filteredData, setFilteredData] = useState<
    SkipApiChainInterface[] | SkipApiToken[]
  >(data);
  const [rotateAnimation] = useState(new Animated.Value(0));
  const [activeSections, setActiveSections] = useState([]);

  useEffect(() => {
    setFilteredData(data);

    return () => {
      handleClearSearch();
    };
  }, [data]);

  if (!data) return <Loading />;

  const searchOptions = {
    isCaseSensitive: false,
    includeScore: true,
    shouldSort: true,
    threshold: 0.1,
    keys: ['chain_name', 'recommended_symbol'],
  };
  const fuse = new Fuse(data, searchOptions);

  const searchTokens = (tokenName: string) => {
    if (tokenName !== '') {
      const filteredTokens = fuse.search(tokenName).map(token => {
        return token.item;
      });
      setFilteredData(filteredTokens);
    } else {
      setFilteredData(data);
    }
  };

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
          {endsWith(selectedChain?.logo_uri, '.svg') ? (
            <SvgUri
              width='32'
              height='32'
              className='mr-[18px] rounded-full'
              uri={selectedChain.logo_uri ?? ''}
            />
          ) : (
            <CyDFastImage
              source={{ uri: selectedChain.logo_uri }}
              className='w-[32px] h-[32px] rounded-full'
            />
          )}
          <CyDText>{capitalize(selectedChain.chain_name)}</CyDText>
        </CyDView>
        <Animated.Image
          style={isActive ? animatedStyle : ''}
          source={AppImages.UP_ARROW}
        />
      </CyDView>
    );
  };
  const renderContent = () => {
    return (
      <CyDScrollView className='h-[240px]'>
        <CyDView className='flex flex-row py-[24px] px-[6px] flex-wrap gap-[12px] items-center justify-between  '>
          {chainData.map((item, index) => {
            if (endsWith(item?.logo_uri, '.svg'))
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
                      'bg-appColor': selectedChain.chain_id === item.chain_id,
                    },
                  )}>
                  <SvgUri
                    width='32'
                    height='32'
                    uri={item.logo_uri ?? ''}
                    className='rounded-full'
                  />
                  <CyDText className='text-[10px] mt-[6px]'>
                    {capitalize(item.chain_name)}
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
                      'bg-appColor': selectedChain.chain_id === item.chain_id,
                    },
                  )}>
                  <CyDFastImage
                    source={{ uri: item.logo_uri }}
                    className='w-[32px] h-[32px] rounded-full'
                  />
                  <CyDText className='text-[10px] mt-[6px]'>
                    {capitalize(item.chain_name)}
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
            'text-center pt-[24px] pb-[14px] text-[22px] font-nunito font-bold text-primaryTextColor'
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
            />
          )}
          showsVerticalScrollIndicator={true}
        />
      </CyDView>
    </CyDModalLayout>
  );
}

export default function TokenSelection({
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
  amountOut,
  usdAmountOut,
}: {
  selectedFromChain: SkipApiChainInterface | null;
  setSelectedFromChain: Dispatch<SetStateAction<SkipApiChainInterface | null>>;
  fromChainData: SkipApiChainInterface[];
  selectedFromToken: SkipApiToken | null;
  setSelectedFromToken: Dispatch<SetStateAction<SkipApiToken | null>>;
  fromTokenData: SkipApiToken[];
  selectedToChain: SkipApiChainInterface | null;
  setSelectedToChain: Dispatch<SetStateAction<SkipApiChainInterface | null>>;
  toChainData: SkipApiChainInterface[];
  selectedToToken: SkipApiToken | null;
  setSelectedToToken: Dispatch<SetStateAction<SkipApiToken | null>>;
  toTokenData: SkipApiToken[];
  cryptoAmount: string;
  usdAmount: string;
  setCryptoAmount: Dispatch<SetStateAction<string>>;
  amountOut: string;
  usdAmountOut: string;
}) {
  const [fromTokenModalVisible, setFromTokenModalVisible] =
    useState<boolean>(false);
  const [toTokenModalVisible, setToTokenModalVisible] =
    useState<boolean>(false);

  const onToggle = () => {
    const oldFromChain = selectedFromChain;
    const oldFromToken = selectedFromToken;
    const oldToChain = selectedToChain;
    const oldToToken = selectedToToken;

    setSelectedFromChain(oldToChain);
    setSelectedFromToken(oldToToken);
    setSelectedToChain(oldFromChain);
    setSelectedToToken(oldFromToken);
  };

  return (
    <CyDScrollView className={''}>
      <ChooseTokenModal
        setModalVisible={setFromTokenModalVisible}
        isModalVisible={fromTokenModalVisible}
        data={fromTokenData}
        setSelected={
          setSelectedFromToken as Dispatch<SetStateAction<SkipApiToken>>
        }
        selected={selectedFromToken as SkipApiToken}
        selectedChain={selectedFromChain as SkipApiChainInterface}
        setSelectedChain={
          setSelectedFromChain as Dispatch<
            SetStateAction<SkipApiChainInterface>
          >
        }
        chainData={fromChainData}
      />
      <ChooseTokenModal
        setModalVisible={setToTokenModalVisible}
        isModalVisible={toTokenModalVisible}
        data={toTokenData}
        setSelected={
          setSelectedToToken as Dispatch<SetStateAction<SkipApiToken>>
        }
        selected={selectedToToken as SkipApiToken}
        selectedChain={selectedToChain as SkipApiChainInterface}
        setSelectedChain={
          setSelectedToChain as Dispatch<SetStateAction<SkipApiChainInterface>>
        }
        chainData={toChainData}
      />

      <CyDView className='mt-[24px]'>
        <CyDView className='m-[16px] bg-white rounded-[8px] p-[12px]'>
          <CyDView className='flex flex-row justify-between items-center mb-[12px]'>
            <CyDText className='text-[14px] font-medium'>{t('FROM')}</CyDText>
            <CyDText className='text-[14px] font-normal'>
              {get(selectedFromToken, 'balanceInNumbers', 0)?.toFixed(6)}
            </CyDText>
          </CyDView>

          <CyDView className='flex flex-row justify-between items-center'>
            <CyDView className='flex flex-col items-start'>
              <CyDTextInput
                className={clsx(
                  'font-semibold text-center text-primaryTextColor font-nunito text-[20px]',
                )}
                keyboardType='numeric'
                onChangeText={text => {
                  setCryptoAmount(text);
                }}
                // placeholder='0.0'
                value={cryptoAmount}
                autoFocus={true}
                // ref={input => {
                //   enterAmountRef = input;
                // }}
              />
              <CyDText
                className={clsx(
                  'font-semibold text-center text-primaryTextColor font-nunito text-[12px]',
                )}>
                {`$${usdAmount}`}
              </CyDText>
            </CyDView>
            <CyDTouchView
              onPress={() => {
                setFromTokenModalVisible(true);
              }}>
              <CyDView className='flex flex-row items-center'>
                <CyDView className={' relative'}>
                  <CyDView className={'flex flex-row items-center'}>
                    {endsWith(selectedFromChain?.logo_uri, '.svg') ? (
                      <SvgUri
                        width='48'
                        height='48'
                        className='mr-[18px] rounded-full'
                        uri={selectedFromChain?.logo_uri ?? ''}
                      />
                    ) : (
                      <CyDFastImage
                        source={{
                          uri: selectedFromChain?.logo_uri,
                        }}
                        className={'w-[48px] h-[48px] mr-[18px] rounded-full'}
                      />
                    )}
                  </CyDView>
                  <CyDView className='absolute right-[8px] bottom-0 '>
                    <CyDView className={'flex flex-row items-center '}>
                      {endsWith(selectedFromToken?.logo_uri, '.svg') ? (
                        <SvgUri
                          width='20'
                          height='20'
                          className='mr-[8px] border border-white rounded-full'
                          uri={selectedFromToken?.logo_uri ?? ''}
                        />
                      ) : (
                        <CyDFastImage
                          source={{
                            uri: selectedFromToken?.logo_uri,
                          }}
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
                  'font-semibold text-center text-primaryTextColor font-nunito text-[20px]',
                )}>
                {amountOut}
              </CyDText>
              <CyDText
                className={clsx(
                  'font-semibold text-center text-primaryTextColor font-nunito text-[12px]',
                )}>
                {`$${usdAmountOut}`}
              </CyDText>
            </CyDView>
            <CyDTouchView
              onPress={() => {
                setToTokenModalVisible(true);
              }}>
              <CyDView className='flex flex-row items-center'>
                <CyDView className={' relative'}>
                  <CyDView className={'flex flex-row items-center'}>
                    {endsWith(selectedToChain?.logo_uri, '.svg') ? (
                      <SvgUri
                        width='48'
                        height='48'
                        className='mr-[18px] rounded-full'
                        uri={selectedToChain?.logo_uri ?? ''}
                      />
                    ) : (
                      <CyDFastImage
                        source={{
                          uri: selectedToChain?.logo_uri,
                        }}
                        className={'w-[48px] h-[48px] mr-[18px] rounded-full'}
                      />
                    )}
                  </CyDView>
                  <CyDView className='absolute right-[8px] bottom-0'>
                    {endsWith(selectedToToken?.logo_uri, '.svg') ? (
                      <SvgUri
                        width='20'
                        height='20'
                        className='mr-[8px] border border-white rounded-full'
                        uri={selectedToToken?.logo_uri ?? ''}
                      />
                    ) : (
                      <CyDFastImage
                        source={{
                          uri: selectedToToken?.logo_uri,
                        }}
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
    </CyDScrollView>
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
