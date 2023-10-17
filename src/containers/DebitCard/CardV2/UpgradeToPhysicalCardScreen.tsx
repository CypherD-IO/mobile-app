import React, { memo, useEffect, useMemo, useState } from "react";
import { CyDFastImage, CyDImageBackground, CyDSafeAreaView, CyDScrollView, CyDText, CyDTextInput, CyDTouchView, CyDView } from "../../../styles/tailwindStyles";
import { Formik } from "formik";
import * as yup from 'yup';
import * as Sentry from '@sentry/react-native';
import AppImages from "../../../../assets/images/appImages";
import { StyleSheet } from "react-native";
import clsx from "clsx";
import { ICountry, IState } from "../../../models/cardApplication.model";
import ChooseCountryModal from "../../../components/v2/ChooseCountryModal";
import Button from "../../../components/v2/button";
import useAxios from "../../../core/HttpRequest";
import { useGlobalModalContext } from "../../../components/v2/GlobalModal";
import { useTranslation } from "react-i18next";
import { ButtonType } from "../../../constants/enum";
import { stateMaster } from "../../../../assets/datasets/stateMaster";
import ChooseStateFromCountryModal from "../../../components/v2/ChooseStateFromCountryModal";
import axios from "../../../core/Http";
import Loading from "../../../components/v2/loading";

const ShippingDetailsValidationSchema = yup.object().shape({
    phoneNumber: yup.string(),
    line1: yup.string().required('Address line 1 is required'),
    line2: yup.string(),
    city: yup.string().required('City is required'),
    postalCode: yup.string().required('Postal code is required'),
    otp: yup.string().required('OTP is required'),
});

const initialValues = {
    phoneNumber: '',
    line1: '',
    line2: '',
    city: '',
    postalCode: '',
    otp: '',
};

