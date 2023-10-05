import React, { memo, useState } from "react";
import { CyDText, CyDView } from "../../../styles/tailwindStyles";
import { useTranslation } from "react-i18next";
import RNDateTimePicker from "@react-native-community/datetimepicker";
import { isAndroid } from "../../../misc/checkers";
import Button from "../../../components/v2/button";
import moment from "moment";
import { ButtonType } from "../../../constants/enum";
import { DateRange } from "../../../constants/cardPageV2";

interface DateRangeFilterPickerProps {
    minimumDate: Date
    maximumDate: Date
    dateRangeState: [DateRange, React.Dispatch<React.SetStateAction<DateRange>>]
}

const DateRangeFilterPicker = ({ minimumDate, maximumDate, dateRangeState }: DateRangeFilterPickerProps) => {
    const { t } = useTranslation();
    const [dateRange, setDateRange] = dateRangeState;
    const [showPicker, setShowPicker] = useState({
        fromPicker: !isAndroid(),
        toPicker: !isAndroid(),
    });
    return (
        <>
            <CyDView className="h-[30%] w-full p-[10px] gap-[10px]">
                <CyDView className='flex flex-row justify-between items-center py-[10px]'>
                    <CyDText className='text-[18px] font-semibold'>{t('FROM')}</CyDText>
                    {
                        isAndroid() ?
                            <Button
                                type={ButtonType.GREY}
                                onPress={() => {
                                    setShowPicker({
                                        ...showPicker,
                                        fromPicker: true
                                    });
                                }}
                                title={moment(dateRange.fromDate).format('DD MMM, YYYY')} />
                            : null
                    }
                    {
                        showPicker.fromPicker ?
                            <RNDateTimePicker themeVariant='light' mode="date" display="default" value={dateRange.fromDate} minimumDate={minimumDate} maximumDate={maximumDate} onChange={(_, fromDate) => {
                                if (fromDate) {
                                    setDateRange({
                                        fromDate,
                                        toDate: dateRange.toDate
                                    });
                                    if (isAndroid()) {
                                        setShowPicker({
                                            ...showPicker,
                                            fromPicker: false
                                        });
                                    }
                                }
                            }} /> : null
                    }
                </CyDView>
                <CyDView className='flex flex-row justify-between items-center py-[10px]'>
                    <CyDText className='text-[18px] font-semibold'>{t('TO')}</CyDText>
                    {
                        isAndroid() ?
                            <Button
                                type={ButtonType.GREY}
                                onPress={() => {
                                    setShowPicker({
                                        ...showPicker,
                                        toPicker: true
                                    });
                                }}
                                title={moment(dateRange.toDate).format('DD MMM, YYYY')} />
                            : null
                    }
                    {
                        showPicker.toPicker ?
                            <RNDateTimePicker themeVariant='light' mode="date" display='default' value={dateRange.toDate} minimumDate={dateRange.fromDate} maximumDate={maximumDate} onChange={(_, toDate) => {
                                if (toDate) {
                                    setDateRange({
                                        fromDate: dateRange.fromDate,
                                        toDate
                                    });
                                }
                                if (isAndroid()) {
                                    setShowPicker({
                                        ...showPicker,
                                        toPicker: false
                                    });
                                }
                            }} /> : null
                    }
                </CyDView>
                <CyDView className='h-[50%] w-full border-t border-sepratorColor pt-[10px]'>
                    <CyDText className='text-[18px] font-semibold'>{t('PRESETS')}</CyDText>
                    <CyDView className='flex flex-row flex-wrap'>
                        <Button
                            type={ButtonType.GREY}
                            style="px-[10px] mx-[3px] py-[5px] my-[5px]"
                            onPress={() => {
                                setDateRange({
                                    fromDate: moment().subtract(1, 'week').toDate(),
                                    toDate: moment().toDate()
                                });
                            }}
                            title={'Last week'}
                        />
                        <Button
                            type={ButtonType.GREY}
                            style="px-[10px] mx-[3px] py-[5px] my-[5px]"
                            onPress={() => {
                                setDateRange({
                                    fromDate: moment().subtract(1, 'month').toDate(),
                                    toDate: moment().toDate()
                                });
                            }}
                            title={'Last month'}
                        />
                        <Button
                            type={ButtonType.GREY}
                            style="px-[10px] mx-[3px] py-[5px] my-[5px]"
                            onPress={() => {
                                setDateRange({
                                    fromDate: moment().subtract(3, 'months').toDate(),
                                    toDate: moment().toDate()
                                });
                            }}
                            title={'Last 3 months'}
                        />
                        <Button
                            type={ButtonType.GREY}
                            style="px-[10px] mx-[3px] py-[5px] my-[5px]"
                            onPress={() => {
                                setDateRange({
                                    fromDate: moment(new Date(2023, 6, 1)).toDate(),
                                    toDate: moment().toDate()
                                });
                            }}
                            title={'All time'}
                        />
                    </CyDView>
                </CyDView>
            </CyDView>
        </>
    );
};

export default memo(DateRangeFilterPicker);