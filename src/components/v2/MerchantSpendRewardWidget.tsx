import React from 'react';
import {
  CyDView,
  CyDText,
  CyDTouchView,
  CyDImage,
} from '../../styles/tailwindComponents';
import AppImages from '../../../assets/images/appImages';
import { Theme, useTheme } from '../../reducers/themeReducer';
import { useColorScheme } from 'nativewind';

interface MerchantSpendRewardWidgetProps {
  onViewAllPress?: () => void;
  onMerchantPress?: (merchant: any) => void;
}

interface MerchantData {
  id: string;
  name: string;
  multiplier: string;
  icon?: any;
  backgroundColor?: string;
}

const MerchantSpendRewardWidget: React.FC<MerchantSpendRewardWidgetProps> = ({
  onViewAllPress,
  onMerchantPress,
}) => {
  const { theme } = useTheme();
  const { colorScheme } = useColorScheme();

  const isDarkMode =
    theme === Theme.SYSTEM ? colorScheme === 'dark' : theme === Theme.DARK;

  // Dummy merchant data
  const merchantData = {
    baseReward: '1X Rewards',
    baseRewardDescription: '~ 4.5 - 6.7 $CYPR/$10 spent',
    merchants: [
      {
        id: '1',
        name: 'Uber',
        multiplier: '2.1X',
        icon: AppImages.UBER_LOGO, // You'll need to add these to appImages.ts
        backgroundColor: '#000000',
      },
      {
        id: '2',
        name: 'Amazon',
        multiplier: '4.1X',
        icon: AppImages.AMAZON_LOGO,
        backgroundColor: '#FF9900',
      },
      {
        id: '3',
        name: 'Grab',
        multiplier: '1.8X',
        icon: AppImages.GRAB_LOGO,
        backgroundColor: '#00B14F',
      },
      {
        id: '4',
        name: 'Uber',
        multiplier: '2.1X',
        icon: AppImages.UBER_LOGO,
        backgroundColor: '#000000',
      },
      {
        id: '5',
        name: 'Amazon',
        multiplier: '4.1X',
        icon: AppImages.AMAZON_LOGO,
        backgroundColor: '#FF9900',
      },
      {
        id: '6',
        name: 'Grab',
        multiplier: '1.8X',
        icon: AppImages.GRAB_LOGO,
        backgroundColor: '#00B14F',
      },
    ],
  };

  const handleMerchantPress = (merchant: MerchantData) => {
    console.log('Merchant pressed:', merchant);
    onMerchantPress?.(merchant);
  };

  const handleViewAllPress = () => {
    console.log('View all merchant bonus pressed');
    onViewAllPress?.();
  };

  const renderMerchantCard = (merchant: MerchantData, index: number) => (
    <CyDTouchView
      key={merchant.id + index.toString()}
      className='items-center mb-6 w-[100px]'
      onPress={() => handleMerchantPress(merchant)}>
      {/* Merchant Icon with Multiplier Badge */}
      <CyDView className='relative mb-2'>
        <CyDView
          className={`w-16 h-16 bg-white rounded-full items-center justify-center border border-n40`}>
          {/* Placeholder for merchant icon - you can replace with actual images */}
          {merchant.icon ? (
            <CyDImage
              source={merchant.icon}
              className='w-16 h-16 rounded-full'
            />
          ) : (
            <CyDText className='text-[12px] font-bold text-gray-800'>
              {merchant.name}
            </CyDText>
          )}
        </CyDView>

        {/* Multiplier Badge */}
        <CyDView
          className='absolute -top-3 bg-green400 rounded-full px-2 py-1'
          style={{
            alignSelf: 'center',
          }}>
          <CyDText className='text-white text-[12px] font-bold'>
            {merchant.multiplier}
          </CyDText>
        </CyDView>
      </CyDView>

      {/* Merchant Name */}
      <CyDText className='text-[14px] font-medium'>{merchant.name}</CyDText>
    </CyDTouchView>
  );

  return (
    <CyDView
      className={`my-4 mx-4 rounded-[12px] py-4 ${
        isDarkMode ? 'bg-base40' : 'bg-n0 border border-n40'
      }`}>
      {/* Header Section */}
      <CyDView className='flex-row justify-between items-start mb-4 px-4'>
        <CyDView className='flex-1'>
          <CyDText className='text-n200 text-[14px]'>REWARDS</CyDText>
          <CyDText className='text-n200 text-[12px] font-medium'>
            On all Transaction
          </CyDText>
        </CyDView>

        <CyDView className='items-end'>
          <CyDText className='text-[20px]'>{merchantData.baseReward}</CyDText>
          <CyDText className='text-n200 text-[12px] text-right font-medium'>
            {merchantData.baseRewardDescription}
          </CyDText>
        </CyDView>
      </CyDView>

      <CyDView className='w-full h-[1px] bg-n40 mb-4' />

      {/* Additional Rewards Section */}
      <CyDView className='px-4 mb-[20px]'>
        <CyDText className='text-n200 text-[14px] font-medium text-center'>
          Additional rewards on merchants
        </CyDText>
      </CyDView>

      {/* Merchants Grid */}
      <CyDView className='px-4'>
        <CyDView className='flex-row justify-center gap-3 mb-4'>
          {merchantData.merchants
            .slice(0, 3)
            .map((merchant, index) => renderMerchantCard(merchant, index))}
        </CyDView>

        <CyDView className='flex-row justify-center gap-3'>
          {merchantData.merchants
            .slice(3, 6)
            .map((merchant, index) => renderMerchantCard(merchant, index + 3))}
        </CyDView>
      </CyDView>

      {/* View All Button */}
      <CyDView className='px-4'>
        <CyDTouchView
          className={`bg-base200 rounded-[25px] py-3 items-center ${
            isDarkMode ? 'bg-base200' : 'bg-n30'
          }`}
          onPress={handleViewAllPress}>
          <CyDText className='text-[16px] font-medium'>
            View all Merchant bonus
          </CyDText>
        </CyDTouchView>
      </CyDView>
    </CyDView>
  );
};

export default MerchantSpendRewardWidget;
