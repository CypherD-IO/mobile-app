import React, { useContext, useState } from 'react';
import {
  CyDFastImage,
  CyDKeyboardAwareScrollView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../../styles/tailwindStyles';
import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import useAxios from '../../../../core/HttpRequest';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppImages from '../../../../../assets/images/appImages';
import { t } from 'i18next';
import Button from '../../../../components/v2/button';
import { screenTitle } from '../../../../constants';
import { capitalize, ceil } from 'lodash';
import { toWords } from 'number-to-words';
import { HdWalletContext, parseErrorMessage } from '../../../../core/util';
import { HdWalletContextDef } from '../../../../reducers/hdwallet_reducer';
import { v4 as uuidv4 } from 'uuid';
import { ChainBackendNames } from '../../../../constants/server';
import { useGlobalModalContext } from '../../../../components/v2/GlobalModal';
import { StyleSheet } from 'react-native';
import { Card } from '../../../../models/card.model';

interface RouteParams {
  amount: string;
  currentCardProvider: string;
  card: Card;
  cardBalance: string;
}

interface WithdrawPost {
  idempotencyKey: string;
  amount: number;
  chain: ChainBackendNames;
  toAddress: string;
  isCharged: boolean;
}

export default function WithdrawConfirmation() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const { postWithAuth } = useAxios();
  const insets = useSafeAreaInsets();
  const hdWallet = useContext(HdWalletContext) as HdWalletContextDef;
  const { showModal, hideModal } = useGlobalModalContext();

  const { amount, card, currentCardProvider } = route.params ?? {};
  const ethereumAddress = hdWallet?.state?.wallet?.ethereum?.address ?? '';

  const finalAmount =
    ceil(parseFloat(amount || '0'), 2) -
    ceil(parseFloat(amount || '0') * 0.005, 2);
  const cypherFee = ceil(parseFloat(amount || '0') * 0.005, 2);

  const dollars = Math.floor(Number(amount));
  const cents = Math.round((Number(amount) % 1) * 10000) / 100;

  const [loading, setLoading] = useState(false);

  const postWithdrawal = async () => {
    setLoading(true);
    const postBody: WithdrawPost = {
      idempotencyKey: uuidv4(),
      amount: ceil(parseFloat(amount || '0'), 2),
      chain: ChainBackendNames.BASE,
      toAddress: ethereumAddress,
      isCharged: true,
    };
    const { isError, error } = await postWithAuth(
      '/v1/cards/crypto-withdrawal',
      postBody,
    );
    if (isError) {
      showModal('state', {
        type: 'error',
        title: t('WITHDRAW_ERROR'),
        description: parseErrorMessage(error) ?? t('CONTACT_SUPPORT'),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    } else {
      navigation.navigate(screenTitle.WITHDRAW_SUCCESS, {
        amount,
        card,
        currentCardProvider,
      });
    }
    setLoading(false);
  };

  return (
    <CyDView
      className='flex flex-col justify-between h-full bg-n30'
      style={{ paddingTop: insets.top }}>
      <CyDView className='flex-1  px-[16px]'>
        <CyDTouchView
          className=''
          onPress={() => {
            navigation.goBack();
          }}>
          <CyDFastImage
            source={AppImages.BACK_ARROW_GRAY}
            className='w-[32px] h-[32px]'
          />
        </CyDTouchView>

        <CyDKeyboardAwareScrollView className='flex-1 bg-n30 mt-[12px]'>
          <CyDText className='font-bold text-[28px] text-base400 '>
            {'Does Everything look right ?'}
          </CyDText>
          <CyDView className='mt-[24px]'>
            <CyDText className='font-medium text-[12px] text-n100'>
              {'Your are withdrawing '}
            </CyDText>
            <CyDView className='bg-n10 rounded-[8px] mt-[4px] p-[12px]'>
              <CyDText className='font-bold text-[20px] text-base400 flex flex-row items-end'>
                {`$ ${amount}`}
              </CyDText>
            </CyDView>
            <CyDText className='font-medium text-[12px] text-n200 mt-[4px]'>
              {cents > 0
                ? `${String(capitalize(toWords(dollars)))} dollars and ${String(toWords(cents))} cents`
                : `${String(capitalize(toWords(dollars)))} dollars`}
            </CyDText>
          </CyDView>
          <CyDView className='mt-[24px]'>
            <CyDText className='font-medium text-[12px] text-n100'>
              {'Conversion Rate'}
            </CyDText>
            <CyDView className='bg-n10 rounded-[8px] mt-[4px] p-[12px]'>
              <CyDText className='font-bold text-[17px] text-n200'>
                {`$ ${cypherFee}`}
              </CyDText>
            </CyDView>
          </CyDView>
          <CyDView className='mt-[24px]'>
            <CyDText className='font-medium text-[12px] text-n100'>
              {'To'}
            </CyDText>
            <CyDView className='bg-n10 rounded-[8px] mt-[4px] p-[16px]'>
              <CyDText className='font-medium text-[12px] text-n200'>
                {ethereumAddress}
              </CyDText>
            </CyDView>
          </CyDView>
          <CyDView className='mt-[24px]'>
            <CyDText className='font-medium text-[12px] text-n100'>
              {'Asset value'}
            </CyDText>
            <CyDView className='bg-n10 rounded-[8px] mt-[4px] p-[12px] flex flex-row justify-between'>
              <CyDText className='font-bold text-[16px] text-base400'>
                {`$ ${finalAmount}`}
              </CyDText>
              <CyDView className='flex flex-row items-center'>
                <CyDView className='relative mr-[2px]'>
                  <CyDFastImage
                    source={AppImages.USDC_TOKEN}
                    className='w-[18px] h-[18px] '
                  />
                  <CyDFastImage
                    source={AppImages.BASE_LOGO}
                    className='w-[8px] h-[8px] absolute bottom-[0px] right-[0px]'
                  />
                </CyDView>
                <CyDText className='text-[14px] text-base400 font-bold'>
                  {' BASE X USDC'}
                </CyDText>
              </CyDView>
            </CyDView>
            <CyDText className='font-medium text-[12px] text-n200 mt-[4px]'>
              {'It will take up to 24 hours to credit in your wallet '}
            </CyDText>
          </CyDView>
        </CyDKeyboardAwareScrollView>
      </CyDView>

      <CyDView className='bg-n0 px-[16px] pb-[32px] pt-[24px] rounded-t-[16px]'>
        <Button
          title={t('ACCEPT')}
          loaderStyle={styles.loader}
          loading={loading}
          onPress={() => {
            void postWithdrawal();
          }}
        />
      </CyDView>
    </CyDView>
  );
}

const styles = StyleSheet.create({
  loader: {
    height: 20,
    width: 20,
  },
});
