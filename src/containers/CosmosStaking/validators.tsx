import React, { useContext, useEffect, useMemo, useState } from 'react';
import { CyDText, CyDView, CyDImage, CyDFlatList, CyDTouchView, CyDTextInput } from '../../styles/tailwindStyles';
import SwitchView from '../../components/SwitchView';
import { useTranslation } from 'react-i18next';
import {
  CosmosActionType,
  CosmosStakingContext,
  cosmosStakingContextDef,
  IAllValidators
} from '../../reducers/cosmosStakingReducer';
import Button from '../../components/v2/button';
import AppImages from '../../../assets/images/appImages';
import { convertFromUnitAmount } from '../../core/util';
import Empty from '../../components/v2/empty';
import CyDModalLayout from '../../components/v2/modal';
import { screenTitle } from '../../constants';
import { BackHandler, StyleSheet } from 'react-native';

export default function CosmosValidators ({ route, navigation }) {
  const { t } = useTranslation();
  const { tokenData, from } = route.params;
  const cosmosStaking = useContext<cosmosStakingContextDef>(CosmosStakingContext);

  const [index, setIndex] = useState<number>(cosmosStaking.cosmosStakingState.stakedBalance.toString() === '0' ? 1 : 0);
  const [allValidators, setAllValidators] = useState<IAllValidators[]>([]);
  const [myValidators, setMyValidators] = useState<IAllValidators[]>([]);
  const [showManage, setShowManage] = useState<boolean>(false);
  const [validatorData, setValidatorData] = useState({});
  const [filterText, setFilterText] = useState<string>('');
  const [filterList, setFilterList] = useState<IAllValidators[]>([]);

  const handleBackButton = () => {
    navigation.goBack();
    return true;
  };

  useEffect(() => {
    BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    const myData: IAllValidators[] = [];
    const allData: IAllValidators[] = [];
    for (const item of cosmosStaking.cosmosStakingState.userValidators.values()) { myData.push(item); }
    for (const item of cosmosStaking.cosmosStakingState.allValidators.values()) { allData.push(item); }
    myData?.sort((a, b) => (parseInt(String(a.tokens)) > parseInt(String(b.tokens)) ? -1 : 1));
    allData?.sort((a, b) => (parseInt(String(a.tokens)) > parseInt(String(b.tokens)) ? -1 : 1));
    setFilterList(index === 0 ? myData : allData);
    setMyValidators(myData);
    setAllValidators(allData);

    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
    };
  }, []);

  const convert = n => {
    if (n < 1e3) return n;
    if (n >= 1e3 && n < 1e6) return +(n / 1e3).toFixed(1) + 'K';
    if (n >= 1e6 && n < 1e9) return +(n / 1e6).toFixed(1) + 'M';
    if (n >= 1e9 && n < 1e12) return +(n / 1e9).toFixed(1) + 'B';
    if (n >= 1e12) return +(n / 1e12).toFixed(1) + 'T';
  };

  const Item = ({ item }: {item: IAllValidators}): JSX.Element => {
    return <CyDView>
      <CyDView className={'flex flex-row my-[24px] justify-between mx-[20px] items-center'}>
        <CyDView>
          <CyDText className={'text-[16px] font-bold text-secondaryTextColor font-nunito'}>{item.name}</CyDText>
          {item.balance.toString() !== '0' && <CyDView className={'flex flex-row items-center'}>
            <CyDImage source={AppImages[tokenData.chainDetails.backendName + '_LOGO']} className={'w-[16px] h-[16px]'} />
            <CyDText className={'ml-[10px] text-[16px] font-medium text-primaryTextColor font-nunito'}>{'Staked'}</CyDText>
            <CyDText className={'ml-[10px] text-[16px] font-bold text-secondaryTextColor font-nunito'}>{convertFromUnitAmount(item.balance.toString(), tokenData.contractDecimals)}</CyDText>
          </CyDView>}
          <CyDView className={'flex flex-row item-center mt-[8px]'}>
            {item.apr !== '0.00' && <CyDImage source={AppImages.APR_ICON} className={'w-[20px] h-[16px]'} />}
            {item.apr !== '0.00' && <CyDText className={'ml-[4px] font-nunito text-subTextColor'}>{`APR ${item.apr}`}</CyDText>}
            <CyDImage source={AppImages.COINS} className={'ml-[10px] w-[20px] h-[16px]'} />
            <CyDText className={'ml-[4px] font-nunito text-subTextColor'}>{convert(parseFloat(convertFromUnitAmount(item.tokens.toString(), tokenData.contractDecimals)))}</CyDText>
          </CyDView>
        </CyDView>
        <Button onPress={() => {
          setValidatorData(item);
          setShowManage(true);
        }} title={'Manage'} type={'ternary'} style={'max-h-[60px] p-[4%]'}/>
      </CyDView>
      <CyDView className={'w-full h-[1px] bg-[#F4F4F4] mx-[30px]'}></CyDView>

    </CyDView>;
  };

  useEffect(() => {
    if (allValidators.length > 0) {
      if (filterText === '') {
        index === 1 ? setFilterList(allValidators) : setFilterList(myValidators);
      } else {
        const filteredValidators = index === 1
          ? allValidators.filter((item: IAllValidators) => item.name.toLowerCase().startsWith(filterText.toLowerCase()))
          : myValidators.filter((item: IAllValidators) => item.name.toLowerCase().startsWith(filterText.toLowerCase()));
        setFilterList(filteredValidators);
      }
    }
  }, [filterText, index]);

  const renderItem = ({ item }: { item: any}) => (
    <Item item={item} />
  );

  const memoizedValue = useMemo(() => renderItem, [filterList, index]);
  return (
    <CyDView className={'bg-white h-full w-full'}>
      <CyDModalLayout setModalVisible={setShowManage} isModalVisible={showManage} style={styles.modalLayout} animationIn={'slideInUp'} animationOut={'slideOutDown'}>
        <CyDView className={'bg-white p-[25px] pb-[30px] rounded-[20px] relative'}>
          <CyDTouchView onPress={() => setShowManage(false)} className={'z-[50]'}>
            <CyDImage source={AppImages.CLOSE} className={' w-[22px] h-[22px] z-[50] absolute right-[0px] '} />
          </CyDTouchView>
          <CyDText className={'mt-[10] font-bold text-center text-[22px]'}>
                {validatorData.name}
          </CyDText>

          <CyDView className={'flex flex-row mt-[40px]'}>
              {validatorData.apr !== '0.00' && <CyDImage source={AppImages.APR_ICON} className={'h-[20px] w-[20px]'}/>}
              <CyDView className={' flex flex-row'}>
                {validatorData.apr !== '0.00' && <CyDText className={'font-medium text-[16px] ml-[4px] text-primaryTextColor'}>{`APR ${validatorData.apr}`}</CyDText>}
              </CyDView>
            </CyDView>

            <CyDView className={'flex flex-row mt-[20px]'}>
              <CyDImage source={AppImages[tokenData.chainDetails.backendName + '_LOGO']} className={'w-[16px] h-[16px] mt-[3px]'} />
              <CyDView className={' flex flex-row'}>
                <CyDText className={' font-medium text-[16px] ml-[10px] text-primaryTextColor'}>{`Voting Power ${convert(convertFromUnitAmount(validatorData.tokens, tokenData.contractDecimals))}`}</CyDText>
              </CyDView>
            </CyDView>

            {from === CosmosActionType.STAKE && <CyDView>
              {validatorData.balance !== BigInt(0) && <Button onPress={async () => {
                setShowManage(false);
                navigation.navigate(screenTitle.COSMOS_ACTION, {
                  tokenData,
                  validatorData,
                  from: CosmosActionType.REDELEGATE
                });
              }}
              title={t('REDELEGATE')}
              style={'py-[5%] mt-[50px]'}
              loaderStyle={{ height: 30 }}
            />}
            <Button onPress={() => {
              setShowManage(false);
              navigation.navigate(screenTitle.COSMOS_ACTION, {
                tokenData,
                validatorData,
                from: CosmosActionType.DELEGATE
              });
            }}
              title={t('DELEGATE')}
              type={'secondary'}
              style={'py-[5%] mt-[15px]'}
            />
            </CyDView>}
            {validatorData.balance !== BigInt(0) && <Button onPress={() => {
              setShowManage(false);
              navigation.navigate(screenTitle.COSMOS_ACTION, {
                tokenData,
                validatorData,
                from: CosmosActionType.UNDELEGATE
              });
            }}
              title={t('UNDELEGATE')}
              type={'secondary'}
              style={'py-[5%] mt-[15px]'}
              />}
        </CyDView>
      </CyDModalLayout>

      <CyDView className={'flex flex-row justify-center'}>
        {from === CosmosActionType.STAKE && <SwitchView
          title1={t('Staked')}
          title2={t('All Validators')}
          index={index}
          setIndexChange={(index) => {
            setIndex(index);
          }}
        />}
      </CyDView>

      <CyDTextInput
        value={filterText}
        onChangeText={(text) => setFilterText(text)}
        placeholder={t('SEARCH_VALIDATOR')}
        className={'rounded-[8px] py-[8] px-[12] text-[16px] border-[1px] border-subTextColor mx-[16px] mt-[16px]'}
      />

      <CyDFlatList
        data={filterList}
        renderItem={memoizedValue}
        ListEmptyComponent={Empty}
        keyExtractor={(item) => item.address}
        className={'mt-[8px]'}/>
    </CyDView>
  );
}

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end'
  }
});
