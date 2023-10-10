import React, { memo, useContext, useEffect, useState } from "react";
import { CyDFastImage, CyDImageBackground, CyDSafeAreaView, CyDText, CyDTouchView, CyDView } from "../../../styles/tailwindStyles";
import AppImages from "../../../../assets/images/appImages";
import { CardProviders, CardTransactionStatuses, CardTransactionTypes } from "../../../constants/enum";
import AnimatedCardSection from "./AnimatedCardSection";
import { useSharedValue } from "react-native-reanimated";
import { AnimatedTxnList } from "./AnimatedTxnList";
import CardScreen from "../bridgeCard/card";
import { useIsFocused } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import Button from "../../../components/v2/button";
import { screenTitle } from "../../../constants";
import { GlobalContext } from "../../../core/globalContext";
import { CardProfile } from "../../../models/cardProfile.model";
import { get, has } from "lodash";
import useAxios from "../../../core/HttpRequest";
import * as Sentry from '@sentry/react-native';
import SwitchView from "../../../components/v2/switchView";
import CardTransactionItem from "../../../components/v2/CardTransactionItem";
import { AnimatedToolBar } from "./AnimatedToolBar";
import CardTxnFilterModal from "./CardTxnFilterModal";
import { CardTransaction } from "../../../models/card.model";
import { RefreshControl, StyleSheet } from "react-native";
import clsx from "clsx";
import { isAndroid, isIOS } from "../../../misc/checkers";
import moment from "moment";
import { useGlobalModalContext } from "../../../components/v2/GlobalModal";
import { CardSectionHeights, DateRange, STATUSES, TYPES, initialCardTxnDateRange } from "../../../constants/cardPageV2";

interface CypherCardScreenProps {
    navigation: any
    route: { params: { hasBothProviders: boolean; cardProvider: CardProviders } };
}


