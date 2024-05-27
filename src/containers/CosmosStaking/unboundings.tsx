import React, { useContext, useState } from 'react';
import { CyDView, CyDText, CyDFlatList } from '../../styles/tailwindStyles';
import Empty from '../../components/v2/empty';
import { useTranslation } from 'react-i18next';
import { BackHandler } from 'react-native';
import {
  CosmosStakingContext,
  cosmosStakingContextDef,
  IUnboundings,
} from '../../reducers/cosmosStakingReducer';
import * as Progress from 'react-native-progress';
import { convertFromUnitAmount } from '../../core/util';

export default function CosmosUnboundings({ route, navigation }) {
  const { tokenData } = route.params;
  const cosmosStaking =
    useContext<cosmosStakingContextDef>(CosmosStakingContext);
  const [unboundings, setUnboundings] = useState([]);
  const { t } = useTranslation();

  const handleBackButton = () => {
    navigation.goBack();
    return true;
  };

  React.useEffect(() => {
    navigation.setOptions({
      title: 'Unboundings',
    });

    BackHandler.addEventListener('hardwareBackPress', handleBackButton);

    const allData: IUnboundings = [];
    for (const item of cosmosStaking.cosmosStakingState.unBoundings.values()) {
      allData.push(item);
    }
    setUnboundings(allData);

    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
    };
  }, []);

  const convertDate = date => {
    const today = new Date(date);
    const yyyy = today.getFullYear();
    const mm = today.getMonth() + 1;
    const dd = today.getDate();

    return `${yyyy} - ${mm} - ${dd}`;
  };

  const daysRemaining = date => {
    const oneDay = 1000 * 60 * 60 * 24;
    const EndDate = new Date(date);
    const StartDate = new Date();
    const start = Date.UTC(
      EndDate.getFullYear(),
      EndDate.getMonth(),
      EndDate.getDate(),
    );
    const end = Date.UTC(
      StartDate.getFullYear(),
      StartDate.getMonth(),
      StartDate.getDate(),
    );
    return (start - end) / oneDay;
  };

  const progressPercentage = date => {
    const data = new Date(date);
    const today = new Date();

    let difference = data.getTime() - today.getTime();
    difference = difference / (1000 * 3600 * 24);
    return 1 - difference / 14;
  };

  const Item = ({ item }) => {
    return (
      <CyDView>
        <CyDView className={'mx-[20px] mt-[20px]'}>
          <CyDView className={'flex flex-row justify-between'}>
            <CyDText
              className={
                'text-[16px] font-nunito font-bold text-primaryTextColor'
              }>{`${convertFromUnitAmount(item.balance.toString(), tokenData.contractDecimals)} ${tokenData.name}`}</CyDText>
            <CyDText
              className={
                'text-[16px] font-nunito font-semibold text-subTextColor'
              }>
              {convertDate(item.completionTime)}
            </CyDText>
          </CyDView>

          <CyDView className={'mt-[6px] mb-[12px]'}>
            <CyDText
              className={
                'text-[16px] font-nunito font-semibold text-subTextColor'
              }>{`${daysRemaining(item.completionTime)}${t(' days remaining')}`}</CyDText>
          </CyDView>
        </CyDView>
        <CyDView className={'mx-[20px]'}>
          <Progress.Bar
            progress={progressPercentage(item.completionTime)}
            width={350}
            height={5}
            unfilledColor={'#EFEDED'}
            color={'#8372FC'}
            borderColor={'#EFEDED'}
          />
        </CyDView>
      </CyDView>
    );
  };
  const renderItem = ({ item, index }) => <Item item={item} />;

  return (
    <CyDView className={'bg-white h-full w-full'}>
      <CyDFlatList
        data={unboundings}
        renderItem={renderItem}
        ListEmptyComponent={Empty}
      />
    </CyDView>
  );
}
