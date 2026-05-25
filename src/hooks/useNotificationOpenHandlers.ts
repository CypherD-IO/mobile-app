import notifee, { EventType } from '@notifee/react-native';
import {
  FirebaseMessagingTypes,
  getInitialNotification,
  getMessaging,
  onNotificationOpenedApp,
} from '@react-native-firebase/messaging';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import * as Sentry from '@sentry/react-native';
import { useCallback, useEffect, useRef } from 'react';
import { GlobalModalType } from '../constants/enum';
import {
  saveNotificationInboxItem,
  NotificationInboxSource,
} from '../notification/notificationInbox';
import { RouteNotificationAction } from '../notification/pushNotification';

let hasRegisteredNotifeeBackgroundEvent = false;
let latestNotificationInboxScope: string | undefined;

type PushNotificationHandler = (
  remoteMessage: FirebaseMessagingTypes.RemoteMessage | null,
) => Promise<void>;

interface UseNotificationOpenHandlersParams {
  navigation: NavigationProp<ParamListBase>;
  showModal: (type: GlobalModalType, data: any) => void;
  hideModal: () => void;
  notificationInboxScope?: string;
  onPushNotification: PushNotificationHandler;
}

export default function useNotificationOpenHandlers({
  navigation,
  showModal,
  hideModal,
  notificationInboxScope,
  onPushNotification,
}: UseNotificationOpenHandlersParams) {
  const navigationRef = useRef(navigation);
  const showModalRef = useRef(showModal);
  const hideModalRef = useRef(hideModal);
  const onPushNotificationRef = useRef(onPushNotification);

  useEffect(() => {
    latestNotificationInboxScope = notificationInboxScope;
  }, [notificationInboxScope]);

  useEffect(() => {
    navigationRef.current = navigation;
    showModalRef.current = showModal;
    hideModalRef.current = hideModal;
    onPushNotificationRef.current = onPushNotification;
  });

  const saveNotificationOpenToInbox = useCallback(
    async (
      notification: FirebaseMessagingTypes.RemoteMessage | any | null | undefined,
      source: NotificationInboxSource,
      markRead = false,
    ) =>
      await saveNotificationInboxItem(notification, {
        source,
        scopeId: latestNotificationInboxScope ?? notificationInboxScope,
        markRead,
      }),
    [notificationInboxScope],
  );

  useEffect(() => {
    const openPushNotification = async (
      response: FirebaseMessagingTypes.RemoteMessage | null,
    ) => {
      await saveNotificationOpenToInbox(response, 'notifee-open', true);
      await onPushNotificationRef.current(response);
    };

    const messagingInstance = getMessaging();
    void getInitialNotification(messagingInstance)
      .then(openPushNotification)
      .catch(error => {
        Sentry.captureException(error);
      });

    const unsubscribeNotificationOpenedApp = onNotificationOpenedApp(
      messagingInstance,
      openPushNotification,
    );

    notifee
      .getInitialNotification()
      .then(async response => {
        if (response?.notification) {
          await openPushNotification(response.notification as any);
        }
      })
      .catch(error => {
        Sentry.captureException(error);
      });

    if (!hasRegisteredNotifeeBackgroundEvent) {
      hasRegisteredNotifeeBackgroundEvent = true;
      notifee.onBackgroundEvent(async remoteMessage => {
        const { type, detail } = remoteMessage;
        const { notification, pressAction } = detail;

        if (type === EventType.DISMISSED && notification) {
          await saveNotificationInboxItem(notification as any, {
            source: 'notifee-dismiss',
            scopeId: latestNotificationInboxScope,
          });
          return;
        }

        if (type === EventType.PRESS && notification) {
          await saveNotificationInboxItem(notification as any, {
            source: 'notifee-open',
            scopeId: latestNotificationInboxScope,
            markRead: true,
          });
          return;
        }

        if (type === EventType.ACTION_PRESS && notification && pressAction?.id) {
          await saveNotificationInboxItem(notification as any, {
            source: 'notifee-action',
            scopeId: latestNotificationInboxScope,
            markRead: true,
          });
          if (notification.id) {
            await RouteNotificationAction({
              notificationId: notification.id,
              actionId: pressAction.id,
              data: notification.data,
              navigation: navigationRef.current,
              showModal: showModalRef.current,
              hideModal: hideModalRef.current,
            });
          }
        }
      });
    }

    const unsubscribe = notifee.onForegroundEvent(remoteMessage => {
      const { type, detail } = remoteMessage;
      const { notification, pressAction } = detail;

      if (type === EventType.DISMISSED && notification) {
        saveNotificationOpenToInbox(notification as any, 'notifee-dismiss').catch(
          error => {
            Sentry.captureException(error);
          },
        );
      }

      if (type === EventType.PRESS && notification) {
        openPushNotification(notification as any).catch(error => {
          Sentry.captureException(error);
        });
      }

      if (type === EventType.ACTION_PRESS && notification && pressAction?.id) {
        saveNotificationOpenToInbox(notification as any, 'notifee-action', true)
          .then(
            async () =>
              notification.id
                ? await RouteNotificationAction({
                    notificationId: notification.id,
                    actionId: pressAction.id,
                    data: notification?.data,
                    navigation: navigationRef.current,
                    showModal: showModalRef.current,
                    hideModal: hideModalRef.current,
                  })
                : undefined,
          )
          .catch(error => {
            Sentry.captureException(error);
          });
      }
    });

    return () => {
      unsubscribe();
      unsubscribeNotificationOpenedApp();
    };
  }, [saveNotificationOpenToInbox]);
}
