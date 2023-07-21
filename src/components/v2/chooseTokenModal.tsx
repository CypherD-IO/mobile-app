import clsx from 'clsx';
import Fuse from 'fuse.js';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dimensions, StyleSheet } from 'react-native';
import AppImages from '../../../assets/images/appImages';
import { TokenModalType } from '../../constants/enum';
import { CyDFastImage, CyDFlatList, CyDImage, CyDText, CyDTextInput, CyDTouchView, CyDView } from '../../styles/tailwindStyles';
import CyDModalLayout from './modal';
import CyDTokenAmount from './tokenAmount';
import CyDTokenValue from './tokenValue';

interface TokenModal {
  tokenList: any[]
  isChooseTokenModalVisible: boolean
  minTokenValueLimit?: number
  onSelectingToken: (token: any) => void
  onCancel: () => void
  noTokensAvailableMessage?: string
  type?: string
  renderPage?: string
}

export default function ChooseTokenModal (props: TokenModal) {
  const { t } = useTranslation();
  const { isChooseTokenModalVisible, tokenList, minTokenValueLimit = 0, onSelectingToken, onCancel, noTokensAvailableMessage = t<string>('FUND_TRANSFER'), type = TokenModalType.PORTFOLIO, renderPage = '' } = props;
  const [searchText, setSearchText] = useState<string>('');
  const [totalHoldings, setTotalHoldings] = useState({
    originalHoldings: [],
    filteredHoldings: []
  });
  const searchOptions = {
    isCaseSensitive: false,
    includeScore: true,
    shouldSort: true,
    threshold: 0.1,
    keys: [
      'name',
      'symbol'
    ]
  };
  const fuse = new Fuse(totalHoldings.originalHoldings, searchOptions);

  useEffect(() => {
    if (tokenList?.length && type === TokenModalType.PORTFOLIO) {
      const valuedTokens = tokenList.filter((token) => token.isVerified);
      valuedTokens.sort((tokenA, tokenB) => tokenA.totalValue < tokenB.totalValue ? 1 : -1);
      setTotalHoldings({
        originalHoldings: valuedTokens,
        filteredHoldings: valuedTokens
      });
    } else {
      setTotalHoldings({
        originalHoldings: tokenList,
        filteredHoldings: tokenList
      });
    }
  }, [tokenList]);

  const searchTokens = (tokenName: string) => {
    if (tokenName !== '') {
      const filteredTokens = fuse.search(tokenName).map(token => token.item);
      setTotalHoldings({ ...totalHoldings, filteredHoldings: filteredTokens });
    } else {
      setTotalHoldings({ ...totalHoldings, filteredHoldings: totalHoldings.originalHoldings });
    }
  };
  const isTokenDisabled = (totalValue: string | number, isBridgeable: boolean) => {
    if (renderPage === 'fundCardPage') {
      return totalValue < minTokenValueLimit || !isBridgeable;
    }
    return totalValue < minTokenValueLimit;
  };

  const TokenItem = ({ item }: { item: {totalValue: string | number, logoUrl: string, name: string, chainDetails: any, actualBalance: string | number, symbol: string, isBridgeable: boolean} }) => {
    if (type === TokenModalType.PORTFOLIO) {
      const { totalValue, logoUrl, name, chainDetails, actualBalance, symbol, isBridgeable } = item;
      const { logo_url, backendName } = chainDetails;
      return (
        <CyDTouchView disabled={isTokenDisabled(totalValue, isBridgeable)} onPress={() => { onSelectingToken(item); }} className={clsx('flex flex-row justify-between py-[20px] border-b-[1px] border-b-sepratorColor mx-[15px]', { 'opacity-25': isTokenDisabled(totalValue, isBridgeable) })}>
        <CyDView className={'flex flex-row w-full justify-start items-center'}>
          <CyDView>
            <CyDImage
              source={{ uri: logoUrl }}
              className={'h-[38px] w-[38px] rounded-[20px] mr-[10px]'}
            />
          </CyDView>
          <CyDView className='flex flex-1 flex-col justify-center'>
            <CyDView className='flex flex-1 flex-row justify-between'>
              <CyDText className={'font-extrabold text-[16px] max-w-[80%]'}>{name}</CyDText>
              <CyDTokenValue className={'font-extrabold text-[18px]'}>{totalValue}</CyDTokenValue>
            </CyDView>
            <CyDView className='flex flex-1 flex-row justify-between'>
              <CyDView className={'flex flex-row items-center align-center mt-[5px]'}>
                <CyDFastImage
                  source={logo_url }
                  className={'h-[15px] w-[15px] rounded-[7px] mr-[2px]'}
                />
                <CyDText className={'text-[12px]'}>{backendName.toUpperCase()}</CyDText>
              </CyDView>
              <CyDView className='flex flex-row items-end self-end'>
                <CyDTokenAmount className='text-[14px]'>{actualBalance}</CyDTokenAmount>
                <CyDText className={'text-[14px]'}> {symbol}</CyDText>
              </CyDView>
            </CyDView>
          </CyDView>
        </CyDView>
      </CyDTouchView>
      );
    } else if (type === TokenModalType.SWAP) {
      return <SwapTokenItem item={item}/>;
    }
    return <></>;
  };

  const SwapTokenItem = ({ item }) => {
    const { logo, name, symbol } = item;
    return (
      <CyDTouchView onPress={() => { onSelectingToken(item); }} className={'flex flex-row justify-between py-[20px] border-b-[1px] border-b-sepratorColor mx-[30px]'}>
        <CyDView className={'flex flex-row justify-start items-center'}>
          <CyDView>
            <CyDImage
              source={{ uri: logo }}
              className={'h-[30px] w-[30px] rounded-[7px] ml-[10px] mr-[4px]'}
            />
          </CyDView>
          <CyDView>
            <CyDText className={'pl-[20px] pr-[30px] font-bold text-[18px]'}>{name}</CyDText>
            <CyDText className={'pl-[20px] pr-[30px] text-[13px]'}>{symbol}</CyDText>
          </CyDView>
        </CyDView>
      </CyDTouchView>
    );
  };

  const clearSearch = () => {
    setSearchText('');
    searchTokens('');
  };

  return (
    <CyDModalLayout
        setModalVisible={ () => { }}
        disableBackDropPress={true}
        animationIn={'slideInUp'}
        animationOut={'slideOutDown'}
        animationInTiming = {300}
        animationOutTiming = {300}
        isModalVisible={isChooseTokenModalVisible}
        style={styles.modalContainer}
      >
        <CyDView className={'bg-white pt-[10px] mt-[50px] w-[100%] rounded-t-[20px]'} style={{ height: height - 50 }}>
          <CyDTouchView className={'flex flex-row justify-end z-10'}
            onPress={() => { clearSearch(); onCancel(); }}
          >
            <CyDImage
              source={ AppImages.CLOSE }
              className={'w-[16px] h-[16px] top-[20px] right-[20px] '}
            />
          </CyDTouchView>
          <CyDView>
            <CyDText className='text-center font-nunito text-[22px] font-extrabold  '>
              {t<string>('CHOOSE_TOKEN')}
            </CyDText>
          </CyDView>
          <CyDView className={'mt-[20px] mb-[100px]'}>
            <CyDView className={'flex flex-row justify-between items-center self-center border-[1px] border-sepratorColor w-[353px] h-[60px] rounded-[30px] px-[20px]'}>
              <CyDTextInput
                className={'self-center py-[15px] w-[95%]'}
                value={searchText}
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={(text: string) => { setSearchText(text); searchTokens(text); }}
                placeholderTextColor={'#C5C5C5'}
                placeholder='Search Token' />
                {searchText !== ''
                  ? <CyDTouchView onPress={() => { clearSearch(); }}>
                  <CyDImage className={''} source={AppImages.CLOSE_CIRCLE}/>
                </CyDTouchView>
                  : <></>}
            </CyDView>
            {renderPage === 'fundCardPage'
              ? <CyDView className={'mt-[10px]'}>
              <CyDText className='text-center font-nunito text-[12px] font-semibold text-redColor'>
              {t<string>('SUPPORTED_TOKENS_TEXT')}
              </CyDText>
            </CyDView>
              : <></>}
            {totalHoldings.originalHoldings.length
              ? <CyDFlatList
              className={'mt-[10px]'}
              data={totalHoldings.filteredHoldings}
              renderItem={(item: any) => TokenItem(item)}
              showsVerticalScrollIndicator={true}>
            </CyDFlatList>
              : <CyDView className='flex h-full justify-center items-center mt-[-40px]'>
                  <CyDText className='px-[25px] text-[18px] text-center font-bold'>
                    {noTokensAvailableMessage}
                  </CyDText>
                </CyDView>}
          </CyDView>
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
    alignItems: 'center'
  }
});
