import React, { useContext } from 'react';
import {
  CyDFastImage,
  CyDIcons,
  CyDMaterialDesignIcons,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindComponents';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from 'i18next';
import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { StyleSheet } from 'react-native';
import { CypherPlanId } from '../../../constants/enum';
import moment from 'moment';
import Intercom from '@intercom/intercom-react-native';
import { sendFirebaseEvent } from '../../utilities/analyticsUtility';
import { HdWalletContext } from '../../../core/util';
import { HdWalletContextDef } from '../../../reducers/hdwallet_reducer';
import * as Sentry from '@sentry/react-native';

interface RouteParams {
  planInfo: {
    expiresOn: number;
    metalCardEligible: boolean;
    planId: CypherPlanId;
    updatedOn: number;
  };
}

export default function ManageSubscription() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const { planInfo } = route.params;
  const hdWalletContext = useContext(HdWalletContext) as HdWalletContextDef;
  return (
    <CyDView
      className='flex flex-col justify-between h-full bg-n0'
      style={{ paddingTop: insets.top }}>
      <CyDView className='flex flex-row items-center py-[16px] px-[16px] '>
        <CyDTouchView
          className='pr-[16px]'
          onPress={() => {
            navigation.goBack();
          }}>
          <CyDIcons name='arrow-left' size={24} className='text-base400' />
        </CyDTouchView>
        <CyDText className='text-[16px] font-bold text-base400'>
          {t('MANAGE_PREMIUM')}
        </CyDText>
      </CyDView>

      <CyDView className='flex-1 bg-n20 px-[16px]'>
        <CyDView
          className='bg-p0 rounded-[16px] p-[16px] mt-[30px]'
          style={styles.shadow}>
          <CyDText className='font-bold text-[14px] text-center'>
            {`Premium unlocked! You've been enjoying it since  ${moment
              .unix(planInfo.updatedOn)
              .format('MMMM Do, YYYY')}.`}
          </CyDText>
        </CyDView>

        <CyDView className='mt-[10px] '>
          <CyDText className='font-medium text-[12px] text-n200'>
            {t('MANAGE_PREMIUM')}
          </CyDText>
          <CyDView className=' rounded-[6px] bg-n0 mt-[6px]'>
            <CyDView className='flex-row justify-between px-[16px] py-[18px]'>
              <CyDText className='font-medium text-[14px]'>
                Next renewal
              </CyDText>
              <CyDText className='font-bold text-[12px]'>
                {moment.unix(planInfo.expiresOn).format('MMMM Do, YYYY')}
              </CyDText>
            </CyDView>
            <CyDView className='flex-row justify-end items-center'>
              <CyDView className='h-[1px] bg-n30 w-[85%]' />
            </CyDView>
            <CyDView className='flex-row justify-between px-[16px] py-[18px]'>
              <CyDText className='font-medium text-[14px]'>
                Cancel Subscription
              </CyDText>
              <CyDTouchView
                onPress={() => {
                  try {
                    void Intercom.present();
                    sendFirebaseEvent(hdWalletContext, 'support');
                  } catch (e) {
                    Sentry.captureException(e);
                  }
                }}>
                <CyDText className='font-bold text-[14px] text-blue300'>
                  Contact Support
                </CyDText>
              </CyDTouchView>
            </CyDView>
          </CyDView>
        </CyDView>
      </CyDView>
    </CyDView>
  );
}
const styles = StyleSheet.create({
  shadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
});
