import * as C from '../../constants';
import React, { useState, useEffect, useContext } from 'react';
import { Switch, FlatList, BackHandler } from 'react-native';
import { Colors } from '../../constants/theme';
import { useTranslation } from 'react-i18next';
import axios from '../../core/Http';
import * as Sentry from '@sentry/react-native';
import { HdWalletContext } from '../../core/util';
import AppImages from '../../../assets/images/appImages';
import EmptyView from '../../components/EmptyView';
import { hostWorker } from '../../global';
import { GlobalContext } from '../../core/globalContext';

const { CText, SafeAreaView, DynamicView } = require('../../styles');

export interface NotificationList {
  id: string
  info: string
}

export interface NotificationPreferences {
  [key: string]: boolean
}

export default function NotificationSettings (props) {
  const { t } = useTranslation();

  const globalContext = useContext<any>(GlobalContext);
  const hdWalletContext = useContext<any>(HdWalletContext);
  const ARCH_HOST: string = hostWorker.getHost('ARCH_HOST');
  const [ethAddress, setEthAddress] = useState<String>(hdWalletContext.state.wallet.ethereum.address);
  const [notificationList, setNotificationList] = useState<NotificationList[]>([]);
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>({});

  const handleBackButton = () => {
    props.navigation.goBack();
    return true;
  };

  useEffect(() => {
    BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
    };
  }, []);

  const getNotificationList = async () => {
    try {
      const response = await axios.get(`${ARCH_HOST}/v1/notification`);
      setNotificationList(response.data.notificationOptions);
    } catch (err) {
      Sentry.captureException(err);
      throw err;
    }
  };

  const getNotificationPreferences = async () => {
    try {
      if (ethAddress) {
        const headers = {
          headers: { Authorization: `Bearer ${String(globalContext.globalState.token)}` }
        };
        const response = await axios.get(`${ARCH_HOST}/v1/notification/settings`, headers);
        const data = response.data;
        if (Object.keys(data).length > 0) setNotificationPreferences(data.preference);
        else setNotificationPreferences({});
      }
    } catch (err) {
      Sentry.captureException(err);
      throw err;
    }
  };

  const updateNotificationPreference = async (payload) => {
    try {
      const headers = {
        headers: { Authorization: `Bearer ${String(globalContext.globalState.token)}` }
      };
      const response = await axios.patch(`${ARCH_HOST}/v1/notification/settings`, payload, headers);
      const data = response.data;
      setNotificationPreferences(data.preference);
    } catch (err) {
      Sentry.captureException(err);
      throw err;
    }
  };

  useEffect(() => {
    getNotificationList();
    getNotificationPreferences();
  }, []);

  const emptyView = () => {
    return (
        <DynamicView dynamic dynamicWidth dynamicHeight height={100} width={100} jC='flex-start' bGC={Colors.whiteColor}>
          <EmptyView
            text={'Loading...'}
            image={AppImages.LOADING_IMAGE}
            buyVisible={false}
            marginTop={50}
            isLottie={true}
          />
        </DynamicView>
    );
  };

  const Item = ({ item }) => {
    let enabled = true;
    const id = item.id;
    if (id in notificationPreferences) {
      enabled = notificationPreferences[item.id];
    }

    const [isEnabled, setIsEnabled] = useState(enabled);
    const toggleSwitch = () => {
      setIsEnabled(previousState => !previousState);

      const payload = {
        id: item.id,
        enabled: !isEnabled
      };

      updateNotificationPreference(payload);
    };

    return (
        <DynamicView dynamic dynamicWidth width={100} fD={'row'} pV={16} pH={15} >
          <DynamicView dynamic dynamicWidth width={100} fD={'row'} pT={32} >

            <DynamicView dynamic dynamicHeightFix height={40} fD={'row'} bR={20}>
              <DynamicView dynamic dynamicWidthFix width={230} dynamicHeightFix height={40} aLIT='flex-start' fD={'column'} jC='center'>
                <CText tA={'left'} dynamic fF={C.fontsName.FONT_BOLD} fS={16} color={Colors.primaryTextColor}>{t(item.id)}</CText>
                <CText tA={'left'} dynamic fF={C.fontsName.FONT_SEMI_BOLD} fS={12} color={Colors.subTextColor}>{item.info}</CText>
              </DynamicView>
            </DynamicView>

            <DynamicView dynamic dynamicHeightFix height={40} fD={'row'} jC='center'>
              <DynamicView dynamic dynamicWidthFix width={30} dynamicHeightFix height={40} aLIT='flex-end' fD={'column'} jC='center'>
                <Switch
                  onValueChange={toggleSwitch}
                  value={isEnabled}
                />
              </DynamicView>
            </DynamicView>

          </DynamicView>
        </DynamicView>
    );
  };

  const renderItem = ({ item }) => (
      <Item item={item} />
  );

  // NOTE: LIFE CYCLE METHOD 🍎🍎🍎🍎
  return (
      <SafeAreaView dynamic>
        <DynamicView dynamic dynamicWidth dynamicHeight height={100} width={100} jC='flex-start' bGC={Colors.whiteColor}>
          <DynamicView dynamic dynamicWidth width={100} fD={'column'} jC='center' aLIT='center' pT={20} pH={6}>
            <CText tA={'left'} dynamic fF={C.fontsName.FONT_SEMI_BOLD} fS={13} color={Colors.subTextColor}>
              Stay up to date! Enable to receive various notifications for incoming and outgoing transactions.
            </CText>
          </DynamicView>
          <FlatList
            data={notificationList}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            ListEmptyComponent={emptyView()}
          />
        </DynamicView>
      </SafeAreaView>
  );
}
