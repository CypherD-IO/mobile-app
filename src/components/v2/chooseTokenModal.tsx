import clsx from 'clsx';
import Fuse from 'fuse.js';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dimensions, TextInput, StyleSheet } from 'react-native';
import AppImages from '../../../assets/images/appImages';
import { CyDFastImage, CyDFlatList, CyDImage, CyDText, CyDTouchView, CyDView } from '../../styles/tailwindStyles';
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
}

export default function ChooseTokenModal (props: TokenModal) {
  const { t } = useTranslation();
  const { isChooseTokenModalVisible, tokenList, minTokenValueLimit = 0, onSelectingToken, onCancel, noTokensAvailableMessage = t<string>('FUND_TRANSFER') } = props;
  const [searchText, setSearchText] = useState<string>('');
  const [totalHoldings, setTotalHoldings] = useState({
    originalHoldings: [],
    filteredHoldings: []
  });
  const searchOptions = {
    isCaseSensitive: false,
    includeScore: true,
    shouldSort: true,
    threshold: 0.3,
    keys: [
      'name'
    ]
  };
  const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  });

  useEffect(() => {
    if (tokenList && tokenList.length) {
      const valuedTokens = tokenList.filter((token) => token.isVerified);
      valuedTokens.sort((tokenA, tokenB) => tokenA.totalValue < tokenB.totalValue ? 1 : -1);
      setTotalHoldings({
        originalHoldings: valuedTokens,
        filteredHoldings: valuedTokens
      });
    }
  }, [tokenList]);

  const searchTokens = (tokenName: string) => {
    if (tokenName !== '') {
      const fuse = new Fuse(totalHoldings.originalHoldings, searchOptions);
      const filteredTokens = fuse.search(tokenName).map(token => token.item);
      setTotalHoldings({ ...totalHoldings, filteredHoldings: filteredTokens });
    } else {
      setTotalHoldings({ ...totalHoldings, filteredHoldings: totalHoldings.originalHoldings });
    }
  };

  const TokenItem = ({ item }) => {
    const { totalValue, logoUrl, name, chainDetails, actualBalance, symbol } = item;
    const { logo_url, backendName } = chainDetails;
    return (
      <CyDTouchView disabled={totalValue < minTokenValueLimit} onPress={() => { onSelectingToken(item); }} className={clsx('flex flex-row justify-between py-[20px] border-b-[1px] border-b-sepratorColor mx-[30px]', { 'opacity-25': totalValue < minTokenValueLimit })}>
        <CyDView className={'flex flex-row justify-start items-center'}>
          <CyDView>
            <CyDImage
              source={{ uri: logoUrl }}
              className={'h-[38px] w-[38px] rounded-[7px] mx-[10] mv-[10]'}
            />
          </CyDView>
          <CyDView>
            <CyDText className={'font-extrabold'}>{name}</CyDText>
            <CyDView className={'flex flex-row items-center align-center mt-[5px]'}>
              <CyDFastImage
                source={logo_url }
                className={'h-[15px] w-[15px] rounded-[7px] mr-[2px] mv-[10]'}
              />
              <CyDText className={'text-[10px]'}>{backendName.toUpperCase()}</CyDText>
            </CyDView>
          </CyDView>
        </CyDView>
        <CyDView className={'flex flex-wrap justify-end'}>
          <CyDTokenValue className={'font-extrabold text-right text-[16px]'}>{totalValue}</CyDTokenValue>
          <CyDTokenAmount className='text-right'>{actualBalance}</CyDTokenAmount>
        </CyDView>
      </CyDTouchView>
    );
  };

  // setIsChooseTokenVisible(false); !totalHoldings.originalHoldings.length && navigation.goBack();

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
        <CyDView className={'bg-white pt-[10px] mt-[50px] w-[100%] rounded-[20px]'} style={{ height: height - 50 }}>
          <CyDTouchView className={'flex flex-row justify-end z-10'}
            onPress={() => { onCancel(); }}
          >
            <CyDImage
              source={ AppImages.CLOSE }
              className={'w-[16px] h-[16px] top-[20px] right-[20px] '}
            />
          </CyDTouchView>
          <CyDView>
            <CyDText className='text-center font-nunito text-[20px] font-extrabold font-[##434343]'>
              {t<string>('CHOOSE_TOKEN')}
            </CyDText>
          </CyDView>
          <CyDView className={'mt-[20px] mb-[100px]'}>
            <CyDView className={'flex flex-row justify-between items-center self-center border-[1px] border-sepratorColor w-[80%] rounded-[30px] px-[20px]'}>
              <TextInput
                className={'self-center py-[15px] w-[90%]'}
                value={searchText}
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={(text) => { setSearchText(text); searchTokens(text); }}
                placeholderTextColor={'#C5C5C5'}
                placeholder='Search Token' />
                {searchText !== ''
                  ? <CyDTouchView onPress={() => { setSearchText(''); }}>
                  <CyDImage className={''} source={AppImages.CLOSE_CIRCLE}/>
                </CyDTouchView>
                  : <></>}
            </CyDView>
            {totalHoldings.originalHoldings.length
              ? <CyDFlatList
              className={'mt-[20px]'}
              data={totalHoldings.filteredHoldings}
              renderItem={(item) => TokenItem(item)}
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
    justifyContent: 'flex-end',
    alignItems: 'center'
  }
});
