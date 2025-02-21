import notifee, {
  AndroidImportance,
  AndroidStyle,
} from '@notifee/react-native';
import firebase from '@react-native-firebase/app';
import { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import * as Sentry from '@sentry/react-native';
import { hostWorker } from '../global';
import axios from '../core/Http';
import { isAddressSet } from '../core/util';
import {
  CardControlTypes,
  CypherDeclineCodes,
  GlobalModalType,
  NOTIFE_ACTIONS,
  RPCODES,
} from '../constants/enum';
import { screenTitle } from '../constants';
import { NavigationProp, ParamListBase } from '@react-navigation/native';

export const getToken = async (
  walletAddress: string,
  cosmosAddress?: string,
  osmosisAddress?: string,
  nobleAddress?: string,
  coreumAddress?: string,
) => {
  const ARCH_HOST: string = hostWorker.getHost('ARCH_HOST');
  try {
    const fcmToken = await firebase.messaging().getToken();
    if (isAddressSet(walletAddress)) {
      const registerURL = `${ARCH_HOST}/v1/configuration/device/register`;
      const payload = {
        address: walletAddress,
        cosmosAddress,
        osmosisAddress,
        nobleAddress,
        coreumAddress,
        fcmToken,
      };
      try {
        await axios.put(registerURL, payload);
        return { fcmToken };
      } catch (error) {
        Sentry.captureException(error);
        return { error };
      }
    } else {
      return { error: 'Wallet address is not set' };
    }
  } catch (e) {
    Sentry.captureException(e);
    return { error: e };
  }
};

async function createNotificationChannel() {
  const channelId = await notifee.createChannel({
    id: 'default',
    name: 'Default Channel',
    importance: AndroidImportance.HIGH,
  });
  return channelId;
}

const getAndroidActions = (categoryId?: CypherDeclineCodes | RPCODES) => {
  switch (categoryId) {
    case CypherDeclineCodes.INT_COUNTRY:
      return [
        {
          title: 'Add Country',
          pressAction: {
            id: NOTIFE_ACTIONS.ADD_COUNTRY,
            launchActivity: 'default',
          },
        },
        {
          title: 'Enable Zero Restriction',
          pressAction: {
            id: NOTIFE_ACTIONS.ENABLE_ZERO_RESTRICTION_MODE,
            launchActivity: 'default',
          },
        },
      ];
    case CypherDeclineCodes.INT_CHANNEL_LIMIT:
      return [
        {
          title: 'Increase International Limit',
          pressAction: {
            id: NOTIFE_ACTIONS.INCREASE_INTERNATIONAL_LIMIT,
            launchActivity: 'default',
          },
        },
        {
          title: 'Enable Zero Restriction',
          pressAction: {
            id: NOTIFE_ACTIONS.ENABLE_ZERO_RESTRICTION_MODE,
            launchActivity: 'default',
          },
        },
      ];
    case CypherDeclineCodes.DOM_CHANNEL_LIMIT:
      return [
        {
          title: 'Increase Domestic Limit',
          pressAction: {
            id: NOTIFE_ACTIONS.INCREASE_DOMESTIC_LIMIT,
            launchActivity: 'default',
          },
        },
        {
          title: 'Enable Zero Restriction',
          pressAction: {
            id: NOTIFE_ACTIONS.ENABLE_ZERO_RESTRICTION_MODE,
            launchActivity: 'default',
          },
        },
      ];
    case CypherDeclineCodes.DAILY_LIMIT:
      return [
        {
          title: 'Increase Daily Limit',
          pressAction: {
            id: NOTIFE_ACTIONS.INCREASE_DAILY_LIMIT,
            launchActivity: 'default',
          },
        },
        {
          title: 'Enable Zero Restriction',
          pressAction: {
            id: NOTIFE_ACTIONS.ENABLE_ZERO_RESTRICTION_MODE,
            launchActivity: 'default',
          },
        },
      ];
    case CypherDeclineCodes.MONTHLY_LIMIT:
      return [
        {
          title: 'Increase Monthly Limit',
          pressAction: {
            id: NOTIFE_ACTIONS.INCREASE_MONTHLY_LIMIT,
            launchActivity: 'default',
          },
        },
        {
          title: 'Enable Zero Restriction',
          pressAction: {
            id: NOTIFE_ACTIONS.ENABLE_ZERO_RESTRICTION_MODE,
            launchActivity: 'default',
          },
        },
      ];

    case CypherDeclineCodes.RATE_CHECK_USER:
    case CypherDeclineCodes.LOCATION_CHECK_USER:
      return [
        {
          title: 'Enable Zero Restriction Mode',
          pressAction: {
            id: NOTIFE_ACTIONS.ENABLE_ZERO_RESTRICTION_MODE,
            launchActivity: 'default',
          },
        },
      ];
    case RPCODES.CardIsNotActivated:
      return [
        {
          title: 'Activate Card',
          pressAction: {
            id: NOTIFE_ACTIONS.ACTIVATE_CARD,
            launchActivity: 'default',
          },
        },
      ];
    case RPCODES.CardIsBlocked:
      return [
        {
          title: 'Unblock Card',
          pressAction: {
            id: NOTIFE_ACTIONS.UNBLOCK_CARD,
            launchActivity: 'default',
          },
        },
      ];
  }
};

export const showNotification = async (
  notification: FirebaseMessagingTypes.Notification | undefined,
  data?: any,
) => {
  const channelId = await createNotificationChannel();
  const title = notification?.title ?? data?.notificationTitle;
  const body = notification?.body ?? data?.notificationBody;
  if (title && body) {
    await notifee.displayNotification({
      title,
      body,
      data,
      android: {
        channelId,
        actions: getAndroidActions(data?.categoryId),
        style: {
          type: AndroidStyle.BIGTEXT,
          text: body,
        },
      },
      ios: {
        categoryId: data?.categoryId ?? '',
      },
    });
  }
};

async function setCategories() {
  await notifee.setNotificationCategories([
    {
      id: CypherDeclineCodes.INT_COUNTRY,
      actions: [
        {
          id: NOTIFE_ACTIONS.ADD_COUNTRY,
          title: 'Add Country',
          foreground: true,
        },
        {
          id: NOTIFE_ACTIONS.ENABLE_ZERO_RESTRICTION_MODE,
          title: 'Enable Zero Restriction',
          foreground: true,
        },
      ],
    },
    {
      id: CypherDeclineCodes.INT_CHANNEL_LIMIT,
      actions: [
        {
          id: NOTIFE_ACTIONS.INCREASE_INTERNATIONAL_LIMIT,
          title: 'Increase International Limit',
          foreground: true,
        },
        {
          id: NOTIFE_ACTIONS.ENABLE_ZERO_RESTRICTION_MODE,
          title: 'Enable Zero Restriction',
          foreground: true,
        },
      ],
    },
    {
      id: CypherDeclineCodes.DOM_CHANNEL_LIMIT,
      actions: [
        {
          id: NOTIFE_ACTIONS.INCREASE_DOMESTIC_LIMIT,
          title: 'Increase Domestic Limit',
          foreground: true,
        },
        {
          id: NOTIFE_ACTIONS.ENABLE_ZERO_RESTRICTION_MODE,
          title: 'Enable Zero Restriction',
          foreground: true,
        },
      ],
    },
    {
      id: CypherDeclineCodes.DAILY_LIMIT,
      actions: [
        {
          id: NOTIFE_ACTIONS.INCREASE_DAILY_LIMIT,
          title: 'Increase Daily Limit',
          foreground: true,
        },
        {
          id: NOTIFE_ACTIONS.ENABLE_ZERO_RESTRICTION_MODE,
          title: 'Enable Zero Restriction',
          foreground: true,
        },
      ],
    },
    {
      id: CypherDeclineCodes.MONTHLY_LIMIT,
      actions: [
        {
          id: NOTIFE_ACTIONS.INCREASE_MONTHLY_LIMIT,
          title: 'Increase Monthly Limit',
          foreground: true,
        },
        {
          id: NOTIFE_ACTIONS.ENABLE_ZERO_RESTRICTION_MODE,
          title: 'Enable Zero Restriction',
          foreground: true,
        },
      ],
    },
    {
      id: CypherDeclineCodes.RATE_CHECK_USER,
      actions: [
        {
          id: NOTIFE_ACTIONS.ENABLE_ZERO_RESTRICTION_MODE,
          title: 'Enable Zero Restriction',
          foreground: true,
        },
      ],
    },
    {
      id: CypherDeclineCodes.LOCATION_CHECK_USER,
      actions: [
        {
          id: NOTIFE_ACTIONS.ENABLE_ZERO_RESTRICTION_MODE,
          title: 'Enable Zero Restriction',
          foreground: true,
        },
      ],
    },
    {
      id: RPCODES.CardIsNotActivated,
      actions: [
        {
          id: NOTIFE_ACTIONS.ACTIVATE_CARD,
          title: 'Activate Card',
          foreground: true,
        },
      ],
    },
    {
      id: RPCODES.CardIsBlocked,
      actions: [
        {
          id: NOTIFE_ACTIONS.UNBLOCK_CARD,
          title: 'Unblock Card',
          foreground: true,
        },
      ],
    },
  ]);
}

export async function RouteNotificationAction({
  notificationId,
  actionId,
  data,
  navigation,
  showModal,
  hideModal,
}: {
  notificationId: string;
  actionId: string;
  data?: any;
  navigation: NavigationProp<ParamListBase>;
  showModal: (type: GlobalModalType, data: any) => void;
  hideModal: () => void;
}) {
  switch (actionId) {
    case NOTIFE_ACTIONS.ACTIVATE_CARD:
    case NOTIFE_ACTIONS.ADD_COUNTRY:
    case NOTIFE_ACTIONS.UNBLOCK_CARD:
      showModal(GlobalModalType.CARD_ACTIONS_FROM_NOTIFICATION, {
        closeModal: () => {
          hideModal();
        },
        data: {
          ...data,
          navigation,
        },
      });

      break;
    case NOTIFE_ACTIONS.INCREASE_DOMESTIC_LIMIT:
      navigation?.navigate(screenTitle.CARD, {
        screen: screenTitle.DOMESTIC_CARD_CONTROLS,
        params: {
          cardId: data?.cardId,
          currentCardProvider: data?.provider,
          cardControlType: CardControlTypes.DOMESTIC,
        },
      });

      break;
    case NOTIFE_ACTIONS.INCREASE_INTERNATIONAL_LIMIT:
      navigation?.navigate(screenTitle.CARD, {
        screen: screenTitle.INTERNATIONAL_CARD_CONTROLS,
        params: {
          cardId: data?.cardId,
          currentCardProvider: data?.provider,
          cardControlType: CardControlTypes.INTERNATIONAL,
        },
      });
      break;
    case NOTIFE_ACTIONS.INCREASE_DAILY_LIMIT:
    case NOTIFE_ACTIONS.INCREASE_MONTHLY_LIMIT:
      navigation?.navigate(screenTitle.CARD, {
        screen: screenTitle.EDIT_USAGE_LIMITS,
        params: {
          card: {
            cardId: data?.cardId,
            type: data?.cardType,
            last4: data?.last4,
          },
          currentCardProvider: data?.provider,
        },
      });
      break;
    case NOTIFE_ACTIONS.ENABLE_ZERO_RESTRICTION_MODE:
      navigation?.navigate(screenTitle.CARD, {
        screen: screenTitle.CARD_CONTROLS_MENU,
        params: {
          cardId: data?.cardId,
          currentCardProvider: data?.provider,
        },
      });
      break;
  }

  if (notificationId) {
    await notifee.cancelNotification(notificationId);
  }
}

export async function requestUserPermission() {
  const authStatus = await firebase.messaging().requestPermission();
  const enabled =
    authStatus === firebase.messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === firebase.messaging.AuthorizationStatus.PROVISIONAL;

  if (enabled) {
    await notifee.requestPermission();

    await setCategories();
  }
}
