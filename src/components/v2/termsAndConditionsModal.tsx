import React, { useCallback, useState } from 'react';
import { Linking, StyleSheet } from 'react-native';
import {
  CyDIcons,
  CyDMaterialDesignIcons,
  CyDSafeAreaView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindComponents';
import { useTranslation } from 'react-i18next';
import useAxios from '../../core/HttpRequest';
import CyDModalLayout from './modal';
import clsx from 'clsx';
import Button from './button';
import { screenTitle } from '../../constants';
import {
  ParamListBase,
  NavigationProp,
  useNavigation,
} from '@react-navigation/native';
import {
  LEGAL_CYPHERHQ,
  RAIN_ACCOUNT_OPENING_PRIVACY_POLICY_URL,
  RAIN_E_SIGN_CONSENT_URL,
  TERMS_PRIVACY_POLICY_URL,
} from '../../constants/data';
import { setRainTerms } from '../../core/asyncStorage';
import { CardProviders } from '../../constants/enum';

export default function TermsAndConditionsModal({
  isModalVisible,
  setIsModalVisible,
  onAgree,
  onCancel,
  cardProvider,
}: {
  isModalVisible: boolean;
  setIsModalVisible: (isModalVisible: boolean) => void;
  onAgree: () => void;
  onCancel: () => void;
  cardProvider: CardProviders;
}) {
  const { t } = useTranslation();
  const { patchWithAuth } = useAxios();
  const [hasConsent, setHasConsent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [acceptRainTerms, setAcceptRainTerms] = useState({
    eSign: false,
    accountOpening: false,
    cypherTerms: false,
    infoConsent: false,
    unauthorizedSolicitation: false,
  });
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  const onClickAgree = async () => {
    if (cardProvider === CardProviders.RAIN_CARD) {
      await setRainTerms(true);
      onAgree();
    } else {
      setIsLoading(true);
      const response = await patchWithAuth('/v1/cards/agree-terms', {});
      if (!response.isError) {
        onAgree();
      }
      setIsLoading(false);
    }
  };

  const RenderContent = useCallback(() => {
    if (cardProvider === CardProviders.RAIN_CARD) {
      return (
        <CyDView className='flex flex-1 flex-col justify-between gap-[12px]'>
          <CyDView>
            <CyDView className='flex flex-row w-full mt-[22px]'>
              <CyDTouchView
                className='flex flex-row items-center p-[8px] -m-[8px]'
                onPress={() =>
                  setAcceptRainTerms({
                    ...acceptRainTerms,
                    eSign: !acceptRainTerms.eSign,
                  })
                }>
                <CyDView
                  className={clsx(
                    'h-[20px] w-[20px] border-[1px] rounded-[4px] border-base400',
                    {
                      'bg-p150 border-p150': acceptRainTerms.eSign,
                    },
                  )}>
                  {acceptRainTerms.eSign && (
                    <CyDMaterialDesignIcons
                      name='check-bold'
                      size={16}
                      className='text-n0'
                    />
                  )}
                </CyDView>
              </CyDTouchView>

              <CyDText className='px-[12px] text-[12px]'>
                I accept the{' '}
                <CyDText
                  className='text-blue-800'
                  onPress={() => Linking.openURL(RAIN_E_SIGN_CONSENT_URL)}>
                  E-Sign Consent
                </CyDText>{' '}
              </CyDText>
            </CyDView>

            <CyDView className='flex flex-row w-full mt-[22px]'>
              <CyDTouchView
                className='flex flex-row items-center p-[8px] -m-[8px]'
                onPress={() =>
                  setAcceptRainTerms({
                    ...acceptRainTerms,
                    accountOpening: !acceptRainTerms.accountOpening,
                  })
                }>
                <CyDView
                  className={clsx(
                    'h-[20px] w-[20px] border-[1px] rounded-[4px] border-base400',
                    {
                      'bg-p150 border-p150': acceptRainTerms.accountOpening,
                    },
                  )}>
                  {acceptRainTerms.accountOpening && (
                    <CyDMaterialDesignIcons
                      name='check-bold'
                      size={16}
                      className='text-n0'
                    />
                  )}
                </CyDView>
              </CyDTouchView>

              <CyDText className='px-[12px] text-[12px]'>
                I accept the{' '}
                <CyDText
                  className='text-blue-800'
                  onPress={() =>
                    Linking.openURL(RAIN_ACCOUNT_OPENING_PRIVACY_POLICY_URL)
                  }>
                  Account Opening Privacy Notice
                </CyDText>{' '}
              </CyDText>
            </CyDView>
            <CyDView className='flex flex-row w-full mt-[22px]'>
              <CyDTouchView
                className='flex flex-row items-center p-[8px] -m-[8px]'
                onPress={() =>
                  setAcceptRainTerms({
                    ...acceptRainTerms,
                    cypherTerms: !acceptRainTerms.cypherTerms,
                  })
                }>
                <CyDView
                  className={clsx(
                    'h-[20px] w-[20px] border-[1px] rounded-[4px] border-base400',
                    {
                      'bg-p150 border-p150': acceptRainTerms.cypherTerms,
                    },
                  )}>
                  {acceptRainTerms.cypherTerms && (
                    <CyDMaterialDesignIcons
                      name='check-bold'
                      size={16}
                      className='text-n0'
                    />
                  )}
                </CyDView>
              </CyDTouchView>

              <CyDText className='px-[12px] text-[12px]'>
                I accept the Cypher card{' '}
                <CyDText
                  className='text-blue-800'
                  onPress={() => Linking.openURL(LEGAL_CYPHERHQ)}>
                  Terms and Conditions
                </CyDText>{' '}
                and{' '}
                <CyDText
                  className='text-blue-800'
                  onPress={() => Linking.openURL(TERMS_PRIVACY_POLICY_URL)}>
                  Privacy Policy
                </CyDText>
              </CyDText>
            </CyDView>

            <CyDTouchView
              className='flex flex-row items-center mt-[22px]'
              onPress={() => {
                setAcceptRainTerms({
                  ...acceptRainTerms,
                  infoConsent: !acceptRainTerms.infoConsent,
                });
              }}>
              <CyDView
                className={clsx(
                  'h-[20px] w-[20px] border-[1px] border-base400 rounded-[4px]',
                  {
                    'bg-p150 border-p150': acceptRainTerms.infoConsent,
                  },
                )}>
                {acceptRainTerms.infoConsent && (
                  <CyDMaterialDesignIcons
                    name='check-bold'
                    size={16}
                    className='text-n0'
                  />
                )}
              </CyDView>
              <CyDText className='px-[12px] text-[12px]'>
                {t('RAIN_INFO_CONSENT')}
              </CyDText>
            </CyDTouchView>

            <CyDTouchView
              className='flex flex-row items-center mt-[22px]'
              onPress={() => {
                setAcceptRainTerms({
                  ...acceptRainTerms,
                  unauthorizedSolicitation:
                    !acceptRainTerms.unauthorizedSolicitation,
                });
              }}>
              <CyDView
                className={clsx(
                  'h-[20px] w-[20px] border-[1px] border-base400 rounded-[4px]',
                  {
                    'bg-p150 border-p150':
                      acceptRainTerms.unauthorizedSolicitation,
                  },
                )}>
                {acceptRainTerms.unauthorizedSolicitation && (
                  <CyDMaterialDesignIcons
                    name='check-bold'
                    size={16}
                    className='text-n0'
                  />
                )}
              </CyDView>
              <CyDText className='px-[12px] text-[12px]'>
                {t('RAIN_SOLICITATION')}
              </CyDText>
            </CyDTouchView>
          </CyDView>

          <CyDView className={'w-[100%]'}>
            <Button
              style='h-[54px]'
              title={t('AGGREE_CONTINUE')}
              disabled={
                !acceptRainTerms.eSign ||
                !acceptRainTerms.accountOpening ||
                !acceptRainTerms.cypherTerms ||
                !acceptRainTerms.infoConsent ||
                !acceptRainTerms.unauthorizedSolicitation
              }
              loading={isLoading}
              onPress={() => {
                void onClickAgree();
              }}
            />
          </CyDView>
        </CyDView>
      );
    }
    return (
      <CyDView>
        <CyDView className='flex flex-col justify-between items-center w-full mt-[24px]'>
          <CyDText className='text-center w-full mt-[12px]'>
            {t('TERMS_CONDITIONS_DESC')}
          </CyDText>
        </CyDView>

        <CyDView className='h-[160px] w-[240px] flex flex-col justify-between items-center blur-[10px] mt-[32px] bg-base400 self-center rounded-[4px]'>
          <CyDView className='opacity-40'>
            <CyDText className='text-center text-n0 mt-[12px]'>
              {t('TERMS_CONDITIONS')}
            </CyDText>
            <CyDText className='text-center text-[10px] text-n0 mt-[10px]'>
              CypherD Wallet Inc
            </CyDText>
            <CyDText className='text-[10px] text-n0 mt-[10px] px-[4px]'>
              We will post any changes to these terms of service in a notice of
              the change at the bottom of our web page.
            </CyDText>
          </CyDView>
          <CyDTouchView
            className='w-full py-[16px] bg-n40 flex flex-row justify-center items-center'
            onPress={() => {
              setIsModalVisible(false);
              navigation.navigate(screenTitle.LEGAL_SCREEN);
            }}>
            <CyDText className='text-center text-blue-500'>
              {t('VIEW_TERMS_CONDITIONS')}
            </CyDText>
            <CyDIcons
              name='chevron-right'
              size={24}
              className='text-blue-500'
            />
          </CyDTouchView>
        </CyDView>

        <CyDTouchView
          className='flex flex-row items-center my-[32px]'
          onPress={() => {
            setHasConsent(!hasConsent);
          }}>
          <CyDView
            className={clsx(
              'h-[20px] w-[20px] border-[1px] border-base400 rounded-[4px]',
              {
                'bg-black': hasConsent,
              },
            )}>
            {hasConsent && (
              <CyDMaterialDesignIcons
                name='check-bold'
                size={16}
                className='text-base400'
              />
            )}
          </CyDView>
          <CyDText className='px-[12px] text-[14px]'>{t('AGREE_T&C')}</CyDText>
        </CyDTouchView>
        <CyDView className={'w-[100%]'}>
          <Button
            style='h-[54px]'
            title={t('AGGREE_CONTINUE')}
            disabled={!hasConsent}
            loading={isLoading}
            onPress={() => {
              void onClickAgree();
            }}
          />
        </CyDView>
      </CyDView>
    );
  }, [setIsModalVisible, cardProvider, acceptRainTerms]);

  return (
    <CyDModalLayout
      setModalVisible={setIsModalVisible}
      isModalVisible={isModalVisible}
      style={styles.modalLayout}
      animationIn={'slideInUp'}
      animationOut={'slideOutDown'}>
      <CyDView
        className={clsx(
          'w-full bg-n0 p-[24px] pb-[48px] rounded-[22px]',
          cardProvider === CardProviders.RAIN_CARD && 'h-full',
        )}>
        <CyDSafeAreaView className='flex-1'>
          <CyDView className='flex flex-row items-center'>
            <CyDView className='flex w-full justify-center items-center'>
              <CyDText className={'font-bold text-center text-[22px]'}>
                {t('TERMS_CONDITIONS')}
              </CyDText>
            </CyDView>
            <CyDTouchView
              onPress={() => onCancel()}
              className={'z-[50] ml-[-24px]'}>
              <CyDMaterialDesignIcons
                name={'close'}
                size={24}
                className='text-base400'
              />
            </CyDTouchView>
          </CyDView>

          <RenderContent />
        </CyDSafeAreaView>
      </CyDView>
    </CyDModalLayout>
  );
}

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    zIndex: 999,
    justifyContent: 'flex-end',
  },
});