const CypherCardScreen = ({ navigation, route }: CypherCardScreenProps) => {
    const { hasBothProviders, cardProvider } = route.params;

    const isFocused = useIsFocused();
    const { t } = useTranslation();
    const { getWithAuth, postWithAuth } = useAxios();
    const { showModal, hideModal } = useGlobalModalContext();

    const globalContext = useContext<any>(GlobalContext);
    const cardProfile: CardProfile = globalContext.globalState.cardProfile;

    const cardSectionHeight: CardSectionHeights = hasBothProviders ? 320 : 270;

    const [cardBalance, setCardBalance] = useState('');
    const [currentCardIndex] = useState(0); // Not setting anywhere.
    const [currentCardProvider, setCurrentCardProvider] = useState<string>(cardProvider);
    const [transactions, setTransactions] = useState<CardTransaction[]>([]);
    const [filteredTransactions, setFilteredTransactions] = useState<CardTransaction[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [filterModalVisible, setFilterModalVisible] = useState(false);
    const [filter, setFilter] = useState<{
        types: CardTransactionTypes[];
        dateRange: DateRange,
        statuses: CardTransactionStatuses[]
    }>({
        types: TYPES,
        dateRange: initialCardTxnDateRange,
        statuses: STATUSES
    });

    const scrollY = useSharedValue(-cardSectionHeight);

    const onRefresh = () => {
        setCardBalance('');
        void fetchCardBalance();
        void retrieveTxns();
    };

    useEffect(() => {
        if (isFocused && cardProfile && !currentCardProvider) {
            let tempCurrentCardProvider = '';
            if (has(cardProfile, CardProviders.BRIDGE_CARD)) {
                tempCurrentCardProvider = CardProviders.BRIDGE_CARD;
            } else if (has(cardProfile, CardProviders.PAYCADDY)) {
                tempCurrentCardProvider = CardProviders.PAYCADDY;
            }
            setCurrentCardProvider(tempCurrentCardProvider);
        }
    }, [cardProfile, currentCardProvider, isFocused]);

    useEffect(() => {
        onRefresh();
    }, [currentCardProvider]);

    useEffect(() => {
        spliceTransactions(transactions);
    }, [filter.statuses, filter.types]);

    useEffect(() => {
        void retrieveTxns();
    }, [filter.dateRange]);

    const fetchCardBalance = async () => {
        const currentCard = get(cardProfile, currentCardProvider).cards[
            currentCardIndex
        ];
        const url = `/v1/cards/${currentCardProvider}/card/${String(
            currentCard?.cardId,
        )}/balance`;
        try {
            const response = await getWithAuth(url);
            if (!response.isError && response?.data && response.data.balance) {
                setCardBalance(String(response.data.balance));
            } else {
                setCardBalance('NA');
            }
        } catch (error) {
            Sentry.captureException(error);
            setCardBalance('NA');
        }
    };

    const retrieveTxns = async () => {
        const currentCard = get(cardProfile, currentCardProvider).cards[
            currentCardIndex
        ];
        let txnURL = `/v1/cards/${currentCardProvider}/card/${String(currentCard?.cardId)}/transactions`;
        if (filter.dateRange !== initialCardTxnDateRange) {
            const { fromDate, toDate } = filter.dateRange;
            txnURL += `?startDate=${moment(fromDate).startOf('day').toISOString()}&endDate=${moment(toDate).endOf('day').toISOString()}`;
        }
        try {
            setRefreshing(true);
            const res = await getWithAuth(txnURL);
            if (!res.isError) {
                const { transactions: txnsToSet } = res.data;
                txnsToSet.sort((a: CardTransaction, b: CardTransaction) => {
                    return a.date < b.date ? 1 : -1;
                });
                setTransactions(txnsToSet);
                spliceTransactions(txnsToSet);
                setRefreshing(false);
            } else {
                setRefreshing(false);
                const errorObject = {
                    res: JSON.stringify(res),
                    location: 'isError=true when trying to fetch card txns.',
                };
                Sentry.captureException(errorObject);
                showModal('state', { type: 'error', title: t('FAILED_TO_UPDATE_TXNS'), description: res.error, onSuccess: hideModal, onFailure: hideModal });
            }
        } catch (e) {
            setRefreshing(false);
            const errorObject = {
                e,
                location: 'Error when trying to fetch card txns.',
            };
            Sentry.captureException(errorObject);
            showModal('state', { type: 'error', title: t('FAILED_TO_UPDATE_TXNS'), description: e, onSuccess: hideModal, onFailure: hideModal });
        }
    };

    const exportCardTransactions = async () => {
        const currentCard = get(cardProfile, currentCardProvider).cards[currentCardIndex];
        const exportEndpoint = `/v1/cards/${currentCardProvider}/card/${String(currentCard?.cardId)}/transactions/export`;
        try {
            setIsExporting(true);
            const res = await postWithAuth(exportEndpoint, {});
            if (!res.isError) {
                showModal('state', { type: 'success', title: t('TXNS_EXPORTED'), description: t('CARD_TXNS_EXPORTED_TEXT') + (cardProfile.email ?? 'your registered email.'), onSuccess: hideModal, onFailure: hideModal });
            } else {
                const errorObject = {
                    res: JSON.stringify(res),
                    location: 'isError=true when trying to export card txns.',
                };
                Sentry.captureException(errorObject);
                showModal('state', { type: 'error', title: t('FAILED_TO_EXPORT_TXNS'), description: res.error, onSuccess: hideModal, onFailure: hideModal });
            }
            setIsExporting(false);
        } catch (e) {
            const errorObject = {
                e,
                location: 'Error when trying to fetch card txns.',
            };
            Sentry.captureException(errorObject);
            showModal('state', { type: 'error', title: t('FAILED_TO_EXPORT_TXNS'), description: e, onSuccess: hideModal, onFailure: hideModal });
            setIsExporting(false);
        }
    };

    const spliceTransactions = (txnsToSplice: CardTransaction[]) => {
        if (txnsToSplice.length === 0) {
            setFilteredTransactions([]);
        }

        const filteredTxns = txnsToSplice.filter(txn => {
            const isIncludedType = filter.types.includes(txn.type); // FILTERING THE TYPE
            const statusString = txn.isSettled ? CardTransactionStatuses.SETTLED : CardTransactionStatuses.PENDING;
            const isIncludedStatus = filter.statuses.includes(statusString); // FILTERING THE STATUS
            return (
                isIncludedType && isIncludedStatus
            );
        });

        setFilteredTransactions(filteredTxns);
    };

    return (
        <CyDSafeAreaView className="flex-1 bg-white">
            {/* TXN FILTER MODAL */}
            <CardTxnFilterModal
                navigation={navigation}
                modalVisibilityState={[filterModalVisible, setFilterModalVisible]}
                filterState={[filter, setFilter]}
            />
            {/* TXN FILTER MODAL */}
            <CyDImageBackground className='h-full w-full' source={AppImages.DEBIT_CARD_BACKGROUND} resizeMode="cover" imageStyle={styles.imageBackgroundImageStyles}>
                <AnimatedCardSection scrollY={scrollY} cardSectionHeight={cardSectionHeight}>
                    {/* SWITCH PROVIDER */}
                    {hasBothProviders && (
                        <CyDView className='flex items-center mt-[-10px] mb-[10px]'>
                            <SwitchView
                                titles={['Card1', 'Card2']}
                                index={
                                    currentCardProvider === CardProviders.BRIDGE_CARD ? 0 : 1
                                }
                                setIndexChange={(index: number) => {
                                    if (index) {
                                        setCurrentCardProvider(CardProviders.PAYCADDY);
                                    } else setCurrentCardProvider(CardProviders.BRIDGE_CARD);
                                }}
                            />
                        </CyDView>
                    )}
                    <CardScreen
                        navigation={navigation}
                        hideCardDetails={isFocused}
                        currentCardProvider={currentCardProvider}
                        setCurrentCardProvider={setCurrentCardProvider}
                    />
                    {/* SWITCH PROVIDER */}
                    {/* FUND CARD */}
                    <CyDView
                        className={
                            'flex flex-row justify-between px-[2%] py-[1.2%] bg-white border-[1px] mx-[20px] rounded-[8px] border-sepratorColor'
                        }
                    >
                        <CyDView>
                            <CyDText className={'font-bold text-[12px]'}>
                                {t<string>('TOTAL_BALANCE')}
                            </CyDText>
                            <CyDText className={'font-bold text-[20px]'}>
                                {(cardBalance !== 'NA' ? '$ ' : '') + cardBalance}
                            </CyDText>
                        </CyDView>
                        <Button
                            image={AppImages.LOAD_CARD_LOTTIE}
                            isLottie={true}
                            onPress={() => {
                                navigation.navigate(screenTitle.BRIDGE_FUND_CARD_SCREEN, {
                                    navigation,
                                    currentCardProvider,
                                    currentCardIndex,
                                });
                            }}
                            style={'pr-[7%] pl-[5%] py-[2%] items-center align-center rounded-[8px]'}
                            title={t('LOAD_CARD_CAPS')}
                            titleStyle={'text-[14px]'}
                        />
                    </CyDView>
                    {/* FUND CARD */}
                </AnimatedCardSection>
                <CyDView className={clsx('h-full px-[10px] pb-[40px]', { 'pb-[75px]': isAndroid() })}>
                    {/* TOOLBAR */}
                    <AnimatedToolBar scrollY={scrollY} cardSectionHeight={cardSectionHeight}>
                        <CyDView className="h-[50px] flex flex-row justify-between items-center py-[10px] px-[10px] bg-white border border-sepratorColor mt-[10px] rounded-t-[24px]">
                            <CyDView className='flex justify-center items-start px-[5px]'>
                                <CyDText className="text-[16px] font-bold">{t('TRANS')}</CyDText>
                                <CyDText className="text-[10px] text-subTextColor">{`from ${moment(filter.dateRange.fromDate).format('DD MMM, \'YY')} to ${moment(filter.dateRange.toDate).format('DD MMM, \'YY')}`}</CyDText>
                            </CyDView>
                            <CyDView className='flex flex-row justify-end items-center px-[5px]'>
                                <CyDTouchView onPress={() => {
                                    setFilterModalVisible(true);
                                }}>
                                    <CyDFastImage className='w-[48px] h-[26px]' source={AppImages.FILTER} resizeMode='contain' />
                                </CyDTouchView>
                                <CyDTouchView disabled={isExporting} className={clsx({ 'opacity-40': isExporting })} onPress={() => {
                                    void exportCardTransactions();
                                }}>
                                    <CyDFastImage className='w-[48px] h-[26px]' source={AppImages.EXPORT} resizeMode='contain' />
                                </CyDTouchView>
                            </CyDView>
                        </CyDView>
                    </AnimatedToolBar>
                    {/* TOOLBAR */}
                    {/* TXN LIST */}
                    <AnimatedTxnList
                        scrollY={scrollY}
                        cardSectionHeight={cardSectionHeight}
                        refreshControl={<RefreshControl className={clsx({ 'bg-white': isIOS() })} refreshing={refreshing} onRefresh={onRefresh} progressViewOffset={cardSectionHeight} />}
                        data={filteredTransactions}
                        keyExtractor={(_, index) => index.toString()}
                        renderItem={({ item }: { item: CardTransaction }) => {
                            return <CardTransactionItem item={item} />;
                        }}
                        ListEmptyComponent={<CyDView className="h-full bg-white border-x border-sepratorColor w-full justify-start items-center py-[30%]">
                            <CyDFastImage source={AppImages.NO_TRANSACTIONS_YET} className="h-[150px] w-[150px]" resizeMode="contain" />
                        </CyDView>}
                    />
                    {/* TXN LIST */}
                </CyDView>
            </CyDImageBackground>
        </CyDSafeAreaView>
    );
};
export default memo(CypherCardScreen);

const styles = StyleSheet.create({
    imageBackgroundImageStyles: {
        top: -50
    }
});