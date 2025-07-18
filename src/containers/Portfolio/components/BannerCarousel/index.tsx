import React, { memo, useContext, useEffect, useState } from 'react';
import CarouselItem from './BannerCarouselItem';
import { BannerRecord } from '../../../../models/bannerRecord.interface';
import { ActivityContext, HdWalletContext } from '../../../../core/util';
import moment from 'moment';
import {
  ActivityAny,
  ActivityReducerAction,
  ActivityStatus,
  ActivityType,
  DebitCardTransaction,
  ExchangeTransaction,
} from '../../../../reducers/activity_reducer';
import useAxios from '../../../../core/HttpRequest';
import * as Sentry from '@sentry/react-native';
import {
  NavigationProp,
  ParamListBase,
  useIsFocused,
  useNavigation,
} from '@react-navigation/native';
import { hostWorker } from '../../../../global';
import axios from '../../../../core/Http';
import {
  getDismissedActivityCardIDs,
  getDismissedMigrationCardIDs,
  getDismissedStaticCardIDs,
  setDismissedActivityCardIDs,
  setDismissedMigrationCardIDs,
  setDismissedStaticCardIDs,
} from '../../../../core/asyncStorage';
import { showToast } from '../../../utilities/toastUtility';
import { ACTIVITIES_REFRESH_TIMEOUT } from '../../../../constants/timeOuts';
import { CyDView } from '../../../../styles/tailwindComponents';
import CardCarousel from '../../../../components/v2/CardCarousel';
import { SharedValue } from 'react-native-reanimated';
import { get } from 'lodash';
import { MigrationData } from '../../../../models/migrationData.interface';

const ARCH_HOST = hostWorker.getHost('ARCH_HOST');

export type BridgeOrCardActivity = ExchangeTransaction | DebitCardTransaction;

