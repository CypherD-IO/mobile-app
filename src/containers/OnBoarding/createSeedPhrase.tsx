import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useIsFocused,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import React, { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NativeModules } from 'react-native';
// @ts-expect-error - Type declaration not available for react-native-bip39
import bip39 from 'react-native-bip39';
// @ts-expect-error - Type declaration not available for react-native-custom-qr-codes
import { QRCode } from 'react-native-custom-qr-codes';
import { AppImagesMap } from '../../../assets/images/appImages';
import Button from '../../components/v2/button';
import Loading from '../../components/v2/loading';
import { ButtonType, SECRET_TYPES, SeedPhraseType } from '../../constants/enum';
import {
  generateWalletFromMnemonic,
  IAccountDetailWithChain,
} from '../../core/Address';
import { saveCredentialsToKeychain } from '../../core/Keychain';
import { copyToClipboard, HdWalletContext } from '../../core/util';
import { isAndroid } from '../../misc/checkers';
import {
  CyDIcons,
  CyDMaterialDesignIcons,
  CyDSafeAreaView,
  CyDScrollView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindComponents';
import { setFirstLaunchAfterWalletCreation } from '../../core/asyncStorage';
import { showToast } from '../../containers/utilities/toastUtility';
import Toast from 'react-native-toast-message';
import { toastConfig } from '../../components/v2/toast';
import { useGlobalBottomSheet } from '../../components/v2/GlobalBottomSheetProvider';

interface RouteParams {
  seedPhraseType: SeedPhraseType;
}

// Component to render individual seed phrase word with number
const SeedPhraseWord = ({
  word,
  index,
  totalWords,
}: {
  word: string;
  index: number;
  totalWords: number;
}) => {
  // Check if this word is in the last row (last 3 words)
  const isLastRow = index > totalWords - 3;

  return (
    <CyDView
      className={`w-[33.33%] px-[4px] flex-row items-center justify-center ${isLastRow ? 'mb-0' : 'mb-[24px]'}`}>
      <CyDText className='text-primaryText text-[16px] font-normal text-center'>
        {index}. {word}
      </CyDText>
    </CyDView>
  );
};

function CreateSeedPhrase() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();

  const { t } = useTranslation();
  const isFocused = useIsFocused();

  const { seedPhraseType = SeedPhraseType.TWELVE_WORDS } = route.params;
  const [seedPhrase, setSeedPhrase] = useState<string>('');
  const [wallet, setWallet] = useState<{
    accounts: IAccountDetailWithChain[];
    mnemonic: string;
    privateKey: string;
  }>();
  const [loading, setLoading] = useState<boolean>(true);
  const [showSeedPhrase, setShowSeedPhrase] = useState<boolean>(false);
  const { showBottomSheet } = useGlobalBottomSheet();

  const maskedSeedPhrase =
    seedPhraseType === SeedPhraseType.TWELVE_WORDS
      ? new Array(12).fill('******')
      : new Array(24).fill('******');
  const hdWalletContext = useContext<any>(HdWalletContext);

  /**
   * Generates a new mnemonic seed phrase based on the specified type
   * Uses bip39 library to create either 12 or 24 word seed phrases
   */
  const generateMnemonic = async () => {
    try {
      const generatedSeedPhrase =
        seedPhraseType === SeedPhraseType.TWELVE_WORDS
          ? await bip39.generateMnemonic()
          : await bip39.generateMnemonic(256);
      setSeedPhrase(generatedSeedPhrase);
    } catch (error) {
      console.error('Error generating mnemonic:', error);
      // Handle error appropriately - could show error message or navigate back
    }
  };

  /**
   * Generates wallet data from the provided mnemonic
   * Creates wallet with index 0 by default for seed phrase imports
   */
  const generateWallet = async (mnemonic: string, trkEvent: string) => {
    try {
      const generatedWallet = await generateWalletFromMnemonic(
        mnemonic,
        0, // when imported via seedphrase we generate with index 0 by default
      );
      setWallet(generatedWallet);
    } catch (error) {
      console.error('Error generating wallet:', error);
      // Handle error appropriately
    }
  };

  /**
   * Toggles the visibility of the seed phrase between shown and masked states
   */
  const toggleSeedPhraseVisibility = () => {
    setShowSeedPhrase(!showSeedPhrase);
  };

  /**
   * Copies the seed phrase to clipboard without showing any toast notification
   */
  const handleCopySeedPhrase = () => {
    copyToClipboard(seedPhrase);
    Toast.show({
      type: 'success',
      text1: 'Copied to clipboard',
    });
  };

  /**
   * Saves the wallet credentials to keychain and proceeds to portfolio
   * This completes the wallet creation process
   */
  const proceedToPortfolio = async () => {
    if (wallet) {
      try {
        await saveCredentialsToKeychain(
          hdWalletContext,
          wallet,
          SECRET_TYPES.MENEMONIC,
        );
        await setFirstLaunchAfterWalletCreation(true);
      } catch (error) {
        console.error('Error saving credentials:', error);
        // Handle error appropriately
      }
    }
  };

  /**
   * Displays the seed phrase QR code inside a global bottom sheet
   */
  const handleShowQR = () => {
    const ethAddress =
      wallet?.accounts.find(a => a.name === 'ethereum')?.address ?? '';
    const formattedAddress = ethAddress
      ? `${ethAddress.slice(0, 6)}...${ethAddress.slice(-6)}`
      : '';

    showBottomSheet({
      id: 'seed-phrase-qr',
      snapPoints: ['60%', '90%'],
      showCloseButton: true,
      scrollable: true,
      content: (
        <CyDView className='bg-n20 px-[25px] pb-[54px] pt-[16px]'>
          <CyDText className='font-bold text-[22px] text-center mb-[24px]'>
            Recovery Phrase
          </CyDText>

          {/* Ethereum Address Display */}
          {formattedAddress !== '' && (
            <CyDView className='items-center'>
              <CyDText className='text-n200 text-[14px] font-medium'>
                {formattedAddress}
              </CyDText>
            </CyDView>
          )}

          <CyDView className='flex justify-center items-center mt-[16px] mb-[44px]'>
            <CyDView className='rounded-[12px] p-[8px] bg-white'>
              <QRCode
                content={seedPhrase}
                codeStyle='dot'
                size={180}
                logo={AppImagesMap.common.QR_LOGO}
                logoSize={60}
              />
            </CyDView>
          </CyDView>

          {/* Security Warning */}
          <CyDView className='bg-red400 rounded-[12px] p-[16px] mx-[8px] mb-[8px]'>
            <CyDView className='flex-row items-start'>
              <CyDMaterialDesignIcons
                name='school'
                size={24}
                className='text-white mr-[12px] mt-[2px] flex-shrink-0'
              />
              <CyDText className='text-white text-[14px] flex-1 leading-[20px] font-medium'>
                Please refrain from sharing this QR code with anyone or any
                unknown applications. Anyone who has access to this QR code can
                gain access to all of your assets.
              </CyDText>
            </CyDView>
          </CyDView>
        </CyDView>
      ),
    });
  };

  // Generate mnemonic on component mount
  useEffect(() => {
    if (seedPhrase === '') {
      void generateMnemonic();
    }
  }, []);

  // Handle screenshot prevention on Android
  useEffect(() => {
    if (isFocused) {
      if (isAndroid()) NativeModules.PreventScreenshotModule.forbid();
    } else {
      if (isAndroid()) NativeModules.PreventScreenshotModule.allow();
    }
  }, [isFocused]);

  // Generate wallet when seed phrase is available
  useEffect(() => {
    if (seedPhrase) {
      void generateWallet(seedPhrase, 'create_wallet');
      setLoading(false);
    }
  }, [seedPhrase]);

  return (
    <CyDSafeAreaView className='bg-n20 flex-1'>
      <Toast config={toastConfig} position={'bottom'} bottomOffset={140} />
      {loading ? (
        <Loading />
      ) : (
        <CyDView className='flex-1'>
          <CyDScrollView
            className='flex-1'
            showsVerticalScrollIndicator={false}>
            {/* Header with Logo and Title */}
            <CyDView className='items-center pt-[36px] pb-[30px]'>
              <CyDView className='w-[64px] h-[64px] bg-blue-500 rounded-[12px] items-center justify-center mb-[24px]'>
                <CyDIcons name='shield-tick' size={28} className='text-white' />
              </CyDView>

              <CyDText className='text-primaryText text-[18px] font-bold text-center px-[40px] leading-[26px]'>
                These words unlock your wallet,{'\n'}Keep them safe.
              </CyDText>
            </CyDView>

            {/* Seed Phrase Grid */}
            {seedPhrase.length > 0 && (
              <CyDView className='px-[24px] mb-[16px]'>
                {/* Show/Hide Toggle */}
                <CyDView className='flex-row justify-end mb-[16px]'>
                  <CyDTouchView
                    onPress={toggleSeedPhraseVisibility}
                    className='flex-row items-center'>
                    <CyDMaterialDesignIcons
                      name={showSeedPhrase ? 'eye-outline' : 'eye-off-outline'}
                      size={20}
                      className='text-base400 mr-[8px]'
                    />
                    <CyDText className='text-base400 text-[14px] font-medium'>
                      {showSeedPhrase ? 'Hide' : 'Show'}
                    </CyDText>
                  </CyDTouchView>
                </CyDView>

                {/* Seed Phrase Words Grid */}
                <CyDView className='flex-row flex-wrap justify-start px-[8px] py-[16px] bg-base40 rounded-[12px]'>
                  {(showSeedPhrase
                    ? seedPhrase.split(' ')
                    : maskedSeedPhrase
                  ).map((word, index) => (
                    <SeedPhraseWord
                      key={index}
                      word={word}
                      index={index + 1}
                      totalWords={
                        showSeedPhrase
                          ? seedPhrase.split(' ').length
                          : maskedSeedPhrase.length
                      }
                    />
                  ))}
                </CyDView>
              </CyDView>
            )}

            {/* Recommendation Section */}
            <CyDView className='bg-base40 rounded-[8px] p-[16px] mx-[24px] mb-[16px]'>
              <CyDView className='flex-row items-start'>
                <CyDMaterialDesignIcons
                  name='school'
                  size={24}
                  className='text-n200 mr-[12px] mt-[2px]'
                />
                <CyDText className='text-n200 text-[12px] flex-1 leading-[16px]'>
                  We recommend writing down this seed on paper and storing it
                  securely in a place only you can access.
                </CyDText>
              </CyDView>
            </CyDView>

            {/* Action Buttons */}
            <CyDView className='flex-row justify-center px-[20px] mb-[30px]'>
              <CyDTouchView
                onPress={handleShowQR}
                className='flex-row items-center justify-center bg-n0 border border-n40 rounded-[25px] py-[12px] px-[24px] mr-[12px] flex-1'>
                <CyDMaterialDesignIcons
                  name='qrcode'
                  size={16}
                  className='text-base400 mr-[8px]'
                />
                <CyDText className='text-base400 text-[14px] font-bold text-center'>
                  Show QR
                </CyDText>
              </CyDTouchView>

              <CyDTouchView
                onPress={handleCopySeedPhrase}
                className='flex-row items-center justify-center bg-n0 border border-n40 rounded-[25px] py-[12px] px-[24px] flex-1'>
                <CyDMaterialDesignIcons
                  name='content-copy'
                  size={16}
                  className='text-base400 mr-[8px]'
                />
                <CyDText className='text-base400 text-[14px] font-bold text-center'>
                  Copy Seed
                </CyDText>
              </CyDTouchView>
            </CyDView>
          </CyDScrollView>

          {/* Fixed Bottom Section */}
          <CyDView className='bg-n20 pt-[8px]'>
            {/* Continue Button */}
            <CyDView className='px-[20px] mb-[20px]'>
              <Button
                title='Continue'
                onPress={() => {
                  void proceedToPortfolio();
                }}
                type={ButtonType.PRIMARY}
                style='w-full rounded-[30px]'
                titleStyle='text-[20px] font-bold'
                paddingY={14}
              />
            </CyDView>

            {/* Security Audit */}
            <CyDView className='flex-row px-[20px] mb-[4px] items-center justify-center'>
              <CyDMaterialDesignIcons
                name='shield-check'
                size={16}
                className='text-base400 mr-[6px]'
              />
              <CyDText className='text-primaryText text-[10px] font-bold text-center'>
                {t('CYPHER_AUDIT_TEXT')}
              </CyDText>
            </CyDView>
          </CyDView>
        </CyDView>
      )}
    </CyDSafeAreaView>
  );
}

export default CreateSeedPhrase;
