import React, { memo, useMemo } from "react";
import { CyDFastImage, CyDImageBackground, CyDText, CyDTouchView, CyDView } from "../../../../styles/tailwindStyles";
import { useNavigation } from "@react-navigation/native";
import { screenTitle } from "../../../../constants";
import AppImages from "../../../../../assets/images/appImages";
import { getDismissedStaticCardIDs, setDismissedStaticCardIDs } from "../../../../core/asyncStorage";

interface StaticCardProps {
    dscSetter: React.Dispatch<React.SetStateAction<string[]>>
    id: string
    title?: string;
    description?: string;
    bgImageURI?: string;
    redirectURI?: string;
    isClosable: boolean;
    endDate: string;
}

const StaticCard = ({ dscSetter, id, title = '', description = '', bgImageURI, redirectURI, isClosable, endDate }: StaticCardProps) => {
    const navigation = useNavigation();
    const CardBody = useMemo(() => {
        if (bgImageURI) {
            return (
                <CyDImageBackground className='p-[10px] items-end' source={{ uri: bgImageURI }} resizeMode='cover'>
                    <CyDView className='h-full w-[75%] flex items-start justify-center'>
                        <CyDText className='text-[14px] font-bold'>{title}</CyDText>
                        <CyDText className='text-[14px] text-subTextColor font-medium'>{description}</CyDText>
                    </CyDView>
                </CyDImageBackground>
            );
        } else {
            return (
                <CyDView className='h-full flex flex-col justify-center items-center'>
                    <CyDText className='text-[14px] font-bold'>{title}</CyDText>
                    <CyDText className='text-[14px] text-subTextColor font-medium'>{description}</CyDText>
                </CyDView>
            );
        }
    }, [bgImageURI, title, description]);


    const addNewDismissedCard = async () => {
        const dismissedStaticCards = await getDismissedStaticCardIDs();
        const parsedSC = dismissedStaticCards ? JSON.parse(dismissedStaticCards) : [];
        const newDismissedSC = !parsedSC.includes(`${id}|${endDate}`) ? [...parsedSC, `${id}|${endDate}`] : parsedSC;
        await setDismissedStaticCardIDs(newDismissedSC);
        dscSetter(newDismissedSC.map((nDS: string) => nDS.split('|')[0]));
    };

    return (
        <CyDView className='flex flex-row h-full w-full'>
            <CyDTouchView onPress={() => {
                if (redirectURI) {
                    navigation.navigate(screenTitle.SOCIAL_MEDIA_SCREEN, {
                        uri: redirectURI,
                        title,
                    });
                }
            }} className='h-full w-full border border-sepratorColor overflow-hidden rounded-[16px]'>
                {CardBody}
            </CyDTouchView>
            {
                isClosable ?
                    <CyDTouchView onPress={() => {
                        void addNewDismissedCard();
                    }} className='absolute top-[-4px] right-[-4px] h-[20px] w-[20px] justify-center items-center bg-white border border-sepratorColor rounded-full overflow-hidden p-[3px]'>
                        <CyDFastImage source={AppImages.CLOSE} className="h-[8px] w-[8px]" resizeMode="contain" />
                    </CyDTouchView>
                    : null
            }
        </CyDView>
    );
};

export default memo(StaticCard);