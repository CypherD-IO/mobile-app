import React, { memo, useContext, useEffect, useState } from "react";
import { CyDFastImage, CyDImageBackground, CyDSafeAreaView, CyDText, CyDTouchView, CyDView } from "../../../styles/tailwindStyles";
import AppImages from "../../../../assets/images/appImages";
import { CardProviders, TransactionTypes } from "../../../constants/enum";
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
import CardTxnFilterModal from "../bridgeCard/CardTxnFilterModal";
import { CardTransaction } from "../../../models/card.model";
import { RefreshControl } from "react-native";

export type CardSectionHeights = 270 | 320
interface CypherCardScreenProps {
    navigation: any
    route: { params: { hasBothProviders: boolean; cardProvider: CardProviders } };
}

const CypherCardScreen = ({ navigation, route }: CypherCardScreenProps) => {
    const { hasBothProviders, cardProvider } = route.params;

    const isFocused = useIsFocused();
    const { t } = useTranslation();
    const { getWithAuth } = useAxios();

    const globalContext = useContext<any>(GlobalContext);
    const cardProfile: CardProfile = globalContext.globalState.cardProfile;

    const cardSectionHeight: CardSectionHeights = hasBothProviders ? 320 : 270;

    const [cardBalance, setCardBalance] = useState('');
    const [currentCardIndex] = useState(0); // Not setting anywhere.
    const [currentCardProvider, setCurrentCardProvider] = useState<string>(cardProvider);
    const [transactions, setTransactions] = useState<CardTransaction[]>([]);
    const [filteredTransactions, setFilteredTransactions] = useState<CardTransaction[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [filterModalVisible, setFilterModalVisible] = useState(false);
    const [filter, setFilter] = useState<{
        types: TransactionTypes[]
    }>({
        types: []
    });

    const scrollY = useSharedValue(-cardSectionHeight);

    const onRefresh = () => {
        setCardBalance('');
        void fetchCardBalance();
        void retrieveRecentTxns();
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
        spliceTransactions();
    }, [filter]);

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

    const retrieveRecentTxns = async () => {
        const currentCard = get(cardProfile, currentCardProvider).cards[
            currentCardIndex
        ];
        const txnURL = `/v1/cards/${currentCardProvider}/card/${String(currentCard?.cardId)}/transactions`;
        try {
            setRefreshing(true);
            const res = await getWithAuth(txnURL);
            if (!res.isError) {
                const { transactions: txnsToSet } = res.data;
                txnsToSet.sort((a: CardTransaction, b: CardTransaction) => {
                    return a.date < b.date ? 1 : -1;
                });
                setTransactions(txnsToSet);
                setFilteredTransactions(txnsToSet);
                setRefreshing(false);
            } else {
                setRefreshing(false);
                const errorObject = {
                    res: JSON.stringify(res),
                    location: 'isError=true when trying to fetch recent card txns.',
                };
                Sentry.captureException(errorObject);
            }
        } catch (e) {
            setRefreshing(false);
            const errorObject = {
                e,
                location: 'Error when trying to fetch recent card txns.',
            };
            Sentry.captureException(errorObject);
        }
    };

    const spliceTransactions = () => {
        if (transactions.length === 0) {
            return [];
        }

        const filteredTxns = transactions.filter(txn => {
            const isIncludedType = filter.types.includes(txn.type); // FILTERING THE TYPE
            return (
                isIncludedType
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
            <CyDImageBackground className='h-full w-full mb-[10px]' source={AppImages.DEBIT_CARD_BACKGROUND} resizeMode="cover">
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
                <CyDView className="h-full mb-[75px] px-[10px]">
                    {/* TOOLBAR */}
                    <AnimatedToolBar scrollY={scrollY} cardSectionHeight={cardSectionHeight}>
                        <CyDView className="h-[40px] flex flex-row justify-between items-center py-[5px] px-[10px] bg-white border border-sepratorColor mt-[10px] rounded-t-[24px]">
                            <CyDText className="text-[16px] font-bold px-[10px]">{t('TRANS')}</CyDText>
                            <CyDTouchView onPress={() => {
                                setFilterModalVisible(true);
                            }}>
                                <CyDFastImage className='w-[78px] h-[25px]' source={AppImages.ACTIVITY_FILTER} />
                            </CyDTouchView>
                        </CyDView>
                    </AnimatedToolBar>
                    {/* TOOLBAR */}
                    {/* TXN LIST */}
                    <AnimatedTxnList
                        scrollY={scrollY}
                        cardSectionHeight={cardSectionHeight}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                        data={filteredTransactions}
                        renderItem={({ item, index }: { item: CardTransaction, index: number }) => {
                            return <CardTransactionItem key={index} item={item} />;
                        }}
                        ListEmptyComponent={<CyDView className="h-[50%] w-full justify-center items-center">
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