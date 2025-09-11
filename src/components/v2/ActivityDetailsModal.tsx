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
import useAxios from '../../core/HttpRequest';
import Intercom from '@intercom/intercom-react-native';
import Toast from 'react-native-toast-message';
import { logAnalytics, parseErrorMessage } from '../../core/util';
import Clipboard from '@react-native-clipboard/clipboard';

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
  const [expeditionTimestamp, setExpeditionTimestamp] = React.useState<
    number | null
  >(null);
  const [remainingTime, setRemainingTime] = React.useState<number>(0);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);
  const { postWithAuth } = useAxios();

  /**
   * Cleanup timer on component unmount or when modal closes
   */
  React.useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  /**
   * Reset expedition state when modal closes
   */
  React.useEffect(() => {
    if (!isVisible) {
      setExpeditionRequestSuccess(false);
      setExpeditionTimestamp(null);
      setRemainingTime(0);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isVisible]);

  /**
   * Start countdown timer when expedition request is successful
   */
  React.useEffect(() => {
    if (expeditionRequestSuccess && expeditionTimestamp) {
      const updateTimer = () => {
        const now = moment().unix();
        const expeditionTime = moment.unix(expeditionTimestamp);
        const endTime = expeditionTime.add(20, 'minutes').unix();
        const remaining = endTime - now;

        if (remaining <= 0) {
          setRemainingTime(0);
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
        } else {
          setRemainingTime(remaining);
        }
      };

      // Update immediately
      updateTimer();

      // Set up interval to update every second
      timerRef.current = setInterval(updateTimer, 1000);

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };
    }
  }, [expeditionRequestSuccess, expeditionTimestamp]);

  if (!activity) {
    return null;
  }

  /**
   * Gets the current activity data, preferring live data from ongoing, completed, or failed activities
   * Falls back to the original activity prop if not found in any array
   */
  const getCurrentActivity = (): CardFundResponse => {
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

      // const requestData = {
      //   quoteId: currentActivity.quoteId,
      //   ...(txnHash.trim() && { hash: txnHash.trim() }),
      // };

      // const response = await postWithAuth(
      //   '/v1/funding/alertQuoteTicket',
      //   requestData,
      // );
      const response = {
        isError: false,
      };

      if (!response.isError) {
        setTxnHash('');
        setExpeditionRequestSuccess(true);
        setExpeditionTimestamp(moment().unix());
      } else {
        void logAnalytics({
          type: AnalyticsType.ERROR,
          chain: activity.chain,
          message: `Load Report failed: ${parseErrorMessage(response.error)}`,
          screen: 'Activity Status modal',
          address: activity.masterAddress,
          other: {
            masterAddress: activity.masterAddress,
            fromAddress: activity.fromAddress,
            token: activity.tokenSymbol,
            tokensRequired: activity.tokensRequired,
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
   * Gets the appropriate step information based on activity status
   */
  const getStepInfo = () => {
    const status = currentActivity.status;

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
          status === ActivityStatus.DELAYED,
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
          status === ActivityStatus.COMPLETED,
        inProgress: status === ActivityStatus.IN_PROGRESS,
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
    const isCompleted =
      currentActivity.status === ActivityStatus.TRANSACTION_VERIFIED_ON_CHAIN ||
      currentActivity.status === ActivityStatus.COMPLETED;

    return isCompleted
      ? `Transaction verified on ${capitalize(currentActivity.chain)} Network`
      : `Verifying on ${capitalize(currentActivity.chain)} Network`;
  };

  /**
   * Gets the title for step 4 based on activity status
   */
  const getStep4Title = (): string => {
    switch (currentActivity.status) {
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
      currentActivity.status === ActivityStatus.DELAYED &&
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
                      'w-10 h-10 rounded-full items-center justify-center',
                      {
                        'bg-[#006A31]':
                          step.completed &&
                          currentActivity.status === ActivityStatus.COMPLETED,
                        'bg-yellow-500':
                          step.completed &&
                          currentActivity.status !== ActivityStatus.COMPLETED,
                        'bg-red-500': step.failed,
                        'bg-white':
                          step.inProgress && !step.completed && !step.failed,
                        'bg-n40':
                          !step.completed && !step.failed && !step.inProgress,
                      },
                    )}>
                    {step.inProgress ? (
                      <CyDMaterialDesignIcons
                        name='loading'
                        size={16}
                        className='!text-base400 animate-spin'
                      />
                    ) : step.failed ? (
                      <CyDMaterialDesignIcons
                        name='close'
                        size={16}
                        color={'white'}
                        className='text-base400'
                      />
                    ) : step.completed ? (
                      <CyDMaterialDesignIcons
                        name='check'
                        size={16}
                        color={'white'}
                      />
                    ) : (
                      <CyDText
                        className={clsx(
                          'text-[16px] font-bold',
                          'text-base200',
                        )}>
                        {step.step}
                      </CyDText>
                    )}
                  </CyDView>
                  {/* Vertical Line */}
                  {index < getStepInfo().length - 1 && (
                    <CyDView
                      className={clsx('w-[2px] h-[42px]', {
                        'bg-[#006A31]':
                          step.completed &&
                          currentActivity.status === ActivityStatus.COMPLETED,
                        'bg-yellow-300':
                          step.completed &&
                          currentActivity.status !== ActivityStatus.COMPLETED,
                        'bg-red-500': step.failed && !step.completed,
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
                    className={clsx('text-[16px] font-medium mb-1', {
                      'text-base100': step.completed || step.inProgress,
                      'text-red-500': step.failed && !step.completed,
                      'text-base200':
                        !step.completed && !step.failed && !step.inProgress,
                    })}>
                    {step.title}
                  </CyDText>
                  {step.subtitle && (
                    <CyDText
                      className={clsx('text-[12px]', {
                        'text-base200': !step.failed,
                        'text-red-400': step.failed,
                      })}>
                      {step.subtitle}
                    </CyDText>
                  )}
                </CyDView>
              </CyDView>
            ))}
          </CyDView>
        </CyDView>

        {/* Footer - Only show if activity is not completed */}
        {currentActivity.status !== ActivityStatus.COMPLETED && (
          <>
            {/* Failed status - show contact support */}
            {currentActivity.status === ActivityStatus.FAILED && (
              <CyDView className='p-6 border-t border-n40'>
                <CyDTouchView
                  onPress={handleContactSupport}
                  className='bg-red-500 rounded-full py-3 px-4 items-center mb-3'>
                  <CyDText className='text-white font-medium text-[14px]'>
                    Contact Support
                  </CyDText>
                </CyDTouchView>
              </CyDView>
            )}

            {/* Expedition request successful - show countdown timer */}
            {expeditionRequestSuccess && remainingTime > 0 && (
              <CyDView className='p-4 bg-n20 border-t border-n40'>
                {/* <CyDView className='bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4'> */}
                <CyDView className='flex-row items-center justify-between mb-2'>
                  <CyDText className='text-[16px] font-semibold flex-1 '>
                    {'Your funding is our top priority'}
                  </CyDText>
                  <CyDView className='bg-p100 border border-base400 rounded-[8px] p-[6px] w-[120px]'>
                    <CyDText className='text-[12px] font-bold'>
                      Resolving in {formatRemainingTime(remainingTime)}
                    </CyDText>
                  </CyDView>
                </CyDView>
                <CyDText className='text-[14px] text-n200'>
                  We have received your request and the team is currently
                  working on it, will update you soon.
                </CyDText>
                {/* </CyDView> */}
              </CyDView>
            )}

            {/* Timer expired but activity not completed - show contact support */}
            {expeditionRequestSuccess && remainingTime === 0 && (
              <CyDView className='p-6 border-t border-n40'>
                <CyDTouchView
                  onPress={handleContactSupport}
                  className='bg-red-500 rounded-full py-3 px-4 items-center mb-3'>
                  <CyDText className='text-white font-medium text-[14px]'>
                    Contact Support
                  </CyDText>
                </CyDTouchView>
              </CyDView>
            )}

            {/* Delayed but no expedition request yet - show original UI */}
            {isDelayed &&
              !expeditionRequestSuccess &&
              currentActivity.status !== ActivityStatus.FAILED && (
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
