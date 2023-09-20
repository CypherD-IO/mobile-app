import React, { memo, useMemo } from "react";
import { CyDFastImage, CyDText, CyDTouchView, CyDView } from "../../../../styles/tailwindStyles";
import { useTranslation } from "react-i18next";
import AppImages from "../../../../../assets/images/appImages";
import { ActivityStatus, ActivityType } from "../../../../reducers/activity_reducer";
import { formatAmount } from "../../../../core/util";
import clsx from "clsx";
import { ALL_CHAINS } from "../../../../constants/server";
import CyDTokenValue from "../../../../components/v2/tokenValue";
import { useNavigation } from "@react-navigation/native";
import { screenTitle } from "../../../../constants";
import { getDismissedActivityCardIDs, setDismissedActivityCardIDs } from "../../../../core/asyncStorage";

interface ActivityCardProps {
    dacSetter: React.Dispatch<React.SetStateAction<string[]>>
    id: string
    dateTime: Date
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

const ActivityCard = ({ dacSetter, id, dateTime, type, status, bridgePayload, cardPayload }: ActivityCardProps) => {
    const { t } = useTranslation();
    const navigation = useNavigation();
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
                        <CyDTokenValue className='text-[24px] font-extrabold text-primaryTextColor'>
                            {amountInUsd}
                        </CyDTokenValue>
                    </CyDView>
                    <CyDView className='flex flex-row justify-center items-end gap-[3px]'>
                        <CyDText className='font-bold text-[16px]'>{formatAmount(amount, 2)}</CyDText>
                        <CyDText className='font-medium text-[12px] mb-[2px]'>{tokenSymbol}</CyDText>
                    </CyDView>
                </CyDView>
            </>;
        } else {
            return null;
        }
    }, [type, bridgePayload, cardPayload]);


    const addNewDismissedCard = async () => {
        const dismissedActivityCardsFromAS = await getDismissedActivityCardIDs();
        const parsedAC = dismissedActivityCardsFromAS ? JSON.parse(dismissedActivityCardsFromAS) : [];
        console.log("🚀 ~ file: ActivityCard.tsx:93 ~ addNewDismissedCard ~ parsedAC:", parsedAC);
        const newDismissedAC = !parsedAC.includes(`${id}|${dateTime.toISOString()}`) ? [...parsedAC, `${id}|${dateTime.toISOString()}`] : parsedAC;
        await setDismissedActivityCardIDs(newDismissedAC);
        console.log("🚀 ~ file: ActivityCard.tsx:96 ~ addNewDismissedCard ~ newDismissedAC:", newDismissedAC);
        dacSetter(newDismissedAC.map((nDA: string) => nDA.split('|')[0]));
    };

    return (
        <CyDView className='flex flex-row h-full w-full'>
            <CyDTouchView className='h-full border border-sepratorColor overflow-hidden rounded-[8px]' onPress={() => {
                navigation.navigate(screenTitle.ACTIVITIES);
            }}>
                <CyDView className='h-[75%] w-full flex flex-row justify-evenly items-center '>
                    {CardBody}
                </CyDView>
                <CyDView className={clsx('h-[25%] w-full bg-privacyMessageBackgroundColor justify-center px-[30px]', { 'bg-toastColor': status === ActivityStatus.SUCCESS, 'bg-redColor': status === ActivityStatus.FAILED })}>
                    <CyDText className='font-bold text-[12px]'>{t(`${type.toUpperCase()}_ACTIVITY`)}</CyDText>
                </CyDView>
            </CyDTouchView>
            <CyDTouchView onPress={() => {
                void addNewDismissedCard();
            }} className='absolute top-[-4px] right-[-4px] h-[20px] w-[20px] justify-center items-center bg-white border border-sepratorColor rounded-full overflow-hidden p-[3px]'>
                <CyDFastImage source={AppImages.CLOSE} className="h-[8px] w-[8px]" resizeMode="contain" />
            </CyDTouchView>
        </CyDView>
    );
};

export default memo(ActivityCard);