import React, { memo } from "react";
import { CyDFastImage, CyDText, CyDTouchView, CyDView } from "../../styles/tailwindStyles";
import { intercomAnalyticsLog } from "../../containers/utilities/analyticsUtility";
import { screenTitle } from "../../constants";
import { useTranslation } from "react-i18next";
import { TransactionFilterTypes, TransactionTypes } from "../../constants/enum";
import clsx from "clsx";
import AppImages from "../../../assets/images/appImages";
import moment from "moment";
import { useNavigation } from "@react-navigation/native";

interface Transaction {
    id: string;
    type: string;
    title: string;
    date: Date;
    amount: number;
    iconUrl: string;
    tokenData?: {
        id: number,
        chain: string,
        hash: string,
        symbol: string,
        coinId: string,
        tokenNos: number,
        tokenAddress: string
    }
}
interface CardTransactionItemProps {
    item: Transaction
}

const getTransactionIndicator = (type: string) => {
    switch (type.toUpperCase()) {
        case TransactionFilterTypes.CREDIT:
            return AppImages.ICON_DOWN;
        case TransactionFilterTypes.DEBIT:
            return AppImages.ICON_UP;
        case TransactionTypes.REFUND:
            return AppImages.ICON_DOWN;
        default:
            return AppImages.MOVE_FUNDS;
    }
};

const formatDate = (date: string) => {
    return moment.utc(date).local().format('MMM DD YYYY, h:mm a');
};

const getTransactionSign = (type: string) => {
    switch (type.toUpperCase()) {
        case TransactionFilterTypes.CREDIT:
            return '+';
        case TransactionFilterTypes.DEBIT:
            return '-';
        case TransactionTypes.REFUND:
            return '+';
        default:
            return '..';
    }
};

const CardTransactionItem = ({ item }: CardTransactionItemProps) => {
    const { t } = useTranslation();
    const navigation = useNavigation();
    const { iconUrl, type, date, title, amount } = item;
    return (
        <CyDTouchView
            key={item.id}
            className={
                'h-[80px] flex flex-row justify-between items-center bg-white px-[10px] border-b-[1px] border-sepratorColor'
            }
            onPress={() => {
                void intercomAnalyticsLog('card_transaction_info_clicked');
                navigation.navigate(
                    screenTitle.BRIDGE_CARD_TRANSACTION_DETAILS_SCREEN,
                    { transaction: item },
                );
            }}
        >
            <CyDView
                className={
                    'flex flex-row justify-start align-center items-center w-[65%]'
                }
            >
                <CyDFastImage
                    source={
                        iconUrl && iconUrl !== ''
                            ? { uri: iconUrl }
                            : getTransactionIndicator(type)
                    }
                    className={'h-[30px] w-[30px]'}
                    resizeMode={'contain'}
                />
                <CyDView className={'ml-[10px]'}>
                    <CyDText
                        className={clsx('font-bold flex-wrap w-[230px]', {
                            'text-redCyD': type === 'failed',
                        })}
                        ellipsizeMode="tail"
                        numberOfLines={1}
                    >
                        {title.replace(/\s+/g, ' ')}
                    </CyDText>
                    <CyDText>{formatDate(String(date))}</CyDText>
                </CyDView>
            </CyDView>
            <CyDView className='flex flex-row self-center items-center'>
                <CyDText
                    className={clsx('font-bold text-[16px] mr-[5px]', {
                        'text-redCyD': type === TransactionTypes.DEBIT,
                        'text-successTextGreen': type === TransactionTypes.CREDIT,
                        'text-darkYellow': type === TransactionTypes.REFUND
                    })}
                >
                    {getTransactionSign(type)}
                    {amount} {t<string>('USD')}
                </CyDText>
            </CyDView>
        </CyDTouchView>
    );
};

export default memo(CardTransactionItem);