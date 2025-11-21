import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
  CyDMaterialDesignIcons,
  CyDSafeAreaView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindComponents';
import { t } from 'i18next';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import { CypherPlanId, GlobalContextType } from '../../../constants/enum';
import moment from 'moment';
import PageHeader from '../../../components/PageHeader';
import { GlobalContext, GlobalContextDef } from '../../../core/globalContext';
import { IPlanData } from '../../../models/planData.interface';
import useCardUtilities from '../../../hooks/useCardUtilities';
import { get } from 'lodash';
import Loading from '../../Loading';
import GradientText from '../../../components/gradientText';
import CancelSubscriptionModal from '../../../components/cancelSubscriptionModal';
import useAxios from '../../../core/HttpRequest';
import { useGlobalModalContext } from '../../../components/v2/GlobalModal';
import { parseErrorMessage } from '../../../core/util';
import clsx from 'clsx';
import Toast from 'react-native-toast-message';

export default function ManageSubscription() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const globalContext = useContext(GlobalContext);
  const { globalState } = globalContext as GlobalContextDef;
  const cardProfile = globalState.cardProfile;
  const currentPlanInfo = cardProfile?.planInfo;
  const currentCardProvider = cardProfile?.provider;
  const { getPlanData, getWalletProfile } = useCardUtilities();
  const { postWithAuth } = useAxios();

  const [fetchingPlanData, setFetchingPlanData] = useState(false);
  const [planData, setPlanData] = useState<IPlanData | undefined>(undefined);
  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const { showModal, hideModal } = useGlobalModalContext();

  const proPlanData = useMemo(
    () => get(planData, ['default', CypherPlanId.PRO_PLAN]),
    [planData],
  );

  const fetchPlanData = async () => {
    setFetchingPlanData(true);
    try {
      const planDataValue = await getPlanData(globalState.token);
      // Basic shape guard
      if (planDataValue && (planDataValue as IPlanData).default) {
        setPlanData(planDataValue as IPlanData);
      } else {
        setPlanData(undefined);
      }
    } finally {
      setFetchingPlanData(false);
    }
  };
  useEffect(() => {
    void fetchPlanData();
  }, []);

  /**
   * Refreshes the card profile after subscription operations
   */
  const refreshProfile = async (): Promise<void> => {
    try {
      const data = await getWalletProfile(globalState.token);
      if (globalContext) {
        globalContext.globalDispatch({
          type: GlobalContextType.CARD_PROFILE,
          cardProfile: data,
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text2: parseErrorMessage(error),
      });
    }
  };

  /**
   * Handles the cancellation of subscription
   */
  const handleCancelSubscription = async (): Promise<void> => {
    setIsCancelling(true);
    try {
      const response = await postWithAuth(
        `/v1/cards/${currentCardProvider ?? ''}/plan/toggle/auto-renewal`,
        {},
      );

      if (!response.isError) {
        showModal('state', {
          type: 'success',
          title: t('SUCCESS'),
          description: t('SUBSCRIPTION_CANCELLED_SUCCESSFULLY'),
          onSuccess: hideModal,
          onFailure: hideModal,
        });
        await refreshProfile();
        setIsCancelling(false);
      } else {
        setIsCancelling(false);
        showModal('state', {
          type: 'error',
          title: t('ERROR_WHILE_CANCEL_SUBSCRIPTION'),
          description: parseErrorMessage(response.error),
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      }
    } catch (error) {
      setIsCancelling(false);
      showModal('state', {
        type: 'error',
        title: t('ERROR_WHILE_CANCEL_SUBSCRIPTION'),
        description: parseErrorMessage(error),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    }
  };

  return (
    <CyDSafeAreaView
      className='flex flex-col justify-between h-full bg-n0'
      edges={['top']}>
      <PageHeader title={'MANAGE_PREMIUM'} navigation={navigation} />

      <CyDView className='flex-1 bg-n20 px-[16px]'>
        {currentPlanInfo && planData && proPlanData && !fetchingPlanData ? (
          <>
            <CyDView className='bg-n0 rounded-[8px] py-[16px] mt-[16px]'>
              <CyDView className='px-[16px]'>
                <GradientText
                  textElement={
                    <CyDText className='font-extrabold text-[22px]'>
                      {'Premium'}
                    </CyDText>
                  }
                  gradientColors={['#FA9703', '#F89408', '#F6510A']}
                  locations={[0, 0.1, 0.2]}
                />
                <CyDText className='mt-[6px] text-[14px] font-semibold tracking-[-0.6px] leading-[145%]'>
                  {'Cypher Premium with metal card '}
                </CyDText>
              </CyDView>
              <CyDView className='bg-base200 h-[1px] w-full my-[16px]' />
              <CyDView className='px-[16px]'>
                <CyDView className='flex-row gap-x-[12px] items-center'>
                  <CyDMaterialDesignIcons
                    name='currency-usd'
                    size={28}
                    className='text-base400'
                  />
                  <CyDText className='text-[14px] font-normal text-base400'>
                    {`$${proPlanData.cost} per year`}
                  </CyDText>
                </CyDView>
                <CyDView className='flex-row gap-x-[12px] items-center mt-[12px]'>
                  <CyDMaterialDesignIcons
                    name='calendar-month-outline'
                    size={28}
                    className='text-base400'
                  />
                  <CyDText className='text-[14px] font-normal text-base400'>
                    {`Renews on ${moment
                      .unix(currentPlanInfo.expiresOn ?? 0)
                      .format('MMM DD, YYYY')}`}
                  </CyDText>
                </CyDView>
              </CyDView>
            </CyDView>

            {currentPlanInfo.autoRenewal && (
              <CyDTouchView
                className={clsx(
                  'my-[16px] bg-n0 rounded-[8px] p-[16px] flex flex-row gap-x-[8px]',
                  {
                    'opacity-50': isCancelling,
                  },
                )}
                onPress={() => setShowCancelModal(true)}
                disabled={isCancelling}>
                <CyDText className='text-[14px] font-medium tracking-[-0.6px] leading-[145%] text-red200'>
                  {t('CANCEL_SUBSCRIPTION')}
                </CyDText>
                {isCancelling && (
                  <CyDMaterialDesignIcons
                    name='loading'
                    size={24}
                    color={'#444444'}
                    className='!text-base400 animate-spin'
                  />
                )}
              </CyDTouchView>
            )}

            {!currentPlanInfo.autoRenewal && (
              <CyDTouchView
                className={clsx(
                  'my-[16px] bg-n0 rounded-[8px] p-[16px] flex flex-row gap-x-[8px]',
                  {
                    'opacity-50': isCancelling,
                  },
                )}
                onPress={() => {
                  void handleCancelSubscription();
                }}
                disabled={isCancelling}>
                <CyDText className='text-[14px] font-medium tracking-[-0.6px] leading-[145%] text-green200'>
                  {t('CONTINUE_SUBSCRIPTION')}
                </CyDText>
                {isCancelling && (
                  <CyDMaterialDesignIcons
                    name='loading'
                    size={24}
                    color={'#444444'}
                    className='!text-base400 animate-spin'
                  />
                )}
              </CyDTouchView>
            )}

            {currentPlanInfo.autoRenewal && (
              <CyDText className='text-[12px] !text-base150'>
                {`If you decide to cancel, you'll still have access to your subscription until ${moment
                  .unix(currentPlanInfo.expiresOn ?? 0)
                  .format(
                    'MMM DD, YYYY',
                  )}. After that, your plan will automatically switch to the Free plan.`}
              </CyDText>
            )}

            {!currentPlanInfo.autoRenewal && (
              <CyDText className='text-[12px] !text-base150'>
                {`Your auto-renewal is disabled, you'll still have access to your subscription until ${moment
                  .unix(currentPlanInfo.expiresOn ?? 0)
                  .format(
                    'MMM DD, YYYY',
                  )}. By clicking on the above button, you can enable auto-renewal.`}
              </CyDText>
            )}
          </>
        ) : (
          <CyDView className='flex-1 bg-n20 px-[16px]'>
            <Loading loadingText={'Fetching subscription information...'} />
          </CyDView>
        )}
      </CyDView>

      {/* Cancel Subscription Modal */}
      {currentPlanInfo && (
        <CancelSubscriptionModal
          isModalVisible={showCancelModal}
          setShowModal={setShowCancelModal}
          currentPlanInfo={currentPlanInfo}
          onCancelSubscription={handleCancelSubscription}
        />
      )}
    </CyDSafeAreaView>
  );
}