interface Props {
    route: {
        params: {
            currentCardProvider: string
        }
    }
}
const UpgradeToPhysicalCardScreen = ({ route }: Props) => {
    const { currentCardProvider } = route.params;

    const { postWithAuth } = useAxios();
    const { t } = useTranslation();
    const { showModal, hideModal } = useGlobalModalContext();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);
    const [otpHasBeenSent, setOtpHasBeenSent] = useState(false);
    const [selectCountryModalVisible, setSelectCountryModalVisible] = useState<boolean>(false);
    const [selectStateModalVisible, setSelectStateModalVisible] = useState<boolean>(false);
    const [selectCountryModalForDialCodeVisible, setSelectCountryModalForDialCodeVisible] = useState<boolean>(false);
    const [stateMasterData, setStateMasterData] = useState<IState[]>([]);
    const [selectedCountry, setSelectedCountry] = useState<ICountry>({
        name: 'United States',
        dialCode: '+1',
        flag: '🇺🇸',
        Iso2: 'US',
        Iso3: 'USA',
        currency: 'USD',
    });
    const [selectedCountryForDialCode, setSelectedCountryForDialCode] = useState<ICountry>({
        name: 'United States',
        dialCode: '+1',
        flag: '🇺🇸',
        Iso2: 'US',
        Iso3: 'USA',
        currency: 'USD',
    });

    const selectedCountryStates = useMemo(() => {
        return stateMasterData.filter(state => state.country_code === selectedCountry.Iso2);
    }, [selectedCountry.Iso2, stateMasterData]);

    const [selectedState, setSelectedState] = useState<IState>(selectedCountryStates[0]);

    // Initial fetching of stateMaster
    useEffect(() => {
        void getStateMaster();
    }, []);

    useEffect(() => {
        setSelectedState(selectedCountryStates[0]);
    }, [selectedCountryStates]);

    const getStateMaster = async () => {
        try {
            setLoading(true);
            const response = await axios.get('https://public.cypherd.io/js/stateMaster.js');
            if (response?.data) {
                const stateData = response.data;
                setStateMasterData(stateData);
            } else {
                setStateMasterData(stateMaster);
                const errorObject = {
                    response,
                    message: 'Response data was not undefined when trying to fetch stateMaster',
                };
                Sentry.captureException(errorObject);
            }
            setLoading(false);
        } catch (e) {
            setStateMasterData(stateMaster);
            const errorObject = {
                e,
                message: 'Error when trying to fetch stateMaster',
            };
            Sentry.captureException(errorObject);
            setLoading(false);
        }
    };

    const sendOtp = async () => {
        const path = `/v1/cards/${currentCardProvider}/generate/physical/otp`;

        const response = await postWithAuth(path, {});
        if (response.isError) {
            showModal(
                'state',
                {
                    type: 'error',
                    title: t('OTP_TRIGGER_FAILED'),
                    description: t('OTP_TRIGGER_FAILED_TEXT'),
                    onSuccess: hideModal,
                    onFailure: hideModal,
                }
            );
        } else {
            setOtpHasBeenSent(true);
        }
    };

    const onSubmit = async (values: typeof initialValues) => {
        setIsSubmitting(true);
        const phoneNumber = selectedCountryForDialCode.dialCode + values.phoneNumber;
        const data: Record<string, string | number> = {
            country: selectedCountry.Iso2,
            line1: values.line1,
            line2: values.line2,
            city: values.city,
            state: selectedState.name,
            postalCode: values.postalCode,
        };

        if (values.phoneNumber) {
            data.phoneNumber = phoneNumber;
        }
        if (values.otp.length === 4) {
            data.otp = Number(values.otp);
        }

        try {
            const response = await postWithAuth(`/v1/cards/${currentCardProvider}/generate/physical`, data);
            if (!response.isError) {
                console.log(response);
                showModal(
                    'state',
                    {
                        type: 'success',
                        title: t('SUCCESS'),
                        description: t('PHYSICAL_CARD_UPGRADE_SUBMISSION_SUCCESS_TEXT'),
                        onSuccess: hideModal,
                        onFailure: hideModal,
                    }
                );
            } else {
                const errorObject = {
                    response,
                    currentCardProvider,
                    data,
                    message: 'isError=true when trying to submit physical card upgrade infomation.'
                };
                showModal(
                    'state',
                    {
                        type: 'error',
                        title: t('FAILURE'),
                        description: t('PHYSICAL_CARD_UPGRADE_SUBMISSION_FAILURE_TEXT'),
                        onSuccess: hideModal,
                        onFailure: hideModal,
                    }
                );
                console.log(errorObject);
            }
            setIsSubmitting(false);
        } catch (e) {
            const errorObject = {
                e,
                currentCardProvider,
                data,
                message: 'Error when trying to submit physical card upgrade infomation.'
            };
            showModal(
                'state',
                {
                    type: 'error',
                    title: t('FAILURE'),
                    description: t('PHYSICAL_CARD_UPGRADE_SUBMISSION_FAILURE_TEXT'),
                    onSuccess: hideModal,
                    onFailure: hideModal,
                }
            );
            console.log(errorObject);
            setIsSubmitting(false);
        }
    };
    return (
        <CyDSafeAreaView className="bg-white flex-1">
            <ChooseCountryModal
                isModalVisible={selectCountryModalVisible}
                setModalVisible={setSelectCountryModalVisible}
                selectedCountryState={[selectedCountry, setSelectedCountry]}
            />
            <ChooseCountryModal
                isModalVisible={selectCountryModalForDialCodeVisible}
                setModalVisible={setSelectCountryModalForDialCodeVisible}
                selectedCountryState={[selectedCountryForDialCode, setSelectedCountryForDialCode]}
            />
            <ChooseStateFromCountryModal
                isModalVisible={selectStateModalVisible}
                setModalVisible={setSelectStateModalVisible}
                selectedCountry={selectedCountry}
                selectedCountryStates={selectedCountryStates}
                selectedStateState={[selectedState, setSelectedState]}
            />
            <Formik
                initialValues={initialValues}
                validationSchema={ShippingDetailsValidationSchema}
                onSubmit={onSubmit}
            >
                {({ values, errors, handleBlur, handleChange, handleSubmit }) => (
                    <CyDImageBackground className='h-full w-full' source={AppImages.CARD_KYC_BACKGROUND} resizeMode='cover' imageStyle={styles.imageBackground}>
                        {loading
                            ? <Loading /> :
                            <CyDScrollView className="h-full w-full">
                                <CyDText className='font-medium text-center my-[4px] p-[8px]'>{t('ADD_SHIPPING_DETAILS_SUBTEXT')}</CyDText>
                                <CyDText className='font-bold mx-[20px]'>{t('COUNTRY_INIT_CAPS')}</CyDText>
                                <CyDTouchView
                                    className={
                                        'bg-white h-[50px] border border-inputBorderColor py-[5px] px-[10px] mx-[20px] rounded-[8px] flex flex-row justify-between items-center'
                                    }
                                    onPress={() => setSelectCountryModalVisible(true)}
                                >
                                    <CyDView
                                        className={clsx(
                                            'flex flex-row justify-between items-center',
                                            { 'border-redOffColor': !selectedCountry }
                                        )}
                                    >
                                        <CyDView className={'flex flex-row items-center'}>
                                            <CyDText className='text-center text-[18px] ml-[8px]'>
                                                {selectedCountry.flag}
                                            </CyDText>
                                            <CyDText className='text-center text-[18px] ml-[8px]'>
                                                {selectedCountry.name}
                                            </CyDText>
                                        </CyDView>
                                    </CyDView>
                                    <CyDFastImage className='h-[12px] w-[12px]' source={AppImages.DOWN_ARROW} resizeMode='contain' />
                                </CyDTouchView>
                                <CyDText className='font-bold mx-[20px] mt-[20px]'>{t('PHONE_NUMBER_INIT_CAPS')}</CyDText>
                                <CyDView
                                    className={
                                        'bg-white h-[50px] border border-inputBorderColor py-[5px] px-[10px] mx-[20px] rounded-[8px] flex flex-row justify-between items-center'
                                    }

                                >
                                    <CyDView
                                        className={clsx(
                                            'flex flex-row justify-between items-center',
                                            { 'border-redOffColor': !selectedCountryForDialCode }
                                        )}
                                    >
                                        <CyDTouchView
                                            onPress={() => setSelectCountryModalForDialCodeVisible(true)}
                                            className={'flex w-[20%] flex-row items-center'}>
                                            <CyDText
                                                className={
                                                    'text-center text-[16px] mx-[4px]'
                                                }
                                            >
                                                {selectedCountryForDialCode.dialCode}
                                            </CyDText>
                                            <CyDFastImage className='h-[12px] w-[12px]' source={AppImages.DOWN_ARROW} resizeMode='contain' />
                                        </CyDTouchView>
                                        <CyDTextInput
                                            className="h-full w-[80%] text-[16px] border-l px-[20px] border-inputBorderColor"
                                            inputMode='tel'
                                            onChangeText={handleChange('phoneNumber')}
                                            onBlur={handleBlur('phoneNumber')}
                                            value={values.phoneNumber}
                                        />
                                    </CyDView>
                                </CyDView>
                                <CyDView className="mx-[20px] mt-[20px] flex flex-row items-center">
                                    <CyDText className='font-bold pr-[4px]'>{t('ADDRESS_LINE_1_INIT_CAPS')}</CyDText>
                                    <CyDText className='font-medium pl-[4px] text-[12px] text-redCyD'>{errors.line1 ?? ''}</CyDText>
                                </CyDView>
                                <CyDView
                                    className={
                                        'bg-white h-[50px] border border-inputBorderColor py-[5px] px-[10px] mx-[20px] rounded-[8px] flex flex-row justify-between items-center'
                                    }

                                >
                                    <CyDView
                                        className='flex flex-row justify-between items-center'
                                    >
                                        <CyDTextInput
                                            className="h-full w-[100%] text-[16px]"
                                            inputMode='text'
                                            placeholder="Line #1"
                                            onChangeText={handleChange('line1')}
                                            onBlur={handleBlur('line1')}
                                            value={values.line1}
                                        />
                                    </CyDView>
                                </CyDView>
                                <CyDText className='font-bold mx-[20px] mt-[20px]'>{t('ADDRESS_LINE_2_INIT_CAPS')}</CyDText>
                                <CyDView
                                    className={
                                        'bg-white h-[50px] border border-inputBorderColor py-[5px] px-[10px] mx-[20px] rounded-[8px] flex flex-row justify-between items-center'
                                    }

                                >
                                    <CyDView
                                        className='flex flex-row justify-between items-center'
                                    >
                                        <CyDTextInput
                                            className="h-full w-[100%] text-[16px]"
                                            inputMode='text'
                                            placeholder="Line #2"
                                            onChangeText={handleChange('line2')}
                                            onBlur={handleBlur('line2')}
                                            value={values.line2}
                                        />
                                    </CyDView>
                                </CyDView>
                                <CyDView className="mx-[20px] mt-[20px] flex flex-row items-center">
                                    <CyDText className='font-bold pr-[4px]'>{t('CITY_INIT_CAPS')}</CyDText>
                                    <CyDText className='font-medium pl-[4px] text-[12px] text-redCyD'>{errors.city ?? ''}</CyDText>
                                </CyDView>
                                <CyDView
                                    className={
                                        'bg-white h-[50px] border border-inputBorderColor py-[5px] px-[10px] mx-[20px] rounded-[8px] flex flex-row justify-between items-center'
                                    }

                                >
                                    <CyDView
                                        className='flex flex-row justify-between items-center'
                                    >
                                        <CyDTextInput
                                            className="h-full w-[100%] text-[16px]"
                                            inputMode='text'
                                            placeholder="City"
                                            onChangeText={handleChange('city')}
                                            onBlur={handleBlur('city')}
                                            value={values.city}
                                        />
                                    </CyDView>
                                </CyDView>
                                <CyDText className='font-bold mt-[20px] mx-[20px]'>{t('STATE_INIT_CAPS')}</CyDText>
                                <CyDTouchView
                                    className={
                                        'bg-white h-[50px] border border-inputBorderColor py-[5px] px-[10px] mx-[20px] rounded-[8px] flex flex-row justify-between items-center'
                                    }
                                    onPress={() => setSelectStateModalVisible(true)}
                                >
                                    <CyDView
                                        className={clsx(
                                            'flex flex-row justify-between items-center',
                                            { 'border-redOffColor': !selectedState }
                                        )}
                                    >
                                        <CyDView className={'flex flex-row items-center'}>
                                            <CyDText
                                                className={
                                                    'text-center text-black font-nunito text-[18px] ml-[8px]'
                                                }
                                            >
                                                {selectedState.name}
                                            </CyDText>
                                        </CyDView>
                                    </CyDView>
                                    <CyDFastImage className='h-[12px] w-[12px]' source={AppImages.DOWN_ARROW} resizeMode='contain' />
                                </CyDTouchView>
                                <CyDView className="mx-[20px] mt-[20px] flex flex-row items-center">
                                    <CyDText className='font-bold pr-[4px]'>{t('ZIPCODE_INIT_CAPS')}</CyDText>
                                    <CyDText className='font-medium pl-[4px] text-[12px] text-redCyD'>{errors.postalCode ?? ''}</CyDText>
                                </CyDView>
                                <CyDView
                                    className={
                                        'bg-white h-[50px] border border-inputBorderColor py-[5px] px-[10px] mx-[20px] rounded-[8px] flex flex-row justify-between items-center'
                                    }

                                >
                                    <CyDView
                                        className='flex flex-row justify-between items-center'
                                    >
                                        <CyDTextInput
                                            className="h-full w-[100%] text-[16px]"
                                            inputMode='text'
                                            placeholder="000000"
                                            onChangeText={handleChange('postalCode')}
                                            onBlur={handleBlur('postalCode')}
                                            value={values.postalCode}
                                        />
                                    </CyDView>
                                </CyDView>
                                <CyDText className='font-bold mx-[20px] my-[10px]'>{t('SEND_OTP_TEXT')}</CyDText>
                                <Button style='w-[30%] p-[0px] h-[30px] mx-[20px]' onPress={() => {
                                    void sendOtp();
                                }} type={ButtonType.PRIMARY} title={t('SEND_OTP')} titleStyle='text-[12px]' />
                                <CyDView className="mx-[20px] mt-[20px] flex flex-row items-center">
                                    <CyDText className='font-bold pr-[4px]'>{t('ENTER_OTP')}</CyDText>
                                    <CyDText className='font-medium pl-[4px] text-[12px] text-redCyD'>{errors.otp ?? ''}</CyDText>
                                </CyDView>
                                <CyDView
                                    className={
                                        clsx('bg-white h-[50px] border border-inputBorderColor py-[5px] px-[10px] mx-[20px] rounded-[8px] flex flex-row justify-between items-center', { 'opacity-40 bg-slate-200': !otpHasBeenSent })
                                    }
                                >
                                    <CyDView
                                        className='flex flex-row justify-between items-center'
                                    >
                                        <CyDTextInput
                                            className='h-full w-[100%] text-[16px]'
                                            editable={otpHasBeenSent}
                                            inputMode='numeric'
                                            placeholder="0000"
                                            onChangeText={handleChange('otp')}
                                            onBlur={handleBlur('otp')}
                                            value={values.otp}
                                        />
                                    </CyDView>
                                </CyDView>
                                <Button loading={isSubmitting} onPress={handleSubmit} style='h-[60px] w-full rounded-[0px] mt-[20px]' title='Submit' />
                            </CyDScrollView>
                        }
                    </CyDImageBackground>
                )}
            </Formik>
        </CyDSafeAreaView>
    );
};

const styles = StyleSheet.create({
    imageBackground: {
        opacity: 0.04,
    },
});

export default memo(UpgradeToPhysicalCardScreen);