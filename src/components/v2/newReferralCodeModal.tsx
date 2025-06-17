import React, {
  Dispatch,
  SetStateAction,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  CyDView,
  CyDText,
  CyDImage,
  CyDTouchView,
  CyDKeyboardAvoidingView,
  CyDTextInput,
  CyDMaterialDesignIcons,
  CyDScrollView,
  CyDSafeAreaView,
} from '../../styles/tailwindComponents';
import CyDModalLayout from './modal';
import { t } from 'i18next';
import { Animated, Keyboard, Platform, StyleSheet } from 'react-native';
import { sampleSize } from 'lodash';
import Button from './button';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import clsx from 'clsx';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { showToast } from '../../containers/utilities/toastUtility';

// Keep only the styles we need to pass directly to components
const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    width: '100%',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
});

// Validation schema
const ValidationSchema = Yup.object().shape({
  code: Yup.string()
    .min(6, t('REFERRAL_CODE_LENGTH_INFO'))
    .required(t('REFERRAL_CODE_REQUIRED')),
  channel: Yup.string(),
  username: Yup.string(),
  campaignName: Yup.string(),
});

interface FormValues {
  code: string;
  channel: string;
  username: string;
  campaignName: string;
}

export default function NewReferralCodeModal({
  isModalVisible,
  setIsModalVisible,
  createReferralCode,
  code,
  setCode,
}: {
  isModalVisible: boolean;
  setIsModalVisible: (val: boolean) => void;
  createReferralCode: (payload: {
    utm_source?: string;
    utm_campaign?: string;
    influencer?: string;
    utm_medium: string;
  }) => Promise<void>;
  code: string;
  setCode: Dispatch<SetStateAction<string>>;
}) {
  // Modal expansion state
  const [isFullHeight, setIsFullHeight] = useState(false);
  const heightAnim = useRef(new Animated.Value(45)).current;
  const [backdropOpacity, setBackdropOpacity] = useState(0.5);

  // Generate initial invite code
  function generateCode() {
    const letters = sampleSize('ABCDEFGHIJKLMNOPQRSTUVWXYZ', 4);
    const numbers = sampleSize('0123456789', 4);
    return [...letters, ...numbers].join(``);
  }

  // Use a default generated code if none is provided
  const [initialCode, setInitialCode] = useState(() => code || generateCode());

  // Keyboard handling
  const scrollViewRef = useRef<any>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [activeInput, setActiveInput] = useState('');

  // Set the parent code state on first render if needed
  useEffect(() => {
    if (!code && initialCode) {
      setCode(initialCode);
    }
  }, []);

  // Initialize Formik values
  const initialValues: FormValues = {
    code: initialCode,
    channel: '',
    username: '',
    campaignName: '',
  };

  useEffect(() => {
    // Keyboard listeners
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
      },
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
      },
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Scroll to active input when keyboard is visible
  useEffect(() => {
    if (keyboardVisible && activeInput && scrollViewRef.current) {
      setTimeout(() => {
        switch (activeInput) {
          case 'channel':
            scrollViewRef.current.scrollTo({ y: 100, animated: true });
            break;
          case 'username':
            scrollViewRef.current.scrollTo({ y: 150, animated: true });
            break;
          case 'campaignName':
            scrollViewRef.current.scrollTo({ y: 300, animated: true });
            break;
          default:
            break;
        }
      }, 300);
    }
  }, [keyboardVisible, activeInput]);

  // Expand modal when keyboard is shown
  useEffect(() => {
    if (keyboardVisible) {
      animateToFullHeight();
    }
  }, [keyboardVisible]);

  const animateToFullHeight = () => {
    if (!isFullHeight) {
      setIsFullHeight(true);
      setBackdropOpacity(0);

      Animated.timing(heightAnim, {
        toValue: 95,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  };

  const handleScroll = (event: any) => {
    if (event.nativeEvent.contentOffset.y > 0) {
      animateToFullHeight();
    }
  };

  const handleAddAttribution = (setFieldValue: any) => {
    animateToFullHeight();
  };

  const handleRefreshCode = (setFieldValue: any) => {
    const newCode = generateCode();
    void setFieldValue('code', newCode);
    setCode(newCode);
  };

  const handleSubmit = async (values: FormValues) => {
    // Update the parent code state
    setCode(values.code);
    // Call the parent createReferralCode function
    setIsModalVisible(false);
    try {
      await createReferralCode({
        utm_source: values.channel || undefined,
        utm_campaign: values.campaignName || undefined,
        influencer: values.username || undefined,
        utm_medium: 'referral',
      });
    } catch (error) {
      console.error('Error creating referral code:', error);
      showToast(t('REFERRAL_CODE_CREATION_FAILED_MESSAGE'), 'error');
    }
  };

  return (
    <CyDModalLayout
      isModalVisible={isModalVisible}
      style={styles.modalLayout}
      backdropOpacity={backdropOpacity}
      animationIn={'slideInUp'}
      animationOut={'slideOutDown'}
      swipeDirection={['down']}
      onSwipeComplete={({ swipingDirection }) => {
        if (swipingDirection === 'down') {
          setIsModalVisible(false);
        }
      }}
      propagateSwipe={true}
      setModalVisible={(_val: any) => {
        setIsModalVisible(_val);
      }}>
      <CyDKeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}>
        <GestureHandlerRootView className='flex-1'>
          <Animated.View
            style={[
              styles.modalContainer,
              {
                height: heightAnim.interpolate({
                  inputRange: [45, 100],
                  outputRange: ['45%', '100%'],
                }),
              },
            ]}
            className={clsx('bg-n20', {
              'rounded-t-[24px]': !isFullHeight,
              'rounded-t-0': isFullHeight,
            })}>
            <CyDView className='items-center mt-[16px]'>
              <CyDView className='w-[32px] h-[4px] bg-[#d9d9d9] rounded-full' />
            </CyDView>

            <Formik
              initialValues={initialValues}
              validationSchema={ValidationSchema}
              onSubmit={handleSubmit}
              enableReinitialize={false}>
              {({
                handleChange,
                handleBlur,
                handleSubmit: formikSubmit,
                setFieldValue,
                values,
                errors,
                touched,
                isValid,
              }) => (
                <>
                  <CyDScrollView
                    ref={scrollViewRef}
                    onScroll={handleScroll}
                    scrollEventThrottle={16}
                    keyboardShouldPersistTaps='handled'
                    contentContainerClassName='px-[16px] pb-[150px]'>
                    <CyDText className='font-semibold text-[24px] mt-[16px]'>
                      {t('CREATE_REFERRAL_CODE')}
                    </CyDText>
                    <CyDText className='text-n200 font-[500] text-[14px] mt-[4px]'>
                      {t('CREATE_REFERRAL_CODE_SUB')}
                    </CyDText>

                    <CyDText className='font-bold text-[14px] mt-[24px] text-n200'>
                      {t('NEW_INVITE_CODE')}{' '}
                      <CyDText className='text-red-500'>*</CyDText>
                    </CyDText>

                    <CyDView className='flex-row items-center'>
                      <CyDTextInput
                        className='border border-n40 rounded-[8px] p-[12px] bg-n0 mt-[4px] flex-1'
                        placeholder={t('YOUR_CUSTOM_INVITE_CODE')}
                        value={values.code}
                        onChangeText={text => {
                          const upperCaseText = text.toUpperCase();
                          handleChange('code')(upperCaseText);
                          setCode(upperCaseText);
                        }}
                        onBlur={handleBlur('code')}
                        autoFocus={false}
                        onFocus={() => setActiveInput('code')}
                        autoCapitalize='characters'
                      />
                      <CyDTouchView
                        className='ml-[8px] p-[12px] border border-n40 rounded-[8px] bg-n0 mt-[4px]'
                        onPress={() => handleRefreshCode(setFieldValue)}>
                        <CyDMaterialDesignIcons
                          name='refresh'
                          size={20}
                          className='text-base400'
                        />
                      </CyDTouchView>
                    </CyDView>

                    {touched.code && errors.code && (
                      <CyDText className='text-red-500 text-[12px] mt-[4px]'>
                        {errors.code}
                      </CyDText>
                    )}

                    {!isFullHeight ? (
                      <CyDTouchView
                        className='flex-row items-center mt-[16px] bg-n0 self-start px-[12px] py-[8px] rounded-[8px] border border-n40'
                        onPress={() => handleAddAttribution(setFieldValue)}>
                        <CyDMaterialDesignIcons
                          name='plus'
                          size={16}
                          className='mr-[4px] text-base400'
                        />
                        <CyDText className='font-[600] text-[14px]'>
                          {t('ADD_CUSTOM_ATTRIBUTION')}
                        </CyDText>
                      </CyDTouchView>
                    ) : (
                      <>
                        {/* Channel */}
                        <CyDText className='font-bold text-[14px] mt-[24px] text-n200'>
                          {t('CHANNEL')}
                        </CyDText>
                        <CyDTextInput
                          className='border border-n40 rounded-[8px] p-[12px] bg-n0 mt-[4px]'
                          placeholder={t('WHERE_YOU_ARE_PLANNING_TO_USE_CODE')}
                          value={values.channel}
                          onChangeText={handleChange('channel')}
                          onBlur={handleBlur('channel')}
                          onFocus={() => setActiveInput('channel')}
                        />
                        <CyDText className='text-[#6b7280] text-[12px] mt-[4px]'>
                          {t('CHANNEL_EXAMPLE')}
                        </CyDText>

                        {/* Username */}
                        <CyDText className='font-bold text-[14px] mt-[24px] text-n200'>
                          {t('USERNAME')}
                        </CyDText>
                        <CyDTextInput
                          className='border border-n40 rounded-[8px] p-[12px] bg-n0 mt-[4px]'
                          placeholder={t('USERNAME_PLACEHOLDER')}
                          value={values.username}
                          onChangeText={handleChange('username')}
                          onBlur={handleBlur('username')}
                          onFocus={() => setActiveInput('username')}
                          autoCapitalize='none'
                          autoCorrect={false}
                        />
                        <CyDText className='text-[#6b7280] text-[12px] mt-[4px]'>
                          {t('USERNAME_EXAMPLE')}
                        </CyDText>

                        {/* Campaign Name */}
                        <CyDText className='font-bold text-[14px] mt-[24px] text-n200'>
                          {t('CAMPAIGN_NAME')}
                        </CyDText>
                        <CyDTextInput
                          className='border border-n40 rounded-[8px] p-[12px] bg-n0 mt-[4px]'
                          placeholder={t('CAMPAIGN_NAME_PLACEHOLDER')}
                          value={values.campaignName}
                          onChangeText={handleChange('campaignName')}
                          onBlur={handleBlur('campaignName')}
                          onFocus={() => setActiveInput('campaignName')}
                        />
                        <CyDText className='text-[#6b7280] text-[12px] mt-[4px]'>
                          {t('CAMPAIGN_EXAMPLE')}
                        </CyDText>
                      </>
                    )}
                  </CyDScrollView>

                  {/* Continue Button */}
                  <CyDSafeAreaView className='absolute bottom-0 left-0 right-0 bg-n20 border-t-[1px] border-n40'>
                    <CyDView className='px-[16px] py-[16px]'>
                      <Button
                        title={t('CONTINUE')}
                        onPress={() => {
                          try {
                            formikSubmit();
                          } catch (error) {
                            console.error('Error handling submit:', error);
                          }
                        }}
                        disabled={!isValid}
                      />
                    </CyDView>
                  </CyDSafeAreaView>
                </>
              )}
            </Formik>
          </Animated.View>
        </GestureHandlerRootView>
      </CyDKeyboardAvoidingView>
    </CyDModalLayout>
  );
}
