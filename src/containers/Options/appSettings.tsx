import React from 'react';
import {
  CyDView,
  CyDTouchView,
  CyDText,
  CyDImage,
  CyDFlatList,
  CyDImageBackground,
} from '../../styles/tailwindStyles';
import { useTranslation } from 'react-i18next';
import AppImages from '../../../assets/images/appImages';
import { screenTitle } from '../../constants';
import { BackHandler } from 'react-native';

interface IAppSettingsData {
  index: number;
  title: string;
  logo: any;
  navigateTo?: string;
}
const appSettingsData: IAppSettingsData[] = [
  {
    index: 0,
    title: 'Notifications',
    logo: AppImages.BELL,
    navigateTo: screenTitle.NOTIFICATION_SETTINGS,
  },
  {
    index: 1,
    title: 'Advanced Settings',
    logo: AppImages.ADVANCED_SETTINGS,
    navigateTo: screenTitle.ADVANCED_SETTINGS,
  },
];

const renderSettingsData = (item: IAppSettingsData, navigation: any) => {
  return (
    <CyDView className={'mx-[24px]'}>
      <CyDTouchView
        className={'flex flex-row justify-between pl-[15px] py-[24px]'}
        onPress={() => {
          navigation.navigate(item.navigateTo);
        }}>
        <CyDView className={'flex flex-row items-center'}>
          <CyDView
            className={
              'flex items-center justify-center h-[27px] w-[27px] rounded-[7px] mr-[14px]'
            }>
            <CyDImage
              source={item.logo}
              className={'w-[17px] h-[17px]'}
              resizeMode={'contain'}
            />
          </CyDView>
          <CyDText className={'font-semibold text-[16px] text-[#434343]'}>
            {item.title}
          </CyDText>
        </CyDView>
        {item.index === 1 ? (
          <CyDImage
            source={AppImages.OPTIONS_ARROW}
            className={'w-[11%] h-[15px]'}
            resizeMode={'contain'}
          />
        ) : (
          <CyDView></CyDView>
        )}
      </CyDTouchView>
      <CyDView className={'h-[01px] bg-portfolioBorderColor'} />
    </CyDView>
  );
};

export default function AppSettings({ navigation }) {
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

  return (
    <CyDView className={'bg-n0 h-full '}>
      <CyDImageBackground
        className={'h-[50%] pt-[30px]'}
        source={AppImages.BG_SETTINGS}
        resizeMode={'cover'}>
        <CyDFlatList
          data={appSettingsData}
          renderItem={({ item }) => renderSettingsData(item, navigation)}
          keyExtractor={item => item.index}
        />
      </CyDImageBackground>
    </CyDView>
  );
}
