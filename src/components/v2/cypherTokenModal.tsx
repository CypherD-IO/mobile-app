import React, { useRef, useState, useEffect } from 'react';
import {
  CyDView,
  CyDText,
  CyDImage,
  CyDScrollView,
  CyDIcons,
} from '../../styles/tailwindComponents';
import AppImages from '../../../assets/images/appImages';
import { Animated, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CyDModalLayout from './modal';

interface CypherTokenModalProps {
  isVisible: boolean;
  onClose: () => void;
}

const updateStatusBarStyle = (isFullScreen: boolean) => {
  if (Platform.OS === 'android') {
    const bgColor = isFullScreen ? '#000000ff' : 'transparent';
    StatusBar.setBackgroundColor(bgColor);
  }
  StatusBar.setBarStyle('light-content');
};

const CypherTokenModal: React.FC<CypherTokenModalProps> = ({
  isVisible,
  onClose,
}) => {
  const [isFullHeight, setIsFullHeight] = useState(false);
  const heightAnim = useRef(new Animated.Value(75)).current;
  const [backdropOpacity, setBackdropOpacity] = useState(0.5);

  const animateToFullHeight = () => {
    if (!isFullHeight) {
      setIsFullHeight(true);
      setBackdropOpacity(0);

      Animated.timing(heightAnim, {
        toValue: 100,
        duration: 300,
        useNativeDriver: false,
      }).start(() => {
        updateStatusBarStyle(true);
      });
    }
  };

  const handleModalClose = () => {
    setIsFullHeight(false);
    setBackdropOpacity(0.5);
    updateStatusBarStyle(false);
    heightAnim.setValue(75);
    onClose();
  };

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    console.log(
      'Scroll detected, offsetY:',
      offsetY,
      'isFullHeight:',
      isFullHeight,
    );

    // Only trigger expansion if not already full height
    if (!isFullHeight && offsetY > 10) {
      animateToFullHeight();
    }
  };

  const handleScrollBeginDrag = () => {
    console.log('Scroll begin drag detected, isFullHeight:', isFullHeight);
    // Don't auto-expand on drag begin, let user actually scroll
  };

  const handleTouchStart = () => {
    console.log('Touch start detected');
  };

  const handleTouchMove = () => {
    console.log('Touch move detected, isFullHeight:', isFullHeight);
    // Only expand if not already full height
    if (!isFullHeight) {
      console.log('Expanding modal via touch move');
      animateToFullHeight();
    }
  };

  // Reset height when modal visibility changes
  useEffect(() => {
    if (!isVisible) {
      setIsFullHeight(false);
      heightAnim.setValue(75);
    }
  }, [isVisible]);

  return (
    <CyDModalLayout
      setModalVisible={handleModalClose}
      isModalVisible={isVisible}
      style={{ margin: 0, justifyContent: 'flex-end' }}
      backdropOpacity={backdropOpacity}
      onSwipeComplete={({ swipingDirection }) => {
        if (swipingDirection === 'down') {
          handleModalClose();
        }
      }}
      swipeDirection={['down']}
      propagateSwipe={false}
      disableBackDropPress={false}
      avoidKeyboard={false}>
      <SafeAreaView className='flex-1 justify-end' edges={['top']}>
        <Animated.View
          className='w-full bg-[#1a1a1a]'
          style={{
            height: heightAnim.interpolate({
              inputRange: [75, 100],
              outputRange: ['75%', '100%'],
            }),
            borderTopLeftRadius: heightAnim.interpolate({
              inputRange: [75, 100],
              outputRange: [16, 0],
            }),
            borderTopRightRadius: heightAnim.interpolate({
              inputRange: [75, 100],
              outputRange: [16, 0],
            }),
          }}>
          {/* Grey indicator at the top */}
          <CyDView className='w-[32px] h-[4px] bg-[#d9d9d9] self-center mt-[16px]' />

          {/* Header */}
          <CyDView className='flex-row items-center justify-between p-[20px] border-b border-[#333333]'>
            <CyDView className='flex flex-col'>
              <CyDImage
                source={AppImages.CYPR_TOKEN}
                className='w-[44px] h-[44px]'
              />
              <CyDText className='text-[20px] font-bold text-white'>
                Cypher Token
              </CyDText>
            </CyDView>
          </CyDView>

          <CyDScrollView
            className='flex-1'
            showsVerticalScrollIndicator={true}
            bounces={true}
            onScroll={handleScroll}
            onScrollBeginDrag={handleScrollBeginDrag}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            scrollEventThrottle={1}
            nestedScrollEnabled={true}
            contentContainerClassName='pb-[60px]'
            style={{ flex: 1 }}>
            {/* How you can earn it section */}
            <CyDView className='mb-[32px] px-[20px] mt-[20px]'>
              <CyDText className='text-[18px] font-bold text-white mb-[20px]'>
                How you can earn it
              </CyDText>

              {/* On Purchases */}
              <CyDView className='flex-row items-start mb-[24px]'>
                <CyDView className='w-[48px] h-[48px] bg-[#333333] rounded-[12px] items-center justify-center mr-[16px]'>
                  <CyDImage
                    source={AppImages.SHOPPING_BAG_ICON_WHITE}
                    className='w-[24px] h-[24px]'
                  />
                </CyDView>
                <CyDView className='flex-1'>
                  <CyDText className='text-[16px] font-semibold text-white mb-[4px]'>
                    On Purchases
                  </CyDText>
                  <CyDText className='text-[14px] text-[#999999] leading-[20px]'>
                    Spend using the cypher card to earn cypher token
                  </CyDText>
                </CyDView>
              </CyDView>

              {/* Referrals */}
              <CyDView className='flex-row items-start mb-[24px]'>
                <CyDView className='w-[48px] h-[48px] bg-[#333333] rounded-[12px] items-center justify-center mr-[16px]'>
                  <CyDImage
                    source={AppImages.PERSON_ICON_WHITE}
                    className='w-[24px] h-[24px]'
                  />
                </CyDView>
                <CyDView className='flex-1'>
                  <CyDText className='text-[16px] font-semibold text-white mb-[4px]'>
                    Referrals
                  </CyDText>
                  <CyDText className='text-[14px] text-[#999999] leading-[20px]'>
                    Refer others to the cypher platform
                  </CyDText>
                </CyDView>
              </CyDView>

              {/* Additional rewards */}
              <CyDView className='flex-row items-start mb-[24px]'>
                <CyDView className='w-[48px] h-[48px] bg-[#333333] rounded-[12px] items-center justify-center mr-[16px]'>
                  <CyDImage
                    source={AppImages.SHOP_ICON_WHITE}
                    className='w-[24px] h-[24px]'
                  />
                </CyDView>
                <CyDView className='flex-1'>
                  <CyDText className='text-[16px] font-semibold text-white mb-[4px]'>
                    Additional rewards
                  </CyDText>
                  <CyDText className='text-[14px] text-[#999999] leading-[20px]'>
                    Activate merchants for additional rewards multiplier, get up
                    to 12X more cypher tokens than normal rewards
                  </CyDText>
                </CyDView>
              </CyDView>
            </CyDView>

            {/* How to use it section */}
            <CyDView className='mb-[32px] px-[20px]'>
              <CyDText className='text-[18px] font-bold text-white mb-[20px]'>
                How to use it
              </CyDText>

              {/* Compound your reward */}
              <CyDView className='flex-row items-start mb-[24px]'>
                <CyDView className='w-[48px] h-[48px] bg-[#333333] rounded-[12px] items-center justify-center mr-[16px]'>
                  <CyDImage
                    source={AppImages.COIN_STACK_ICON_WHITE}
                    className='w-[24px] h-[24px]'
                  />
                </CyDView>
                <CyDView className='flex-1'>
                  <CyDText className='text-[16px] font-semibold text-white mb-[4px]'>
                    Compound your reward
                  </CyDText>
                  <CyDText className='text-[14px] text-[#999999] leading-[20px]'>
                    Use your $CYPR to Activate your favourite brands for
                    additional rewards
                  </CyDText>
                </CyDView>
              </CyDView>

              {/* Load you card & Spend */}
              <CyDView className='flex-row items-start mb-[24px]'>
                <CyDView className='w-[48px] h-[48px] bg-[#333333] rounded-[12px] items-center justify-center mr-[16px]'>
                  <CyDImage
                    source={AppImages.CARD_ICON_WHITE}
                    className='w-[24px] h-[24px]'
                  />
                </CyDView>
                <CyDView className='flex-1'>
                  <CyDText className='text-[16px] font-semibold text-white mb-[4px]'>
                    Load you card & Spend
                  </CyDText>
                  <CyDText className='text-[14px] text-[#999999] leading-[20px]'>
                    you can load your card with cypher token, and spend across
                    140m+ merchants
                  </CyDText>
                </CyDView>
              </CyDView>

              {/* Grow with Us */}
              <CyDView className='flex-row items-start mb-[24px]'>
                <CyDView className='w-[48px] h-[48px] bg-[#333333] rounded-[12px] items-center justify-center mr-[16px]'>
                  <CyDImage
                    source={AppImages.ANALYTICS_ICON_WHITE}
                    className='w-[24px] h-[24px]'
                  />
                </CyDView>
                <CyDView className='flex-1'>
                  <CyDText className='text-[16px] font-semibold text-white mb-[4px]'>
                    Grow with Us
                  </CyDText>
                  <CyDText className='text-[14px] text-[#999999] leading-[20px]'>
                    Invite friends, shop often, and lock smart — your influence
                    (and rewards) grow over time.
                  </CyDText>
                </CyDView>
              </CyDView>
            </CyDView>

            {/* Footer */}
            <CyDView className='mb-[60px] px-[20px]'>
              <CyDText className='text-[16px] font-medium text-[#666666] text-center mb-[20px]'>
                Start earning $CYPR tokens today and unlock exclusive rewards!
              </CyDText>
              <CyDView className='bg-[#333333] rounded-[12px] p-[16px] mb-[20px]'>
                <CyDText className='text-[14px] text-white text-center'>
                  💎 Join thousands of users already earning CYPR tokens
                </CyDText>
              </CyDView>

              {/* Additional content to ensure scrolling */}
              <CyDView className='bg-[#2a2a2a] rounded-[12px] p-[16px] mb-[20px]'>
                <CyDText className='text-[14px] text-[#999999] text-center mb-[8px]'>
                  Token Details
                </CyDText>
                <CyDText className='text-[12px] text-[#666666] text-center'>
                  Symbol: CYPR • Network: Base Chain • Total Supply: 1B
                </CyDText>
              </CyDView>

              <CyDView className='bg-[#2a2a2a] rounded-[12px] p-[16px] mb-[20px]'>
                <CyDText className='text-[14px] text-[#999999] text-center mb-[8px]'>
                  Learn More
                </CyDText>
                <CyDText className='text-[12px] text-[#666666] text-center'>
                  Visit our documentation to understand tokenomics and reward
                  mechanisms
                </CyDText>
              </CyDView>

              <CyDView className='h-[100px] bg-[#2a2a2a] rounded-[12px] p-[16px] mb-[20px] justify-center'>
                <CyDText className='text-[14px] text-[#999999] text-center'>
                  This is extra content to test scrolling functionality. The
                  modal should be able to scroll through all this content
                  smoothly.
                </CyDText>
              </CyDView>
            </CyDView>
          </CyDScrollView>
        </Animated.View>
      </SafeAreaView>
    </CyDModalLayout>
  );
};

export default CypherTokenModal;
