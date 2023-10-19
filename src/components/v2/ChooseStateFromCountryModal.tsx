import React, { memo, useEffect, useState } from "react";
import CyDModalLayout from "./modal";
import { CyDFastImage, CyDScrollView, CyDText, CyDTextInput, CyDTouchView, CyDView } from "../../styles/tailwindStyles";
import AppImages from "../../../assets/images/appImages";
import { Colors } from "../../constants/theme";
import { ICountry, IState } from "../../models/cardApplication.model";
import clsx from "clsx";
import { StyleSheet } from "react-native";

interface Props {
    isModalVisible: boolean
    setModalVisible: React.Dispatch<React.SetStateAction<boolean>>
    selectedCountry: ICountry
    selectedCountryStates: IState[]
    selectedStateState: [IState, React.Dispatch<React.SetStateAction<IState>>]
}

const ChooseStateFromCountryModal = ({ isModalVisible, setModalVisible, selectedCountry, selectedCountryStates, selectedStateState }: Props) => {
    const [selectedState, setSelectedState] = selectedStateState;

    const [stateFilterText, setStateFilter] = useState('');
    const [states, setStates] = useState<
        IState[]
    >([]);

    useEffect(() => {
        setStates(selectedCountryStates);
    }, [selectedCountryStates]);

    useEffect(() => {
        if (stateFilterText === '') {
            setStates(states);
        } else {
            const filteredCountries = states.filter(
                state =>
                    state.name.toLowerCase().includes(stateFilterText.toLowerCase())
            );
            setStates(filteredCountries);
        }
    }, [states, stateFilterText]);



    return (
        <CyDModalLayout
            setModalVisible={setModalVisible}
            isModalVisible={isModalVisible}
            style={styles.modalLayout}
            animationIn={'slideInUp'}
            animationOut={'slideOutDown'}
        >
            <CyDView className='flex flex-col justify-end h-full'>
                <CyDView className={'bg-white h-[50%] rounded-t-[20px]'}>
                    <CyDView
                        className={
                            'flex flex-row mt-[20px] justify-center items-center'
                        }
                    >
                        <CyDTextInput
                            className={
                                'border-[1px] border-inputBorderColor rounded-[8px] p-[10px] text-[14px] w-[80%] font-nunito text-primaryTextColor'
                            }
                            value={stateFilterText}
                            autoCapitalize='none'
                            autoCorrect={false}
                            onChangeText={(text) => setStateFilter(text)}
                            placeholder='Search State'
                            placeholderTextColor={Colors.subTextColor}
                        />
                        <CyDTouchView
                            onPress={() => {
                                setModalVisible(false);
                            }}
                            className={'ml-[18px]'}
                        >
                            <CyDFastImage
                                source={AppImages.CLOSE}
                                className={' w-[22px] h-[22px] z-[50] right-[0px] '}
                            />
                        </CyDTouchView>
                    </CyDView>
                    <CyDScrollView className={'mt-[12px]'}>
                        <CyDView className='mb-[100px]'>
                            {states.map((state) => {
                                return (
                                    <CyDTouchView
                                        onPress={() => {
                                            setSelectedState(state);
                                            setModalVisible(false);
                                        }}
                                        className={clsx(
                                            'flex flex-row items-center justify-between px-[16px] py-[6px] mx-[12px] rounded-[8px]',
                                            {
                                                'bg-paleBlue':
                                                    state.name === selectedState.name,
                                            }
                                        )}
                                        key={state.id}
                                    >
                                        <CyDView className={'flex flex-row items-center'}>
                                            <CyDText className={'text-[36px]'}>
                                                {selectedCountry.flag}
                                            </CyDText>
                                            <CyDText
                                                className={'ml-[10px] font-semibold text-[16px]'}
                                            >
                                                {state.name}
                                            </CyDText>
                                        </CyDView>
                                    </CyDTouchView>
                                );
                            })}
                        </CyDView>
                    </CyDScrollView>
                </CyDView>
            </CyDView>
        </CyDModalLayout>
    );
};

const styles = StyleSheet.create({
    modalLayout: {
        margin: 0,
        justifyContent: 'flex-end',
    },
});

export default memo(ChooseStateFromCountryModal);