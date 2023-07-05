import * as React from 'react';
import { Colors } from '../../constants/theme';
import * as C from '../../constants';
import AppImages from '../../../assets/images/appImages';
import { useContext, useState } from 'react';
import { StakingContext } from '../../core/util';
import { BackHandler, FlatList } from 'react-native';
import EmptyView from '../../components/EmptyView';
import { useTranslation } from 'react-i18next';
import * as Progress from 'react-native-progress';

const {
  CText,
  DynamicView
} = require('../../styles');

export default function Unboundings ({ route, navigation }) {
  const stakingValidators = useContext<any>(StakingContext);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const { t } = useTranslation();

  const handleBackButton = () => {
    navigation.goBack();
    return true;
  };

  React.useEffect(() => {
    BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
    };
  }, []);

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

  const convertDate = (date) => {
    const today = new Date(date);
    const yyyy = today.getFullYear();
    const mm = today.getMonth() + 1;
    const dd = today.getDate();

    return dd + '-' + mm + '-' + yyyy;
  };

  const daysRemaining = (date) => {
    const oneDay = 1000 * 60 * 60 * 24;
    const EndDate = new Date(date);
    const StartDate = new Date();
    const start = Date.UTC(EndDate.getFullYear(), EndDate.getMonth(), EndDate.getDate());
    const end = Date.UTC(StartDate.getFullYear(), StartDate.getMonth(), StartDate.getDate());
    return (start - end) / oneDay;
  };

  const progressPercentage = (date) => {
    const data = new Date(date);
    const today = new Date();

    let difference = data.getTime() - today.getTime();
    difference = difference / (1000 * 3600 * 24);
    return (1 - (difference / 14));
  };

  const Item = ({ item, index }) => (
        <DynamicView dynamic mL={12} mR={12} mB={index === stakingValidators.stateStaking.unBoundingsList.length - 1 ? 50 : 30}>
            <DynamicView dynamic fD={'row'} dynamicWidth width={100} >
                <CText dynamic fF={C.fontsName.FONT_SEMI_BOLD} fS={12} pV={5} tA={'left'}
                       color={Colors.primaryTextColor}>{(item.balance * (10 ** -18)).toFixed(3) + ' EVMOS'}</CText>
                <CText dynamic fF={C.fontsName.FONT_SEMI_BOLD} fS={12} color={Colors.subTextColor}>{convertDate(item.completion_time)}</CText>
            </DynamicView>
            <DynamicView dynamic fD={'row'} dynamicWidth width={100} jC={'flex-start'} aLIT={'flex-start'}>
                <CText dynamic fF={C.fontsName.FONT_SEMI_BOLD} fS={12} tA={'left'}
                       color={Colors.subTextColor}>{daysRemaining(item.completion_time) + ' days remaining'}</CText>
            </DynamicView>
            <DynamicView dynamic dynamicWidth width={100} fD={'row'} mT={10} style={{ flex: 1 }}>
                <Progress.Bar progress={progressPercentage(item.completion_time)}
                              width={350} height={5} unfilledColor={'#EFEDED'}
                              color={'#8372FC'} borderColor={'#EFEDED'}
                />
            </DynamicView>
        </DynamicView>
  );

  const renderItem = ({ item, index }) => (
        <Item item={item} index={index}/>
  );

  return (
        <DynamicView dynamic dynamicHeight height={100}>

            <FlatList
                nestedScrollEnabled
                data={ stakingValidators.stateStaking.unBoundingsList }
                renderItem={renderItem}
                refreshing={isRefreshing}
                style={{ width: '100%', backgroundColor: Colors.whiteColor, paddingTop: 40 }}
                keyExtractor={item => item.completion_time}
                ListEmptyComponent={emptyView('empty')}
                showsVerticalScrollIndicator={true}
            />
        </DynamicView>
  );
}
