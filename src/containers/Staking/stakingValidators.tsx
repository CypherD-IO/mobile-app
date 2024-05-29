import * as React from 'react';
import SwitchView from '../../components/v2/switchView';
import { useTranslation } from 'react-i18next';
import { useContext, useEffect, useMemo, useState } from 'react';
import { Colors } from '../../constants/theme';
import { BackHandler, FlatList } from 'react-native';
import EmptyView from '../../components/EmptyView';
import AppImages from '../../../assets/images/appImages';
import { StakingContext } from '../../core/util';
import { stakeValidators } from '../../core/Staking';
import * as C from '../../constants';
import { StakeOptionsModal } from '../../components/StakeOptionsModal';
import {
  CyDImage,
  CyDText,
  CyDTextInput,
  CyDView,
} from '../../styles/tailwindStyles';
import Button from '../../components/v2/button';
import { ButtonType } from '../../constants/enum';

const { DynamicView } = require('../../styles');

function StakingValidators({ route, navigation }) {
  const { tokenData, typeOfAction } = route.params;
  const { t } = useTranslation();

  const stakingValidators = useContext<any>(StakingContext);
  const [index, setIndex] = useState<number>(
    stakingValidators.stateStaking.totalStakedBalance != BigInt(0) ? 0 : 1,
  );
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [myValidatorsData, setMyValidatorsList] = useState<stakeValidators[]>(
    [],
  );
  const [allValidatorsData, setAllValidatorsList] = useState<stakeValidators[]>(
    [],
  );
  const [showDelegationModal, setShowDelegationModal] =
    useState<boolean>(false);
  const [data, setData] = useState({ description: { name: '' } });
  const [filterList, setFilterList] = useState<stakeValidators[]>([]);
  const [filterText, setFilterText] = useState<string>('');

  const handleBackButton = () => {
    navigation.goBack();
    return true;
  };

  useEffect(() => {
    BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
    };
  }, []);

  useEffect(() => {
    const myData: stakeValidators[] = [];
    const allData: stakeValidators[] = [];
    for (const item of stakingValidators.stateStaking.myValidators.values()) {
      myData.push(item);
    }
    for (const item of stakingValidators.stateStaking.allValidators.values()) {
      allData.push(item);
    }
    myData?.sort((a, b) =>
      parseInt(String(a.tokens)) > parseInt(String(b.tokens)) ? -1 : 1,
    );
    allData?.sort((a, b) =>
      parseInt(String(a.tokens)) > parseInt(String(b.tokens)) ? -1 : 1,
    );
    setFilterList(index === 0 ? myData : allData);
    setMyValidatorsList(myData);
    setAllValidatorsList(allData);
  }, []);

  useEffect(() => {
    if (allValidatorsData.length > 0) {
      if (filterText === '') {
        index === 1
          ? setFilterList(allValidatorsData)
          : setFilterList(myValidatorsData);
      } else {
        const filteredValidators =
          index === 1
            ? allValidatorsData.filter((item: stakeValidators) =>
                item.description.name
                  .toLowerCase()
                  .startsWith(filterText.toLowerCase()),
              )
            : myValidatorsData.filter((item: stakeValidators) =>
                item.description.name
                  .toLowerCase()
                  .startsWith(filterText.toLowerCase()),
              );
        setFilterList(filteredValidators);
      }
    }
  }, [filterText, index]);

  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => {},
      headerTitle: () => (
        <CyDView className={'-mt-[10px]'}>
          {typeOfAction === 'stake' && (
            <SwitchView
              titles={[t('Staked'), t('All Validators')]} // Pass the titles as an array
              index={index}
              setIndexChange={index => {
                setIndex(index);
              }}
              style={{ marginBottom: 10 }}
            />
          )}
        </CyDView>
      ),
    });
  }, [index, navigation]);

  const emptyView = (view: any) => {
    return (
      <DynamicView
        dynamic
        dynamicWidth
        dynamicHeight
        height={80}
        width={100}
        mT={0}
        bGC={Colors.whiteColor}
        aLIT={'center'}>
        {view === 'empty' ? (
          <EmptyView
            text={t('NO_CURRENT_HOLDINGS')}
            image={AppImages.EMPTY}
            buyVisible={false}
            marginTop={80}
          />
        ) : (
          <></>
        )}
      </DynamicView>
    );
  };

  const convert = (n: number) => {
    if (n < 1e3) return n;
    if (n >= 1e3 && n < 1e6) return (n / 1e3).toFixed(1) + 'K';
    if (n >= 1e6 && n < 1e9) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e9 && n < 1e12) return (n / 1e9).toFixed(1) + 'B';
    if (n >= 1e12) return (n / 1e12).toFixed(1) + 'T';
  };

  const Item = ({ item }) => {
    return (
      <CyDView className='flex flex-row justify-between items-center mx-[16px] border-b-[0.5px] border-sepratorColor py-[12px]'>
        <CyDView className='flex flex-col items-start justify-start max-w-[72%]'>
          <CyDText className='font-semibold text-secondaryTextColor'>
            {item.description.name}
          </CyDText>
          {item.balance !== BigInt(0) && (
            <CyDView className='flex flex-row items-center mt-[2px]'>
              <CyDImage
                source={AppImages.EVMOS_LOGO}
                className='h-[12px] w-[12px]'
                resizeMode='contain'
              />
              <CyDText className='font-semibold text-primaryTextColor ml-[10px]'>
                {'Staked ' + (parseFloat(item.balance) * 10 ** -18).toFixed(2)}
              </CyDText>
            </CyDView>
          )}
          <CyDView className='flex flex-row justify-between items-center mt-[2px]'>
            {item.apr !== '0.00' && (
              <CyDImage
                source={AppImages.APR_ICON}
                className={'w-[20px] h-[16px]'}
              />
            )}
            {item.apr !== '0.00' && <CyDText>{`APR ${item.apr}`}</CyDText>}
            <CyDImage
              source={AppImages.COINS}
              className={'w-[20px] h-[16px] ml-[10px]'}
            />
            <CyDText>{convert(parseFloat(item.tokens) * 10 ** -18)}</CyDText>
          </CyDView>

          {item.jailed && (
            <CyDView className='flex flex-row justify-center items-center'>
              <CyDImage
                source={AppImages.CLOSE_CIRCLE}
                className={'w-[20px] h-[16px]'}
              />
              <CyDText>Jailed</CyDText>
            </CyDView>
          )}
        </CyDView>
        <CyDView className='max-w-[35%]'>
          <Button
            type={ButtonType.TERNARY}
            style={'py-[10px] px-[10px]'}
            titleStyle='font-bold'
            title='Manage'
            onPress={() => {
              setData({ ...item, logo: tokenData.chainDetails.backendName });
              setShowDelegationModal(true);
            }}
          />
        </CyDView>
      </CyDView>
    );
  };

  const renderItem = ({ item }) => <Item item={item} />;

  const memoizedValue = useMemo(() => renderItem, [myValidatorsData, index]);

  return (
    <DynamicView dynamic dynamicHeight height={100} bGC={Colors.whiteColor}>
      <DynamicView
        dynamic
        dynamicWidth
        width={100}
        fD={'row'}
        jC={'center'}
        bGC={Colors.whiteColor}
        style={{ paddingRight: 16 }}>
        <StakeOptionsModal
          isModalVisible={showDelegationModal}
          onPress={() => {
            setShowDelegationModal(false);
            navigation.navigate(C.screenTitle.STAKING_MANAGEMENT, {
              itemData: data,
              tokenData,
            });
          }}
          onCancelPress={() => {
            setShowDelegationModal(false);
          }}
          data={data}
          typeOfAction={typeOfAction}
        />
      </DynamicView>

      <CyDTextInput
        value={filterText}
        onChangeText={text => setFilterText(text)}
        placeholder={'search'}
        className={
          'rounded-[8px] w-[90%] py-[8px] px-[12px] text-[16px] border-[1px] border-subTextColor mt-[16px]'
        }
      />

      <FlatList
        removeClippedSubviews
        nestedScrollEnabled
        data={filterList}
        renderItem={memoizedValue}
        refreshing={isRefreshing}
        style={{ width: '100%', backgroundColor: Colors.whiteColor }}
        keyExtractor={item => item.description.name}
        ListEmptyComponent={emptyView('empty')}
        showsVerticalScrollIndicator={true}
      />
    </DynamicView>
  );
}

export default StakingValidators;
