import React, { useCallback, useState } from 'react';
import {
  CyDSafeAreaView,
  CyDText,
  CyDView,
  CyDTouchView,
  CyDImage,
  CyDScrollView,
  CydMaterialDesignIcons,
} from '../../../styles/tailwindStyles';
import { StyleSheet, StatusBar } from 'react-native';
import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import AppImages from '../../../../assets/images/appImages';
import { isIOS } from '../../../misc/checkers';
import clsx from 'clsx';
import { ButtonType, CardProviders } from '../../../constants/enum';
import Button from '../../../components/v2/button';
import { Card } from '../../../models/card.model';
import { screenTitle } from '../../../constants';

interface RouteParams {
  currentCardProvider: CardProviders;
  card: Card;
}

export default function CardActivationConsent() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<Record<string, RouteParams>, string>>();
  const { currentCardProvider, card } = route.params;
  const { t } = useTranslation();
  const [hasConsent, setHasConsent] = useState(false);

  const virtualCardReplacementInfo = [
    {
      title: t('VIRTUAL_CARD_REPLACEMENT_INFO_TITLE_1'),
      description: t('VIRTUAL_CARD_REPLACEMENT_INFO_DESC_1'),
    },
    {
      title: t('VIRTUAL_CARD_REPLACEMENT_INFO_TITLE_2'),
      description: t('VIRTUAL_CARD_REPLACEMENT_INFO_DESC_2'),
    },
    {
      title: t('VIRTUAL_CARD_REPLACEMENT_INFO_TITLE_3'),
      description: t('VIRTUAL_CARD_REPLACEMENT_INFO_DESC_3'),
    },
  ];

  const RenderContent = useCallback(() => {
    return (
      <CyDView className='flex flex-col bg-n0 px-[16px] pb-[16px] pt-[2px] gap-y-[14px] rounded-[12px]'>
        {virtualCardReplacementInfo.map((item, index) => (
          <CyDView key={index} className='flex flex-col'>
            <CyDText className='text-[14px] font-bold'>{item.title}</CyDText>
            <CyDText className='text-[12px] mt-[2px]'>
              {item.description}
            </CyDText>
          </CyDView>
        ))}
      </CyDView>
    );
  }, []);

  const RenderPremiumPrompt = useCallback(() => {
    return (
      <CyDView className='flex flex-col bg-n20 px-[16px] pb-[22px] pt-[2px] gap-y-[14px] rounded-[12px]'>
        <CyDView className='flex flex-row justify-center items-center '>
          <CyDImage
            source={AppImages.MULTIPLE_CARDS}
            className='w-[94px] h-[94px] mt-[-54px]'
            resizeMode='contain'
          />
        </CyDView>
        <CyDView className='flex flex-col justify-center items-center'>
          <CyDText className='text-[14px] text-center font-bold w-[80%] mt-[-22px]'>
            {t('GET_MULTIPLE_CARDS_PREMIUM')}
          </CyDText>
          <CyDText className='text-[14px] text-center w-[80%] mt-[22px]'>
            {t('PREMIUM_SAVINGS')}
          </CyDText>
        </CyDView>
        <CyDTouchView
          className='flex flex-row justify-center items-center w-full p-[8px] rounded-[22px]'
          style={styles.premiumButton}>
          <CyDText className='text-center font-bold text-[16px]'>Go</CyDText>
          <CyDImage
            source={AppImages.PREMIUM_LABEL}
            className='w-[72px] h-[16px] ml-[4px]'
            resizeMode='contain'
          />
        </CyDTouchView>
      </CyDView>
    );
  }, []);

  const RenderConsent = useCallback(() => {
    return (
      <CyDTouchView
        className='flex flex-row items-start bg-n20 rounded-[12px] p-[16px]'
        onPress={() => {
          setHasConsent(!hasConsent);
        }}>
        <CyDView
          className={clsx('h-[20px] w-[20px] border-[1px] rounded-[4px]', {
            'bg-n0': hasConsent,
          })}>
          {hasConsent && (
            <CydMaterialDesignIcons
              name='check-bold'
              size={16}
              className='text-base400 ml-[2px]'
            />
          )}
        </CyDView>
        <CyDView className='w-[90%] ml-[4px] mt-[-4px]'>
          <CyDText className='px-[12px] text-[16px] font-bold'>
            {t('I_UNDERSTAND_AND_AGREE')}
          </CyDText>
          <CyDText className='px-[12px] text-[14px] mt-[4px]'>
            {t('VIRTUAL_CARD_CANCEL_ACC')}
          </CyDText>
        </CyDView>
      </CyDTouchView>
    );
  }, [hasConsent]);

  return (
    <CyDSafeAreaView className='flex flex-1 bg-n20 h-full bg-n20'>
      <StatusBar barStyle='dark-content' backgroundColor={'#EBEDF0'} />
      <CyDView className='flex flex-1 flex-col justify-between h-full bg-transparent'>
        <CyDView className='flex-1 mx-[16px] pb-[92px]'>
          <CyDView className='flex-row items-center justify-between'>
            <CyDTouchView
              onPress={() => {
                navigation.goBack();
              }}
              className='w-[36px] h-[36px]'>
              <CydMaterialDesignIcons
                name={'arrow-left-thin'}
                size={32}
                className='text-base400'
              />
            </CyDTouchView>
          </CyDView>
          <CyDScrollView
            className='flex-1'
            showsVerticalScrollIndicator={false}>
            <CyDView className='mt-[12px]'>
              <CyDText className='text-[26px] font-bold'>
                {t('ACTIVATE_PHYSICAL_CARD')}
              </CyDText>
              <CyDText className='text-[16px] mt-[4px] text-subTextColor'>
                {t('ACTIVATE_PHYSICAL_CARD_SUB')}
              </CyDText>
            </CyDView>
            <CyDView className='flex flex-col justify-center items-center mt-[-32px]'>
              <CyDImage
                source={AppImages.REPLACE_VIRTUAL_CARD}
                className='w-full h-[320px]'
                resizeMode='contain'
              />
              <CyDText className='text-[18px] text-center font-bold mt-[4px] w-[84%]'>
                {t('REPLACE_VIRTUAL_CARD_SUB')}
              </CyDText>
            </CyDView>
            <CyDView className='mt-[48px]'>
              <RenderContent />
            </CyDView>
            <CyDView className='mt-[58px]'>
              <RenderPremiumPrompt />
            </CyDView>
            <CyDView className='mt-[58px] mb-[22px]'>
              <RenderConsent />
            </CyDView>
          </CyDScrollView>
        </CyDView>
        <CyDView
          className={clsx(
            'absolute w-full bottom-[0px] bg-n0 py-[32px] px-[16px]',
            {
              'bottom-[-32px]': isIOS(),
            },
          )}>
          <Button
            onPress={() => {
              navigation.navigate(screenTitle.CARD_ACTIAVTION_SCREEN, {
                currentCardProvider,
                card,
              });
            }}
            disabled={!hasConsent}
            type={ButtonType.PRIMARY}
            title={t('CONTINUE')}
            style={'h-[60px] w-full py-[10px]'}
          />
        </CyDView>
      </CyDView>
    </CyDSafeAreaView>
  );
}

const styles = StyleSheet.create({
  premiumButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 50, // Rounded corners
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5, // For Android shadow
  },
});
