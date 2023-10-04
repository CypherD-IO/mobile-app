import React, { memo, useContext, useEffect, useState } from "react";
import { CyDImageBackground, CyDSafeAreaView, CyDText, CyDView } from "../../../styles/tailwindStyles";
import AppImages from "../../../../assets/images/appImages";
import { CardProviders } from "../../../constants/enum";
import AnimatedCardSection from "./AnimatedCardSection";
import { useSharedValue } from "react-native-reanimated";
import { H_CARD_SECTION } from "./constants";
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

    const [cardBalance, setCardBalance] = useState('');
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [currentCardProvider, setCurrentCardProvider] = useState<string>(cardProvider);
    const [recentTransactions, setRecentTransactions] = useState([]);
    const [loadingRecentTxns, setLoadingRecentTxns] = useState(false);
    const scrollY = useSharedValue(-H_CARD_SECTION);


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
    }, [isFocused]);

    useEffect(() => {
        setCardBalance('');
        void fetchCardBalance();
        void retrieveRecentTxns();
    }, [currentCardProvider]);

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
            setLoadingRecentTxns(true);
            const res = await getWithAuth(txnURL);
            if (!res.isError) {
                const { transactions } = res.data;
                transactions.sort((a, b) => {
                    return a.date < b.date ? 1 : -1;
                });
                // const txnsToBeSet = transactions.length >= 4 ? transactions.slice(0, 4) : transactions;
                // setRecentTransactions(txnsToBeSet);
                setRecentTransactions(transactions);
                setLoadingRecentTxns(false);
            } else {
                setLoadingRecentTxns(false);
                const errorObject = {
                    res: JSON.stringify(res),
                    location: 'isError=true when trying to fetch recent card txns.',
                };
                Sentry.captureException(errorObject);
            }
        } catch (e) {
            setLoadingRecentTxns(false);
            const errorObject = {
                e,
                location: 'Error when trying to fetch recent card txns.',
            };
            Sentry.captureException(errorObject);
        }
    };

    return (
        <CyDSafeAreaView className="flex-1 bg-white">
            <CyDImageBackground className="flex-1" source={AppImages.DEBIT_CARD_BACKGROUND} resizeMode="contain">
                <AnimatedCardSection scrollY={scrollY}>
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
                <CyDView className="h-full mb-[75px] mt-[10px]">
                    <AnimatedTxnList
                        scrollY={scrollY}
                        data={recentTransactions}
                        renderItem={({ item, index }: { item: any, index: number }) => {
                            return <CardTransactionItem key={index} item={item} />;
                        }}
                        ListEmptyComponent={<CyDView className="h-[50%] w-full justify-center items-center">
                            <CyDText>{'No transactions yet.'}</CyDText>
                        </CyDView>}
                    />
                </CyDView>
            </CyDImageBackground>
        </CyDSafeAreaView>
    );
};
export default memo(CypherCardScreen);