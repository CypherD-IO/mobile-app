import React, { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, Linking, Share } from 'react-native';
import {
  CyDImage,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindStyles';
import AppImages from '../../../assets/images/appImages';
import { screenTitle } from '../../constants';
import useAxios from '../../core/HttpRequest';
import LottieView from 'lottie-react-native';
import { t } from 'i18next';
import Button from '../../components/v2/button';
import { ButtonType } from '../../constants/enum';

const ShareVia = ({ referralLink }: { referralLink: string }) => {
  const shareUrlText = `Hey! I've been using the Cypher Card, and it's a game-changer for crypto spending. Check it out:

    ✅ Seamless Google Pay and Apple Pay support
    ✅ Incredibly low forex fees (just 0.5% on the premium plan!)
    ✅ Spend your crypto easily anywhere cards are accepted

    Here's my referral link: ${referralLink}

    By using this link, you can get started with Cypher Card and we'll both earn amazing rewards.
  `;

  const shareOptions = [
    {
      name: 'Whatsapp',
      icon: AppImages.WHATSAPP_ICON,
      url: `whatsapp://send?text=${encodeURIComponent(shareUrlText)}`,
    },
    {
      name: 'Telegram',
      icon: AppImages.TELEGRAM_ICON,
      url: `tg://msg?text=${encodeURIComponent(shareUrlText)}`,
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
        console.error('An error occurred', error);
        await Share.share({
          message: shareUrlText,
        });
      }
    } else if (option.name === 'QR Code') {
      // Implement QR code generation logic here
      console.log('QR Code generation not implemented');
    } else if (option.name === 'Share') {
      try {
        await Share.share({
          message: shareUrlText,
        });
      } catch (error) {
        console.error(error);
      }
    }
  };

  return (
    <CyDView className='p-[16px]'>
      <CyDText className='text-sm font-medium'>Share via</CyDText>
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
        <CyDImage
          source={AppImages.COPY_DARK}
          className='w-[24px] h-[24px] ml-[8px]'
        />
      </CyDView>
    </CyDView>
    <CyDView className='h-[1px] bg-cardBg'></CyDView>
    <CyDView className='flex flex-row items-center justify-between p-[16px]'>
      <CyDText className='font-[500]'>{t('CODE')}</CyDText>
      <CyDView className='flex flex-row items-center'>
        <CyDText className='font-bold'>{referralCode}</CyDText>
        <CyDImage
          source={AppImages.COPY_DARK}
          className='w-[24px] h-[24px] ml-[8px]'
        />
      </CyDView>
    </CyDView>
    <CyDView className='h-[1px] bg-cardBg'></CyDView>
    <ShareVia referralLink={referralLink} />
  </CyDView>
);

const PointsInfo = ({
  referredAddress,
  points,
}: {
  referredAddress: string;
  points: number;
}) => {
  const trimmedAddress = `${referredAddress.slice(0, 4)}......${referredAddress.slice(-4)}`;

  return (
    <CyDView className='mt-[24px]'>
      <CyDText className='text-[16px] font-[500] text-black'>
        {t('POINTS_EARNED')}
      </CyDText>
      <CyDView className='flex flex-col text-black bg-white rounded-[8px] mt-[6px]'>
        <CyDView className='flex flex-row items-center justify-between p-[16px]'>
          <CyDText className='font-[500] font-[500] '>{trimmedAddress}</CyDText>
          <CyDView className='flex flex-row items-center'>
            <CyDImage
              source={AppImages.REFERRAL_STAR}
              className='w-[18px] h-[18px] mr-[4px]'
            />
            <CyDText className='font-[600]'>
              {points.toLocaleString('en-US')}
            </CyDText>
          </CyDView>
        </CyDView>
      </CyDView>
    </CyDView>
  );
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
export default function Referrals({ route, navigation }) {
  const [loading, setLoading] = useState<boolean>(false);
  const { getWithAuth } = useAxios();

  return (
    <>
      <SafeAreaView className='flex bg-cardBg h-full'>
        <CyDView className='flex-row items-center justify-between mx-[16px]'>
          <CyDTouchView
            onPress={() => {
              console.log('back');
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
                onPress={() => {}}
                style='p-[8px]'
              />
            </CyDView>
            <ReferralInfo
              referralLink='https://cypherhq.io/refer/A8CQ3737'
              referralCode='A8CQ3737'
            />
            <PointsInfo
              referredAddress='0x1940821a0875867d32de4d6da184574cafbdc491'
              points={100000000}
            />
            <HowItWorks />
          </CyDView>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
