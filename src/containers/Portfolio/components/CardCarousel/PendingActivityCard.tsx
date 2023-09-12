import React, { memo } from "react";
import { PendingActivityType } from "../../../../constants/enum";
import { CyDFastImage, CyDText, CyDView } from "../../../../styles/tailwindStyles";
import { useTranslation } from "react-i18next";
import AppImages from "../../../../../assets/images/appImages";

interface PendingActivityCardProps {
    pendingActivityType: PendingActivityType
}

const PendingActivityCard = ({ pendingActivityType }: PendingActivityCardProps) => {
    const { t } = useTranslation();
    const isBridge = pendingActivityType === PendingActivityType.BRIDGE;
    const ACTIVITY_IMAGE = isBridge ? AppImages.APP_SEL : AppImages.CARD_SEL;
    return (
        <CyDView className='flex w-full border border-sepratorColor overflow-hidden rounded-[25px]'>
            <CyDView className='h-[75%] w-full flex flex-row justify-evenly items-center '>
                <CyDView>
                    <CyDView className='flex flex-row justify-center items-end gap-[3px]'>
                        <CyDText className='font-bold text-[24px]'>{'1.00'}</CyDText>
                        <CyDText className='font-medium text-[14px] mb-[2px]'>{'EVM'}</CyDText>
                    </CyDView>
                    <CyDView className='flex flex-row justify-center items-end gap-[3px]'>
                        <CyDFastImage className='h-[22px] w-[22px]' source={AppImages.EVMOS_LOGO} resizeMode='contain' />
                        <CyDText className='font-medium text-[14px] mb-[2px]'>{'Evmos'}</CyDText>
                    </CyDView>
                </CyDView>
                {
                    isBridge ? <>
                        <CyDView>
                            <CyDFastImage className='h-[32px] w-[32px]' source={ACTIVITY_IMAGE} resizeMode='contain' />
                        </CyDView>
                        <CyDView>
                            <CyDView className='flex flex-row justify-center items-end gap-[3px]'>
                                <CyDText className='font-bold text-[24px]'>{'1920'}</CyDText>
                                <CyDText className='font-medium text-[14px] mb-[2px]'>{'ATOM'}</CyDText>
                            </CyDView>
                            <CyDView className='flex flex-row justify-center items-end gap-[3px]'>
                                <CyDFastImage className='h-[22px] w-[22px]' source={AppImages.COSMOS_LOGO} resizeMode='contain' />
                                <CyDText className='font-medium text-[14px] mb-[2px]'>{'ATOM'}</CyDText>
                            </CyDView>
                        </CyDView>
                    </>
                        :
                        <CyDFastImage className={'h-full w-[150px]'} source={AppImages.CARD} resizeMode="cover" />
                }
            </CyDView>
            <CyDView className='h-[25%] w-full bg-privacyMessageBackgroundColor justify-center px-[30px]'>
                <CyDText className='font-bold text-[12px]'>{t('PENDING_ACTIVITY')}</CyDText>
            </CyDView>
        </CyDView>
    );
};

export default memo(PendingActivityCard);