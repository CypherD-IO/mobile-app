import React, { useState, useEffect, useContext } from 'react';
import { Switch, FlatList, BackHandler } from 'react-native';
import { useTranslation } from 'react-i18next';
import axios from '../../core/Http';
import * as Sentry from '@sentry/react-native';
import { HdWalletContext } from '../../core/util';
import { hostWorker } from '../../global';
import { GlobalContext } from '../../core/globalContext';
import {
  CyDSafeAreaView,
  CyDText,
  CyDView,
} from '../../styles/tailwindComponents';
import Loading from '../../components/v2/loading';
import { get } from 'lodash';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';

export interface NotificationList {
  id: string;
  info: string;
}

export interface NotificationPreferences {
  [key: string]: boolean;
}

export default function NotificationSettings() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  const globalContext = useContext<any>(GlobalContext);
  const hdWalletContext = useContext<any>(HdWalletContext);
  const ARCH_HOST: string = hostWorker.getHost('ARCH_HOST');
  const ethereumAddress = get(
    hdWalletContext,
    'state.wallet.ethereum.address',
    undefined,
  );
  const [notificationList, setNotificationList] = useState<NotificationList[]>(
    [],
  );
  const [notificationPreferences, setNotificationPreferences] =
    useState<NotificationPreferences>({});

  const handleBackButton = () => {
    navigation.goBack();
    return true;
  };

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackButton,
    );
    return () => {
      subscription.remove();
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
      if (ethereumAddress) {
        const headers = {
          headers: {
            Authorization: `Bearer ${String(globalContext.globalState.token)}`,
          },
        };
        const response = await axios.get(
          `${ARCH_HOST}/v1/notification/settings`,
          headers,
        );
        const data = response.data;
        if (Object.keys(data).length > 0)
          setNotificationPreferences(data.preference);
        else setNotificationPreferences({});
      }
    } catch (err) {
      Sentry.captureException(err);
      throw err;
    }
  };

  const updateNotificationPreference = async payload => {
    try {
      const headers = {
        headers: {
          Authorization: `Bearer ${String(globalContext.globalState.token)}`,
        },
      };
      const response = await axios.patch(
        `${ARCH_HOST}/v1/notification/settings`,
        payload,
        headers,
      );
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
    return <Loading />;
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
        enabled: !isEnabled,
      };

      updateNotificationPreference(payload);
    };

    return (
      <CyDView className='flex flex-row justify-between pt-8 p-4'>
        <CyDView className='flex-row h-10 rounded-2xl'>
          <CyDView className='w-[230px] h-10 justify-center'>
            <CyDText className='text-left font-bold text-[16px]'>
              {t(item.id)}
            </CyDText>
            <CyDText className='text-left font-semibold text-[12px] text-subTextColor'>
              {item.info}
            </CyDText>
          </CyDView>
        </CyDView>

        <CyDView className='h-10 flex-row justify-center'>
          <CyDView className='w-[30px] h-10 items-end justify-center'>
            <Switch onValueChange={toggleSwitch} value={isEnabled} />
          </CyDView>
        </CyDView>
      </CyDView>
    );
  };

  const renderItem = ({ item }) => <Item item={item} />;

  // NOTE: LIFE CYCLE METHOD 🍎🍎🍎🍎
  return (
    <CyDSafeAreaView className='bg-n20 flex-1'>
      <CyDView className='h-full w-full justify-start'>
        <CyDView className='w-full justify-center items-center pt-5 px-1.5'>
          <CyDText className='text-left font-semibold text-[13px] text-subTextColor'>
            Stay up to date! Enable to receive various notifications for
            incoming and outgoing transactions.
          </CyDText>
        </CyDView>
        <FlatList
          data={notificationList}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          ListEmptyComponent={emptyView()}
        />
      </CyDView>
    </CyDSafeAreaView>
  );
}
