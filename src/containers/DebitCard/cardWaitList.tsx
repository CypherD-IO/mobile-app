import React, { useContext, useEffect, useState } from 'react';
import AppImages from '../../../assets/images/appImages';
import Button from '../../components/v2/button';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import axios from '../../core/Http';
import { isAndroid } from '../../misc/checkers';
import {
  CyDImage,
  CyDMaterialDesignIcons,
  CyDScrollView,
  CyDText,
  CyDTextInput,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindComponents';
import { hostWorker } from '../../global';
import { isValidEmailID, HdWalletContext } from '../../core/util';
import * as Sentry from '@sentry/react-native';
import { useTranslation } from 'react-i18next';
import * as C from '../../constants/index';
import clsx from 'clsx';
import ChooseCountryModal from '../../components/v2/ChooseCountryModal';
import { ICountry } from '../../models/cardApplication.model';
import { CardProviders } from '../../constants/enum';
import useCardUtilities from '../../hooks/useCardUtilities';
import { get } from 'lodash';
import { CardProfile } from '../../models/cardProfile.model';
import { GlobalContext } from '../../core/globalContext';

const cardBenefits = [
  'Available globally',
  'Accepted by 40+ million merchants worldwide',
  'Supports 20+ chains, 500+ tokens - more coming soon!',
  'Access both virtual and physical cards',
  'Free worldwide shipping for physical cards',
  'Zero fee funding for USDC',
  '24/7 customer support',
];

interface Props {
  navigation: any;
}

export default function CardWailtList({ navigation }: Props) {
  const ARCH_HOST: string = hostWorker.getHost('ARCH_HOST');

  const { showModal, hideModal } = useGlobalModalContext();
  const { t } = useTranslation();

  const hdWallet = useContext<any>(HdWalletContext);
  const ethereumAddress = get(
    hdWallet,
    'state.wallet.ethereum.address',
    undefined,
  );

  const [joiningWaitlist, setJoiningWaitlist] = useState<boolean>(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const [isValidUserEmail, setIsValidUserEmail] = useState<boolean>(false);
  const [isModalVisible, setModalVisible] = useState<boolean>(false);
  const [selectedCountry, setSelectedCountry] = useState<ICountry>({
    name: 'United States',
    dialCode: '+1',
    flag: '🇺🇸',
    Iso2: 'US',
    Iso3: 'USA',
    currency: 'USD',
  });
  const [provider, setProvider] = useState(CardProviders.REAP_CARD);
  const { checkIsRCEnabled } = useCardUtilities();
  const globalContext = useContext<any>(GlobalContext);
  const cardProfile: CardProfile = globalContext.globalState.cardProfile;

  useEffect(() => {
    const setCardProvider = async () => {
      const isRcEnabled = await checkIsRCEnabled();
      if (
        !isRcEnabled &&
        !get(cardProfile, [CardProviders.PAYCADDY, 'isRcUpgradable'], false)
      ) {
        setProvider(CardProviders.PAYCADDY);
      }
    };

    void setCardProvider();
  }, [selectedCountry]);

  async function joinWaitlist() {
    if (userEmail && userEmail !== '') {
      if (isValidEmailID(userEmail)) {
        try {
          setIsValidUserEmail(true);
          setJoiningWaitlist(true);
          const payload = {
            email: userEmail,
            ethAddress: ethereumAddress,
            country: selectedCountry.Iso2,
          };
          const response = await axios.post(
            `${ARCH_HOST}/v1/cards/waitlist`,
            payload,
          );
          if (
            response.status === 201 &&
            (response.data.status === 'REGISTERED' ||
              response.data.status === 'PRESENT')
          ) {
            setJoiningWaitlist(false);
            showModal('state', {
              type: 'success',
              title: '',
              description: t('JOIN_WAITLIST_SUCCESS_TOAST'),
              onSuccess: () => {
                setUserEmail('');
                hideModal();
              },
              onFailure: hideModal,
            });
          }
        } catch (error) {
          Sentry.captureException(error);
          setJoiningWaitlist(false);
          showModal('state', {
            type: 'error',
            title: '',
            description: t('JOINING_WAITLIST_ERROR'),
            onSuccess: hideModal,
            onFailure: hideModal,
          });
        }
      } else {
        setJoiningWaitlist(false);
        setIsValidUserEmail(false);
      }
    } else {
      showModal('state', {
        type: 'error',
        title: '',
        description: t('EMPTY_EMAIL_ERROR'),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    }
  }

  return (
    <CyDView
      className={clsx('flex-1 bg-n0 mt-[32px]', {
        'pb-[75px]': isAndroid(),
      })}>
      <CyDScrollView className='bg-n0 py-[12px]'>
        <ChooseCountryModal
          isModalVisible={isModalVisible}
          setModalVisible={setModalVisible}
          selectedCountryState={[selectedCountry, setSelectedCountry]}
        />
        <CyDView className={'w-screen'}>
          <CyDText
            className={'text-center font-bold text-[22px] mt-[20px] mb-[10px]'}>
            {t<string>('SIGNUP_CARD_WAITLIST_TITLE')}
          </CyDText>
          {/* <CyDText className={'text-center font-bold text-[14px] mt-[-6px] mb-[6px]'}>{`(${t('AVAILABLE_ONLY_IN_USA')})`}</CyDText> */}
          <CyDView>
            <CyDView className={'flex items-center text-center z-50'}>
              <CyDImage source={AppImages.DEBIT_SHOW_CARD} />
            </CyDView>
            <CyDView
              className={
                'flex justify-center items-center text-center relative mt-[-80px]'
              }>
              <CyDView
                className={
                  'w-[85%] bg-n0 px-[50px] pt-[100px] pb-[30px] rounded-[18px] shadow-lg'
                }>
                <CyDView>
                  {provider === CardProviders.PAYCADDY && (
                    <>
                      <CyDTouchView
                        className={
                          'mt-[5px] mb-[5px] border-[1px] border-base80 py-[12px] px-[10px] rounded-[8px] flex w-[100%]'
                        }
                        onPress={() => setModalVisible(true)}>
                        <CyDView
                          className={clsx(
                            'flex flex-row justify-between items-center',
                            { 'border-redOffColor': !selectedCountry },
                          )}>
                          <CyDView className={'flex flex-row items-center'}>
                            <CyDText className='text-center text-[18px] ml-[8px]'>
                              {selectedCountry.flag}
                            </CyDText>
                            <CyDText className='text-center text-[18px] ml-[8px]'>
                              {selectedCountry.name}
                            </CyDText>
                          </CyDView>
                          <CyDMaterialDesignIcons
                            name={'chevron-down'}
                            size={16}
                            className={'text-base400'}
                          />
                        </CyDView>
                      </CyDTouchView>
                      <CyDTextInput
                        value={userEmail}
                        textContentType='emailAddress'
                        autoFocus={true}
                        keyboardType='email-address'
                        autoCapitalize='none'
                        autoCorrect={false}
                        onChangeText={(text: string) => {
                          setUserEmail(text);
                          setIsValidUserEmail(true);
                        }}
                        placeholderTextColor={'#C5C5C5'}
                        className={clsx(
                          'border-[1px] border-[#C5C5C5] h-[50px] rounded-[8px] text-center text-black',
                          {
                            'pb-[10px]': isAndroid(),
                          },
                        )}
                        placeholder='Enter your email'
                      />
                      <Button
                        disabled={!isValidUserEmail && userEmail !== ''}
                        onPress={() => {
                          void joinWaitlist();
                        }}
                        loading={joiningWaitlist}
                        style={'rounded-[8px] h-[50px] mt-[20px]'}
                        title={t<string>('CTA_JOIN_WAITLIST')}
                      />

                      {!isValidUserEmail && userEmail !== '' && (
                        <CyDText className='text-center mt-[18px] mb-[-28px] text-red-500'>
                          {t<string>('VALID_EMAIL_ERROR')}
                        </CyDText>
                      )}
                    </>
                  )}
                  {provider === CardProviders.REAP_CARD && (
                    <Button
                      disabled={!isValidUserEmail && userEmail !== ''}
                      onPress={() => {
                        navigation.navigate(C.screenTitle.CARD_SIGNUP_SCREEN);
                      }}
                      style={'rounded-[8px] h-[50px] mt-[20px]'}
                      title={t<string>('APPLY_NOW')}
                    />
                  )}
                  <CyDView className={'flex flex-row justify-center'}>
                    <CyDTouchView
                      className={'mt-[20px]'}
                      onPress={() =>
                        navigation.navigate(
                          C.screenTitle.CARD_SIGNUP_LANDING_SCREEN,
                        )
                      }>
                      <CyDText
                        className={
                          'text-center text-blue-700 underline underline-offset-2 font-semibold'
                        }>
                        {t<string>('I_HAVE_A_REFERAL_CODE')}
                      </CyDText>
                    </CyDTouchView>
                  </CyDView>
                </CyDView>
              </CyDView>
            </CyDView>
          </CyDView>
        </CyDView>
        <CyDView>
          <CyDText className={'mt-[25px] mx-[40px] text-[20px] font-bold'}>
            {t<string>('CARD_WAITLIST_PAGE_CAPTION')}
          </CyDText>
        </CyDView>
        <CyDView className={'mx-[40px] my-[10px]'}>
          {cardBenefits.map(item => {
            return (
              <CyDView className={'flex flex-row my-[4px]'} key={item}>
                <CyDMaterialDesignIcons
                  name={'triangle'}
                  size={14}
                  className='text-p150 rotate-90 mt-[6px]'
                />
                <CyDText className={'ml-[10px] leading-[25px]'}>{item}</CyDText>
              </CyDView>
            );
          })}
        </CyDView>
        <CyDView className={'flex items-center text-center'}>
          <CyDImage
            source={AppImages.DOTS_ILLUSTRATION}
            className={'w-[200px] h-[90px]'}
          />
        </CyDView>
      </CyDScrollView>
    </CyDView>
  );
}
