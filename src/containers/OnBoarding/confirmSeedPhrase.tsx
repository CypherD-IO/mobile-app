/* eslint-disable @typescript-eslint/indent */
import * as React from 'react';
import { CyDSafeAreaView, CyDText, CyDTouchView, CyDView } from '../../styles/tailwindStyles';
import { HdWalletContext, PortfolioContext, shuffleSeedPhrase } from '../../core/util';
import { useTranslation } from 'react-i18next';
import { useContext, useEffect, useState } from 'react';
import { saveCredentialsToKeychain } from '../../core/Keychain';
import ReadOnlySeedPhraseBlock from '../../components/v2/readOnlySeedPhraseBlock';
import Toast from 'react-native-toast-message';
import { INFO_WAITING_TIMEOUT } from '../../core/Http';

function ConfirmSeedPhrase ({ route, navigation }) {
    const { t } = useTranslation();
    const hdWalletContext = useContext<any>(HdWalletContext);
    const portfolioState = useContext<any>(PortfolioContext);
    const origSeedPhrase = route.params.seedPhrase;
    const wallet = route.params.wallet;

    const [confirmableSeedPhrase, setConfirmableSeedPhrase] = useState<string[]>([]);
    const [jumbledSeedPhrase, setJumbledSeedPhrase] = useState<string[]>([]);
    const [maximumRetryCount, setMaximumRetryCount] = useState<number>(5);

    useEffect(() => {
        initalize();
    }, []);

    const initalize = () => {
        const initConfirmableArray = [];
        for (let i = 0; i < origSeedPhrase.split(' ').length; i++) {
            initConfirmableArray.push('');
        }
        setConfirmableSeedPhrase(initConfirmableArray);
        setJumbledSeedPhrase(shuffleSeedPhrase(origSeedPhrase.split(' ')));
        setMaximumRetryCount(5);
    };

    const pushToConfirmableSeedPhrase = (jumbledSelectedIndex: number) => {
        const firstEmptyOccurence = (element: string) => element === '';
        const index = confirmableSeedPhrase.findIndex(firstEmptyOccurence);
        const tempConfirmableSeedPhrase = [...confirmableSeedPhrase];
        const tempJumbledSeedPhrase = [...jumbledSeedPhrase];
        if (origSeedPhrase.split(' ')[index] === tempJumbledSeedPhrase[jumbledSelectedIndex]) {
            tempConfirmableSeedPhrase[index] = tempJumbledSeedPhrase[jumbledSelectedIndex];
            setConfirmableSeedPhrase(tempConfirmableSeedPhrase);
            tempJumbledSeedPhrase[+(jumbledSelectedIndex)] = '';
            setJumbledSeedPhrase(tempJumbledSeedPhrase);
            if (origSeedPhrase === tempConfirmableSeedPhrase.join(' ')) {
                Toast.show({
                    type: t('TOAST_TYPE_SUCCESS'),
                    text1: t('SEED_PHRASE_MATCH'),
                    position: 'bottom'
                });
                setTimeout(() => {
                    proceedToPortfolio();
                }, INFO_WAITING_TIMEOUT);
            }
        } else {
            if (jumbledSeedPhrase[jumbledSelectedIndex] !== '') {
                if (maximumRetryCount > 1) {
                    let retriesLeft = maximumRetryCount;
                    setMaximumRetryCount(--retriesLeft);
                    Toast.show({
                        type: t('TOAST_TYPE_ERROR'),
                        text1: t('SEED_PHRASE_INDEX_MISMATCH'),
                        position: 'bottom'
                    });
                } else {
                    initalize();
                }
            }
        }
    };

    const onBlockInvoked = (jumbledSelectedIndex: number) => {
        pushToConfirmableSeedPhrase(jumbledSelectedIndex);
    };

    const proceedToPortfolio = () => {
        void saveCredentialsToKeychain(hdWalletContext, portfolioState, wallet);
    };

    return (
        <CyDSafeAreaView className={'bg-white h-full flex-col justify-between'}>
            <CyDView>
                <CyDView className={'flex items-center justify-center py-[20px] px-[30px]'}>
                    <CyDText className={'text-[16px] text-center'}>
                        {t('CONFIRM_SEED_PHRASE_INFO')}
                    </CyDText>
                </CyDView>
                <CyDView>
                    <CyDView className={'w-full flex flex-row justify-center'}>
                        <CyDView className={'flex flex-row flex-wrap bg-lightGrey justify-center items-center text-center py-[20px]'}>
                            {confirmableSeedPhrase.map((word, index) => {
                                return <ReadOnlySeedPhraseBlock key={index} content={word} index={++index} disabled={true} backgroundColor={word === '' ? 'white' : 'appColor'} onBlockTouch={undefined} clickEvent={undefined}></ReadOnlySeedPhraseBlock>;
                            })}
                        </CyDView>
                    </CyDView>
                    { maximumRetryCount < 3 && <CyDView className={'mb-[-12px] z-10 shadow-lg absolute bottom-[-8px] left-[31%] py-[7px] rounded-full bg-white text-center'}>
                        <CyDText className={'font-semibold text-center text-[15px] px-[20px]'}>
                            {maximumRetryCount} {t('ATTEMPTS_LEFT')}
                        </CyDText>
                    </CyDView>}
                </CyDView>
                <CyDView className={'w-full flex flex-row justify-center'}>
                    <CyDView className={'flex flex-row flex-wrap justify-center items-center text-center w-[94%] mt-[4%] p-[10px]'}>
                        {jumbledSeedPhrase.map((word, index) => {
                            return (
                                <ReadOnlySeedPhraseBlock key={index} content={word} index={0} disabled={false} backgroundColor={word === '' ? 'white' : 'appColor'} onBlockTouch={onBlockInvoked} clickEvent={index} ></ReadOnlySeedPhraseBlock>
                            );
                        })}
                    </CyDView>
                </CyDView>
            </CyDView>
            <CyDView>
            </CyDView>
        </CyDSafeAreaView>
    );
};

export default ConfirmSeedPhrase;
