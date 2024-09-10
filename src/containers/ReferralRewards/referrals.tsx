import React, { useContext, useEffect, useState } from 'react';
import { generateUserInviteLink, HdWalletContext } from '../../core/util';
import analytics from '@react-native-firebase/analytics';
import {
  CyDFastImage,
  CyDImage,
  CyDScrollView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindStyles';
import Button from '../../components/v2/button';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import { useTranslation } from 'react-i18next';
import useAxios from '../../core/HttpRequest';
import FastImage from 'react-native-fast-image';
import AppImages from '../../../assets/images/appImages';
import SwitchView from '../../components/SwitchView';
import Clipboard from '@react-native-clipboard/clipboard';
import { showToast } from '../utilities/toastUtility';
import Loading from '../../components/v2/loading';
import { onShare } from '../utilities/socialShareUtility';
import { BackHandler } from 'react-native';

export default function ReferralRewards(props: {
  navigation: any;
  route: {
    params: { filter: { types: string[]; time: string; statuses: string[] } };
  };
}) {
  const { navigation } = props;

  const { t } = useTranslation();
  const hdWalletContext = useContext<any>(HdWalletContext);
  const { showModal, hideModal } = useGlobalModalContext();
  const [loading, setLoading] = useState<boolean>(false);
  const [referralData, setReferralData] = useState<any>({});
  const [error, setError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [index, setIndex] = useState<number>(0);
  const [switchTitle, setSwitchTitle] = useState<string[]>([]);
  const [referralInviteLink, setReferralInviteLink] = useState<string>('');
  const { getWithAuth } = useAxios();
  const handleBackButton = () => {
    props.navigation.goBack();
    return true;
  };

  React.useEffect(() => {
    BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
    };
  }, []);

  useEffect(() => {
    const getReferralData = async () => {
      const resp = await getWithAuth('/v1/referral/tabDetails');
      if (!resp.isError) {
        setReferralData({ ...resp.data });
        if (resp.data.dashboard && resp.data.inviteCodeTab) {
          const data = [
            resp?.data?.inviteCodeTab?.tabTitle,
            resp?.data?.dashboard?.tabTitle,
          ];
          setSwitchTitle([...data]);
        }
        const {
          ethereum: { address },
        } = hdWalletContext.state.wallet;
        const inviteLink = generateUserInviteLink();
        setReferralInviteLink(inviteLink);
      } else {
        showModal('state', {
          type: t<string>('TOAST_TYPE_ERROR'),
          description: resp,
          onSuccess: onModalHide,
          onFailure: onModalHide,
        });
      }
    };

    const {
      ethereum: { address },
    } = hdWalletContext.state.wallet;
    void analytics().logEvent('referral_screen_view', {
      fromEthAddress: address,
    });
    void getReferralData();
  }, []);

  function onModalHide() {
    hideModal();
  }

  function copyToClipboard(text: string) {
    Clipboard.setString(text);
  }

  const TabStaticContent = (props: {
    tabDetails: { title: string; description: string; actionSteps: string[] };
  }) => {
    return (
      <CyDView className={'mb-[10px]'}>
        <CyDText
          className={'text-[#434343] text-[27px]  font-extrabold mt-[20px]'}>
          {props.tabDetails.title}
        </CyDText>
        <CyDText className={'text-[#1F1F1F] text-[18px] font-normal mt-[12px]'}>
          {props.tabDetails.description}
        </CyDText>
        {props.tabDetails.actionSteps.map((item, index) => (
          <CyDText
            className={
              'text-[#1F1F1F] text-[16px] font-normal mt-[15px] ml-[15px]'
            }
            key={index}>
            &#8226; {item}
          </CyDText>
        ))}
      </CyDView>
    );
  };

  const DashboardTabContent = () => {
    return (
      <CyDView>
        <TabStaticContent tabDetails={referralData.dashboard} />
      </CyDView>
    );
  };

  const InviteCodeTabContent = () => {
    return (
      <CyDView>
        <TabStaticContent tabDetails={referralData.inviteCodeTab} />

        {error && (
          <CyDText
            className={
              'text-[#EE4D30] text-[12px] font-medium mt-[10px] ml-[4px]'
            }>
            {errorMessage}
          </CyDText>
        )}

        <CyDView className={'flex flex-row mt-[18px]'}>
          <Button
            onPress={() => {
              void onShare(
                t('RECOMMEND_TITLE'),
                t('RECOMMEND_MESSAGE'),
                referralInviteLink,
              );
            }}
            title={t<string>('SHARE')}
            style={'h-[50px] w-6/12 mr-[25px]'}
            loading={loading}
            isLottie={false}
          />

          <CyDTouchView
            className={
              'border-[1px] py-[10px] px-[20px] flex flex-row items-center justify-center border-[#545454] border-solid rounded-[12px] w-5/12'
            }
            onPress={() => {
              copyToClipboard(referralInviteLink);
              showToast(t('REFERRAL_CODE_COPY'));
            }}>
            <CyDImage source={AppImages.COPY} />
            <CyDText className={'ml-[10px] text-[16px] font-bold'}>
              COPY
            </CyDText>
          </CyDTouchView>
        </CyDView>
      </CyDView>
    );
  };

  const RenderTabContent = () => {
    if (index === 0 && referralData?.inviteCodeTab) {
      return <InviteCodeTabContent />;
    }
    if (index === 1 && referralData?.dashboard) {
      return <DashboardTabContent />;
    }
    return (
      <CyDView className={'w-full h-full bg-white relative'}>
        <Loading />
      </CyDView>
    );
  };
  return (
    <CyDView className={'w-full h-full bg-white relative'}>
      <CyDView className={'bg-infoTextBackground h-[260px] mt-[-10px]'}>
        <CyDTouchView
          onPress={() => {
            navigation.goBack();
          }}>
          <CyDFastImage
            source={AppImages.BACK_ARROW_GRAY}
            className={'w-[32px] h-[32px] mx-[20px] mt-[60px]'}
          />
        </CyDTouchView>
        <CyDFastImage
          source={AppImages.REFERRAL_REWARDS}
          className={'h-full  -top-[50px] -z-50'}
          resizeMode={FastImage.resizeMode.contain}
        />
      </CyDView>
      <CyDScrollView className={'px-[20px] mt-[35px]'}>
        {switchTitle.length > 1 && (
          <CyDView className='flex flex-row'>
            <SwitchView
              titles={switchTitle} // Pass the titles as an array
              index={index}
              setIndexChange={(index: number) => {
                setIndex(index);
              }}
            />
          </CyDView>
        )}
        <RenderTabContent />
      </CyDScrollView>
    </CyDView>
  );
}
