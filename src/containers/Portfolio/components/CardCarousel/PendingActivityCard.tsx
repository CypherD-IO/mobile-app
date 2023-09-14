import React, { memo, useMemo } from "react";
import { CyDFastImage, CyDText, CyDView } from "../../../../styles/tailwindStyles";
import { useTranslation } from "react-i18next";
import AppImages from "../../../../../assets/images/appImages";
import { ActivityStatus, ActivityType } from "../../../../reducers/activity_reducer";
import { formatAmount } from "../../../../core/util";
import clsx from "clsx";
import { ALL_CHAINS } from "../../../../constants/server";

interface PendingActivityCardProps {
    type: ActivityType
    status: ActivityStatus
    bridgePayload?: {
        fromChain: string
        fromSymbol: string
        fromTokenAmount: string
        toChain: string
        toSymbol: string
        toTokenAmount: string
    }
    cardPayload?: {
        amount: string
        amountInUsd: string
        tokenSymbol: string
    }
}

const PendingActivityCard = ({ type, status, bridgePayload, cardPayload }: PendingActivityCardProps) => {
    const { t } = useTranslation();
    const CardBody = useMemo(() => {
        if (type === ActivityType.BRIDGE && bridgePayload) {
            const { fromChain, fromSymbol, fromTokenAmount, toChain, toSymbol, toTokenAmount } = bridgePayload;
            const fromChainlogo = ALL_CHAINS.find(chain => chain.name === fromChain)?.logo_url;
            const toChainlogo = ALL_CHAINS.find(chain => chain.name === toChain)?.logo_url;
            return <>
                <CyDView>
                    <CyDView className='flex flex-row justify-center items-end gap-[3px]'>
                        <CyDText className='font-bold text-[20px]'>{formatAmount(fromTokenAmount, 1)}</CyDText>
                        <CyDText className='font-medium text-[14px] mb-[2px]'>{fromSymbol}</CyDText>
                    </CyDView>
                    <CyDView className='flex flex-row justify-center items-end gap-[3px]'>
                        <CyDFastImage className='h-[22px] w-[22px]' source={fromChainlogo} resizeMode='contain' />
                        <CyDText className='font-medium text-[14px] mb-[2px]'>{fromChain}</CyDText>
                    </CyDView>
                </CyDView>
                <CyDView>
                    <CyDFastImage className='h-[32px] w-[32px]' source={AppImages.APP_SEL} resizeMode='contain' />
                </CyDView>
                <CyDView>
                    <CyDView className='flex flex-row justify-center items-end gap-[3px]'>
                        <CyDText className='font-bold text-[20px]'>{formatAmount(toTokenAmount, 1)}</CyDText>
                        <CyDText className='font-medium text-[14px] mb-[2px]'>{toSymbol}</CyDText>
                    </CyDView>
                    <CyDView className='flex flex-row justify-center items-end gap-[3px]'>
                        <CyDFastImage className='h-[22px] w-[22px]' source={toChainlogo} resizeMode='contain' />
                        <CyDText className='font-medium text-[14px] mb-[2px]'>{toChain}</CyDText>
                    </CyDView>
                </CyDView>
            </>;
        } else if (type === ActivityType.CARD && cardPayload) {
            const { amount, amountInUsd, tokenSymbol } = cardPayload;
            return <>
                <CyDFastImage className={'h-full w-[150px]'} source={AppImages.CARD} resizeMode="cover" />
                <CyDView>
                    <CyDView className='flex flex-row justify-center items-end gap-[3px]'>
                        <CyDText className='font-bold text-[20px]'>{formatAmount(amountInUsd, 2)}</CyDText>
                        <CyDText className='font-medium text-[14px] mb-[2px]'>{`USD`}</CyDText>
                    </CyDView>
                    <CyDView className='flex flex-row justify-center items-end gap-[3px]'>
                        <CyDText className='font-bold text-[20px]'>{formatAmount(amount, 2)}</CyDText>
                        <CyDText className='font-medium text-[14px] mb-[2px]'>{tokenSymbol}</CyDText>
                    </CyDView>
                </CyDView>
            </>;
        } else {
            return null;
        }
    }, [type, bridgePayload, cardPayload]);

    return (
        <CyDView className='flex w-full border border-sepratorColor overflow-hidden rounded-[25px]'>
            <CyDView className='h-[75%] w-full flex flex-row justify-evenly items-center '>
                {CardBody}
            </CyDView>
            <CyDView className={clsx('h-[25%] w-full bg-privacyMessageBackgroundColor justify-center px-[30px]', { 'bg-toastColor': status === ActivityStatus.SUCCESS })}>
                <CyDText className='font-bold text-[12px]'>{t(`${type.toUpperCase()}_ACTIVITY`)}</CyDText>
            </CyDView>
        </CyDView>
    );
};

export default memo(PendingActivityCard);