const BannerCarousel = () => {
  const { getWithAuth } = useAxios();
  const isFocused = useIsFocused();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  const activityContext = useContext(ActivityContext);
  const hdWallet = useContext(HdWalletContext);

  const [dismissedActivityCards, setDismissedActivityCards] = useState<
    string[]
  >([]);
  const [dismissedStaticCards, setDismissedStaticCards] = useState<string[]>(
    [],
  );
  const [dismissedMigrationCards, setDismissedMigrationCards] = useState<
    string[]
  >([]);
  const [dismissedStaticIDsReady, setDismissedStaticIDsReady] = useState(false);
  const [activityCards, setActivityCards] = useState<BridgeOrCardActivity[]>(
    [],
  );
  const [staticCards, setStaticCards] = useState<BannerRecord[]>([]);
  const [migrationCard, setMigrationCard] = useState<MigrationData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const ethereumAddress = get(
    hdWallet,
    'state.wallet.ethereum.address',
    undefined,
  );

  // function to get the activities from the past one hour
  const getRecentActivities = () => {
    const allActivities = activityContext?.state.activityObjects;
    if (allActivities && allActivities.length > 0) {
      const oneHourAgo = moment().subtract(1, 'hour');
      const filteredActivities = allActivities?.filter(
        activity =>
          activity &&
          moment(activity.datetime).isAfter(oneHourAgo) &&
          [ActivityType.BRIDGE, ActivityType.CARD].includes(activity.type),
      );
      const validActivities = filteredActivities?.filter(
        activity =>
          activity !== undefined &&
          !dismissedActivityCards.includes(activity.id),
      );
      return validActivities as BridgeOrCardActivity[];
    }
    return [];
  };

  // function to get the pending activities out of the recent activities
  const getPendingActivities = () => {
    const recentActivities = getRecentActivities();
    if (recentActivities.length === 0) {
      return [];
    }
    const pendingCardsAndBridges: ActivityAny[] = [];
    recentActivities.forEach(activity => {
      if (
        [
          ActivityStatus.DELAYED,
          ActivityStatus.INPROCESS,
          ActivityStatus.PENDING,
        ].includes(activity.status)
      ) {
        pendingCardsAndBridges.push(activity);
      }
    });
    return pendingCardsAndBridges;
  };

  // function to get the new banner data from the API
  const getStaticCards = async () => {
    if (ethereumAddress) {
      const uri = `/v1/configuration/device/banner-info/${ethereumAddress}`;
      try {
        const res = await getWithAuth(uri);
        const {
          data: { data: arrayOfBanners },
        } = res;
        if (arrayOfBanners?.length) {
          return arrayOfBanners as BannerRecord[];
        }
        return [];
      } catch (e) {
        const errorObject = {
          e,
          message: 'Error occured during the new banner call.',
        };
        Sentry.captureException(errorObject);
      }
    }
    return [];
  };

  const getMigrationCard = async () => {
    try {
      const { isError, data } = await getWithAuth('/v1/cards/migration');
      if (!isError && data) {
        return data;
      }
      return [];
    } catch (e) {
      const errorObject = {
        e,
        message: 'Error occured during the migration card call.',
      };
      Sentry.captureException(errorObject);
    }
  };

  // useEffect to check for static cards and migration data from backend
  useEffect(() => {
    const checkStaticCards = async () => {
      const availableStaticCards = await getStaticCards();

      const filteredStaticCards = availableStaticCards?.filter(
        sc => !dismissedStaticCards.includes(sc.id),
      );
      if (filteredStaticCards) {
        if (filteredStaticCards.length === 0) {
          setStaticCards([]);
        } else {
          const sortedBannerRecords = filteredStaticCards.sort((a, b) => {
            const priorityOrder = ['HIGHEST', 'HIGH', 'MEDIUM', 'LOW'];
            return (
              priorityOrder.indexOf(a.priority) -
              priorityOrder.indexOf(b.priority)
            );
          });
          setStaticCards(sortedBannerRecords);
        }
      }
    };

    const checkMigrationCard = async () => {
      const availableMigrationCard = await getMigrationCard();
      const statusDescriptions: Record<string, string> = {
        PENDING: 'Your fund migration is under processing',
        SUCCESS: 'Your funds have been migrated successfully',
        FAILED: 'Your fund migration failed, please contact support',
        DELAYED: 'Your fund migration is delayed, please contact support',
        IN_PROGRESS:
          'Your fund migration is in progress, we appreciate your patience',
      };
      const statusTitle: Record<string, string> = {
        PENDING: 'Pending',
        SUCCESS: 'Success',
        FAILED: 'Failed',
        DELAYED: 'Delayed',
        IN_PROGRESS: 'In Progress',
      };
      const updatedData: MigrationData[] = availableMigrationCard.map(item => {
        return {
          ...item,
          title: `$${Number(item.amount) ?? ''} Migration ${get(statusTitle, item?.status, '')}`,
          description: get(statusDescriptions, item?.status, ''),
          priority: 'HIGHEST',
          type: ActivityType.MIGRATE_FUND,
          isClosable: item?.status === 'SUCCESS',
        };
      });
      const filteredMigrationCards = updatedData?.filter(
        mc => !dismissedMigrationCards.includes(mc?.requestId),
      );
      if (filteredMigrationCards) {
        if (filteredMigrationCards.length === 0) {
          setMigrationCard([]);
        } else {
          setMigrationCard(filteredMigrationCards);
        }
      }
    };

    if (dismissedStaticIDsReady) {
      setIsLoading(true);
      void checkStaticCards();
      void checkMigrationCard();
      setIsLoading(false);
    }
  }, [dismissedStaticIDsReady, dismissedStaticCards, dismissedMigrationCards]);

  // util to get respective ActivityStatus
  const _getUpdatedActivityStatus = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return ActivityStatus.SUCCESS;
      case 'DELAYED':
        return ActivityStatus.DELAYED;
      case 'IN_PROGRESS':
        return ActivityStatus.INPROCESS;
      case 'PENDING':
        return ActivityStatus.PENDING;
      case 'FAILED':
        return ActivityStatus.FAILED;
      default:
        return ActivityStatus.SUCCESS;
    }
  };

  // function to update the status for an Activity
  const updateStatusForCardOrBridge = async (
    activity: BridgeOrCardActivity,
  ) => {
    const currentActivityStatus = activity.status;
    const activityQuoteId = activity.quoteId;
    if (
      currentActivityStatus === ActivityStatus.INPROCESS ||
      currentActivityStatus === ActivityStatus.DELAYED ||
      (currentActivityStatus === ActivityStatus.PENDING && activityQuoteId)
    ) {
      const uri = `${ARCH_HOST}/v1/activities/status/${activity.type}/${activityQuoteId}`;
      try {
        const res = await axios.get(uri, { timeout: 3000 });
        const {
          data: {
            activityStatus: { status, quoteId },
          },
        }: { data: { activityStatus: { status: string; quoteId: string } } } =
          res;
        if (quoteId === activityQuoteId) {
          const updatedStatus = _getUpdatedActivityStatus(status);
          if (currentActivityStatus !== updatedStatus) {
            activityContext?.dispatch({
              type: ActivityReducerAction.PATCH,
              value: {
                id: activity.id,
                status: updatedStatus,
              },
            });
          }
          const returnActivity = activity;
          returnActivity.status = updatedStatus;
          return returnActivity;
        } else {
          throw new Error(
            `Mismatch in quoteIds: ${activityQuoteId} and ${quoteId} or status: ${status}.`,
          );
        }
      } catch (e) {
        const errorObject = {
          e,
          activity,
          message:
            'Error when updating status for Card or Bridge in Portfolio.',
        };
        Sentry.captureException(errorObject);
      }
    }
    return activity;
  };

  // Initially load dismissed IDs from Async Storage
  useEffect(() => {
    const loadDismissedIDsAndRefreshStore = async () => {
      const dismissedActivities = await getDismissedActivityCardIDs();
      if (dismissedActivities) {
        const newDismissedActivities = [];
        const parsedActivities: string[] = JSON.parse(dismissedActivities);
        for (const pa of parsedActivities) {
          // if the date attached to the id is 1 hour ago, remove it.
          if (
            moment(new Date(pa.split('|')[1])).isAfter(
              moment().subtract(1, 'hour'),
            )
          ) {
            newDismissedActivities.push(pa);
          }
        }
        setDismissedActivityCards(
          newDismissedActivities.map(nDA => nDA.split('|')[0]),
        );
        await setDismissedActivityCardIDs(newDismissedActivities);
      }
      const dismissedStatics = await getDismissedStaticCardIDs();
      if (dismissedStatics) {
        const newDismissedStatics = [];
        const parsedStatics: string[] = JSON.parse(dismissedStatics);
        for (const ps of parsedStatics) {
          // if the endDate is after the current moment, push.
          if (moment(new Date(ps.split('|')[1])).isAfter(moment())) {
            newDismissedStatics.push(ps);
          }
        }
        setDismissedStaticCards(
          newDismissedStatics.map(nDS => nDS.split('|')[0]),
        );
        void setDismissedStaticCardIDs(newDismissedStatics);
      }
      const dismissedMigration = await getDismissedMigrationCardIDs();
      if (dismissedMigration) {
        const parsedMigration: string[] = JSON.parse(dismissedMigration);

        void setDismissedMigrationCardIDs(parsedMigration);
        setDismissedMigrationCards(parsedMigration);
      }
      setDismissedStaticIDsReady(true);
    };
    void loadDismissedIDsAndRefreshStore();
  }, []);

  // useEffect to check for Activities
  useEffect(() => {
    const checkActivities = async () => {
      const recentActivities = getRecentActivities();
      const activityCardsToSet = [];
      if (getPendingActivities().length === 0) {
        clearInterval(refreshActivityInterval);
        // void refresh(); // TODO: Try to refresh.
      }
      for (const recentActivity of recentActivities) {
        const updatedActivity =
          await updateStatusForCardOrBridge(recentActivity);
        if (recentActivity.status !== updatedActivity.status) {
          if (updatedActivity.status === ActivityStatus.SUCCESS) {
            showToast(`${recentActivity.type} activity complete.`);
          }
        }
        activityCardsToSet.unshift(updatedActivity);
      }
      setActivityCards(activityCardsToSet);
    };

    const refreshActivityInterval = setInterval(() => {
      void checkActivities();
    }, ACTIVITIES_REFRESH_TIMEOUT);

    return () => {
      clearInterval(refreshActivityInterval);
    };
  }, [
    activityContext?.state.activityObjects,
    isFocused,
    dismissedActivityCards,
  ]);

  const renderItem = ({
    item,
    index,
    boxWidth,
    halfBoxDistance,
    panX,
  }: {
    item: BannerRecord | BridgeOrCardActivity;
    index: number;
    boxWidth: number;
    halfBoxDistance: number;
    panX: SharedValue<number>;
  }) => {
    return (
      <CyDView className='mt-[6px]'>
        <CarouselItem
          item={item}
          index={index}
          boxWidth={boxWidth}
          halfBoxDistance={halfBoxDistance}
          panX={panX}
          setDismissedActivityCards={setDismissedActivityCards}
          setDismissedStaticCards={setDismissedStaticCards}
          setDismissedMigrationCards={setDismissedMigrationCards}
          navigation={navigation}
        />
      </CyDView>
    );
  };

  // Sorts and makes the cardsData to be passed to the CardsCarousel.
  // Here the priority order : HIGHEST -> ACTIVITY -> HIGH -> MEDIUM -> LOW, is followed.
  const makeCards = () => {
    const highestPriorityCards = staticCards.filter(
      staticCard => staticCard.priority === 'HIGHEST',
    );
    const otherCards = staticCards.filter(
      staticCard => staticCard.priority !== 'HIGHEST',
    );
    return [
      ...migrationCard,
      ...highestPriorityCards,
      ...activityCards,
      ...otherCards,
    ];
  };

  const cards = makeCards();

  if (isLoading) {
    return <></>;
  }

  return (
    <CardCarousel
      cardsData={cards}
      moreThanOneCardOffset={1.1}
      renderItem={renderItem}
    />
  );
};

export default memo(BannerCarousel);
