import React, { useContext, useEffect, useState } from 'react';
import {
  CyDView,
  CyDText,
  CyDImage,
  CyDTouchView,
  CyDScrollView,
} from '../../styles/tailwindStyles';
import { BackHandler, Switch } from 'react-native';
import { getIBC, setIBC } from '../../core/asyncStorage';
import { GlobalContext } from '../../core/globalContext';
import { GlobalContextType } from '../../constants/enum';
import AppImages from '../../../assets/images/appImages';
import { useTranslation } from 'react-i18next';
import { screenTitle } from '../../constants';
export interface IAdvancedSettingsData {
  ibc: boolean;
}

export const advancedSettingsInitialState = {
  ibc: false,
};

export default function AdvancedSettings({ navigation }) {
  const [IBCStatus, setIBCStatus] = useState<boolean>(false);
  const globalContext = useContext<any>(GlobalContext);
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

  useEffect(() => {
    const getData = async () => {
      const data = await getIBC();
      let tempStatus = false;
      if (data === 'true') tempStatus = true;
      setIBCStatus(tempStatus);
    };
    void getData();
  }, []);

  return (
    <CyDScrollView className={'bg-n0 h-full px-[24px] pt-[40px]'}>
      <CyDView className={'flex flex-row justify-between items-center'}>
        <CyDView>
          <CyDText className={'font-bold text-[18px]'}>
            {t<string>('IBC')}
          </CyDText>
          <CyDText
            className={'font-medium text-subTextColor w-9/12'}
            numberOfLines={3}>
            Inter Chain transfer in Cosmos eco-system
          </CyDText>
        </CyDView>
        <Switch
          onValueChange={async () => {
            const tempStatus = !IBCStatus;
            globalContext.globalDispatch({
              type: GlobalContextType.IBC,
              ibc: tempStatus,
            });
            setIBCStatus(tempStatus);
            await setIBC(tempStatus);
          }}
          value={IBCStatus}
        />
      </CyDView>
      <CyDView className={'h-[01px] my-[14px] bg-portfolioBorderColor'} />
      <CyDTouchView
        onPress={() => {
          navigation.navigate(screenTitle.HOSTS_AND_RPC_SCREEN);
        }}
        className={'flex flex-row justify-between items-center'}>
        <CyDView>
          <CyDText className={'font-bold text-[18px]'}>
            {t<string>('HOSTS_AND_RPC_INIT_CAPS')}
          </CyDText>
          <CyDText
            className={'font-medium text-subTextColor w-9/12'}
            numberOfLines={3}>
            Get a glimpse of the nodes being used
          </CyDText>
        </CyDView>
      </CyDTouchView>
    </CyDScrollView>
  );
}
