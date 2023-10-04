import React, { memo, useEffect, useLayoutEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { BackHandler, StyleSheet } from "react-native";
import { CyDFastImage, CyDSafeAreaView, CyDText, CyDTouchView, CyDView } from "../../../styles/tailwindStyles";
import CheckBoxes from "../../../components/checkBoxes";
import Button from "../../../components/v2/button";
import CyDModalLayout from "../../../components/v2/modal";
import { ButtonType, TransactionTypes } from "../../../constants/enum";
import AppImages from "../../../../assets/images/appImages";

export const FILTERS = ['Type'];
export const TRANSACTION_TYPES = [TransactionTypes.CREDIT, TransactionTypes.DEBIT, TransactionTypes.REFUND];
// export const STATUSES = ['completed', 'error'];

interface CardTxnFilterModalProps {
    navigation: any
    modalVisibilityState: [boolean, React.Dispatch<React.SetStateAction<boolean>>]
    filterState: [{
        types: string[];
    }, React.Dispatch<React.SetStateAction<{
        types: string[];
    }>>]
}

const CardTxnFilterModal = ({ navigation, modalVisibilityState, filterState }: CardTxnFilterModalProps) => {
    const { t } = useTranslation();
    const [index, setIndex] = useState<number>(0);
    const [filter, setFilter] = filterState;
    const [selectedTypes, setSelectedTypes] = useState<string[]>(filter.types === TRANSACTION_TYPES ? [] : filter.types);
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

    useLayoutEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <CyDTouchView onPress={() => {
                    setSelectedTypes(TRANSACTION_TYPES);
                }}>
                    <CyDText className='color-[#048A81] font-bold text-[16px]'>{t('RESET_ALL')}</CyDText>
                </CyDTouchView>
            )
        });
    }, [navigation, t]);

    function onApply() {
        const data = {
            types: selectedTypes.length === 0 ? TRANSACTION_TYPES : selectedTypes,
        };

        selectedTypes.length === 0 && setSelectedTypes([]);

        setFilter(data);
        setModalVisible(false);
    }

    const onReset = () => {
        setSelectedTypes([]);
        setFilter({ types: TRANSACTION_TYPES });
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
                        {FILTERS.map((filter, idx) => (
                            <CyDTouchView key={idx}
                                onPress={() => setIndex(idx)}
                                className={`${index === idx ? 'bg-appColor' : 'bg-whiteflex'} justify-center py-[20px]`}>
                                <CyDText className={'text-left pl-[12px] text-[16px] font-bold'}>
                                    {filter + (idx === 0 ? ` (${selectedTypes.length})` : '')}
                                </CyDText>
                            </CyDTouchView>
                        ))}
                    </CyDView>
                    <CyDView className={'bg-white w-[70%]'}>
                        {index === 0 &&
                            <CheckBoxes
                                radioButtonsData={TRANSACTION_TYPES}
                                onPressRadioButton={setSelectedTypes}
                                initialValues={selectedTypes}
                            />}
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
