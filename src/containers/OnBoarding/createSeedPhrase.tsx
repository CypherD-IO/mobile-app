/* eslint-disable @typescript-eslint/indent */
import * as React from 'react';
import { CyDImage, CyDSafeAreaView, CyDText, CyDTouchView, CyDView } from '../../styles/tailwindStyles';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import bip39 from 'react-native-bip39';
import ReadOnlySeedPhraseBlock from '../../components/v2/readOnlySeedPhraseBlock';
import AppImages from '../../../assets/images/appImages';
import CyDModalLayout from '../../components/v2/modal';
import { StyleSheet } from 'react-native';
import { screenTitle } from '../../constants';
import { generateWalletFromMnemonic } from '../../core/Address';
import Loading from '../../components/v2/loading';

function CreateSeedPhrase ({ navigation }) {
  const { t } = useTranslation();
  const [seedPhrase, setSeedPhrase] = useState<string>('');
  const [wallet, setWallet] = useState<any>();
  const [loading, setLoading] = useState<boolean>(true);
  const [isTipsVisible, setTipsVisible] = useState<boolean>(false);
  const waysToSecureSeedPhrase = [t('WRITE_DOWN_SEED_PHRASE'), t('USE_STEEL_BACKUPS'), t('USE_PASSWORD_MANAGER'), t('NEVER_STORE_ON_INTERNET_DEVICES')];
  const [showSeedPhrase, setShowSeedPhrase] = useState<boolean>(false);
  const maskedSeedPhrase = new Array(12).fill('******');

  const generateMnemonic = async () => {
    const generatedSeedPhrase = await bip39.generateMnemonic();
    setSeedPhrase(generatedSeedPhrase);
  };

  const generateWallet = async (mnemonic: string, trkEvent: string) => {
      const generatedWallet = await generateWalletFromMnemonic(mnemonic, trkEvent);
      setWallet(generatedWallet);
  };

  useEffect(() => {
    if (seedPhrase === '') {
      void generateMnemonic();
    }
  }, []);

  useEffect(() => {
    if (seedPhrase) {
      void generateWallet(seedPhrase, 'create_wallet');
      setLoading(false);
    }
  }, [seedPhrase]);

  const toggleSeedPhraseVisibility = () => {
    setShowSeedPhrase(!showSeedPhrase);
  };

  return (
        <>
        <CyDModalLayout setModalVisible={() => { } } isModalVisible={isTipsVisible} style={styles.modalLayout} animationIn={'slideInUp'} animationOut={'slideOutDown'}>
            <CyDView className={'bg-white p-[25px] pb-[30px] rounded-[20px] relative'}>
                <CyDTouchView onPress={() => { setTipsVisible(false); } } className={'z-[50]'}>
                    <CyDImage source={AppImages.CLOSE} className={' w-[22px] h-[22px] z-[50] absolute right-[0px] '} />
                </CyDTouchView>
                <CyDText className={' mt-[10] font-bold text-[22px] text-center '}>{t('HOW_TO_SECURE')}</CyDText>
                  <CyDView className={'mx-[20px] my-[10px]'}>
                      {
                          waysToSecureSeedPhrase.map(item => {
                              return (<CyDView className={'flex flex-row my-[4px]'} key={item}>
                                  <CyDImage className={'mt-[6px]'} source={AppImages.RIGHT_ARROW_BULLET} />
                                  <CyDText className={'ml-[10px] leading-[25px] font-semibold'}>{item}</CyDText>
                              </CyDView>);
                          })
                      }
                  </CyDView>
            </CyDView>
            </CyDModalLayout>

            { loading
                    ? <Loading></Loading>
                    : <CyDSafeAreaView className={'bg-white h-full flex-col justify-between'}>
              <CyDView>
                  <CyDView>
                      <CyDView className={'flex items-center justify-center py-[20px] px-[30px]'}>
                          <CyDText className={'text-[16px] text-center'}>
                              {t('CREATE_SEED_PHRASE_INFO')}
                          </CyDText>
                      </CyDView>
                      <CyDView className={'flex items-center justify-center px-[30px]'}>
                          <CyDText className={'text-[14px] font-bold text-center'}>
                              {t('CREATE_SEED_PHRASE_WARNING')}
                          </CyDText>
                      </CyDView>
                  </CyDView>
                  {seedPhrase.length > 0 && <><CyDView className={'flex flex-row justify-end mt-[4px] h-[18px]'}>
                          {showSeedPhrase && <CyDTouchView onPress={() => { toggleSeedPhraseVisibility(); }}><CyDImage source={AppImages.EYE_OPEN} className={'w-[27px] h-[18px] mr-[12px]'} /></CyDTouchView>}
                          {!showSeedPhrase && <CyDTouchView onPress={() => { toggleSeedPhraseVisibility(); }}><CyDImage source={AppImages.EYE_CLOSE} className={'w-[27px] h-[24px] mr-[12px]'} /></CyDTouchView>}
                    </CyDView>
                    {showSeedPhrase && <CyDView className={'w-full flex flex-row justify-center'}><CyDView className={'flex flex-row flex-wrap bg-lightGrey justify-center items-center text-center mt-[5%] py-[6px]'}>
                          {seedPhrase.split(' ').map((word, index) => {
                              return <ReadOnlySeedPhraseBlock key={index} content={word} index={++index} onBlockTouch={undefined} clickEvent={undefined}></ReadOnlySeedPhraseBlock>;
                          })}
                        </CyDView>
                    </CyDView>}
                          {!showSeedPhrase && <CyDView className={'w-full flex flex-row justify-center'}><CyDView className={'flex flex-row flex-wrap bg-lightGrey justify-center items-center text-center mt-[5%] py-[6px]'}>
                              {maskedSeedPhrase.map((word, index) => {
                                  return <ReadOnlySeedPhraseBlock key={index} content={word} index={++index} onBlockTouch={undefined} clickEvent={undefined}></ReadOnlySeedPhraseBlock>;
                              })}
                          </CyDView>
                          </CyDView>}</>}
                  <CyDTouchView onPress={() => { setTipsVisible(true); }} className={'m-[22px] flex flex-row justify-end'}>
                      <CyDImage className={'mt-[1px] w-[17px] h-[17px] mr-[6px]'} source={AppImages.INFO_CIRCLE}></CyDImage>
                          <CyDText className={'text-[14px] font-bold'}>{t('HOW_TO_SECURE_SEED_PHRASE')}</CyDText>
                  </CyDTouchView>
                </CyDView>
                  <CyDTouchView onPress={() => navigation.navigate(screenTitle.CONFIRM_SEED_PHRASE, { seedPhrase, wallet })}
                      className={'bg-appColor py-[20px] flex flex-row justify-center items-center rounded-[12px] justify-around w-[80%] mx-auto mb-[25px]'}>
                      <CyDText className={'text-center font-semibold'}>{t('CONFIRM_ALL_CAPS')}</CyDText>
                  </CyDTouchView>
          </CyDSafeAreaView>}</>
  );
};

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end'
  }
});

export default CreateSeedPhrase;
