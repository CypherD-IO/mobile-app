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
import { copyToClipboard, isValidEmailID } from '../../core/util';
import * as Sentry from '@sentry/react-native';
import { useTranslation } from 'react-i18next';
import * as C from '../../constants/index';
import clsx from 'clsx';
import ChooseCountryModal from '../../components/v2/ChooseCountryModal';
import { ICountry } from '../../models/cardApplication.model';
import useAxios from '../../core/HttpRequest';
import { useKeyboard } from '../../hooks/useKeyboard';
import { Keyboard } from 'react-native';
import { CardProviders, CardReferralStatus } from '../../constants/enum';
import { IReferredUser } from '../../models/referredUser.interface';
import { showToast } from '../utilities/toastUtility';
import { onShare } from '../utilities/socialShareUtility';

interface Props {
  navigation: any;
  route: { params: { fromOptionsStack?: boolean } };
}

export default function SendInviteCode({ route, navigation }: Props) {
  const { showModal, hideModal } = useGlobalModalContext();
  const { fromOptionsStack } = route.params;
  const { t } = useTranslation();
  const [joiningWaitlist, setJoiningWaitlist] = useState<boolean>(false);
  const [referralData, setReferralData] = useState<IReferredUser[]>([]);
  const [userEmail, setUserEmail] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [isModalVisible, setModalVisible] = useState<boolean>(false);
  const [selectedCountry, setSelectedCountry] = useState<
    ICountry | undefined
  >();
  const { postWithAuth, getWithAuth } = useAxios();
  const { keyboardHeight } = useKeyboard();

  useEffect(() => {
    void getReferralData();
  }, []);

  const getReferralData = async () => {
    const response = await getWithAuth(
      `/v1/cards/${CardProviders.PAYCADDY}/referrals`,
    );
    if (!response.isError) {
      if (response.data.referralData) {
        setReferralData(response.data.referralData);
      }
    }
  };

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
            void getReferralData();
            showModal('state', {
              type: 'success',
              title: t('INVITE_SENT_SUCCESSFULLY'),
              description:
                t('INVITE_SENT_DESCRIPTION') +
                ' ' +
                userEmail +
                '. ' +
                t('INVITE_REFERRAL_PROGRESS_UPDATE'),
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
  const resetNavigation = () => {
    if (!fromOptionsStack) {
      navigation.reset({
        index: 0,
        routes: [{ name: C.screenTitle.DEBIT_CARD_SCREEN }],
      });
    } else {
      navigation.reset({
        index: 0,
        routes: [{ name: C.screenTitle.OPTIONS_SCREEN }],
      });
    }
  };

  const handleBack = () => {
    if (keyboardHeight) {
      Keyboard.dismiss();
      setTimeout(() => {
        resetNavigation();
      }, 100);
    } else {
      resetNavigation();
    }
  };

  return (
    <CyDView className='flex-1'>
      <CyDScrollView
        className={clsx('mb-[72px] bg-secondaryBackgroundColor', {
          'pb-[75px]': isAndroid(),
        })}>
        <CyDImageBackground
          source={AppImages.SEND_INVITE_CODE_BG}
          className='h-[260px] w-full rounded-b-[200px]'
          resizeMode='contain'>
          <CyDSafeAreaView>
            <CyDView className='px-[10px]'>
              <CyDTouchView
                onPress={() => {
                  handleBack();
                }}>
                <CyDImage
                  source={AppImages.BACK}
                  className='h-[22px] w-[25px]'
                  resizeMode='contain'
                />
              </CyDTouchView>
            </CyDView>
            <CyDView className='flex flex-col w-[70%] p-[22px]'>
              <CyDView>
                <CyDText className='font-extrabold text-[24px]'>
                  {t<string>('SEND_INVITE_CODE_TITLE')}
                </CyDText>
              </CyDView>
              <CyDText className='font-semibold mt-[12px]'>
                {t('SEND_INVITE_CODE_DESC')}
              </CyDText>
            </CyDView>
          </CyDSafeAreaView>
        </CyDImageBackground>

        <CyDView className='py-[12px] bg-secondaryBackgroundColor'>
          <ChooseCountryModal
            isModalVisible={isModalVisible}
            setModalVisible={setModalVisible}
            selectedCountryState={[selectedCountry, setSelectedCountry]}
          />
          <CyDView className={'w-screen'}>
            <CyDView>
              <CyDText className='ml-[18px] mb-[6px] font-semibold text-[18px]'>
                {t('INVITE_A_FRIEND')}
              </CyDText>
              <CyDView
                className={'flex justify-center items-center text-center'}>
                <CyDView className={'p-[8px] w-[94%] bg-white rounded-[18px]'}>
                  <CyDTouchView
                    className={
                      'my-[8px] border-[1px] bg-white border-inputBorderColor py-[12px] px-[10px] rounded-[8px] flex w-[100%]'
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
                        <CyDText className='text-center text-[16px] ml-[2px]'>
                          {selectedCountry?.name ?? "Select Friend's Country"}
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
                      'border-[1px] border-[#C5C5C5] bg-white h-[50px] rounded-[8px] pl-[20px] text-left text-black',
                      {
                        'pb-[10px]': isAndroid(),
                      },
                    )}
                    placeholder={"Friend's name"}
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
                      'border-[1px] my-[8px] border-[#C5C5C5] bg-white h-[50px] pl-[20px] rounded-[8px] text-left text-black',
                      {
                        'pb-[10px]': isAndroid(),
                      },
                    )}
                    placeholder={"Friend's email"}
                  />
                  <Button
                    onPress={() => {
                      void joinWaitlist();
                    }}
                    loading={joiningWaitlist}
                    style={'rounded-[8px] h-[50px] mt-[10px] mb-[8px]'}
                    title={t<string>('SEND_INVITE_CODE')}
                  />
                </CyDView>
                {referralData.length !== 0 && (
                  <CyDView className='w-[94%] mt-[32px]'>
                    <CyDText className='ml-[6px] mb-[12px] font-semibold text-[18px]'>
                      {t('INVITED_FRIENDS')}
                    </CyDText>
                    <CyDView className={'p-[6px] bg-white rounded-[18px]'}>
                      <RenderReferrals referralData={referralData} />
                    </CyDView>
                  </CyDView>
                )}
              </CyDView>
            </CyDView>
          </CyDView>
        </CyDView>
      </CyDScrollView>
    </CyDView>
  );
}

