import React, { memo, useMemo, useState } from "react";
import { CyDText, CyDTouchView, CyDView } from "../../../styles/tailwindStyles";
import RNDateTimePicker from "@react-native-community/datetimepicker";
import { isAndroid } from "../../../misc/checkers";
import Button from "../../../components/v2/button";
import moment from "moment";
import { ButtonType } from "../../../constants/enum";
import { DateRange, PRESET_OFFSET_DAYS } from "../../../constants/cardPageV2";
import { t } from "i18next";
import clsx from "clsx";

interface DatePresetButtonProps {
    presetOffset: number,
    setDateRange: React.Dispatch<React.SetStateAction<DateRange>>
    isActive: boolean
}

interface DateRangeFilterPickerProps {
    minimumDate: Date
    maximumDate: Date
    dateRangeState: [DateRange, React.Dispatch<React.SetStateAction<DateRange>>]
}

const DatePresetButton = ({ presetOffset, setDateRange, isActive }: DatePresetButtonProps) => {
    const fromDate = moment().subtract(presetOffset, 'days').toDate();
    const toDate = moment().toDate();
    return (
        <CyDTouchView
            className={clsx('px-[10px] mx-[3px] py-[5px] my-[5px] rounded-[8px] border border-greyButtonBackgroundColor', { 'bg-buttonColor': isActive })}
            onPress={() => setDateRange({ fromDate, toDate })}
        >
            <CyDText className='text-[16px] font-extrabold text-center'>{`Last ${presetOffset} days`}</CyDText>
        </CyDTouchView>
    );
};

const DateRangeFilterPicker = ({ minimumDate, maximumDate, dateRangeState }: DateRangeFilterPickerProps) => {
    const [dateRange, setDateRange] = dateRangeState;
    const [showPicker, setShowPicker] = useState({
        fromPicker: !isAndroid(),
        toPicker: !isAndroid(),
    });


    const Presets = useMemo(() => {
        return PRESET_OFFSET_DAYS.map((offset, index) => {
            const formatText = 'DD/MMM/YYYY';
            const fromDateIsEqual = moment().subtract(offset, 'days').format(formatText) === moment(dateRange.fromDate).format(formatText);
            const toDateIsEqual = moment().format(formatText) === moment(dateRange.toDate).format(formatText);
            return <DatePresetButton key={index} presetOffset={offset} setDateRange={setDateRange} isActive={fromDateIsEqual && toDateIsEqual} />;
        });
    }, [dateRange.fromDate, dateRange.toDate, setDateRange]);

    return (
        <>
            <CyDView className="h-[30%] w-full gap-[10px]">
                <CyDView className='flex flex-row justify-between items-center p-[10px]'>
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
                <CyDView className='flex flex-row justify-between items-center p-[10px]'>
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
                <CyDView className='w-full border-y border-sepratorColor p-[10px]'>
                    <CyDView className='flex flex-row flex-wrap'>
                        {
                            Presets
                        }
                    </CyDView>
                </CyDView>
            </CyDView>
        </>
    );
};

export default memo(DateRangeFilterPicker);