import React, { useState, useRef } from 'react';
import {
  useWindowDimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import {
  CyDView,
  CyDText,
  CyDTouchView,
  CyDMaterialDesignIcons,
} from '../../styles/tailwindComponents';
import { CardFundResponse } from '../../models/activities.interface';
import { ActivityStatus } from '../../constants/enum';
import clsx from 'clsx';
import { isAndroid, isIOS } from '../../misc/checkers';
import moment from 'moment';

interface ActivityBottomBarProps {
  /** Array of ongoing card activities */
  ongoingCardActivities: CardFundResponse[];
  /** Array of completed fundings in last 5 minutes */
  fundingsCompletedInLast5Mins: CardFundResponse[];
  /** Array of failed fundings in last 5 minutes */
  fundingsFailedInLast5Mins: CardFundResponse[];
  /** Callback when a completed activity is closed/removed */
  onRemoveCompletedActivity?: (activityId: string) => void;
  /** Callback when a failed activity is closed/removed */
  onRemoveFailedActivity?: (activityId: string) => void;
  /** Callback when "Know More" is pressed for ongoing activities */
  onKnowMore?: (activity: CardFundResponse) => void;
}

interface ActivityCardProps {
  activity: CardFundResponse;
  isCompleted: boolean;
  isFailed: boolean;
  onClose?: () => void;
  onKnowMore?: () => void;
  width: number;
  isDelayed: boolean;
}

/**
 * Individual activity card component
 * Shows a simple notification-style UI for activities
 */
const ActivityCard: React.FC<ActivityCardProps> = ({
  activity,
  isCompleted,
  isFailed,
  onClose,
  onKnowMore,
  isDelayed,
  width,
}) => {
  return (
    <CyDView className='px-4 pt-4 rounded-t-[18px]' style={{ width }}>
      {/* Main notification bar */}
      <CyDView className={'flex-row items-center justify-between'}>
        {/* Left side - Loader and text */}
        <CyDView className='flex-row items-center flex-1'>
          {!isCompleted && !isFailed && (
            <CyDMaterialDesignIcons
              name='loading'
              size={20}
              color={isDelayed ? 'black' : 'white'}
              className='mr-3 !animate-spin'
            />
          )}
          {isCompleted && (
            <CyDMaterialDesignIcons
              name='cash'
              size={24}
              className='text-white mr-3'
            />
          )}
          {isFailed && (
            <CyDMaterialDesignIcons
              name='alert-circle'
              size={20}
              className='text-white mr-3'
            />
          )}

          <CyDText
            className={clsx(' font-medium text-[14px] flex-1', {
              'text-black': isDelayed,
              'text-white': !isDelayed,
            })}>
            {isCompleted
              ? `Your card is loaded with $${activity.amount.toFixed(2)} USDC!`
              : isFailed
                ? `Card load failed for $${activity.amount.toFixed(2)}`
                : `Loading is in progress for $${activity.amount.toFixed(2)}`}
          </CyDText>
        </CyDView>

        {/* Right side - Action buttons */}
        <CyDView className='flex-row items-center'>
          {!isCompleted && !isFailed && onKnowMore && (
            <CyDTouchView
              onPress={onKnowMore}
              className={clsx('rounded-[8px] p-[6px] border border-white', {
                'border-black': isDelayed,
                'border-white': !isDelayed,
              })}>
              <CyDText
                className={clsx('font-bold text-[12px]', {
                  'text-white': !isDelayed,
                  'text-black': isDelayed,
                })}>
                Know More
              </CyDText>
            </CyDTouchView>
          )}

          {isFailed && onKnowMore && (
            <CyDTouchView
              onPress={onKnowMore}
              className='rounded-[8px] p-[6px] border border-white'>
              <CyDText className='text-white font-bold text-[12px]'>
                Details
              </CyDText>
            </CyDTouchView>
          )}

          {(isCompleted || isFailed) && onClose && (
            <CyDTouchView
              onPress={onClose}
              className='ml-3 w-6 h-6 items-center justify-center'>
              <CyDMaterialDesignIcons
                name='close'
                size={16}
                className='text-white'
              />
            </CyDTouchView>
          )}
        </CyDView>
      </CyDView>
    </CyDView>
  );
};

/**
 * ActivityBottomBar Component
 *
 * Displays a carousel of card funding activities in a bottom sheet modal.
 * Shows both ongoing and recently completed activities with appropriate actions.
 *
 * Features:
 * - Carousel navigation between multiple activities
 * - Timeline view showing funding progress steps
 * - Closable completed activities
 * - "Know More" action for ongoing activities
 * - Auto-hides when no activities are present
 */
const ActivityBottomBar: React.FC<ActivityBottomBarProps> = ({
  ongoingCardActivities = [],
  fundingsCompletedInLast5Mins = [],
  fundingsFailedInLast5Mins = [],
  onRemoveCompletedActivity,
  onRemoveFailedActivity,
  onKnowMore,
}) => {
  const { width } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  // Combine all activities for the carousel - memoized to prevent unnecessary recalculations
  const allActivities = React.useMemo(() => {
    const combined = [
      ...ongoingCardActivities.map(activity => ({
        ...activity,
        isCompleted: activity.status === ActivityStatus.COMPLETED,
        isFailed: activity.status === ActivityStatus.FAILED,
      })),
      ...fundingsCompletedInLast5Mins.map(activity => ({
        ...activity,
        isCompleted: true,
        isFailed: false,
      })),
      ...fundingsFailedInLast5Mins.map(activity => ({
        ...activity,
        isCompleted: false,
        isFailed: true,
      })),
    ];

    return combined;
  }, [
    ongoingCardActivities,
    fundingsCompletedInLast5Mins,
    fundingsFailedInLast5Mins,
  ]);

  // Determine background color based on current activity - memoized to prevent multiple calculations
  const backgroundColor = React.useMemo(() => {
    const currentActivity = allActivities[currentIndex];
    if (!currentActivity) {
      return 'bg-[#006A31]'; // Default green
    }

    const currenTime = moment().unix();
    const quoteAfter15mins = moment
      .unix(currentActivity.createdOn)
      .add(15, 'minutes');
    const isDelayed = moment.unix(currenTime).isAfter(quoteAfter15mins);

    // Check actual activity status
    if (
      currentActivity.status === ActivityStatus.FAILED ||
      currentActivity.isFailed
    ) {
      return '!bg-red-600';
    } else if (
      currentActivity.status === ActivityStatus.COMPLETED ||
      currentActivity.isCompleted
    ) {
      return '!bg-[#006A31]';
    } else if (currentActivity.status === ActivityStatus.DELAYED || isDelayed) {
      return '!bg-p100';
    } else {
      return '!bg-[#006A31]'; // Default green for ongoing
    }
  }, [allActivities, currentIndex]);

  // Don't render if no activities
  if (allActivities.length === 0) {
    return null;
  }

  /**
   * Handles removing a completed activity
   */
  const handleRemoveCompletedActivity = (activityId: string) => {
    if (onRemoveCompletedActivity) {
      onRemoveCompletedActivity(activityId);
    }
  };

  /**
   * Handles removing a failed activity
   */
  const handleRemoveFailedActivity = (activityId: string) => {
    if (onRemoveFailedActivity) {
      onRemoveFailedActivity(activityId);
    }
  };

  /**
   * Handles "Know More" action for ongoing activities
   */
  const handleKnowMore = (activity: CardFundResponse) => {
    if (onKnowMore) {
      onKnowMore(activity);
    }
  };

  /**
   * Handles scroll position changes to update dot indicators
   */
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / width);
    setCurrentIndex(index);
  };

  /**
   * Renders individual FlatList item
   */
  const renderItem = ({
    item,
  }: {
    item: CardFundResponse & {
      isCompleted: boolean;
      isFailed: boolean;
    };
  }) => {
    // Determine if this activity should have a close button
    const isFromCompletedArray = fundingsCompletedInLast5Mins.some(
      activity => activity.freshdeskId === item.freshdeskId,
    );
    const isFromFailedArray = fundingsFailedInLast5Mins.some(
      activity => activity.freshdeskId === item.freshdeskId,
    );

    // Also check if activity has failed status (even if still in ongoing array)
    const hasFailedStatus = item.status === ActivityStatus.FAILED;

    const currenTime = moment().unix();
    const quoteAfter15mins = moment.unix(item.createdOn).add(15, 'minutes');

    const isDelayed = moment.unix(currenTime).isAfter(quoteAfter15mins);

    return (
      <ActivityCard
        activity={item}
        isCompleted={item.isCompleted}
        isFailed={item.isFailed}
        isDelayed={isDelayed}
        onClose={
          isFromCompletedArray
            ? () => handleRemoveCompletedActivity(item.freshdeskId.toString())
            : isFromFailedArray || hasFailedStatus
              ? () => handleRemoveFailedActivity(item.freshdeskId.toString())
              : undefined // No close button for truly ongoing activities
        }
        onKnowMore={
          !item.isCompleted || item.isFailed
            ? () => handleKnowMore(item)
            : undefined
        }
        width={width}
      />
    );
  };

  /**
   * Renders dot indicators
   */
  const renderDotIndicators = () => {
    if (allActivities.length <= 1) return null;

    return (
      <CyDView className='flex-row justify-center mt-3'>
        {allActivities.map((_, index) => (
          <CyDView
            key={index}
            className={clsx(
              'w-[5px] h-[5px] rounded-full mx-1',
              index === currentIndex ? 'bg-white' : 'bg-white/60',
            )}
          />
        ))}
      </CyDView>
    );
  };

  return (
    <CyDView
      className={clsx(backgroundColor, 'rounded-t-[18px]', {
        'pb-[68px]': isIOS(),
        'mb-[56px]': isAndroid(),
      })}>
      <FlatList
        ref={flatListRef}
        data={allActivities}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        keyExtractor={item => item.freshdeskId.toString()}
      />
      {renderDotIndicators()}
    </CyDView>
  );
};

export default ActivityBottomBar;
