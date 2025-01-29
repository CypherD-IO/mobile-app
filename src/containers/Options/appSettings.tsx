import React from 'react';
import { BackHandler } from 'react-native';
import AppImages from '../../../assets/images/appImages';
import { screenTitle } from '../../constants';
import {
  CyDFlatList,
  CyDImage,
  CyDMaterialDesignIcons,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindStyles';

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
    logo: 'bell-ring-outline',
    navigateTo: screenTitle.NOTIFICATION_SETTINGS,
  },
  {
    index: 1,
    title: 'Advanced Settings',
    logo: 'cogs',
    navigateTo: screenTitle.ADVANCED_SETTINGS,
  },
  {
    index: 2,
    title: 'Appearance',
    logo: 'theme-light-dark',
    navigateTo: screenTitle.THEME,
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
            <CyDMaterialDesignIcons
              name={item.logo}
              size={24}
              className='text-base400'
            />
          </CyDView>
          <CyDText className={' text-[16px]'}>{item.title}</CyDText>
        </CyDView>

        <CyDMaterialDesignIcons
          name={'chevron-right'}
          size={24}
          className='text-base400'
        />
      </CyDTouchView>
      <CyDView className={'h-[01px] bg-n40'} />
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
    <CyDView className={'bg-n20 h-full '}>
      <CyDView className={'h-[50%] pt-[30px]'}>
        <CyDFlatList
          data={appSettingsData}
          renderItem={({ item }) => renderSettingsData(item, navigation)}
          keyExtractor={item => item.index}
        />
      </CyDView>
    </CyDView>
  );
}
