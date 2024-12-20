import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  Linking,
  Share,
  Clipboard,
  StatusBar,
} from 'react-native';
import {
  CyDImage,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindStyles';
import AppImages from '../../../assets/images/appImages';
import useAxios from '../../core/HttpRequest';
import LottieView from 'lottie-react-native';
import { t } from 'i18next';
import Button from '../../components/v2/button';
import { ButtonType, CardApplicationStatus } from '../../constants/enum';
import NewReferralCodeModal from '../../components/v2/newReferralCodeModal';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import { showToast } from '../../containers/utilities/toastUtility';
import ShowQRCodeModal from '../../components/v2/showQRCodeModal';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';

const copyToClipboard = (text: string) => {
  Clipboard.setString(text);
  showToast('Copied to clipboard');
};

const ShareVia = ({ referralLink }: { referralLink: string }) => {
  const [isQrModalVisible, setIsQrModalVisible] = useState(false);
  const shareUrlText = `🚀 Revolutionize your crypto spending with Cypher Card! I'm loving it, and here's why:

    💳 Google Pay & Apple Pay support
    💰 Lowest ever 0.5% Forex Fee
    💲 0% Loading Fee for USDC 
    🌍 Use your crypto anywhere, just like a regular card

  🎁 Use my referral link to join and we'll both earn rewards! :
  ${referralLink}`;

  const shareOptions = [
    {
      name: 'Whatsapp',
      icon: AppImages.WHATSAPP_ICON,
      url: `whatsapp://send?text=${encodeURIComponent(shareUrlText)}`,
    },
    {
      name: 'Telegram',
      icon: AppImages.TELEGRAM_BLUE_ICON,
      url: `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(shareUrlText)}`,
    },
    {
      name: 'X',
      icon: AppImages.X_ICON,
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareUrlText)}`,
    },
    { name: 'QR Code', icon: AppImages.QR_CODE_ICON },
    { name: 'Share', icon: AppImages.SHARE_ICON },
  ];

  const handleShare = async (option: {
    name: string;
    url?: string;
    icon: any;
  }) => {
    if (option.url) {
      try {
        const supported = await Linking.canOpenURL(option.url);
        if (supported) {
          await Linking.openURL(option.url);
        } else {
          await Share.share({
            message: shareUrlText,
          });
        }
      } catch (error) {
        await Share.share({
          message: shareUrlText,
        });
      }
    } else if (option.name === 'QR Code') {
      setIsQrModalVisible(true);
    } else if (option.name === 'Share') {
      try {
        await Share.share({
          message: shareUrlText,
        });
      } catch (error) {}
    }
  };

  return (
    <>
      <ShowQRCodeModal
        isModalVisible={isQrModalVisible}
        setIsModalVisible={setIsQrModalVisible}
        referralUrl={referralLink}
      />
      <CyDView className='p-[16px]'>
        <CyDText className='text-[14px] font-medium'>Share via</CyDText>
        <CyDView className='flex-row justify-between mt-[12px]'>
          {shareOptions.map((option, index) => (
            <CyDTouchView
              key={index}
              className='items-center w-[58px] h-[58px]'
              onPress={() => void handleShare(option)}>
              <CyDImage source={option.icon} className='w-[36px] h-[36px]' />
              <CyDText className='text-[10px] mt-[6px]'>{option.name}</CyDText>
            </CyDTouchView>
          ))}
        </CyDView>
      </CyDView>
    </>
  );
};

const ReferralInfo = ({
  referralLink,
  referralCode,
}: {
  referralLink: string;
  referralCode: string;
}) => (
  <CyDView className='flex flex-col text-black bg-white rounded-[8px] mt-[12px]'>
    <CyDView className='flex flex-row items-center justify-between p-[16px]'>
      <CyDText className='font-[500]'>{t('LINK')}</CyDText>
      <CyDView className='flex flex-row items-center'>
        <CyDText className='text-[12px]'>{referralLink}</CyDText>
        <CyDTouchView onPress={() => copyToClipboard(referralLink)}>
          <CyDImage
            source={AppImages.COPY_DARK}
            className='w-[24px] h-[24px] ml-[8px]'
          />
        </CyDTouchView>
      </CyDView>
    </CyDView>
    <CyDView className='h-[1px] bg-cardBg' />
    <CyDView className='flex flex-row items-center justify-between p-[16px]'>
      <CyDText className='font-[500]'>{t('CODE')}</CyDText>
      <CyDView className='flex flex-row items-center'>
        <CyDText className='font-bold'>{referralCode}</CyDText>
        <CyDTouchView onPress={() => copyToClipboard(referralCode)}>
          <CyDImage
            source={AppImages.COPY_DARK}
            className='w-[24px] h-[24px] ml-[8px]'
          />
        </CyDTouchView>
      </CyDView>
    </CyDView>
    <CyDView className='h-[1px] bg-cardBg' />
    <ShareVia referralLink={referralLink} />
  </CyDView>
);

const PointsInfo = ({
  referral,
}: {
  referral: {
    masterAddress: string;
    referralCode: string;
    applicationStatus: string;
    rewardContribution: number;
    createdAt: string;
  };
}) => {
  const {
    masterAddress,
    referralCode,
    applicationStatus,
    rewardContribution,
    createdAt,
  } = referral;
  const trimmedAddress = `${masterAddress.slice(0, 6)}......${masterAddress.slice(-4)}`;
  const formattedDate = createdAt
    ? new Date(createdAt).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '';
  const referralStatus = getReferralStatus(applicationStatus);

  return (
    <>
      <CyDView className='flex flex-row items-center justify-between p-[16px]'>
        <CyDView>
          <CyDView className='flex-row items-center'>
            <CyDText className='font-[500] font-[500]'>
              {trimmedAddress}
            </CyDText>
            <CyDTouchView
              onPress={() => copyToClipboard(masterAddress)}
              className='ml-[8px]'>
              <CyDImage
                source={AppImages.COPY_DARK}
                className='w-[16px] h-[16px]'
              />
            </CyDTouchView>
          </CyDView>
          <CyDText className='text-[10px] font-[600]'>{referralCode}</CyDText>
        </CyDView>

        {applicationStatus !== CardApplicationStatus.COMPLETED && (
          <>
            <CyDText>{formattedDate}</CyDText>
            <CyDView className='flex flex-row items-center'>
              <CyDView
                className={`w-[10px] h-[10px] rounded-full mr-[8px] ${referralStatus === 'KYC Failed' ? 'bg-red-500' : 'bg-yellow-400'}`}
              />
              <CyDText className='font-[600]'>{referralStatus}</CyDText>
            </CyDView>
          </>
        )}
        {applicationStatus === CardApplicationStatus.COMPLETED && (
          <CyDView className='flex flex-row items-center'>
            <CyDImage
              source={AppImages.REFERRAL_STAR}
              className='w-[18px] h-[18px] mr-[4px]'
            />
            <CyDText className='font-[600]'>
              {rewardContribution.toLocaleString()}
            </CyDText>
          </CyDView>
        )}
      </CyDView>
      <CyDView className='h-[1px] bg-cardBg' />
    </>
  );
};

const getReferralStatus = (applicationStatus: string) => {
  switch (applicationStatus) {
    case CardApplicationStatus.CREATED ||
      CardApplicationStatus.VERIFICATION_COMPLETE ||
      CardApplicationStatus.VERIFICATION_PENDING ||
      CardApplicationStatus.KYC_INITIATED ||
      CardApplicationStatus.KYC_PENDING ||
      CardApplicationStatus.KYC_SUCCESSFUL ||
      CardApplicationStatus.SUBMITTED ||
      CardApplicationStatus.COMPLETION_PENDING:
      return 'Signed up';
    case CardApplicationStatus.KYC_FAILED ||
      CardApplicationStatus.KYC_EXPIRED ||
      CardApplicationStatus.DECLINED:
      return 'KYC Failed';
    case CardApplicationStatus.COMPLETED:
      return 'Completed';
    default:
      return 'Signed up';
  }
};

const HowItWorks = () => {
  return (
    <CyDView className='mt-[24px]'>
      <CyDText className='text-[16px] font-[500] text-black'>
        {t('HOW_IT_WORKS')}
      </CyDText>
      <CyDView className='flex flex-col text-black bg-white rounded-[8px] mt-[6px] p-[24px]'>
        <CyDView className='flex flex-row items-center justify-between'>
          <CyDImage
            className='h-[78px] w-[70px] mr-[20px]'
            source={AppImages.HOW_IT_WORKS_1}
          />
          <CyDText className='text-[12px] flex-1 text-center font-[500]'>
            {t('HOW_IT_WORKS_1')}
          </CyDText>
        </CyDView>
        <CyDView className='flex flex-row items-center justify-between mt-[24px]'>
          <CyDText className='text-[12px] flex-1 text-center font-[500]'>
            {t('HOW_IT_WORKS_2')}
          </CyDText>
          <CyDImage
            className='h-[64px] w-[72px] ml-[8px]'
            source={AppImages.HOW_IT_WORKS_2}
          />
        </CyDView>
        <CyDView className='flex flex-row items-center justify-between mt-[24px]'>
          <CyDImage
            className='h-[79px] w-[79px]'
            source={AppImages.HOW_IT_WORKS_3}
          />
          <CyDText className='text-[12px] flex-1 text-center font-[500] ml-[16px]'>
            {t('HOW_IT_WORKS_3')}
          </CyDText>
        </CyDView>
        <CyDView className='flex flex-row items-center justify-between mt-[24px]'>
          <CyDText className='text-[12px] flex-1 text-center font-[500]'>
            {t('HOW_IT_WORKS_4')}
          </CyDText>
          <CyDImage
            className='h-[71px] w-[67px] ml-[13px]'
            source={AppImages.HOW_IT_WORKS_4}
          />
        </CyDView>
        <CyDView className='flex flex-row items-center justify-between mt-[24px]'>
          <CyDImage
            className='h-[50px] w-[48px] mr-[34px]'
            source={AppImages.HOW_IT_WORKS_5}
          />
          <CyDText className='text-[12px] flex-1 text-center font-[500]'>
            {t('HOW_IT_WORKS_5')}
          </CyDText>
        </CyDView>
      </CyDView>
    </CyDView>
  );
};
export default function Referrals() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const { postWithAuth, getWithAuth } = useAxios();
  const { showModal, hideModal } = useGlobalModalContext();
  const [code, setCode] = useState('');
  const [createReferralCodeLoading, setCreateReferralCodeLoading] =
    useState(false);
  const [referralData, setReferralData] = useState(null);
  const [referralDataLoading, setReferralDataLoading] = useState(false);

  useEffect(() => {
    void getReferralData();
  }, []);

  const getReferralData = async () => {
    setReferralDataLoading(true);
    const response = await getWithAuth('/v1/cards/referral-v2');
    setReferralDataLoading(false);

    if (!response.isError) {
      if (response.data.referralCodes.length === 0) {
        showModal('state', {
          type: 'warning',
          title: t('REFERRAL_NOT_AVAILABLE'),
          description: t('REFERRAL_NOT_AVAILABLE_MESSAGE'),
          onSuccess: () => {
            navigation.goBack();
            hideModal();
          },
          onFailure: () => {
            navigation.goBack();
            hideModal();
          },
        });
      } else {
        setReferralData(response.data);
      }
    } else {
      showModal('state', {
        type: 'error',
        title: t('REFERRAL_CODE_FETCH_FAILED'),
        description: t('REFERRAL_CODE_FETCH_FAILED_MESSAGE'),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    }
  };

  const createReferralCode = async () => {
    setIsModalVisible(false);
    setCreateReferralCodeLoading(true);
    const response = await postWithAuth('/v1/cards/referral-v2', {
      referralCode: code,
    });
    setCreateReferralCodeLoading(false);
    if (!response.isError) {
      showModal('state', {
        type: 'success',
        title: t('REFERRAL_CODE_CREATED'),
        description: t('REFERRAL_CODE_CREATED_MESSAGE'),
        onSuccess: () => {
          hideModal();
          void getReferralData();
        },
        onFailure: hideModal,
      });
    } else {
      showModal('state', {
        type: 'error',
        title: t('REFERRAL_CODE_CREATION_FAILED'),
        description:
          response.error.message ?? t('REFERRAL_CODE_CREATION_FAILED_MESSAGE'),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    }
  };

  return (
    <>
      <SafeAreaView className='flex bg-cardBg h-full'>
        <StatusBar barStyle='dark-content' backgroundColor={'#EBEDF0'} />
        <NewReferralCodeModal
          isModalVisible={isModalVisible}
          setIsModalVisible={setIsModalVisible}
          createReferralCode={createReferralCode}
          code={code}
          setCode={setCode}
        />
        <CyDView className='flex-row items-center justify-between mx-[16px]'>
          <CyDTouchView
            onPress={() => {
              navigation.goBack();
            }}
            className='w-[36px] h-[36px]'>
            <CyDImage
              source={AppImages.BACK_ARROW_GRAY}
              className='w-[36px] h-[36px]'
            />
          </CyDTouchView>
          <CyDView className='flex-1 '>
            <CyDText className='text-[16px] font-bold -ml-[16px] text-center'>
              {t('REFERRALS')}
            </CyDText>
          </CyDView>
        </CyDView>
        <ScrollView className='mt-[16px]'>
          <CyDView className='flex flex-col px-[16px] mb-[24px]'>
            <CyDText className='text-[22px] font-bold'>
              Bring a <CyDText className='text-mandarin'>friend along</CyDText>{' '}
              and unlock rewards when they shop with us
            </CyDText>
            <CyDText className='text-[14px] font-[500] text-n200 mt-[6px]'>
              because good things are better shared!
            </CyDText>
            <CyDView className='mt-[32px] items-center'>
              <CyDImage
                source={AppImages.REFERRALS_HERO_IMG}
                className='w-[234px] h-[216px]'
              />
            </CyDView>
            <CyDView className='flex flex-row items-center justify-between'>
              <CyDText className='text-[16px] font-[500] text-black'>
                {t('REFER_VIA')}
              </CyDText>
              <Button
                type={ButtonType.SECONDARY}
                title={t('NEW_CODE')}
                image={AppImages.CIRCULAR_PLUS}
                imageStyle='w-[16px] h-[16px] mr-[4px]'
                onPress={() => {
                  setIsModalVisible(true);
                }}
                style='p-[8px] w-[113px]'
                titleStyle='text-black'
                loading={createReferralCodeLoading}
                loaderStyle={{
                  height: 22,
                  width: 22,
                }}
              />
            </CyDView>
            {!referralDataLoading &&
              referralData?.referralCodes.map((code, index) => (
                <ReferralInfo
                  key={index}
                  referralLink={`https://app.cypherhq.io/card/referral/${code}`}
                  referralCode={code}
                />
              ))}
            {referralDataLoading && (
              <CyDView className='flex flex-col text-black bg-white rounded-[8px] mt-[6px] p-[8px] items-center justify-center'>
                <LottieView
                  source={AppImages.LOADER_TRANSPARENT}
                  autoPlay
                  loop
                  style={{
                    width: 30,
                    height: 30,
                  }}
                />
              </CyDView>
            )}
            {!referralDataLoading && (
              <CyDView className='mt-[24px]'>
                <CyDText className='text-[16px] font-[500] text-black'>
                  {t('POINTS_EARNED')}
                </CyDText>

                <CyDView className='flex flex-col text-black bg-white rounded-[8px] mt-[6px]'>
                  {referralData?.referrals.length > 0 ? (
                    referralData?.referrals.map((referral, key) => (
                      <PointsInfo key={key} referral={referral} />
                    ))
                  ) : (
                    <CyDText className='text-[14px] font-[500] m-[16px] text-center'>
                      {t('NO_REFERRALS_YET_MESSAGE')}
                    </CyDText>
                  )}
                </CyDView>
              </CyDView>
            )}
            <HowItWorks />
          </CyDView>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
