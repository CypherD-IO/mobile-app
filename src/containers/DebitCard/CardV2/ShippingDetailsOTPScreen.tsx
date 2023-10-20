import React, { memo, useContext, useEffect, useState } from "react";
import { CyDImageBackground, CyDSafeAreaView, CyDText, CyDTouchView, CyDView } from "../../../styles/tailwindStyles";
import * as Sentry from '@sentry/react-native';
import AppImages from "../../../../assets/images/appImages";
import { StyleSheet } from "react-native";
import useAxios from "../../../core/HttpRequest";
import { useGlobalModalContext } from "../../../components/v2/GlobalModal";
import { useTranslation } from "react-i18next";
import OtpInput from "../../../components/v2/OTPInput";
import Loading from "../../../components/v2/loading";
import LottieView from 'lottie-react-native';
import { MODAL_HIDE_TIMEOUT_250 } from "../../../core/Http";
import { screenTitle } from "../../../constants";
import { getWalletProfile } from "../../../core/card";
import { GlobalContext } from "../../../core/globalContext";
import { GlobalContextType } from "../../../constants/enum";
import { CardProfile } from "../../../models/cardProfile.model";

interface Props {
    navigation: any
    route: {
        params: {
            currentCardProvider: string
            shippingDetails: {
                country: string
                phoneNumber: string
                line1: string
                line2: string
                city: string
                state: string
                postalCode: string
            };
        }
    }
}

const RESENT_OTP_TIME = 30;


const ShippingDetailsOTPScreen = ({ navigation, route }: Props) => {
    const { currentCardProvider, shippingDetails } = route.params;

    const { postWithAuth } = useAxios();
    const { t } = useTranslation();
    const { showModal, hideModal } = useGlobalModalContext();

    const globalContext = useContext(GlobalContext);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [sendingOTP, setSendingOTP] = useState(false);
    const [resendInterval, setResendInterval] = useState(0);
    const [timer, setTimer] = useState<NodeJS.Timer>();

    useEffect(() => {
        void triggerOtp();
    }, []);

    useEffect(() => {
        if (resendInterval === 0) {
            clearInterval(timer);
        }
    }, [resendInterval]);


    const resendOTP = async () => {
        setSendingOTP(true);
        const otpTriggered = await triggerOtp();
        if (otpTriggered) {
            let resendTime = RESENT_OTP_TIME;
            setTimer(setInterval(() => { resendTime--; setResendInterval(resendTime); }, 1000));
        }
        setSendingOTP(false);
    };

    const onSuccessForModals = () => {
        hideModal();
        setTimeout(() => {
            navigation.navigate(screenTitle.DEBIT_CARD_SCREEN);
        }, MODAL_HIDE_TIMEOUT_250);
    };

    const triggerOtp = async () => {
        const path = `/v1/cards/${currentCardProvider}/generate/physical/otp`;

        try {
            const response = await postWithAuth(path, {});
            if (!response.isError) {
                return !response.isError;
            } else {
                const errorObject = {
                    response,
                    shippingDetails,
                    currentCardProvider,
                    message: 'isError=true when trying to sendOtp in ShippingDetailsOTPScreen.',
                };
                Sentry.captureException(errorObject);
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
            }
        } catch (e) {
            const errorObject = {
                e,
                shippingDetails,
                currentCardProvider,
                message: 'Error caught when trying to sendOtp in ShippingDetailsOTPScreen.',
            };
            Sentry.captureException(errorObject);
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
        }
    };

    const onOTPEntry = async (otp: string) => {
        setIsSubmitting(true);
        const data: Record<string, string | number> = {
            ...shippingDetails,
        };

        if (otp.length === 4) {
            data.otp = Number(otp);
        }

        try {
            const response = await postWithAuth(`/v1/cards/${currentCardProvider}/generate/physical`, data);
            if (!response.isError) {
                if (globalContext?.globalState.token) {
                    const cardProfile: CardProfile = await getWalletProfile(globalContext.globalState.token);
                    globalContext.globalDispatch({ type: GlobalContextType.CARD_PROFILE, cardProfile });
                } else {
                    const errorObject = {
                        response,
                    };
                    Sentry.captureException(errorObject);
                }
                showModal(
                    'state',
                    {
                        type: 'success',
                        title: t('SUCCESS'),
                        description: t('PHYSICAL_CARD_UPGRADE_SUBMISSION_SUCCESS_TEXT'),
                        onSuccess: onSuccessForModals,
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
                        onSuccess: onSuccessForModals,
                        onFailure: hideModal,
                    }
                );
                Sentry.captureException(errorObject);
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
                    onSuccess: onSuccessForModals,
                    onFailure: hideModal,
                }
            );
            Sentry.captureException(errorObject);
            setIsSubmitting(false);
        }
    };

    return (
        <CyDSafeAreaView className="flex-1 bg-white">
            <CyDImageBackground source={AppImages.CARD_KYC_BACKGROUND} imageStyle={styles.imageBackground} className={'h-full bg-white px-[20px] pt-[10px]'}>
                <CyDText className={'text-[25px] font-extrabold'}>{t<string>('ENTER_AUTHENTICATION_CODE')}</CyDText>
                <CyDText className={'text-[15px] font-bold'}>{t<string>('CARD_SENT_OTP')}</CyDText>
                <CyDView>
                    {!isSubmitting && <CyDView className={'mt-[15%]'}>
                        <OtpInput pinCount={4} getOtp={(otp) => {
                            void onOTPEntry(otp);
                        }} />
                        <CyDTouchView className={'flex flex-row items-center mt-[15%]'} disabled={sendingOTP || resendInterval !== 0} onPress={() => { void resendOTP(); }}>
                            <CyDText className={'font-bold underline decoration-solid underline-offset-4'}>{t<string>('RESEND_CODE_INIT_CAPS')}</CyDText>
                            {sendingOTP && <LottieView source={AppImages.LOADER_TRANSPARENT}
                                autoPlay
                                loop
                                style={styles.lottie}
                            />}
                            {resendInterval !== 0 && <CyDText>{String(` in ${resendInterval} sec`)}</CyDText>}
                        </CyDTouchView>
                    </CyDView>}
                    {isSubmitting && <Loading />}
                </CyDView>
            </CyDImageBackground>
        </CyDSafeAreaView>
    );
};

const styles = StyleSheet.create({
    imageBackground: {
        opacity: 0.04,
    },
    lottie: {
        height: 25
    }
});

export default memo(ShippingDetailsOTPScreen);