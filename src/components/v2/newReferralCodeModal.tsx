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
import { CONTENT_TYPES, TARGET_AUDIENCES } from '../../constants/data';

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
    backgroundColor: '#FFFFFF',
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
  contentType: Yup.string(),
  otherContentType: Yup.string().when('contentType', {
    is: 'other',
    then: schema => schema.required(t('SPECIFY_OTHER_CONTENT_TYPE_REQUIRED')),
  }),
  demographic: Yup.string(),
  targetAudience: Yup.string(),
  otherTargetAudience: Yup.string().when('targetAudience', {
    is: 'other',
    then: schema =>
      schema.required(t('SPECIFY_OTHER_TARGET_AUDIENCE_REQUIRED')),
  }),
});

interface FormValues {
  code: string;
  channel: string;
  username: string;
  contentType: string;
  otherContentType: string;
  demographic: string;
  targetAudience: string;
  otherTargetAudience: string;
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
  createReferralCode: (payload: any) => Promise<void>;
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

  // Dropdown state
  const [showContentTypeDropdown, setShowContentTypeDropdown] = useState(false);
  const [showTargetAudienceDropdown, setShowTargetAudienceDropdown] =
    useState(false);

  // Keyboard handling
  const scrollViewRef = useRef<any>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [activeInput, setActiveInput] = useState('');
  const otherContentInputRef = useRef<any>(null);
  const otherTargetAudienceInputRef = useRef<any>(null);
  const demographicInputRef = useRef<any>(null);

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
    contentType: '',
    otherContentType: '',
    demographic: '',
    targetAudience: '',
    otherTargetAudience: '',
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
          case 'otherContentType':
            scrollViewRef.current.scrollTo({ y: 150, animated: true });
            break;
          case 'demographic':
            scrollViewRef.current.scrollTo({ y: 300, animated: true });
            break;
          case 'otherTargetAudience':
            scrollViewRef.current.scrollTo({ y: 450, animated: true });
            break;
          default:
            break;
        }
      }, 300);
    }
  }, [keyboardVisible, activeInput]);

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

  const getContentTypeDisplayText = (
    contentType: string,
    otherContentType: string,
  ) => {
    if (contentType === 'other') {
      return otherContentType || t('SPECIFY_OTHER_CONTENT_TYPE');
    } else if (contentType && CONTENT_TYPES[contentType]) {
      return CONTENT_TYPES[contentType];
    } else {
      return t('SELECT_CONTENT_TYPE');
    }
  };

  const getTargetAudienceDisplayText = (
    targetAudience: string,
    otherTargetAudience: string,
  ) => {
    if (targetAudience === 'other') {
      return otherTargetAudience || t('SPECIFY_OTHER_TARGET_AUDIENCE');
    } else if (targetAudience && TARGET_AUDIENCES[targetAudience]) {
      return TARGET_AUDIENCES[targetAudience];
    } else {
      return t('SELECT_TARGET_AUDIENCE');
    }
  };

  const handleSubmit = async (values: FormValues) => {
    // Update the parent code state
    setCode(values.code);
    // Call the parent createReferralCode function
    setIsModalVisible(false);
    try {
      await createReferralCode({
        utm_source: values.channel || undefined,
        utm_medium: values.contentType || undefined,
        utm_campaign: values.demographic || undefined,
        utm_content:
          values.contentType === 'other' ? values.otherContentType : undefined,
        utm_term:
          values.targetAudience === 'other'
            ? values.otherTargetAudience
            : values.targetAudience,
        influencer: values.username || undefined,
        channel: values.channel || undefined,
      });
    } catch (error) {
      console.error('Error creating referral code:', error);
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
                  inputRange: [45, 95],
                  outputRange: ['45%', '95%'],
                }),
              },
            ]}
            className={clsx('bg-n20', {
              'rounded-t-[24px]': !isFullHeight,
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
                        onChangeText={handleChange('code')}
                        onBlur={handleBlur('code')}
                        autoFocus={false}
                        onFocus={() => setActiveInput('code')}
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

                        {/* Content Type */}
                        <CyDText className='font-bold text-[14px] mt-[24px] text-n200'>
                          {t('CONTENT_TYPE')}
                        </CyDText>

                        {values.contentType === 'other' ? (
                          <>
                            <CyDTextInput
                              ref={otherContentInputRef}
                              className='border border-n40 rounded-[8px] p-[12px] bg-n0 mt-[4px]'
                              placeholder={t('SPECIFY_OTHER_CONTENT_TYPE')}
                              value={values.otherContentType}
                              onChangeText={handleChange('otherContentType')}
                              onBlur={handleBlur('otherContentType')}
                              onFocus={() => setActiveInput('otherContentType')}
                            />
                            {touched.otherContentType &&
                              errors.otherContentType && (
                                <CyDText className='text-red-500 text-[12px] mt-[4px]'>
                                  {errors.otherContentType}
                                </CyDText>
                              )}
                          </>
                        ) : (
                          <CyDView>
                            {/* Dropdown Trigger */}
                            <CyDTouchView
                              className='border border-n40 rounded-[8px] p-[12px] mt-[4px]'
                              onPress={() => {
                                setShowContentTypeDropdown(
                                  !showContentTypeDropdown,
                                );
                                setShowTargetAudienceDropdown(false);
                              }}>
                              <CyDView className='flex-row justify-between items-center'>
                                <CyDText className='text-[14px] text-n200'>
                                  {getContentTypeDisplayText(
                                    values.contentType,
                                    values.otherContentType,
                                  )}
                                </CyDText>
                                <CyDMaterialDesignIcons
                                  name={
                                    showContentTypeDropdown
                                      ? 'chevron-up'
                                      : 'chevron-down'
                                  }
                                  size={20}
                                  className='text-n200'
                                />
                              </CyDView>
                            </CyDTouchView>

                            {/* Dropdown Options */}
                            {showContentTypeDropdown && (
                              <CyDView className='bg-n0 border border-n40 rounded-b-[8px] border-t-0 z-10'>
                                {Object.entries(CONTENT_TYPES).map(
                                  ([value, label]) => (
                                    <CyDTouchView
                                      key={value}
                                      className='p-[12px] border-b border-b-n40'
                                      onPress={() => {
                                        void setFieldValue(
                                          'contentType',
                                          value,
                                        );
                                        if (value === 'other') {
                                          setTimeout(() => {
                                            if (otherContentInputRef.current) {
                                              otherContentInputRef.current.focus();
                                            }
                                            setActiveInput('otherContentType');
                                          }, 100);
                                        }
                                        setShowContentTypeDropdown(false);
                                      }}>
                                      <CyDText className='text-[14px] text-n200'>
                                        {label}
                                      </CyDText>
                                    </CyDTouchView>
                                  ),
                                )}
                              </CyDView>
                            )}
                          </CyDView>
                        )}

                        {/* Region - text input */}
                        <CyDText className='font-bold text-[14px] mt-[24px] text-n200'>
                          {t('REGION')}
                        </CyDText>

                        <CyDTextInput
                          ref={demographicInputRef}
                          className='border border-n40 rounded-[8px] p-[12px] bg-n0 mt-[4px]'
                          placeholder={t('REGION_PLACEHOLDER')}
                          value={values.demographic}
                          onChangeText={handleChange('demographic')}
                          onBlur={handleBlur('demographic')}
                          onFocus={() => setActiveInput('demographic')}
                        />
                        <CyDText className='text-[#6b7280] text-[12px] mt-[4px]'>
                          {t('REGION_EXAMPLE')}
                        </CyDText>

                        {/* Target Audience */}
                        <CyDText className='font-bold text-[14px] mt-[24px] text-n200'>
                          {t('TARGET_AUDIENCE')}
                        </CyDText>

                        {values.targetAudience === 'other' ? (
                          <>
                            <CyDTextInput
                              ref={otherTargetAudienceInputRef}
                              className='border border-n40 rounded-[8px] p-[12px] bg-n0 mt-[4px]'
                              placeholder={t('SPECIFY_OTHER_TARGET_AUDIENCE')}
                              value={values.otherTargetAudience}
                              onChangeText={handleChange('otherTargetAudience')}
                              onBlur={handleBlur('otherTargetAudience')}
                              onFocus={() =>
                                setActiveInput('otherTargetAudience')
                              }
                            />
                            {touched.otherTargetAudience &&
                              errors.otherTargetAudience && (
                                <CyDText className='text-red-500 text-[12px] mt-[4px]'>
                                  {errors.otherTargetAudience}
                                </CyDText>
                              )}
                          </>
                        ) : (
                          <CyDView>
                            {/* Dropdown Trigger */}
                            <CyDTouchView
                              className='border border-n40 rounded-[8px] p-[12px] mt-[4px]'
                              onPress={() => {
                                setShowTargetAudienceDropdown(
                                  !showTargetAudienceDropdown,
                                );
                                setShowContentTypeDropdown(false);
                              }}>
                              <CyDView className='flex-row justify-between items-center'>
                                <CyDText className='text-[14px] text-n200'>
                                  {getTargetAudienceDisplayText(
                                    values.targetAudience,
                                    values.otherTargetAudience,
                                  )}
                                </CyDText>
                                <CyDMaterialDesignIcons
                                  name={
                                    showTargetAudienceDropdown
                                      ? 'chevron-up'
                                      : 'chevron-down'
                                  }
                                  size={20}
                                  className='text-n200'
                                />
                              </CyDView>
                            </CyDTouchView>

                            {/* Dropdown Options */}
                            {showTargetAudienceDropdown && (
                              <CyDView className='bg-n0 border border-n40 rounded-b-[8px] border-t-0 z-10'>
                                {Object.entries(TARGET_AUDIENCES).map(
                                  ([value, label]) => (
                                    <CyDTouchView
                                      key={value}
                                      className='p-[12px] border-b border-b-n40'
                                      onPress={() => {
                                        void setFieldValue(
                                          'targetAudience',
                                          value,
                                        );
                                        if (value === 'other') {
                                          setTimeout(() => {
                                            if (
                                              otherTargetAudienceInputRef.current
                                            ) {
                                              otherTargetAudienceInputRef.current.focus();
                                            }
                                            setActiveInput(
                                              'otherTargetAudience',
                                            );
                                          }, 100);
                                        }
                                        setShowTargetAudienceDropdown(false);
                                      }}>
                                      <CyDText className='text-[14px] text-n200'>
                                        {label}
                                      </CyDText>
                                    </CyDTouchView>
                                  ),
                                )}
                              </CyDView>
                            )}
                          </CyDView>
                        )}

                        <CyDText className='text-n200 text-[12px] mt-[12px]'>
                          {t('CUSTOM_ATTRIBUTION_INFO')}
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
