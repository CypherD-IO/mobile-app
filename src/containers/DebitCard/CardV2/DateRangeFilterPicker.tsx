import React, { memo, useState } from "react";
import { CyDText, CyDView } from "../../../styles/tailwindStyles";
import { useTranslation } from "react-i18next";
import RNDateTimePicker from "@react-native-community/datetimepicker";
import { DateRange } from ".";
import { isAndroid } from "../../../misc/checkers";
import Button from "../../../components/v2/button";
import moment from "moment";
import { ButtonType } from "../../../constants/enum";

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
        <CyDView className="h-full w-full p-[10px] gap-[10px]">
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
        </CyDView>
    );
};

export default memo(DateRangeFilterPicker);