const RenderReferralStatus = ({ status }: { status: CardReferralStatus }) => {
  switch (status) {
    case CardReferralStatus.CARD_ISSUED:
      return (
        <CyDView className='flex flex-row items-center bg-cyanBg mx-[12px] px-[6px] py-[4px] rounded-[4px]'>
          <CyDImage
            source={AppImages.CELEBRATE}
            className='h-[14px] w-[14px] object-contain mr-[4px]'
          />
          <CyDText className=' text-cyanText font-semibold text-[14px]'>
            Card Issued
          </CyDText>
        </CyDView>
      );
    case CardReferralStatus.CREATED:
      return (
        <CyDView className='flex flex-row items-center bg-gray-300 mx-[12px] px-[6px] py-[4px] rounded-[4px]'>
          <CyDImage
            source={AppImages.PENDING}
            className='h-[14px] w-[14px] object-contain mr-[4px]'
          />
          <CyDText className='text-[14px] font-semibold'>Pending</CyDText>
        </CyDView>
      );
    case CardReferralStatus.INVITE_USED:
      return (
        <CyDView className='flex flex-row items-cente bg-binance mx-[12px] px-[6px] py-[4px] rounded-[4px]'>
          <CyDImage
            source={AppImages.CORRECT_WHEAT}
            className='h-[16px] w-[16px] object-contain mr-[4px]'
          />
          <CyDText className='text-[14px] font-semibold text-wheatText'>
            Created
          </CyDText>
        </CyDView>
      );
    case CardReferralStatus.KYC_FAILED:
      return (
        <CyDView className='flex flex-row items-center bg-errorBg mx-[12px] px-[6px] py-[4px] rounded-[4px]'>
          <CyDImage
            source={AppImages.DECLINE}
            className='h-[14px] w-[14px] object-contain mr-[4px]'
          />
          <CyDText className='text-[14px] font-semibold text-errorText'>
            Failed
          </CyDText>
        </CyDView>
      );
    default:
      return <></>;
  }
};

