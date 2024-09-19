import clsx from 'clsx';
import Fuse from 'fuse.js';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dimensions, Keyboard, StyleSheet } from 'react-native';
import AppImages from '../../../assets/images/appImages';
import { TokenModalType } from '../../constants/enum';
import {
  CyDFastImage,
  CyDFlatList,
  CyDImage,
  CyDText,
  CyDTextInput,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindStyles';
import CyDModalLayout from './modal';
import CyDTokenAmount from './tokenAmount';
import CyDTokenValue from './tokenValue';
import { get } from 'lodash';
import { Holding } from '../../core/portfolio';
import { SwapToken } from '../../models/swapToken.interface';
import FastImage from 'react-native-fast-image';
import { copyToClipboard, isNativeToken } from '../../core/util';
import Toast from 'react-native-toast-message';
import { toastConfig } from './toast';
import { AUTO_LOAD_SUPPORTED_CHAINS } from '../../constants/server';
import usePortfolio from '../../hooks/usePortfolio';

interface TokenModal {
  tokenList?: Holding[];
  isChooseTokenModalVisible: boolean;
  minTokenValueLimit?: number;
  onSelectingToken: (token: Holding | SwapToken) => void;
  onCancel: () => void;
  noTokensAvailableMessage?: string;
  type?: TokenModalType;
  renderPage?: string;
}

export default function ChooseTokenModal(props: TokenModal) {
  const { t } = useTranslation();
  const {
    isChooseTokenModalVisible,
    tokenList,
    minTokenValueLimit = 0,
    onSelectingToken,
    onCancel,
    noTokensAvailableMessage = t<string>('FUND_TRANSFER'),
    type = TokenModalType.PORTFOLIO,
    renderPage = '',
  } = props;
  const { getLocalPortfolio } = usePortfolio();
  const [searchText, setSearchText] = useState<string>('');
  const [totalHoldings, setTotalHoldings] = useState<Record<string, Holding[]>>(
    {
      originalHoldings: [],
      filteredHoldings: [],
    },
  );
  const searchOptions = {
    isCaseSensitive: false,
    includeScore: true,
    shouldSort: true,
    threshold: 0.1,
    keys: ['name', 'symbol'],
  };
  const fuse = new Fuse(totalHoldings.originalHoldings, searchOptions);

  useEffect(() => {
    if (isChooseTokenModalVisible) {
      void fetchTotalHoldings();
    }
  }, [isChooseTokenModalVisible, tokenList]);

  const fetchTotalHoldings = async () => {
    if (!tokenList) {
      const localPortfolio = await getLocalPortfolio();
      console.log(localPortfolio.totalHoldings);
      const valuedTokens = localPortfolio.totalHoldings.filter(
        token => token.isVerified,
      );
      console.log('valuedTokens:', valuedTokens);
      valuedTokens.sort(sortDescTokenData);
      setTotalHoldings({
        originalHoldings: valuedTokens,
        filteredHoldings: valuedTokens,
      });
    } else {
      setTotalHoldings({
        originalHoldings: tokenList,
        filteredHoldings: tokenList,
      });
    }
  };

  const sortDescTokenData = (tokenA: Holding, tokenB: Holding) => {
    const totalValueA = get(tokenA, 'totalValue');
    const totalValueB = get(tokenB, 'totalValue');
    const isFundableA = get(tokenA, 'isFundable');
    const isFundableB = get(tokenB, 'isFundable');
    if (isFundableA && !isFundableB) {
      return -1;
    } else if (isFundableB && !isFundableA) {
      return 1;
    } else if (!isFundableA && !isFundableB) {
      return 0;
    } else if (totalValueA < totalValueB) {
      return 1;
    } else {
      return -1;
    }
  };

  const searchTokens = (tokenName: string) => {
    if (tokenName !== '') {
      const filteredTokens = fuse.search(tokenName).map(token => token.item);
      setTotalHoldings({ ...totalHoldings, filteredHoldings: filteredTokens });
    } else {
      setTotalHoldings({
        ...totalHoldings,
        filteredHoldings: totalHoldings.originalHoldings,
      });
    }
  };
  const isTokenDisabled = (
    totalValue: number,
    isFundable: boolean,
    isSwapable: boolean,
  ) => {
    if (renderPage === 'fundCardPage') {
      return totalValue < minTokenValueLimit || !isFundable;
    } else if (renderPage === 'bridgePage') {
      return !isSwapable;
    }
    return totalValue < minTokenValueLimit;
  };

  const clearSearch = () => {
    setSearchText('');
    searchTokens('');
  };

  const [hasText, setHasText] = useState(false);
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

  return (
    <CyDModalLayout
      setModalVisible={() => {}}
      disableBackDropPress={true}
      animationIn={'slideInUp'}
      animationOut={'slideOutDown'}
      animationInTiming={300}
      animationOutTiming={300}
      isModalVisible={isChooseTokenModalVisible}
      style={styles.modalContainer}>
      <CyDView
        className={'bg-white pt-[10px] mt-[50px] w-[100%] rounded-t-[20px]'}
        style={{ height: height - 50 }}>
        <CyDTouchView
          className={'flex flex-row justify-end z-10'}
          onPress={() => {
            Keyboard.dismiss();
            clearSearch();
            onCancel();
          }}>
          <CyDImage
            source={AppImages.CLOSE}
            className={'w-[16px] h-[16px] top-[20px] right-[20px] '}
          />
        </CyDTouchView>
        <CyDView>
          <CyDText className='text-center  text-[22px] font-extrabold  '>
            {t<string>('CHOOSE_TOKEN')}
          </CyDText>
        </CyDView>
        <CyDView className={'mt-[20px] mb-[100px]'}>
          <CyDView
            className={clsx(
              'flex flex-row justify-between items-center self-center border-[0.5px] w-[353px] h-[60px] rounded-[8px] px-[20px] border-sepratorColor',
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
          <CyDView className={'mt-[10px]'}>
            <CyDText className='text-center  text-[12px] font-semibold text-redColor'>
              {renderPage === 'fundCardPage' &&
                t<string>('SUPPORTED_TOKENS_TEXT')}
              {renderPage === 'autoLoad' &&
                `Only ${AUTO_LOAD_SUPPORTED_CHAINS.join(', ')} chains are supported for auto load`}
            </CyDText>
          </CyDView>

          {totalHoldings.originalHoldings.length ? (
            <CyDFlatList
              className={'mt-[10px]'}
              data={totalHoldings.filteredHoldings}
              renderItem={(item: any) =>
                TokenItem({
                  item: item.item,
                  type,
                  renderPage,
                  isTokenDisabled,
                  onSelectingToken,
                })
              }
              showsVerticalScrollIndicator={true}
            />
          ) : (
            <CyDView className='flex h-full justify-center items-center mt-[-40px]'>
              <CyDText className='px-[25px] text-[18px] text-center font-bold'>
                {noTokensAvailableMessage}
              </CyDText>
            </CyDView>
          )}
        </CyDView>
        <Toast config={toastConfig} position={'bottom'} bottomOffset={140} />
      </CyDView>
    </CyDModalLayout>
  );
}

const { height } = Dimensions.get('window');

const styles = StyleSheet.create({
  modalContainer: {
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
});

const TokenItem = ({
  item,
  type,
  renderPage,
  isTokenDisabled,
  onSelectingToken,
}: {
  item: Holding | SwapToken;
  type: TokenModalType;
  renderPage: string;
  isTokenDisabled: (arg1: number, arg2: boolean, arg3: boolean) => boolean;
  onSelectingToken: (arg: Holding | SwapToken) => void;
}) => {
  const copyContractAddress = (contractAddress: string) => {
    copyToClipboard(contractAddress);
    Toast.show({
      type: 'success',
      text1: 'Copied to clipboard',
      position: 'bottom',
    });
  };
  if (type === TokenModalType.PORTFOLIO) {
    const {
      totalValue,
      logoUrl,
      name,
      chainDetails,
      actualBalance,
      symbol,
      isFundable,
      isSwapable,
      isZeroFeeCardFunding,
      contractAddress,
    } = item as Holding;
    const { logo_url, backendName } = chainDetails;
    return (
      <CyDTouchView
        disabled={isTokenDisabled(totalValue, isFundable, isSwapable)}
        onPress={() => {
          onSelectingToken(item);
        }}
        className={clsx(
          'flex flex-row justify-between py-[20px] border-b-[1px] border-b-sepratorColor mx-[15px]',
          { 'opacity-25': isTokenDisabled(totalValue, isFundable, isSwapable) },
        )}>
        <CyDView className={'flex flex-row w-full justify-start items-center'}>
          <CyDView className='flex flex-row h-full mb-[10px] items-center rounded-r-[20px] self-center px-[10px]'>
            <CyDFastImage
              className={'h-[35px] w-[35px] rounded-[50px]'}
              source={{ uri: logoUrl }}
              resizeMode='contain'
            />
            <CyDView className='absolute top-[54%] right-[5px]'>
              <CyDFastImage
                className={
                  'h-[20px] w-[20px] rounded-[50px] border-[1px] border-white bg-white'
                }
                source={
                  chainDetails.logo_url ??
                  'https://raw.githubusercontent.com/cosmostation/cosmostation_token_resource/master/assets/images/common/unknown.png'
                }
                resizeMode={FastImage.resizeMode.contain}
              />
            </CyDView>
          </CyDView>
          <CyDView className='flex flex-1 flex-row items-center'>
            <CyDView className='flex flex-1 flex-col items-between justify-center'>
              <CyDView className='flex flex-row  max-w-[80%] items-center'>
                <CyDText className={'font-extrabold text-[16px]'}>
                  {name}{' '}
                </CyDText>
              </CyDView>

              <CyDView
                className={'flex flex-row items-center align-center mt-[5px]'}>
                {contractAddress && !isNativeToken(item) && (
                  <>
                    <CyDText className={'text-[12px]'}>
                      {`${contractAddress.substring(0, 6)}...${contractAddress.substring(contractAddress.length - 6)}`}
                    </CyDText>
                    <CyDTouchView
                      onPress={() => {
                        copyContractAddress(contractAddress);
                      }}>
                      <CyDImage
                        source={AppImages.COPY}
                        className='h-[10px] w-[10px] ml-[3px]'
                        resizeMode='contain'
                      />
                    </CyDTouchView>
                  </>
                )}
              </CyDView>
            </CyDView>
            <CyDView className='flex flex-col items-end'>
              <CyDTokenValue className={'font-extrabold text-[18px]'}>
                {totalValue}
              </CyDTokenValue>
              <CyDView className='flex flex-row items-end self-end'>
                <CyDTokenAmount className='text-[14px]'>
                  {actualBalance}
                </CyDTokenAmount>
                <CyDText className={'text-[14px]'}> {symbol}</CyDText>
              </CyDView>
            </CyDView>
          </CyDView>
        </CyDView>
      </CyDTouchView>
    );
  } else if (type === TokenModalType.SWAP) {
    return (
      <SwapTokenItem
        item={item as SwapToken}
        onSelectingToken={onSelectingToken}
      />
    );
  }
  return <></>;
};

const SwapTokenItem = ({
  item,
  onSelectingToken,
}: {
  item: SwapToken;
  onSelectingToken: (arg: Holding | SwapToken) => void;
}) => {
  const { logo, name, symbol } = item;
  return (
    <CyDTouchView
      onPress={() => {
        onSelectingToken(item);
      }}
      className={
        'flex flex-row justify-between py-[20px] border-b-[1px] border-b-sepratorColor mx-[30px]'
      }>
      <CyDView className={'flex flex-row justify-start items-center'}>
        <CyDView>
          <CyDImage
            source={{ uri: logo }}
            className={'h-[30px] w-[30px] rounded-[7px] ml-[10px] mr-[4px]'}
          />
        </CyDView>
        <CyDView>
          <CyDText className={'pl-[20px] pr-[30px] font-bold text-[18px]'}>
            {name}
          </CyDText>
          <CyDText className={'pl-[20px] pr-[30px] text-[13px]'}>
            {symbol}
          </CyDText>
        </CyDView>
      </CyDView>
    </CyDTouchView>
  );
};
