import React from 'react';
import { StyleSheet } from 'react-native';
import moment from 'moment';
import CyDModalLayout from './modal';
import {
  CyDView,
  CyDText,
  CyDTouchView,
  CyDMaterialDesignIcons,
  CyDSafeAreaView,
} from '../../styles/tailwindComponents';
import { CardFundResponse } from '../../models/activities.interface';
import { ActivityStatus, AnalyticsType } from '../../constants/enum';
import clsx from 'clsx';
import { capitalize } from 'lodash';
import Intercom from '@intercom/intercom-react-native';
import Toast from 'react-native-toast-message';
import { logAnalytics, parseErrorMessage } from '../../core/util';
import Clipboard from '@react-native-clipboard/clipboard';
import useAxios from '../../core/HttpRequest';

interface ActivityDetailsModalProps {
  /** Whether the modal is visible */
  isVisible: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Activity data to display */
  activity: CardFundResponse | null;
  /** Array of ongoing activities to get live updates from */
  ongoingActivities?: CardFundResponse[];
  /** Array of completed activities to get live updates from */
  completedActivities?: CardFundResponse[];
  /** Array of failed activities to get live updates from */
  failedActivities?: CardFundResponse[];
  setIsVisible: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * ActivityDetailsModal Component
 *
 * Displays detailed information about a card funding activity in a bottom sheet modal.
 * Shows transaction details, network information, and current status with dynamic step progression.
 *
 * Features:
 * - Dynamic step states based on activity.status
 * - Visual indicators for completed, in-progress, and failed states
 * - ETA display for delayed transactions
 * - Contact support button for failed transactions
 * - Consistent step progression logic across all activity statuses
 * - Real-time updates from both ongoing and completed activities arrays
 * - Seamless status transitions when activities move from ongoing to completed
 */
const ActivityDetailsModal: React.FC<ActivityDetailsModalProps> = ({
  isVisible,
  setIsVisible,
  onClose,
  activity,
  ongoingActivities = [],
  completedActivities = [],
  failedActivities = [],
}) => {
  const [txnHash, setTxnHash] = React.useState<string>('');
  const [isSubmittingRequest, setIsSubmittingRequest] =
    React.useState<boolean>(false);
  const [expeditionRequestSuccess, setExpeditionRequestSuccess] =
    React.useState<boolean>(false);
  const [remainingTime, setRemainingTime] = React.useState<number>(0);
  const [fetchingStatusTime, setFetchingStatusTime] = React.useState<number>(0);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);
  const fetchingStatusTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const previousDelayExpiresOnRef = React.useRef<number | null>(null);
  const { postWithAuth } = useAxios();
  /**
   * Cleanup timer on component unmount
   */
  React.useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (fetchingStatusTimerRef.current) {
        clearInterval(fetchingStatusTimerRef.current);
        fetchingStatusTimerRef.current = null;
      }
    };
  }, []);

  /**
   * Reset expedition state when modal closes
   */
  React.useEffect(() => {
    if (!isVisible) {
      setExpeditionRequestSuccess(false);
      setRemainingTime(0);
      setFetchingStatusTime(0);
      previousDelayExpiresOnRef.current = null;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (fetchingStatusTimerRef.current) {
        clearInterval(fetchingStatusTimerRef.current);
        fetchingStatusTimerRef.current = null;
      }
    }
  }, [isVisible]);

  /**
   * Start/update timer only when USER_REPORTED status or delayExpiresOn value actually changes
   * This prevents unnecessary timer resets when data refreshes but expires time is the same
   */
  React.useEffect(() => {
    const currentActivityData = getCurrentActivity();

    if (
      currentActivityData &&
      currentActivityData.activityStatus === ActivityStatus.USER_REPORTED &&
      currentActivityData.delayExpiresOn
    ) {
      const currentDelayExpiresOn = currentActivityData.delayExpiresOn;
      const previousDelayExpiresOn = previousDelayExpiresOnRef.current;

      // Only restart timer if delayExpiresOn value has actually changed
      if (currentDelayExpiresOn !== previousDelayExpiresOn) {
        // Clear existing timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        // Update the ref with new value
        previousDelayExpiresOnRef.current = currentDelayExpiresOn;

        const updateTimer = () => {
          const now = moment().unix();
          const remaining = currentDelayExpiresOn - now;
          const newRemainingTime = remaining > 0 ? remaining : 0;
          setRemainingTime(newRemainingTime);

          // Stop timer when it reaches 0
          if (newRemainingTime === 0 && timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
        };

        // Update immediately
        updateTimer();

        // Only start interval if there's time remaining
        if (currentDelayExpiresOn > moment().unix()) {
          timerRef.current = setInterval(updateTimer, 1000);
        }
      }
      // If delayExpiresOn hasn't changed, let the existing timer continue running
    } else {
      // Clear timer if not in USER_REPORTED status or no delayExpiresOn
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setRemainingTime(0);
      previousDelayExpiresOnRef.current = null;
    }
  }, [activity, ongoingActivities, completedActivities, failedActivities]);

  /**
   * Handle fetching status timer (10-second countdown after reporting transaction)
   */
  React.useEffect(() => {
    if (fetchingStatusTime > 0) {
      fetchingStatusTimerRef.current = setInterval(() => {
        setFetchingStatusTime(prev => {
          if (prev <= 1) {
            // Timer reached 0, clear the interval
            if (fetchingStatusTimerRef.current) {
              clearInterval(fetchingStatusTimerRef.current);
              fetchingStatusTimerRef.current = null;
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (fetchingStatusTimerRef.current) {
          clearInterval(fetchingStatusTimerRef.current);
          fetchingStatusTimerRef.current = null;
        }
      };
    }
  }, [fetchingStatusTime]);

  /**
   * Stop fetching status timer when status changes to USER_REPORTED
   */
  React.useEffect(() => {
    const currentActivityData = getCurrentActivity();
    if (
      currentActivityData &&
      currentActivityData.activityStatus === ActivityStatus.USER_REPORTED &&
      fetchingStatusTime > 0
    ) {
      // Status changed to USER_REPORTED, stop the fetching timer
      setFetchingStatusTime(0);
      if (fetchingStatusTimerRef.current) {
        clearInterval(fetchingStatusTimerRef.current);
        fetchingStatusTimerRef.current = null;
      }
    }
  }, [
    activity,
    ongoingActivities,
    completedActivities,
    failedActivities,
    fetchingStatusTime,
  ]);

  /**
   * Gets the current activity data, preferring live data from ongoing, completed, or failed activities
   * Falls back to the original activity prop if not found in any array
   */
  const getCurrentActivity = (): CardFundResponse | null => {
    if (!activity) return null;

    // Try to find the activity in the ongoing activities array for live updates
    const liveOngoingActivity = ongoingActivities.find(
      ongoing => ongoing.freshdeskId === activity.freshdeskId,
    );

    // If not found in ongoing, try to find in completed activities
    const liveCompletedActivity = completedActivities.find(
      completed => completed.freshdeskId === activity.freshdeskId,
    );

    // If not found in completed, try to find in failed activities
    const liveFailedActivity = failedActivities.find(
      failed => failed.freshdeskId === activity.freshdeskId,
    );

    // Return live activity if found in any array, otherwise fallback to original activity
    return (
      liveOngoingActivity ??
      liveCompletedActivity ??
      liveFailedActivity ??
      activity
    );
  };

  const currentActivity = getCurrentActivity();

  if (!currentActivity) {
    return null;
  }

  const currenTime = moment().unix();
  const quoteAfter15mins = moment
    .unix(currentActivity.createdOn)
    .add(15, 'minutes');

  const isDelayed = moment.unix(currenTime).isAfter(quoteAfter15mins);

  /**
   * Handles the "Request Team" button press for delayed activities
   * Makes an API call to expedite the funding process
   */
  const handleRequestTeam = async (): Promise<void> => {
    if (isSubmittingRequest) return;

    try {
      setIsSubmittingRequest(true);

      const requestData = {
        quoteId: currentActivity.quoteId,
        ...(txnHash.trim() && { hash: txnHash.trim() }),
      };

      const response = await postWithAuth(
        '/v1/funding/quote/alert',
        requestData,
      );

      if (!response.isError) {
        setTxnHash('');
        setExpeditionRequestSuccess(true);
        // Start 10-second fetching status timer
        setFetchingStatusTime(10);
        // Note: Main timer will be handled by USER_REPORTED status from activity updates
      } else {
        void logAnalytics({
          type: AnalyticsType.ERROR,
          chain: currentActivity.chain,
          message: `Load Report failed: ${parseErrorMessage('API Error')}`,
          screen: 'Activity Status modal',
          address: currentActivity.masterAddress,
          other: {
            masterAddress: currentActivity.masterAddress,
            fromAddress: currentActivity.fromAddress,
            token: currentActivity.tokenSymbol,
            tokensRequired: currentActivity.tokensRequired,
          },
        });
        Toast.show({
          text1: 'Failed to submit expedite request',
          text2: 'Contact support to expedite your request',
          type: 'error',
        });
      }
    } catch (error) {
      Toast.show({
        text1: 'Failed to submit expedite request',
        text2: 'Contact support to expedite your request',
        type: 'error',
      });
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  /**
   * Handles modal close with proper animation
   * Ensures consistent closing behavior across all triggers
   */
  const handleModalClose = (): void => {
    setIsVisible(false);
  };

  /**
   * Handles the "Contact Support" button press for failed activities
   * Closes the modal and opens Intercom chat
   */
  const handleContactSupport = (): void => {
    // Close the modal first
    handleModalClose();

    // Open Intercom chat
    void Intercom.present();
  };

  /**
   * Handles pasting transaction hash from clipboard
   */
  const handlePasteHash = async (): Promise<void> => {
    try {
      const clipboardContent = await Clipboard.getString();
      if (clipboardContent.trim()) {
        setTxnHash(clipboardContent.trim());
      }
    } catch (error) {
      console.error('Error reading clipboard:', error);
    }
  };

  /**
   * Handles clearing the transaction hash
   */
  const handleClearHash = (): void => {
    setTxnHash('');
  };

  /**
   * Handles copying quote ID to clipboard
   */
  const handleCopyQuoteId = async (): Promise<void> => {
    try {
      void Clipboard.setString(currentActivity.quoteId);
      Toast.show({
        text1: 'Quote ID copied to clipboard',
        type: 'success',
      });
    } catch (error) {
      console.error('Error copying quote ID:', error);
      Toast.show({
        text1: 'Failed to copy quote ID',
        type: 'error',
      });
    }
  };

  /**
   * Formats timestamp for display
   */
  const formatTimestamp = (timestamp: number): string => {
    return moment.unix(timestamp).format('MMM DD, YYYY, h:mm A');
  };

  /**
   * Formats remaining time for countdown display
   */
  const formatRemainingTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  /**
   * Formats quote ID to show first 6 and last 6 characters
   */
  const formatQuoteId = (quoteId: string): string => {
    if (quoteId.length <= 12) {
      return quoteId; // If quote ID is short, show it fully
    }
    const first6 = quoteId.substring(0, 6);
    const last6 = quoteId.substring(quoteId.length - 6);
    return `${first6}...${last6}`;
  };

  /**
   * Gets the appropriate step information based on activity status
   */
  const getStepInfo = () => {
    const status = currentActivity.activityStatus;

    // Define all possible steps with their base configuration
    const steps = [
      {
        step: 1,
        title: 'Quotation Created',
        completed: true, // Step 1 is always complete
        inProgress: false,
        failed: false,
        subtitle: formatTimestamp(currentActivity.createdOn),
      },
      {
        step: 2,
        title: 'Token Transfer Initiated',
        completed:
          status === ActivityStatus.IN_PROGRESS ||
          status === ActivityStatus.TRANSACTION_VERIFIED_ON_CHAIN ||
          status === ActivityStatus.COMPLETED ||
          status === ActivityStatus.FAILED ||
          status === ActivityStatus.DELAYED ||
          status === ActivityStatus.USER_REPORTED,
        inProgress: status === ActivityStatus.ONCHAIN_TRANSACTION_INITIATED,
        failed: false,
        subtitle: undefined,
      },
      {
        step: 3,
        title: getStep3Title(),
        completed:
          status === ActivityStatus.TRANSACTION_VERIFIED_ON_CHAIN ||
          status === ActivityStatus.DELAYED ||
          status === ActivityStatus.COMPLETED ||
          (status === ActivityStatus.USER_REPORTED && remainingTime > 0),
        inProgress:
          status === ActivityStatus.IN_PROGRESS ||
          status === ActivityStatus.USER_REPORTED,
        failed: status === ActivityStatus.FAILED,
        subtitle: undefined,
      },
      {
        step: 4,
        title: getStep4Title(),
        completed: status === ActivityStatus.COMPLETED,
        inProgress: status === ActivityStatus.TRANSACTION_VERIFIED_ON_CHAIN,
        failed: status === ActivityStatus.FAILED,
        subtitle: getStep4Subtitle(),
      },
    ];

    // Filter out steps that shouldn't be shown based on status
    if (status === ActivityStatus.COMPLETED) {
      // For completed status, show all steps as completed
      return steps.map(step => ({
        ...step,
        completed: true,
        inProgress: false,
        failed: false,
        title: step.step === 4 ? 'Card load Successful' : step.title,
      }));
    }

    return steps;
  };

  /**
   * Gets the title for step 3 based on activity status
   */
  const getStep3Title = (): string => {
    const status = currentActivity.activityStatus;

    // Handle USER_REPORTED status as always verifying (loading)
    if (status === ActivityStatus.USER_REPORTED) {
      return `Verifying on ${capitalize(currentActivity.chain)} Network`;
    }

    const isCompleted =
      status === ActivityStatus.TRANSACTION_VERIFIED_ON_CHAIN ||
      status === ActivityStatus.COMPLETED;

    return isCompleted
      ? `Transaction verified on ${capitalize(currentActivity.chain)} Network`
      : `Verifying on ${capitalize(currentActivity.chain)} Network`;
  };

  /**
   * Gets the title for step 4 based on activity status
   */
  const getStep4Title = (): string => {
    switch (currentActivity.activityStatus) {
      case ActivityStatus.COMPLETED:
        return 'Card load Successful';
      case ActivityStatus.FAILED:
        return 'Card load Failed';
      case ActivityStatus.DELAYED:
        return 'Unusual delay in load';
      case ActivityStatus.TRANSACTION_VERIFIED_ON_CHAIN:
        return 'Card load in progress';
      default:
        return 'Card load in progress';
    }
  };

  /**
   * Gets the subtitle for step 4 based on activity status
   */
  const getStep4Subtitle = (): string | undefined => {
    if (
      currentActivity.activityStatus === ActivityStatus.DELAYED &&
      currentActivity.delayDuration
    ) {
      return `ETA: ${parseInt(currentActivity.delayDuration, 10) / 60}m`;
    }
    return undefined;
  };

  return (
    <CyDModalLayout
      isModalVisible={isVisible}
      setModalVisible={handleModalClose}
      onModalHide={onClose}
      animationIn={'slideInUp'}
      animationOut={'slideOutDown'}
      useNativeDriver={true}
      style={styles.modalLayout}>
      <CyDSafeAreaView className='bg-n20 rounded-[16px]' edges={['bottom']}>
        {/* Header */}
        <CyDView className='flex-row justify-between items-center p-6 border-b border-n40 bg-n0'>
          <CyDText className='text-[20px] font-bold text-base100'>
            Card load
          </CyDText>
          <CyDTouchView
            onPress={handleModalClose}
            className='w-8 h-8 rounded-full bg-n40 items-center justify-center'>
            <CyDMaterialDesignIcons
              name='close'
              size={16}
              className='text-base400'
            />
          </CyDTouchView>
        </CyDView>

        <CyDView className='p-6 bg-n0'>
          {/* Header with amount */}
          <CyDView className='mb-6'>
            <CyDText className='text-[18px] font-medium text-base100'>
              {`Loading your card for $${currentActivity.amount.toFixed(2)}`}
            </CyDText>
          </CyDView>

          {/* Steps Timeline */}
          <CyDView className=''>
            {getStepInfo().map((step, index) => (
              <CyDView key={step.step} className='flex-row items-start'>
                {/* Step Circle */}
                <CyDView className='items-center mr-4'>
                  <CyDView
                    className={clsx(
                      'w-10 h-10 rounded-full items-center justify-center bg-n40',
                      {
                        'bg-[#006A31]':
                          step.completed &&
                          currentActivity.activityStatus ===
                            ActivityStatus.COMPLETED,
                        'bg-[#F7C645]':
                          step.completed &&
                          currentActivity.activityStatus !==
                            ActivityStatus.COMPLETED,
                        'bg-[#E84E4C]': step.failed,
                        'bg-[#00843E]':
                          step.inProgress && !step.completed && !step.failed,
                        'bg-n40':
                          !step.completed && !step.failed && !step.inProgress,
                      },
                    )}>
                    {step.inProgress ? (
                      <CyDMaterialDesignIcons
                        name='loading'
                        size={16}
                        color={'white'}
                        className='animate-spin '
                      />
                    ) : step.failed ? (
                      <CyDMaterialDesignIcons
                        name='close'
                        size={16}
                        color={'white'}
                        // className='text-base400'
                      />
                    ) : step.completed ? (
                      <CyDMaterialDesignIcons
                        name='check'
                        size={16}
                        className='text-base400'
                      />
                    ) : (
                      <CyDText
                        className={clsx(
                          'text-[16px] font-bold',
                          'text-base400',
                        )}>
                        {step.step}
                      </CyDText>
                    )}
                  </CyDView>
                  {/* Vertical Line */}
                  {index < getStepInfo().length - 1 && (
                    <CyDView
                      className={clsx('w-[2px] h-[42px] bg-n40', {
                        'bg-[#006A31]':
                          step.completed &&
                          currentActivity.activityStatus ===
                            ActivityStatus.COMPLETED,
                        'bg-[#F7C645]':
                          step.completed &&
                          currentActivity.activityStatus !==
                            ActivityStatus.COMPLETED,
                        'bg-[#E84E4C]': step.failed && !step.completed,
                        'bg-n40':
                          (step.inProgress &&
                            !step.completed &&
                            !step.failed) ||
                          (!step.completed && !step.failed && !step.inProgress),
                      })}
                    />
                  )}
                </CyDView>

                {/* Step Content */}
                <CyDView className=' pt-2'>
                  <CyDText
                    className={clsx(
                      'text-[16px] font-medium mb-1 text-base200',
                      {
                        'text-base100': step.completed || step.inProgress,
                        'text-[#E84E4C]': step.failed && !step.completed,
                        'text-base200':
                          !step.completed && !step.failed && !step.inProgress,
                      },
                    )}>
                    {step.title}
                  </CyDText>
                  {step.subtitle && (
                    <CyDText
                      className={clsx('text-[12px]', {
                        'text-base200': !step.failed,
                        'text-[#E84E4C]': step.failed,
                      })}>
                      {step.subtitle}
                    </CyDText>
                  )}

                  {/* Quote ID for Step 1 */}
                  {step.step === 1 && (
                    <CyDTouchView
                      className='mt-2 flex-row items-center'
                      onPress={() => {
                        void handleCopyQuoteId();
                      }}>
                      <CyDText className='text-[12px] text-n200'>
                        Quote ID: {formatQuoteId(currentActivity.quoteId)}
                      </CyDText>
                      <CyDMaterialDesignIcons
                        name='content-copy'
                        size={14}
                        color='#9CA3AF'
                        className='ml-2'
                      />
                    </CyDTouchView>
                  )}
                </CyDView>
              </CyDView>
            ))}
          </CyDView>
        </CyDView>

        {/* Footer - Only show if activity is not completed */}
        {currentActivity.activityStatus !== ActivityStatus.COMPLETED && (
          <>
            {/* Failed status - show contact support */}
            {currentActivity.activityStatus === ActivityStatus.FAILED && (
              <CyDView className='p-4 border-t border-n40 '>
                <CyDText className='text-[32px] font-semibold'>😐</CyDText>
                <CyDText className='text-[14px] font-normal'>
                  {'We apologize for the delay in completing your funding.'}
                </CyDText>
                <CyDText className='text-[12px] font-normal mt-[8px] text-n200'>
                  {
                    "Reach out to our support team for a quicker resolution. We understand that delays can be frustrating, but rest assured, the funds that have passed through the blockchain are secure with us, so there's no need to worry."
                  }
                </CyDText>
                <CyDTouchView
                  onPress={handleContactSupport}
                  className='bg-p50 rounded-full py-[10px] px-[24px] items-center mt-4'>
                  <CyDText className='font-medium text-[16px] text-black'>
                    Contact Support
                  </CyDText>
                </CyDTouchView>
              </CyDView>
            )}

            {/* Show "Reported your txn" when expedition request is successful but status not yet USER_REPORTED */}
            {expeditionRequestSuccess &&
              currentActivity.activityStatus !==
                ActivityStatus.USER_REPORTED && (
                <CyDView className='p-4 bg-n20 border-t border-n40'>
                  <CyDText className='text-[16px] font-semibold text-base100 mb-2'>
                    Your funding is our top priority
                  </CyDText>
                  {fetchingStatusTime > 0 ? (
                    <CyDText className='text-[14px] text-n200'>
                      Fetching your report status in {fetchingStatusTime}s
                    </CyDText>
                  ) : (
                    <CyDText className='text-[14px] text-n200'>
                      We have received your transaction report and will update
                      you soon.
                    </CyDText>
                  )}
                </CyDView>
              )}

            {/* USER_REPORTED status with timer - show countdown timer */}
            {currentActivity.activityStatus === ActivityStatus.USER_REPORTED &&
              remainingTime > 0 && (
                <CyDView className='p-4 bg-n20 border-t border-n40'>
                  <CyDView className='flex-row items-center justify-between mb-2'>
                    <CyDText className='text-[16px] font-semibold flex-1'>
                      Your funding is our top priority
                    </CyDText>
                    <CyDView className='bg-p100 border border-base400 rounded-[8px] p-[6px] w-[130px]'>
                      <CyDText className='text-[12px] text-black font-bold text-center'>
                        Resolving in {formatRemainingTime(remainingTime)}
                      </CyDText>
                    </CyDView>
                  </CyDView>
                  <CyDText className='text-[14px] text-n200'>
                    We have received your request and the team is currently
                    working on it, will update you soon.
                  </CyDText>
                </CyDView>
              )}

            {/* USER_REPORTED status but timer expired - show contact support */}
            {currentActivity.activityStatus === ActivityStatus.USER_REPORTED &&
              remainingTime === 0 && (
                <CyDView className='p-4 border-t border-n40 '>
                  <CyDText className='text-[32px] font-semibold'>😐</CyDText>
                  <CyDText className='text-[14px] font-normal'>
                    {'We apologize for the delay in completing your funding.'}
                  </CyDText>
                  <CyDText className='text-[12px] font-normal mt-[8px] text-n200'>
                    {
                      "Reach out to our support team for a quicker resolution. We understand that delays can be frustrating, but rest assured, the funds that have passed through the blockchain are secure with us, so there's no need to worry."
                    }
                  </CyDText>
                  <CyDTouchView
                    onPress={handleContactSupport}
                    className='bg-p50 rounded-full py-[10px] px-[24px] items-center mt-4'>
                    <CyDText className='font-medium text-[16px] text-black'>
                      Contact Support
                    </CyDText>
                  </CyDTouchView>
                </CyDView>
              )}

            {/* Delayed but no expedition request yet - show original UI */}
            {isDelayed &&
              !expeditionRequestSuccess &&
              currentActivity.activityStatus !== ActivityStatus.FAILED &&
              currentActivity.activityStatus !==
                ActivityStatus.USER_REPORTED && (
                <>
                  <CyDView className='p-4 bg-n20 flex flex-row items-start gap-x-[4px]'>
                    <CyDView className='flex-1 pr-2'>
                      <CyDText className='text-[14px]'>
                        {
                          'We know delays are frustrating. Initiate a request to our fund processing team to expedite your funding.'
                        }
                      </CyDText>
                    </CyDView>
                    <CyDTouchView
                      onPress={() => {
                        void handleRequestTeam();
                      }}
                      disabled={isSubmittingRequest}
                      className={clsx(
                        'rounded-lg p-[6px] shrink-0',
                        isSubmittingRequest ? 'bg-n60' : 'bg-n40',
                      )}>
                      <CyDText className='font-medium text-[14px]'>
                        {isSubmittingRequest ? 'Submitting...' : 'Request Team'}
                      </CyDText>
                    </CyDTouchView>
                  </CyDView>
                  <CyDView className='px-4 pb-4 bg-n20'>
                    <CyDText className='text-[12px] text-n80 mb-2'>
                      Provide the correct transaction hash to help the team
                      process faster
                    </CyDText>
                    <CyDView className='border border-n60 rounded-lg bg-n0 flex-row items-center'>
                      {txnHash ? (
                        <>
                          <CyDView className='flex-1 p-3'>
                            <CyDText
                              className='text-[14px] text-base100'
                              numberOfLines={1}
                              ellipsizeMode='middle'>
                              {txnHash}
                            </CyDText>
                          </CyDView>
                          <CyDTouchView
                            onPress={handleClearHash}
                            className='p-3'>
                            <CyDMaterialDesignIcons
                              name='close'
                              size={20}
                              color='#9CA3AF'
                            />
                          </CyDTouchView>
                        </>
                      ) : (
                        <>
                          <CyDView className='flex-1 p-3'>
                            <CyDText className='text-[14px] text-n80'>
                              Transaction hash (optional)
                            </CyDText>
                          </CyDView>
                          <CyDTouchView
                            onPress={() => {
                              void handlePasteHash();
                            }}
                            className='p-3 flex-row items-center gap-1'>
                            <CyDMaterialDesignIcons
                              name='content-paste'
                              size={20}
                              color='#9CA3AF'
                            />
                            <CyDText className='text-[12px] text-n80'>
                              Paste
                            </CyDText>
                          </CyDTouchView>
                        </>
                      )}
                    </CyDView>
                  </CyDView>
                </>
              )}
          </>
        )}
      </CyDSafeAreaView>
    </CyDModalLayout>
  );
};

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end',
  },
});

export default ActivityDetailsModal;
