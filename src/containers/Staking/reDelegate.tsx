import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useContext, useEffect, useMemo, useState } from 'react';
import { Colors } from '../../constants/theme';
import { BackHandler, FlatList } from 'react-native';
import EmptyView from '../../components/EmptyView';
import AppImages from '../../../assets/images/appImages';
import { StakingContext } from '../../core/util';
import { stakeValidators } from '../../core/Staking';
import * as C from '../../constants';

const {
  CText,
  DynamicView,
  DynamicImage,
  DynamicTouchView
} = require('../../styles');

export default function StakingReDelegate ({ route, navigation }) {
  const { t } = useTranslation();
  const { itemData, tokenData, currentValidatorName } = route.params;
  const [allValidatorsData, setAllValidatorsList] = useState<stakeValidators[]>([]);
  const stakingValidators = useContext<any>(StakingContext);

  useEffect(() => {
    const allData: stakeValidators[] = [];
    for (const item of stakingValidators.stateStaking.allValidators.values()) { allData.push(item); }
    allData?.sort((a, b) => ((a.tokens * 10 ** -18) > (b.tokens * 10 ** -18) ? -1 : 1));
    setAllValidatorsList(allData);
  }, []);

  const convert = n => {
    if (n < 1e3) return n;
    if (n >= 1e3 && n < 1e6) return +(n / 1e3).toFixed(1) + 'K';
    if (n >= 1e6 && n < 1e9) return +(n / 1e6).toFixed(1) + 'M';
    if (n >= 1e9 && n < 1e12) return +(n / 1e9).toFixed(1) + 'B';
    if (n >= 1e12) return +(n / 1e12).toFixed(1) + 'T';
  };

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

  const Item = ({ item }) => (
        <>
            {currentValidatorName !== item.description.name && <DynamicTouchView dynamic fD={'row'} dynamicWidth width={100} pV={16} pH={16}
                               bGC={item.description.name === stakingValidators.stateStaking.reValidator.description.name ? 'rgba(88, 173, 171, 0.09)' : Colors.whiteColor}
                               onPress={() => {
                                 stakingValidators.dispatchStaking({ value: { reValidator: item } });
                                 navigation.navigate(C.screenTitle.STAKING_MANAGEMENT, {
                                   itemData,
                                   tokenData,
                                   reDelegator: itemData.description.name
                                 });
                               }}>
                <DynamicView dynamic jC={'flex-start'} aLIT={'flex-start'}>
                    <CText dynamic fF={C.fontsName.FONT_SEMI_BOLD} fS={14} pV={5} tA={'left'}
                           color={Colors.primaryTextColor}>{item.description.name}</CText>
                    <DynamicView dynamic fD={'row'}>
                        <DynamicImage dynamic source={AppImages.GIFT_BOX_PNG} width={10} height={10}/>
                        <CText dynamic fF={C.fontsName.FONT_SEMI_BOLD} mL={4} fS={12} tA={'left'}
                               color={Colors.subTextColor}>{item.commission * 100 + '%'}</CText>
                        <DynamicImage dynamic mL={10} source={AppImages.COINS} width={14} height={12}/>
                        <CText dynamic mL={4} fF={C.fontsName.FONT_SEMI_BOLD} fS={12} tA={'left'}
                               color={Colors.subTextColor}>{convert(item.tokens * (10 ** -18)) + ' EVMOS'}</CText>
                    </DynamicView>
                </DynamicView>

                {item.description.name === stakingValidators.stateStaking.reValidator.description.name &&
                    <DynamicView dynamic dynamicWidth width={25} jC={'flex-end'}>
                        <DynamicImage dynamic dynamicTintColor tC={Colors.toastColor} source={AppImages.CORRECT}
                                      width={15} height={10}/>
                    </DynamicView>
                }
            </DynamicTouchView>
            }
        </>
  );

  const renderItem = ({ item }) => (
        <Item item={item} />
  );

  const memoizedValue = useMemo(() => renderItem, [allValidatorsData]);

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

  return (
       <DynamicView dynamic>
           <FlatList
               removeClippedSubviews
               nestedScrollEnabled
               data={allValidatorsData }
               renderItem={memoizedValue}
               style={{ width: '100%', backgroundColor: Colors.whiteColor }}
               keyExtractor={item => item.description.name}
               ListEmptyComponent={emptyView('empty')}
               showsVerticalScrollIndicator={true}
           />
       </DynamicView>
  );
}
