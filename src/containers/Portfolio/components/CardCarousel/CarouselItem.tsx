import { Extrapolation, SharedValue, interpolate, useAnimatedStyle } from "react-native-reanimated";
import { CyDAnimatedView, CyDFastImage, CyDImageBackground, CyDText, CyDTouchView, CyDView } from "../../../../styles/tailwindStyles";
import React, { memo, useMemo } from "react";
import { BannerRecord } from "../../../../models/bannerRecord.interface";
import { BridgeOrCardActivity } from ".";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { ALL_CHAINS } from "../../../../constants/server";
import { ActivityStatus, ActivityType, DebitCardTransaction, ExchangeTransaction } from "../../../../reducers/activity_reducer";
import { formatAmount } from "../../../../core/util";
import AppImages from "../../../../../assets/images/appImages";
import CyDTokenValue from "../../../../components/v2/tokenValue";
import { screenTitle } from "../../../../constants";
import clsx from "clsx";
import { getDismissedActivityCardIDs, getDismissedStaticCardIDs, setDismissedActivityCardIDs, setDismissedStaticCardIDs } from "../../../../core/asyncStorage";

interface CardCarouselItemProps {
    item: BannerRecord | BridgeOrCardActivity
    index: number
    boxWidth: number
    halfBoxDistance: number
    panX: SharedValue<number>
    setDismissedActivityCards: React.Dispatch<React.SetStateAction<string[]>>
    setDismissedStaticCards: React.Dispatch<React.SetStateAction<string[]>>
}
const CardCarouselItem = ({ item, index, boxWidth, halfBoxDistance, panX, setDismissedActivityCards, setDismissedStaticCards }: CardCarouselItemProps) => {
    const isActivity = 'transactionHash' in item;
    const { t } = useTranslation();
    const navigation = useNavigation();
    const animatedStyle = useAnimatedStyle(() => {
        const scale = interpolate(
            panX.value,
            [
                (index - 1) * boxWidth - halfBoxDistance,
                index * boxWidth - halfBoxDistance,
                (index + 1) * boxWidth - halfBoxDistance, // adjust positioning
            ],
            [0.85, 1, 0.85], // scale down when out of scope
            Extrapolation.CLAMP,
        );
        return {
            transform: [{ scale }]
        };
    });

    const onActivityCardDismissal = async () => {
        const { id, datetime } = item as BridgeOrCardActivity;
        const dismissedIDs = await getDismissedActivityCardIDs();
        const parsedIDs = dismissedIDs ? JSON.parse(dismissedIDs) : [];
        const updatedDismissedIDs = !parsedIDs.includes(`${id}|${datetime.toISOString()}`) ? [...parsedIDs, `${id}|${datetime.toISOString()}`] : parsedIDs;
        await setDismissedActivityCardIDs(updatedDismissedIDs);
        setDismissedActivityCards(updatedDismissedIDs.map((dismissedID: string) => dismissedID.split('|')[0]));
    };

    const onStaticCardDismissal = async () => {
        const { id, endDate } = item as BannerRecord;
        const dismissedIDs = await getDismissedStaticCardIDs();
        const parsedIDs = dismissedIDs ? JSON.parse(dismissedIDs) : [];
        const updatedDismissedIDs = !parsedIDs.includes(`${id}|${endDate}`) ? [...parsedIDs, `${id}|${endDate}`] : parsedIDs;
        await setDismissedStaticCardIDs(updatedDismissedIDs);
        setDismissedStaticCards(updatedDismissedIDs.map((dismissedID: string) => dismissedID.split('|')[0]));
    };

    const ItemBody = useMemo(() => {
        if (isActivity) {
            if (item.type === ActivityType.BRIDGE) {
                const { fromChain, fromSymbol, fromTokenAmount, toChain, toSymbol, toTokenAmount } = item as ExchangeTransaction;
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
            } else if (item.type === ActivityType.CARD) {
                const { amount, amountInUsd, tokenSymbol } = item as DebitCardTransaction;
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
        } else {
            const { title, description, bgImageURI } = item;
            if (bgImageURI) {
                return (
                    <CyDImageBackground className='w-full items-end' source={{ uri: bgImageURI }} resizeMode='cover'>
                        <CyDView className='h-full w-[75%] p-[10px] flex items-start justify-center'>
                            <CyDText className='text-[14px] font-bold'>{title}</CyDText>
                            <CyDText className='text-[14px] text-subTextColor font-medium'>{description}</CyDText>
                        </CyDView>
                    </CyDImageBackground>
                );
            } else {
                return (
                    <CyDView className='h-full w-full flex flex-col justify-center items-center bg-privacyMessageBackgroundColor'>
                        <CyDText className='text-[14px] font-bold'>{title}</CyDText>
                        <CyDText className='text-[14px] text-subTextColor font-medium'>{description}</CyDText>
                    </CyDView>
                );
            }
        }
    }, [isActivity, item]);


    return (
        <CyDAnimatedView className={'flex justify-center items-center'}
            style={[animatedStyle, { width: boxWidth }]}>
            <CyDView className='flex flex-row h-full w-full'>
                <CyDTouchView className='h-full border border-sepratorColor overflow-hidden rounded-[16px]' onPress={() => {
                    if (isActivity) {
                        navigation.navigate(screenTitle.ACTIVITIES);
                    } else {
                        const { redirectURI, title } = item;
                        if (redirectURI) {
                            navigation.navigate(screenTitle.SOCIAL_MEDIA_SCREEN, {
                                title,
                                uri: redirectURI
                            });
                        }
                    }
                }}>
                    <CyDView className={clsx('h-full w-full flex flex-row justify-evenly items-center', { 'h-[75%]': isActivity, })}>
                        {ItemBody}
                    </CyDView>
                    {
                        isActivity ?
                            <CyDView className={clsx('h-[25%] w-full bg-privacyMessageBackgroundColor justify-center px-[30px]', { 'bg-toastColor': item.status === ActivityStatus.SUCCESS, 'bg-redColor': item.status === ActivityStatus.FAILED })}>
                                <CyDText className='font-bold text-[12px]'>{t(`${item.type.toUpperCase()}_ACTIVITY`)}</CyDText>
                            </CyDView>
                            : null
                    }
                </CyDTouchView>
                {
                    isActivity || (!isActivity && item.isClosable) ?

                        <CyDTouchView onPress={() => {
                            if (isActivity) {
                                void onActivityCardDismissal();
                            } else {
                                void onStaticCardDismissal();
                            }
                        }} className='absolute top-[-4px] right-[-4px] h-[20px] w-[20px] justify-center items-center bg-white border border-sepratorColor rounded-full overflow-hidden p-[3px]'>
                            <CyDFastImage source={AppImages.CLOSE} className="h-[8px] w-[8px]" resizeMode="contain" />
                        </CyDTouchView> : null
                }
            </CyDView>
        </CyDAnimatedView>
    );
};

export default memo(CardCarouselItem);