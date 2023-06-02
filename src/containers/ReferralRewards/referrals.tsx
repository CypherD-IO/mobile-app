import React, { useContext, useEffect, useState } from 'react';
import { HdWalletContext } from '../../core/util';
import analytics from '@react-native-firebase/analytics';
import { CyDFastImage, CyDImage, CyDKeyboardAvoidingView, CyDScrollView, CyDText, CyDTextInput, CyDTouchView, CyDView } from '../../styles/tailwindStyles';
import * as Sentry from '@sentry/react-native';
import Button from '../../components/v2/button';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import { useTranslation } from 'react-i18next';
import useAxios from '../../core/HttpRequest';
import clsx from 'clsx';
import { screenTitle } from '../../constants';
import FastImage from 'react-native-fast-image';
import AppImages from '../../../assets/images/appImages';
import SwitchView from '../../components/SwitchView';
import Clipboard from '@react-native-clipboard/clipboard';
import { showToast } from '../utilities/toastUtility';
import Loading from '../../components/v2/loading';
import { isAndroid } from '../../misc/checkers';

export default function ReferralRewards (props:
{
  navigation: any
  route:
  {
    params:
    { filter: { types: string[], time: string, statuses: string[] } }
  }
}) {
  const { navigation } = props;

  const { t } = useTranslation();
  const { getWithAuth, postWithAuth } = useAxios();
  const hdWalletContext = useContext<any>(HdWalletContext);
  const { showModal, hideModal } = useGlobalModalContext();
  const [claimCodeText, setClaimCodeText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [referralData, setReferralData] = useState<any>({});
  const [error, setError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [index, setIndex] = useState<number>(0);
  const [switchTitle, setSwitchTitle] = useState<string[]>([]);

  useEffect(() => {
    const getReferralData = async () => {
      const resp = await getWithAuth('/v1/referral/tabDetails');
      if (!resp.error) {
        setReferralData({ ...resp });

        if (resp.referralTab && resp.inviteCodeTab) {
          const data = [resp?.referralTab?.tabTitle, resp?.inviteCodeTab?.tabTitle];
          setSwitchTitle([...data]);
        }
        if (resp?.referralTab) {
          setIndex(0);
          if (resp.referralTab.refereeCodeApplied) {
            setClaimCodeText(resp.referralTab.refereeCodeApplied);
          }
        } else if (resp?.inviteCodeTab) {
          setIndex(1);
        }
      } else {
        showModal('state', {
          type: t<string>('TOAST_TYPE_ERROR'),
          description: resp,
          onSuccess: onModalHide,
          onFailure: onModalHide
        });
      }
    };

    const { ethereum: { address } } = hdWalletContext.state.wallet;
    analytics().logEvent('referral_screen_view', {
      fromEthAddress: address
    }).catch(Sentry.captureException);

    void getReferralData();
  }, []);

  function onModalHide () {
    hideModal();
  }

  function copyToClipboard (text: string) {
    Clipboard.setString(text);
  };

  const onSubmit = async () => {
    try {
      setLoading(true);
      const payload = {
        claimCode: claimCodeText.toLowerCase()
      };
      const data = await postWithAuth(referralData?.referralTab?.submitPath, payload);
      setLoading(false);
      if (!data.errors) {
        if (data.codeAccepted) {
          showModal('state', {
            type: t<string>('TOAST_TYPE_SUCCESS'),
            title: t<string>('REFERRAL_VERIFIED'),
            description: referralData.referralSuccess,
            onSuccess: () => { hideModal(); navigation.navigate(screenTitle.REFERRAL_REWARDS); },
            onFailure: onModalHide
          });
        } else {
          setError(true);
          setErrorMessage(t<string>('INVALID_REFERRAL'));
        }
      }
    } catch (error: any) {
      setLoading(false);
      setError(true);
      setErrorMessage(error.response.data.errors[0].message);
      Sentry.captureException(error);
    }
  };

  const renderContent = () => {
    if (index === 0 && referralData?.referralTab) {
      return (
        <CyDView>
          <CyDText className={'text-[#434343] text-[27px] font-nunito font-extrabold mt-[20]'}>
            {referralData.referralTab.title}
          </CyDText>

          <CyDText className={'text-[#1F1F1F] text-[18px] font-normal mt-[10] mb-[32]'}>
            {referralData.referralTab.description}
          </CyDText>

          <CyDTextInput
            className={clsx('font-medium text-left font-nunito text-[16px] text-center border-[1px] rounded-[6px] pl-[16px] pr-[10px] py-[8px] h-[60px]', {
              'border-[#EE4D30] text-[#EE4D30]': error,
              'border-[#EBEBEB] text-black ': !error,
              'border-[#048A81] text-[#048A81]': referralData.referralTab?.refereeCodeApplied
            })}
            editable={!referralData?.referralTab?.refereeCodeApplied }
            autoCapitalize={'words'}
            placeholder={referralData.referralTab.textBoxPlaceHolder}
            placeholderTextColor={'#929292'}
            onChangeText={(value: string) => {
              if (error) {
                setError(false);
                setErrorMessage('');
              }
              setClaimCodeText(value);
            }}
            value={claimCodeText.toUpperCase()}
          />

          {!referralData?.referralTab?.refereeCodeApplied && <CyDView className={'flex items-center my-[20]'}>
            <Button onPress={() => {
              void onSubmit();
            }} title={t<string>('SUBMIT')} style={'h-[50] w-[100]'} loading={loading} isLottie={false}/>
          </CyDView>}
        </CyDView>
      );
    } else if (index === 1 && referralData?.inviteCodeTab) {
      return (
        <CyDView>

          <CyDText className={'text-[#434343] text-[27px] font-nunito font-extrabold mt-[20]'}>
            {referralData.inviteCodeTab.title}
          </CyDText>

          <CyDText className={'text-[#1F1F1F] text-[18px] font-normal mt-[10] mb-[32]'}>
            {referralData.inviteCodeTab.description}
          </CyDText>

          { error &&
            <CyDText className={'text-[#EE4D30] text-[16px] font-medium mt-[10] ml-[4px]'}>{errorMessage}</CyDText>
          }

          <CyDView className={'flex flex-row'}>
            <CyDView className={'rounded-[12px] py-[16] bg-[#F5F5F5] w-8/12'}>
              <CyDText className={'text-center text-[22px] font-bold'}>{referralData.inviteCodeTab.referralCode}</CyDText>
            </CyDView>
            <CyDTouchView
              className={'border-[1px] p-[20px] flex flex-row items-center space-x-[8px] justify-center border-[#545454] border-solid rounded-[12px]'}
              onPress={() => { copyToClipboard(referralData.inviteCodeTab.referralCode); showToast(t('REFERRAL_CODE_COPY')); }}
            >
              <CyDImage source={AppImages.COPY} />
              <CyDText className={'text-[16px] font-extrabold'}>{t<string>('COPY')}</CyDText>
            </CyDTouchView>
          </CyDView>

        </CyDView>
      );
    }
  };

  if (!referralData?.referralTab && !referralData.inviteCodeTab) {
    return (
      <CyDView className={'w-full h-full bg-white relative'}>
        <Loading />
      </CyDView>
    );
  }

  return (
    <CyDKeyboardAvoidingView behavior={isAndroid() ? 'height' : 'padding'} enabled className={'h-full flex grow-1'}>
      <CyDView className={'w-full h-full bg-white relative'}>
        <CyDView className={'bg-[#F3FFFB] h-[37%]'} >
          <CyDTouchView onPress={() => { navigation.goBack(null); }}>
            <CyDFastImage source={AppImages.BACK} className={'h-[20] w-[20] mx-[20] mt-[60]'}/>
          </CyDTouchView>
          <CyDFastImage source={{ uri: 'https://public.cypherd.io/icons/referralRewards.png' }}
                        className={'h-[90%] -top-[10] w-[100%]'}
                        resizeMode={FastImage.resizeMode.contain}
          />
        </CyDView>
        <CyDScrollView className={'px-[20] mt-[20%]'}>
          {switchTitle.length === 2 && <CyDView className={'w-[170]'}>
            <SwitchView
              index={index}
              setIndexChange={(index: number) => {
                setIndex(index);
              }}
              title1={switchTitle[0]}
              title2={switchTitle[1]}
            />
          </CyDView>}

          {renderContent()}
        </CyDScrollView>
      </CyDView>
    </CyDKeyboardAvoidingView>
  );
}
