import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
  CyDView,
  CyDFlatList,
  CyDText,
  CyDImage,
  CyDTouchView,
  CyDTextInput,
} from '../../styles/tailwindStyles';
import {
  CosmosStakingContext,
  IAllValidators,
} from '../../reducers/cosmosStakingReducer';
import {
  convertFromUnitAmount,
  convertNumberToShortHandNotation,
} from '../../core/util';
import AppImages from '../../../assets/images/appImages';
import { screenTitle } from '../../constants';
import { BackHandler } from 'react-native';
import { TokenOverviewTabIndices } from '../../constants/enum';
import { filter } from 'lodash';

export default function CosmosSelectReValidator({ route, navigation }) {
  const { validatorData, tokenData, setReValidator, from } = route.params;
  const cosmosStaking = useContext<any>(CosmosStakingContext);
  const [validatorList, setValidatorList] = useState(undefined);
  const [queryData, setQueryData] = useState(undefined);
  const [query, setQuery] = useState<string>('');

  const handleBackButton = () => {
    navigation.goBack();
    return true;
  };

  useEffect(() => {
    BackHandler.addEventListener('hardwareBackPress', handleBackButton);

    const allData: IAllValidators[] = [];
    for (const item of cosmosStaking.cosmosStakingState.allValidators.values()) {
      allData.push(item);
    }
    allData?.sort((a, b) =>
      parseInt(String(a.tokens)) > parseInt(String(b.tokens)) ? -1 : 1,
    );
    setValidatorList(allData);
    setQueryData(allData);

    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
    };
  }, []);

  const handleSearch = text => {
    const formattedQuery = text.toLowerCase();
    const filteredData = filter(validatorList, val => {
      const { name } = val;
      return name.toLowerCase().includes(formattedQuery);
    });
    setQueryData(filteredData);
    setQuery(text);
  };

  const Item = ({ item }): JSX.Element => (
    <>
      {validatorData.name !== item.name && (
        <CyDTouchView
          onPress={() => {
            setReValidator(item);
            if (from === screenTitle.TOKEN_OVERVIEW) {
              navigation.navigate(screenTitle.TOKEN_OVERVIEW, {
                tokenData,
                navigateTo: TokenOverviewTabIndices.STAKING,
              });
            } else {
              navigation.navigate(screenTitle.COSMOS_ACTION, {
                tokenData,
                validatorData,
                from,
              });
            }
          }}>
          <CyDView className={'my-[24px] mx-[20px]'}>
            <CyDView className={'flex flex-row justify-between'}>
              <CyDText
                className={
                  'text-[16px] font-bold text-secondaryTextColor  w-1/2'
                }
                numberOfLines={2}>
                {item.name}
              </CyDText>
              {item.balance.toString() !== '0' && (
                <CyDText
                  className={
                    'ml-[10px] text-[16px] font-bold text-secondaryTextColor '
                  }>{`${convertFromUnitAmount(item.balance.toString(), tokenData.contractDecimals)} ${tokenData.name}`}</CyDText>
              )}
            </CyDView>
            <CyDView className={'flex flex-row item-center mt-[8px]'}>
              {item.apr !== '0.00' && (
                <CyDImage
                  source={AppImages.APR_ICON}
                  className={'w-[20px] h-[16px]'}
                />
              )}
              {item.apr !== '0.00' && (
                <CyDText
                  className={
                    'ml-[4px]  text-subTextColor'
                  }>{`APR ${item.apr}`}</CyDText>
              )}
              <CyDImage
                source={AppImages.COINS}
                className={'ml-[20px] w-[20px] h-[16px]'}
              />
              <CyDText className={'ml-[4px]  text-subTextColor'}>
                {convertNumberToShortHandNotation(
                  parseFloat(
                    convertFromUnitAmount(
                      item.tokens.toString(),
                      tokenData.contractDecimals,
                    ),
                  ),
                )}
              </CyDText>
            </CyDView>
          </CyDView>
          <CyDView className={'w-full h-[1px] bg-[#F4F4F4] mx-[30px]'} />
        </CyDTouchView>
      )}
    </>
  );

  const renderItem = ({ item }) => <Item item={item} />;
  const memoizedValue = useMemo(() => renderItem, []);

  return (
    <CyDView className={'bg-n0 h-full w-full'}>
      <CyDView
        className={
          'bg-[#F6F6F6] p-[8px] mt-[10px] mx-[20px] rounded-[8px] flex flex-row items-center'
        }>
        <CyDTextInput
          className={'ml-[4px] bg-[#F6F6F6] text-[20px] h-[40px] w-[55%] '}
          keyboardType={'numeric'}
          onChangeText={text => handleSearch(text)}
          value={query}
          placeholderTextColor={'#929292'}
          placeholder={'Search'}
        />
      </CyDView>
      <CyDFlatList
        data={queryData}
        renderItem={memoizedValue}
        keyExtractor={item => item.address}
      />
    </CyDView>
  );
}
