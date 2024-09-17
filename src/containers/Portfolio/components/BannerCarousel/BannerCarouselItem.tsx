import {
  Extrapolation,
  SharedValue,
  interpolate,
  useAnimatedStyle,
} from 'react-native-reanimated';
import {
  CyDAnimatedView,
  CyDFastImage,
  CyDImage,
  CyDImageBackground,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../../styles/tailwindStyles';
import React, { memo, useMemo } from 'react';
import { BannerRecord } from '../../../../models/bannerRecord.interface';
import { BridgeOrCardActivity } from '.';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { ALL_CHAINS } from '../../../../constants/server';
import {
  ActivityStatus,
  ActivityType,
  DebitCardTransaction,
  ExchangeTransaction,
} from '../../../../reducers/activity_reducer';
import { formatAmount } from '../../../../core/util';
import AppImages from '../../../../../assets/images/appImages';
import CyDTokenValue from '../../../../components/v2/tokenValue';
import { screenTitle } from '../../../../constants';
import clsx from 'clsx';
import {
  getDismissedActivityCardIDs,
  getDismissedMigrationCardIDs,
  getDismissedStaticCardIDs,
  setDismissedActivityCardIDs,
  setDismissedMigrationCardIDs,
  setDismissedStaticCardIDs,
} from '../../../../core/asyncStorage';
import { cloneDeep, get } from 'lodash';
import { MigrationData } from '../../../../models/migrationData.interface';

interface BannerCarouselItemProps {
  item: BannerRecord | BridgeOrCardActivity | MigrationData;
  index: number;
  boxWidth: number;
  halfBoxDistance: number;
  panX: SharedValue<number>;
  setDismissedActivityCards: React.Dispatch<React.SetStateAction<string[]>>;
  setDismissedStaticCards: React.Dispatch<React.SetStateAction<string[]>>;
  setDismissedMigrationCards: React.Dispatch<React.SetStateAction<string[]>>;
}
const BannerCarouselItem = ({
  item,
  index,
  boxWidth,
  halfBoxDistance,
  panX,
  setDismissedActivityCards,
  setDismissedStaticCards,
  setDismissedMigrationCards,
}: BannerCarouselItemProps) => {
  const isActivity = item ? 'transactionHash' in item : false;
  const { t } = useTranslation();
  const navigation = useNavigation();
  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      panX.value,
      [
        (index - 1) * boxWidth - halfBoxDistance,
        index * boxWidth - halfBoxDistance,
        (index + 1) * boxWidth - halfBoxDistance, // adjust positioning
      ],
      [0.88, 1, 0.88], // scale down when out of scope
      Extrapolation.CLAMP,
    );
    return {
      transform: [{ scale }],
    };
  });

  const _getActivityStatusString = (status: ActivityStatus) => {
    switch (status) {
      case ActivityStatus.SUCCESS:
        return 'COMPLETED';
      case ActivityStatus.DELAYED:
        return 'DELAYED';
      case ActivityStatus.INPROCESS:
        return 'INPROCESS';
      case ActivityStatus.PENDING:
        return 'PENDING';
      case ActivityStatus.FAILED:
        return 'FAILED';
      default:
        return '';
    }
  };

  const onActivityCardDismissal = async () => {
    const { id, datetime } = item as BridgeOrCardActivity;
    const dateISOString = new Date(datetime).toISOString();
    const dismissedIDs = await getDismissedActivityCardIDs();
    const parsedIDs = dismissedIDs ? JSON.parse(dismissedIDs) : [];
    const updatedDismissedIDs = !parsedIDs.includes(`${id}|${dateISOString}`)
      ? [...parsedIDs, `${id}|${dateISOString}`]
      : parsedIDs;
    await setDismissedActivityCardIDs(updatedDismissedIDs);
    setDismissedActivityCards(
      updatedDismissedIDs.map(
        (dismissedID: string) => dismissedID.split('|')[0],
      ),
    );
  };

  const onStaticCardDismissal = async () => {
    const { id, endDate } = item as BannerRecord;
    const dismissedIDs = await getDismissedStaticCardIDs();
    const parsedIDs = dismissedIDs ? JSON.parse(dismissedIDs) : [];
    const updatedDismissedIDs = !parsedIDs.includes(`${id}|${endDate}`)
      ? [...parsedIDs, `${id}|${endDate}`]
      : parsedIDs;
    await setDismissedStaticCardIDs(updatedDismissedIDs);
    setDismissedStaticCards(
      updatedDismissedIDs.map(
        (dismissedID: string) => dismissedID.split('|')[0],
      ),
    );
  };

  const onMigrationCardDismissal = async () => {
    const { requestId } = item as MigrationData;
    const dismissedIDs = await getDismissedMigrationCardIDs();
    const parsedIDs = dismissedIDs ? JSON.parse(dismissedIDs) : [];
    const updatedDismissedIDs = !parsedIDs.includes(requestId)
      ? [...parsedIDs, requestId]
      : parsedIDs;

    await setDismissedMigrationCardIDs(updatedDismissedIDs);
    setDismissedMigrationCards(updatedDismissedIDs);
  };

  const ItemBody = useMemo(() => {
    if (isActivity) {
      if (item.type === ActivityType.BRIDGE) {
        const {
          fromChain,
          fromSymbol,
          fromTokenAmount,
          toChain,
          toSymbol,
          toTokenAmount,
        } = item as ExchangeTransaction;
        const fromChainlogo = ALL_CHAINS.find(
          chain => chain.name === fromChain,
        )?.logo_url;
        const toChainlogo = ALL_CHAINS.find(
          chain => chain.name === toChain,
        )?.logo_url;
        return (
          <>
            <CyDView>
              <CyDView className='flex flex-row justify-center items-end gap-[3px]'>
                <CyDText className='font-bold text-[20px]'>
                  {formatAmount(fromTokenAmount, 1)}
                </CyDText>
                <CyDText className='font-medium text-[14px] mb-[2px]'>
                  {fromSymbol}
                </CyDText>
              </CyDView>
              <CyDView className='flex flex-row justify-center items-end gap-[3px]'>
                <CyDFastImage
                  className='h-[22px] w-[22px]'
                  source={fromChainlogo}
                  resizeMode='contain'
                />
                <CyDText className='font-medium text-[14px] mb-[2px]'>
                  {fromChain}
                </CyDText>
              </CyDView>
            </CyDView>
            <CyDView>
              <CyDFastImage
                className='h-[32px] w-[32px]'
                source={AppImages.APP_SEL}
                resizeMode='contain'
              />
            </CyDView>
            <CyDView>
              <CyDView className='flex flex-row justify-center items-end gap-[3px]'>
                <CyDText className='font-bold text-[20px]'>
                  {formatAmount(toTokenAmount, 1)}
                </CyDText>
                <CyDText className='font-medium text-[14px] mb-[2px]'>
                  {toSymbol}
                </CyDText>
              </CyDView>
              <CyDView className='flex flex-row justify-center items-end gap-[3px]'>
                <CyDFastImage
                  className='h-[22px] w-[22px]'
                  source={toChainlogo}
                  resizeMode='contain'
                />
                <CyDText className='font-medium text-[14px] mb-[2px]'>
                  {toChain}
                </CyDText>
              </CyDView>
            </CyDView>
          </>
        );
      } else if (item.type === ActivityType.CARD) {
        const { amount, amountInUsd, tokenSymbol } =
          item as DebitCardTransaction;
        return (
          <>
            <CyDView>
              <CyDView className='flex flex-row justify-center items-end gap-[3px]'>
                <CyDTokenValue className='text-[20px] font-extrabold '>
                  {amountInUsd}
                </CyDTokenValue>
              </CyDView>
              <CyDView className='flex flex-row justify-center items-end gap-[3px]'>
                <CyDText className='font-bold text-[16px]'>
                  {formatAmount(amount, 2)}
                </CyDText>
                <CyDText className='font-medium text-[12px] mb-[2px]'>
                  {tokenSymbol}
                </CyDText>
              </CyDView>
            </CyDView>
            <CyDFastImage
              className='h-[32px] w-[32px]'
              source={AppImages.CARD_SEL}
              resizeMode='contain'
            />
            <CyDFastImage
              className={'h-[400px] w-[150px] top-[20px]'}
              source={AppImages.CARD}
              resizeMode='contain'
            />
          </>
        );
      } else {
        return null;
      }
    } else {
      const {
        title,
        description,
        bgImageURI,
        type = '',
        status = '',
      } = item as MigrationData;
      if (type === ActivityType.MIGRATE_FUND) {
        return (
          <CyDImageBackground
            className='w-full h-full flex flex-row items-center'
            source={AppImages.MIGRATION_BANNER_BG}
            resizeMode='cover'>
            <CyDFastImage
              source={
                status === 'SUCCESS'
                  ? AppImages.MIGRATION_SUCCESS
                  : AppImages.MIGRATION_PENDING_GIF
              }
              className={clsx('w-[122px] h-[122px]', {
                'w-[99px] h-[93px]': status === 'SUCCESS',
              })}
            />

            <CyDView className='ml-[8px]'>
              <CyDText className='text-[14px] font-extrabold  w-[65%]'>
                {title}
              </CyDText>
              <CyDText className='text-[10px] text-[#091E42] font-medium mt-[3px]  w-[65%]'>
                {description}
              </CyDText>
            </CyDView>
          </CyDImageBackground>
        );
      } else if (bgImageURI) {
        return (
          <CyDImageBackground
            className='w-full items-end'
            source={{ uri: bgImageURI }}
            resizeMode='cover'>
            <CyDView className='h-full w-[75%] p-[10px] flex items-start justify-center'>
              <CyDText className='text-[14px] font-bold'>{title}</CyDText>
              <CyDText className='text-[14px] text-subTextColor font-medium'>
                {description}
              </CyDText>
            </CyDView>
          </CyDImageBackground>
        );
      } else {
        return (
          <CyDView className='h-full w-full flex flex-col justify-center items-center bg-privacyMessageBackgroundColor px-[2px]'>
            <CyDText className='text-[14px] font-bold'>{title}</CyDText>
            <CyDText className='text-[14px] text-subTextColor font-medium text-center'>
              {description}
            </CyDText>
          </CyDView>
        );
      }
    }
  }, [isActivity, item]);

  const onBannerClick = () => {
    if (isActivity) {
      navigation.navigate(screenTitle.ACTIVITIES);
    } else {
      const { redirectURI, title, appCta } = item;
      if (redirectURI) {
        navigation.navigate(screenTitle.SOCIAL_MEDIA_SCREEN, {
          title,
          uri: redirectURI,
        });
      } else if (appCta) {
        // appCta = 'DEBIT_CARD/CARD_INVITE/CARD_SIGNUP';
        const screens = appCta.split('/');
        if (Object.keys(screenTitle).includes(screens[0])) {
          let routeObj = {};
          for (let i = screens.length - 1; i > 0; i--) {
            const screenParams = {
              screen: get(screenTitle, screens[i]),
              params: cloneDeep(routeObj),
            };
            routeObj = cloneDeep(screenParams);
          }
          navigation.navigate(get(screenTitle, screens[0]), routeObj);
        }
      }
    }
  };

  return (
    <CyDAnimatedView
      className={'flex justify-center items-center'}
      style={[animatedStyle, { width: boxWidth }]}>
      <CyDView className='flex flex-row h-full w-full'>
        <CyDTouchView
          className='h-full border border-sepratorColor overflow-hidden rounded-[16px]'
          disabled={
            !isActivity &&
            item.redirectURI === undefined &&
            item.appCta === undefined
          }
          onPress={() => {
            onBannerClick();
          }}>
          <CyDView
            className={clsx(
              'h-full w-full flex flex-row justify-evenly items-center',
              { 'h-[75%]': isActivity },
            )}>
            {ItemBody}
          </CyDView>
          {isActivity ? (
            <CyDView
              className={clsx(
                'h-[25%] flex flex-row w-full bg-privacyMessageBackgroundColor justify-start items-center px-[30px]',
                {
                  'bg-toastColor': item.status === ActivityStatus.SUCCESS,
                  'bg-redColor': item.status === ActivityStatus.FAILED,
                  'bg-darkYellow': item.status === ActivityStatus.DELAYED,
                },
              )}>
              <CyDText className='font-bold text-[12px] pr-[2px]'>
                {t(`${item.type.toUpperCase()}_ACTIVITY`)}
              </CyDText>
              <CyDText className='font-bold text-[12px] pl-[2px]'>
                {t(_getActivityStatusString(item.status))}
              </CyDText>
            </CyDView>
          ) : null}
        </CyDTouchView>
        {isActivity || (!isActivity && item.isClosable) ? (
          <CyDTouchView
            onPress={() => {
              if (isActivity) {
                void onActivityCardDismissal();
              } else if (
                (item as MigrationData)?.type === ActivityType.MIGRATE_FUND
              ) {
                void onMigrationCardDismissal();
              } else {
                void onStaticCardDismissal();
              }
            }}
            className='absolute top-[-4px] right-[-4px] h-[20px] w-[20px] justify-center items-center bg-white border border-sepratorColor rounded-full overflow-hidden p-[3px]'>
            <CyDFastImage
              source={AppImages.CLOSE}
              className='h-[8px] w-[8px]'
              resizeMode='contain'
            />
          </CyDTouchView>
        ) : null}
      </CyDView>
    </CyDAnimatedView>
  );
};

export default memo(BannerCarouselItem);
