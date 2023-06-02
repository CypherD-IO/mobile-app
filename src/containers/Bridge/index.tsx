/**
 * @format
 * @flow
 */
import React, { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ImageBackground } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import AppImages from '../../../assets/images/appImages';
import * as C from '../../constants/index';
import { Colors } from '../../constants/theme';
import { HdWalletContext } from '../../core/util';
import { DynamicTouchView } from '../../styles/viewStyle';
import analytics from '@react-native-firebase/analytics';
const {
  SafeAreaView,
  DynamicView,
  CText,
  DynamicImage
} = require('../../styles');

export default function ShortcutScreen (props) {
  // NOTE: DEFINE VARIABLE 🍎🍎🍎🍎🍎🍎
  const { t } = useTranslation();
  const hdWallet = useContext<any>(HdWalletContext);
  const [data, setData] = useState<any>({});
  const ethereum = hdWallet.state.wallet.ethereum;

  // NOTE: DEFINE HOOKS 🍎🍎🍎🍎🍎🍎

  // NOTE: LIFE CYCLE METHOD 🍎🍎🍎🍎🍎

  // NOTE: HELPER METHOD 🍎🍎🍎🍎🍎

  useEffect(() => {
    setData([
      {
        id: '0',
        title: 'Debit Card',
        image: AppImages.CREDIT_CARD,
        bgColor: '#D2DAE4',
        cardColor: '',
        full: true,
        website:
          'https://app.cypherd.io?source=app&address=' + ethereum.address
      },
      {
        id: '1',
        cardColor: '#3038BD',
        title: 'Bridge Tokens',
        image: AppImages.BRIDGETOKEN,
        bgColor: '#E0E1F5',
        website: 'https://in.search.yahoo.com/?fr2=inr'
      }
      // {
      //   id: "2",
      //   cardColor: "gray",
      //   title: "Bridge v2",
      //   image: AppImages.SHIELD,
      //   bgColor: "lightgray",
      //   website: "",
      // },
    ]);
  }, [hdWallet]);

  const renderItem = ({ item, index }) => {
    return (
      <DynamicTouchView
        sentry-label="shortcuts"
        dynamic
        bGC={item.bgColor}
        dynamicHeightFix
        height={80}
        bR={10}
        mT={8}
        jC={'center'}
        onPress={() => {
          if (index == 1) {
            analytics().logEvent('shortcut_bridge', { from: ethereum.address });
            props.navigation.navigate(C.screenTitle.BRIDGE_SCREEN);
          } else if (index == 0) {
            analytics().logEvent('shortcut_card', { from: ethereum.address });
            props.navigation.navigate(C.screenTitle.DEBIT_CARD_SCREEN, {
              params: { url: item.website }
            });
          } else {
            // analytics().logEvent("token_approval_screen", {
            //   from: ethereum.address,
            // });
            // props.navigation.navigate(C.screenTitle.BRIDGE_SCREEN);
          }
        }}
      >
        <DynamicView dynamic dynamicWidth width={100}>
          <ImageBackground
            source={AppImages.BG_CARD}
            style={{ height: '100%', width: '100%', flexDirection: 'row' }}
          >
            <DynamicView
              dynamic
              dynamicWidth
              width={50}
              aLIT={'flex-start'}
              jC={'center'}
            >
              <DynamicView
                dynamic
                dynamicWidth
                dynamicHeight
                height={75}
                bR={5}
                mL={20}
                width={65}
                bGC={item.cardColor}
                aLIT={'center'}
                jC={'center'}
              >
                <DynamicImage
                  dynamic
                  dynamicWidth
                  dynamicHeight
                  width={item.full ? 125 : 80}
                  height={item.full ? 125 : 80}
                  resizemode="contain"
                  source={item.image}
                />
              </DynamicView>
            </DynamicView>
            <DynamicView
              dynamic
              dynamicWidth
              width={45}
              mT={10}
              aLIT={'flex-end'}
            >
              <CText
                dynamic
                fF={C.fontsName.FONT_BLACK}
                fS={13}
                color={Colors.primaryTextColor}
              >
                {item.title}
              </CText>
              <DynamicImage
                dynamic
                dynamicWidth
                height={40}
                width={10}
                resizemode="contain"
                source={AppImages.RIGHT_ARROW_LONG}
              />
            </DynamicView>
          </ImageBackground>
        </DynamicView>
      </DynamicTouchView>
    );
  };

  // NOTE: LIFE CYCLE METHOD 🍎🍎🍎🍎
  return (
    <SafeAreaView dynamic>
      <DynamicView
        dynamic
        dynamicWidth
        dynamicHeight
        height={100}
        width={100}
        pH={10}
        jC="flex-start"
      >
        <CText
          dynamic
          fF={C.fontsName.FONT_EXTRA_BOLD}
          fS={24}
          mT={10}
          color={Colors.primaryTextColor}
        >
          {t('CypherD_Apps')}
        </CText>
        <FlatList
          data={data}
          style={{ width: '95%', marginTop: 10 }}
          renderItem={renderItem}
        />
      </DynamicView>
    </SafeAreaView>
  );
}
