import React, { memo, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { BackHandler, StyleSheet } from "react-native";
import { CyDFastImage, CyDSafeAreaView, CyDText, CyDTouchView, CyDView } from "../../../styles/tailwindStyles";
import CheckBoxes from "../../../components/checkBoxes";
import Button from "../../../components/v2/button";
import CyDModalLayout from "../../../components/v2/modal";
import { ButtonType, CardTransactionStatuses, CardTransactionTypes } from "../../../constants/enum";
import AppImages from "../../../../assets/images/appImages";
import DateRangeFilterPicker from "./DateRangeFilterPicker";
import { CARD_TXN_FILTERS, DateRange, STATUSES, TYPES, initialCardTxnDateRange } from "../../../constants/cardsv2";

interface CardTxnFilterModalProps {
    navigation: any
    modalVisibilityState: [boolean, React.Dispatch<React.SetStateAction<boolean>>]
    filterState: [{
        types: CardTransactionTypes[];
        dateRange: DateRange
        statuses: CardTransactionStatuses[]
    }, React.Dispatch<React.SetStateAction<{
        types: CardTransactionTypes[];
        dateRange: DateRange
        statuses: CardTransactionStatuses[]
    }>>]
}

const CardTxnFilterModal = ({ navigation, modalVisibilityState, filterState }: CardTxnFilterModalProps) => {
    const { t } = useTranslation();
    const [index, setIndex] = useState<number>(0);
    const [filter, setFilter] = filterState;
    const [selectedTypes, setSelectedTypes] = useState<CardTransactionTypes[]>(filter.types === TYPES ? [] : filter.types);
    const [selectedDateRange, setSelectedDateRange] = useState<DateRange>(filter.dateRange);
    const [selectedStatuses, setSelectedStatuses] = useState<CardTransactionStatuses[]>(filter.statuses === STATUSES ? [] : filter.statuses);
    const [isModalVisible, setModalVisible] = modalVisibilityState;

    useEffect(() => {
        BackHandler.addEventListener('hardwareBackPress', () => {
            navigation.goBack();
            return true;
        });
        return () => {
            BackHandler.removeEventListener('hardwareBackPress', () => {
                navigation.goBack();
                return true;
            });
        };
    }, [navigation]);

    function onApply() {
        const data = {
            types: selectedTypes.length === 0 ? TYPES : selectedTypes,
            dateRange: selectedDateRange,
            statuses: selectedStatuses.length === 0 ? STATUSES : selectedStatuses,
        };

        selectedTypes.length === 0 && setSelectedTypes([]);
        selectedStatuses.length === 0 && setSelectedStatuses([]);

        setFilter(data);
        setModalVisible(false);
    }

    const onReset = () => {
        setSelectedTypes([]);
        setSelectedDateRange(initialCardTxnDateRange);
        setSelectedStatuses([]);
        setFilter({ types: TYPES, dateRange: initialCardTxnDateRange, statuses: STATUSES });
    };

    return (
        <CyDModalLayout
            isModalVisible={isModalVisible}
            setModalVisible={setModalVisible}
            style={styles.modalLayout}
            animationIn="slideInUp"
            animationOut="slideOutDown"
        >
            <CyDSafeAreaView className='bg-white flex-1'>
                <CyDView className="flex flex-row justify-between items-center px-[20px] py-[10px] border-b border-sepratorColor">
                    <CyDTouchView onPress={() => {
                        setModalVisible(false);
                    }} className="p-[5px]">
                        <CyDFastImage className="h-[16px] w-[16px]" source={AppImages.CLOSE} resizeMode="cover" />
                    </CyDTouchView>
                    <CyDText className="text-[20px] font-bold">{t('TRANSACTIONS_FILTER')}</CyDText>
                    <CyDTouchView onPress={onReset}>
                        <CyDText className='color-[#048A81] font-bold text-[16px]'>{t('RESET_ALL')}</CyDText>
                    </CyDTouchView>
                </CyDView>
                <CyDView className={'h-full flex flex-row'}>
                    <CyDView className={'border-r border-activityFilterBorderLine w-[30%]'}>
                        {CARD_TXN_FILTERS.map((filterItem, idx) => (
                            <CyDTouchView key={idx}
                                onPress={() => setIndex(idx)}
                                className={`${index === idx ? 'bg-appColor' : 'bg-whiteflex'} justify-center py-[20px]`}>
                                {
                                    idx === 0 ?
                                        <CyDText className={'text-left pl-[12px] text-[16px] font-bold'}>
                                            {filterItem + ' (' + selectedTypes.length.toString() + ')'}
                                        </CyDText> : null
                                }
                                {
                                    idx === 1 ?
                                        <CyDText className={'text-left pl-[12px] text-[16px] font-bold'}>
                                            {filterItem}
                                        </CyDText> : null
                                }
                                {
                                    idx === 2 ?
                                        <CyDText className={'text-left pl-[12px] text-[16px] font-bold'}>
                                            {filterItem + ' (' + selectedStatuses.length.toString() + ')'}
                                        </CyDText> : null
                                }
                            </CyDTouchView>
                        ))}
                    </CyDView>
                    <CyDView className={'bg-white w-[70%]'}>
                        {
                            index === 0 &&
                            <CheckBoxes
                                radioButtonsData={TYPES}
                                onPressRadioButton={setSelectedTypes}
                                initialValues={selectedTypes}
                            />
                        }
                        {
                            index === 1 &&
                            <DateRangeFilterPicker
                                minimumDate={new Date(2023, 6, 1)}
                                maximumDate={new Date()}
                                dateRangeState={[selectedDateRange, setSelectedDateRange]}
                            />
                        }
                        {
                            index === 2 &&
                            <CheckBoxes
                                radioButtonsData={STATUSES}
                                onPressRadioButton={setSelectedStatuses}
                                initialValues={selectedStatuses}
                            />
                        }
                    </CyDView>
                </CyDView>
                <CyDView className='w-full absolute bottom-0'>
                    <Button
                        onPress={onApply}
                        title={t('APPLY')}
                        style="h-[60px] w-full rounded-[0px]"
                        titleStyle="text-[18px] font-bold"
                        type={ButtonType.PRIMARY}
                    />
                </CyDView>
            </CyDSafeAreaView>
        </CyDModalLayout>
    );
};

export default memo(CardTxnFilterModal);

const styles = StyleSheet.create({
    modalLayout: {
        margin: 0,
        justifyContent: 'flex-end'
    }
});
