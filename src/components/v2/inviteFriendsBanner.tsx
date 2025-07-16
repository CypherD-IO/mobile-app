import React from 'react';
import {
  CyDText,
  CyDView,
  CyDImage,
  CyDTouchView,
  CyDMaterialDesignIcons,
} from '../../styles/tailwindComponents';
import { useTranslation } from 'react-i18next';
import AppImages from '../../../assets/images/appImages';
import { screenTitle } from '../../constants';
import { useNavigation } from '@react-navigation/native';

const InviteFriendsBanner = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();

  const onInvitePress = () => {
    navigation.navigate(screenTitle.REFERRALS);
  };

  return (
    <CyDTouchView
      className='rounded-[12px] overflow-hidden mb-[24px]'
      onPress={onInvitePress}>
      {/* Top Section */}
      <CyDView className='bg-[#F74555] flex-row p-[16px] justify-between items-center'>
        <CyDView className='flex-1 pr-[12px]'>
          <CyDText className='text-white font-bold text-[20px] leading-[26px]'>
            {t(
              'Invite your friends \nto cypher, \nearn reward\nwhen they spend',
            )}
          </CyDText>
        </CyDView>
        <CyDImage
          source={AppImages.INVITE_FRIEND_PERSON}
          resizeMode='contain'
          className='h-[163px] w-[148px] absolute right-[-4px] top-[12px]'
        />
      </CyDView>
      {/* Bottom Section */}
      <CyDView className='flex-row items-center justify-between bg-[#FFC989] py-[16px] px-[20px] border-t-[0.5px] border-n40'>
        <CyDText className='font-bold text-[18px] max-w-[232px] text-black'>
          {t('INVITE_FRIENDS', 'Invite Friends')}
        </CyDText>
        <CyDMaterialDesignIcons
          name='chevron-right'
          size={24}
          className='text-black'
        />
      </CyDView>
    </CyDTouchView>
  );
};

export default InviteFriendsBanner;