const copyInviteCode = (inviteCode: string) => {
  copyToClipboard(inviteCode);
  showToast('Invite code copied to clipboard');
};

const RenderInviteCode = ({ inviteCode }: { inviteCode: string }) => {
  return (
    <CyDView className='flex flex-row items-center py-[4px] px-[6px] bg-gray-100 rounded-[4px]'>
      <CyDText className=''>{inviteCode}</CyDText>
      <CyDTouchView
        className='ml-[4px] cursor-pointer'
        onPress={() => {
          copyInviteCode(inviteCode);
        }}>
        <CyDImage
          source={AppImages.COPY}
          className={'h-[16px] w-[12px] object-contain'}
        />
      </CyDTouchView>
    </CyDView>
  );
};

const RenderReferrals = ({
  referralData,
}: {
  referralData: IReferredUser[];
}) => {
  const { t } = useTranslation();
  return (
    <CyDView>
      {referralData.map((invitedUser: IReferredUser, index: number) => {
        const isPending =
          invitedUser.applicationStatus === CardReferralStatus.CREATED;
        return (
          <CyDView
            key={index}
            className={clsx('pl-[12px] py-[12px] border-b-sepratorColor', {
              'border-b-[1.5px]': index !== referralData.length - 1,
            })}>
            <CyDView className='flex flex-row justify-between'>
              <CyDView className='flex flex-col justify-center max-w-[65%]'>
                <CyDView className='font-bold'>
                  <CyDText>
                    {invitedUser.name !== '' ? invitedUser.name : 'NA'}
                  </CyDText>
                </CyDView>
                <CyDView className='flex flex-col items-start text-[14px]'>
                  <CyDText className='mb-[2px]'>{invitedUser.email} </CyDText>
                  {!isPending && (
                    <RenderInviteCode inviteCode={invitedUser.inviteCode} />
                  )}
                </CyDView>
              </CyDView>
              <CyDView className='flex self-center items-end max-w-[35%]'>
                <RenderReferralStatus status={invitedUser.applicationStatus} />
              </CyDView>
            </CyDView>
            {isPending && (
              <CyDView className='mt-[6px]'>
                <CyDText className='text-[14px] font-light'>
                  {t('INVITE_SENT_NOT_USED')}
                </CyDText>
                <CyDView className='flex flex-row items-center text-[14px] mt-[2px]'>
                  <CyDText className='font-semibold'>Invite code: </CyDText>
                  <RenderInviteCode inviteCode={invitedUser.inviteCode} />
                </CyDView>
                <CyDTouchView
                  className='p-[6px] my-[4px] border-[1px] border-inputBorderColor rounded-[6px] w-[150px]'
                  onPress={() => {
                    void onShare(
                      t('RECOMMEND_TITLE'),
                      t('INVITE_SOCIAL_SHARE_MESSAGE') +
                        '\n' +
                        invitedUser.inviteCode,
                      '',
                    );
                  }}>
                  <CyDView>
                    <CyDText className='text-[16px]'>Send Invite Again</CyDText>
                  </CyDView>
                </CyDTouchView>
              </CyDView>
            )}
          </CyDView>
        );
      })}
    </CyDView>
  );
};
