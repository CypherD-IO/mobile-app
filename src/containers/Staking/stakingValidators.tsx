import * as React from 'react';
import SwitchView from '../../components/SwitchView';
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
import { CyDImage, CyDTextInput } from '../../styles/tailwindStyles';

const {
  CText,
  DynamicView,
  DynamicImage,
  DynamicTouchView
} = require('../../styles');

function StakingValidators ({ route, navigation }) {
  const { tokenData, typeOfAction } = route.params;
  const { t } = useTranslation();

  const stakingValidators = useContext<any>(StakingContext);
  const [index, setIndex] = useState<number>(stakingValidators.stateStaking.totalStakedBalance != BigInt(0) ? 0 : 1);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [myValidatorsData, setMyValidatorsList] = useState<stakeValidators[]>([]);
  const [allValidatorsData, setAllValidatorsList] = useState<stakeValidators[]>([]);
  const [showDelegationModal, setShowDelegationModal] = useState<boolean>(false);
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
    for (const item of stakingValidators.stateStaking.myValidators.values()) { myData.push(item); }
    for (const item of stakingValidators.stateStaking.allValidators.values()) { allData.push(item); }
    myData?.sort((a, b) => (parseInt(String(a.tokens)) > parseInt(String(b.tokens)) ? -1 : 1));
    allData?.sort((a, b) => (parseInt(String(a.tokens)) > parseInt(String(b.tokens)) ? -1 : 1));
    setFilterList(index === 0 ? myData : allData);
    setMyValidatorsList(myData);
    setAllValidatorsList(allData);
  }, []);

  useEffect(() => {
    if (allValidatorsData.length > 0) {
      if (filterText === '') {
        index === 1 ? setFilterList(allValidatorsData) : setFilterList(myValidatorsData);
      } else {
        const filteredValidators = index === 1
          ? allValidatorsData.filter((item: stakeValidators) => item.description.name.toLowerCase().startsWith(filterText.toLowerCase()))
          : myValidatorsData.filter((item: stakeValidators) => item.description.name.toLowerCase().startsWith(filterText.toLowerCase()));
        setFilterList(filteredValidators);
      }
    }
  }, [filterText, index]);

  const emptyView = (view: any) => {
    return (
            <DynamicView dynamic dynamicWidth dynamicHeight height={80} width={100} mT={0} bGC={Colors.whiteColor} aLIT={'center'}>
                {view === 'empty'
                  ? <EmptyView
                        text={t('NO_CURRENT_HOLDINGS')}
                        image={AppImages.EMPTY}
                        buyVisible={false}
                        marginTop={80}
                    />
                  : <></>}
            </DynamicView>
    );
  };

  const convert = n => {
    if (n < 1e3) return n;
    if (n >= 1e3 && n < 1e6) return +(n / 1e3).toFixed(1) + 'K';
    if (n >= 1e6 && n < 1e9) return +(n / 1e6).toFixed(1) + 'M';
    if (n >= 1e9 && n < 1e12) return +(n / 1e9).toFixed(1) + 'B';
    if (n >= 1e12) return +(n / 1e12).toFixed(1) + 'T';
  };

  const Item = ({ item }) => (
            <DynamicView dynamic fD={'row'} dynamicWidth width={100} pT={32} pH={16} >

                <DynamicView dynamic jC={'flex-start'} aLIT={'flex-start'} >
                    <CText dynamic fF={C.fontsName.FONT_SEMI_BOLD} fS={14} pV={4} tA={'left'}
                           color={Colors.secondaryTextColor}>{item.description.name}</CText>
                    {item.balance !== BigInt(0) && <DynamicView fD={'row'} dynamic mB={4}>
                        <DynamicImage dynamic mR={4} source={AppImages.EVMOS_LOGO} width={14} height={14}/>
                        <CText dynamic fF={C.fontsName.FONT_SEMI_BOLD} fS={14} tA={'left'}
                            color={Colors.primaryTextColor}>{'Staked ' + (parseFloat(item.balance) * (10 ** -18)).toFixed(2)}</CText>
                    </DynamicView>
                    }
                    <DynamicView dynamic fD={'row'} aLIT={'center'} jC={'center'}>
                      {item.apr !== '0.00' && <CyDImage source={AppImages.APR_ICON} className={'w-[20px] h-[16px]'} />}
                      {item.apr !== '0.00' && <CText dynamic mL={4} fF={C.fontsName.FONT_SEMI_BOLD} fS={12} tA={'left'}
                                                     color={Colors.subTextColor}>{`APR ${item.apr}`}</CText>}
                        <DynamicImage dynamic mL={10} source={AppImages.COINS} width={16} height={16}/>
                        <CText dynamic mL={4} fF={C.fontsName.FONT_SEMI_BOLD} fS={12} tA={'left'} color={Colors.subTextColor}>{convert(parseFloat(item.tokens) * (10 ** -18))}</CText>
                    </DynamicView>

                    {item.jailed &&
                        <DynamicView dynamic fD={'row'} aLIT={'center'} jC={'center'}>
                            <DynamicImage dynamic source={AppImages.CLOSE_CIRCLE} dynamicTintColor tC={'red'} width={16} height={16}/>
                            <CText dynamic fF={C.fontsName.FONT_SEMI_BOLD} fS={14} pV={4} tA={'left'} mL={8}
                                   color={Colors.redOffColor}>Jailed</CText>
                        </DynamicView>
                    }
                </DynamicView>

                <DynamicView dynamic>
                    <DynamicTouchView sentry-label='evmos-portfolio-stake' dynamic dynamicWidthFix width={94}
                                      bR={30}
                                      bO={1} style={{ borderColor: '#FFDE59' }}
                                      bGC={Colors.whiteColor}
                                      onPress={() => {
                                        setData({ ...item, logo: tokenData.chainDetails.backendName });
                                        setShowDelegationModal(true);
                                      }}>
                        <DynamicView dynamic aLIT={'center'} jC={'center'}>
                            <CText dynamic fF={C.fontsName.FONT_BOLD} fS={14} pV={12}
                                   color={Colors.primaryTextColor}>Manage</CText>
                        </DynamicView>
                    </DynamicTouchView>
                </DynamicView>

            </DynamicView>
  );

  const renderItem = ({ item }) => (
        <Item item={item} />
  );

  const memoizedValue = useMemo(() => renderItem, [myValidatorsData, index]);

  return (
      <DynamicView dynamic dynamicHeight height={100} bGC={Colors.whiteColor}>
        <DynamicView dynamic dynamicWidth width={100} fD={'row'} jC={'center'}
                     bGC={Colors.whiteColor} style={{ paddingRight: 16 }}>

            <StakeOptionsModal
                isModalVisible={showDelegationModal}
                onPress={() => {
                  setShowDelegationModal(false);
                  navigation.navigate(C.screenTitle.STAKING_MANAGEMENT, {
                    itemData: data,
                    tokenData
                  });
                }}
                onCancelPress={() => {
                  setShowDelegationModal(false);
                }}
                data={data}
                typeOfAction={typeOfAction}
            />

            {typeOfAction === 'stake' && <SwitchView
                title1={t('Staked')}
                title2={t('All Validators')}
                index={index}
                setIndexChange={(index) => {
                  setIndex(index);
                }}
                style={{ marginBottom: 10 }}
            />}
        </DynamicView>

        <CyDTextInput
          value={filterText}
          onChangeText={(text) => setFilterText(text)}
          placeholder={'search'}
          className={'rounded-[8px] w-[90%] py-[8] px-[12] text-[16px] border-[1px] border-subTextColor mt-[16px]'}
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
