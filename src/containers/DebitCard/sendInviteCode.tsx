import React, { useEffect, useState } from 'react';
import AppImages from '../../../assets/images/appImages';
import Button from '../../components/v2/button';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import { isAndroid } from '../../misc/checkers';
import {
  CyDImage,
  CyDImageBackground,
  CyDSafeAreaView,
  CyDScrollView,
  CyDText,
  CyDTextInput,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindStyles';
import { isValidEmailID } from '../../core/util';
import * as Sentry from '@sentry/react-native';
import { useTranslation } from 'react-i18next';
import * as C from '../../constants/index';
import clsx from 'clsx';
import ChooseCountryModal from '../../components/v2/ChooseCountryModal';
import { ICountry } from '../../models/cardApplication.model';
import useAxios from '../../core/HttpRequest';

interface Props {
  navigation: any;
}

export default function SendInviteCode({ navigation }: Props) {
  const { showModal, hideModal } = useGlobalModalContext();
  const { t } = useTranslation();

  const [joiningWaitlist, setJoiningWaitlist] = useState<boolean>(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [isModalVisible, setModalVisible] = useState<boolean>(false);
  const [selectedCountry, setSelectedCountry] = useState<
    ICountry | undefined
  >();
  const { postWithAuth } = useAxios();

  useEffect(() => {
    return () => {
      navigation.reset({
        index: 0,
        routes: [{ name: C.screenTitle.DEBIT_CARD_SCREEN }],
      });
    };
  }, []);

  async function joinWaitlist() {
    if (
      userEmail &&
      userEmail !== '' &&
      name &&
      name !== '' &&
      selectedCountry
    ) {
      if (isValidEmailID(userEmail)) {
        try {
          setJoiningWaitlist(true);
          const payload = {
            email: userEmail,
            name,
            countryCode: selectedCountry.Iso2,
          };
          const response = await postWithAuth(
            '/v1/cards/pc/invite-friend',
            payload,
          );
          if (!response.isError) {
            setJoiningWaitlist(false);
            showModal('state', {
              type: 'success',
              title: t('INVITE_SENT_SUCCESSFULLY'),
              description: t('INVITE_SENT_DESCRIPTION') + ' ' + userEmail,
              onSuccess: () => {
                setUserEmail('');
                setName('');
                hideModal();
              },
              onFailure: hideModal,
            });
          } else {
            setJoiningWaitlist(false);
            showModal('state', {
              type: 'error',
              title: '',
              description: response.error.message ?? t('INVITE_SEND_ERROR'),
              onSuccess: hideModal,
              onFailure: hideModal,
            });
          }
        } catch (error) {
          Sentry.captureException(error);
          setJoiningWaitlist(false);
          showModal('state', {
            type: 'error',
            title: '',
            description: t('INVITE_SEND_ERROR'),
            onSuccess: hideModal,
            onFailure: hideModal,
          });
        }
      } else {
        setJoiningWaitlist(false);
        showModal('state', {
          type: 'error',
          title: '',
          description: t('INVALID_EMAIL_NAME_ERROR'),
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      }
    } else {
      showModal('state', {
        type: 'error',
        title: '',
        description: t('INVALID_EMAIL_NAME_ERROR'),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    }
  }

  return (
    <CyDImageBackground
      source={AppImages.SEND_INVITE_CODE_BG}
      className='flex-1'>
      <CyDSafeAreaView className='flex-1'>
        <CyDView
          className={clsx('', {
            'pb-[75px]': isAndroid(),
          })}>
          <CyDView className='flex-row justify-center items-center w-[100%] px-[10px]'>
            <CyDTouchView
              onPress={() => {
                navigation.reset({
                  index: 0,
                  routes: [{ name: C.screenTitle.DEBIT_CARD_SCREEN }],
                });
              }}>
              <CyDImage
                source={AppImages.BACK}
                className='h-[22px] w-[25px]'
                resizeMode='contain'
              />
            </CyDTouchView>
            <CyDView className='flex flex-1 items-center'>
              <CyDText className='font-extrabold text-[20px] ml-[-25px]'>
                {t<string>('SEND_INVITE_CODE_TITLE')}
              </CyDText>
            </CyDView>
          </CyDView>
          <CyDScrollView className='py-[12px]'>
            <ChooseCountryModal
              isModalVisible={isModalVisible}
              setModalVisible={setModalVisible}
              selectedCountryState={[selectedCountry, setSelectedCountry]}
            />
            <CyDView className={'w-screen'}>
              {/* <CyDText
              className={
                'text-center font-bold text-[22px] mt-[60px] mb-[10px]'
              }>
              {t<string>('SEND_INVITE_CODE_TITLE')}
            </CyDText> */}
              {/* <CyDText className={'text-center font-bold text-[14px] mt-[-6px] mb-[6px]'}>{`(${t('AVAILABLE_ONLY_IN_USA')})`}</CyDText> */}
              <CyDView>
                <CyDView className={'flex items-center text-center z-50'}>
                  <CyDImage
                    source={AppImages.SEND_INVITE_CODE}
                    className='h-[180px] w-[180px]'
                  />
                </CyDView>
                <CyDView
                  className={
                    'flex justify-center items-center text-center relative mt-[-120px]'
                  }>
                  <CyDView className={'pt-[100px] w-[75%]'}>
                    <CyDTouchView
                      className={
                        'my-[5px] border-[1px] bg-white border-inputBorderColor py-[12px] px-[10px] rounded-[8px] flex w-[100%]'
                      }
                      onPress={() => setModalVisible(true)}>
                      <CyDView
                        className={clsx(
                          'flex flex-row justify-between items-center',
                          { 'border-redOffColor': !selectedCountry },
                        )}>
                        <CyDView className={'flex flex-row items-center'}>
                          <CyDText className='text-center text-[18px] ml-[8px]'>
                            {selectedCountry?.flag ?? ''}
                          </CyDText>
                          <CyDText className='text-center text-[16px] ml-[8px]'>
                            {selectedCountry?.name ?? 'Select Country'}
                          </CyDText>
                        </CyDView>
                        <CyDImage source={AppImages.DOWN_ARROW} />
                      </CyDView>
                    </CyDTouchView>
                    <CyDTextInput
                      value={name}
                      textContentType='name'
                      autoFocus={true}
                      keyboardType='default'
                      autoCapitalize='none'
                      autoCorrect={false}
                      onChangeText={(text: string) => {
                        setName(text);
                      }}
                      placeholderTextColor={'#C5C5C5'}
                      className={clsx(
                        'border-[1px] border-[#C5C5C5] bg-white h-[50px] rounded-[8px] text-center text-black',
                        {
                          'pb-[10px]': isAndroid(),
                        },
                      )}
                      placeholder={`Friend\'s name`}
                    />
                    <CyDTextInput
                      value={userEmail}
                      textContentType='emailAddress'
                      autoFocus={true}
                      keyboardType='email-address'
                      autoCapitalize='none'
                      autoCorrect={false}
                      onChangeText={(text: string) => {
                        setUserEmail(text);
                      }}
                      placeholderTextColor={'#C5C5C5'}
                      className={clsx(
                        'border-[1px] my-[5px] border-[#C5C5C5] bg-white h-[50px] rounded-[8px] text-center text-black',
                        {
                          'pb-[10px]': isAndroid(),
                        },
                      )}
                      placeholder={`Friend\'s email`}
                    />
                    <Button
                      onPress={() => {
                        void joinWaitlist();
                      }}
                      loading={joiningWaitlist}
                      style={'rounded-[8px] h-[50px] mt-[20px]'}
                      title={t<string>('SEND_INVITE_CODE')}
                    />

                    <CyDView className='flex flex-row mt-[12px] pr-[32px]'>
                      <CyDImage
                        source={AppImages.CANDY_CANE}
                        className='h-[20px] w-[20px]'
                        resizeMode='contain'
                      />
                      <CyDText className='text-center text-successTextGreen font-bold px-[2px]'>
                        {
                          ' Share the joy of giving this season! Gift your friends an invite code for Cypher Card. They will receive it instantly via email, courtesy of you.  '
                        }
                      </CyDText>
                      <CyDImage
                        source={AppImages.CANDY_CANE}
                        className='h-[20px] w-[20px]'
                        resizeMode='contain'
                        style={{
                          transform: [{ scaleX: -1 }],
                        }}
                      />
                    </CyDView>
                  </CyDView>
                </CyDView>
              </CyDView>
            </CyDView>
            {/* <CyDView>
          <CyDText className={'mt-[25px] mx-[40px] text-[20px] font-bold'}>
            {t<string>('CARD_WAITLIST_PAGE_CAPTION')}
          </CyDText>
        </CyDView>
        <CyDView className={'mx-[40px] my-[10px]'}>
          {cardBenefits.map(item => {
            return (
              <CyDView className={'flex flex-row my-[4px]'} key={item}>
                <CyDImage
                  className={'mt-[6px]'}
                  source={AppImages.RIGHT_ARROW_BULLET}
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
        </CyDView> */}
          </CyDScrollView>
        </CyDView>
      </CyDSafeAreaView>
    </CyDImageBackground>
  );
}
