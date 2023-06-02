import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Colors } from '../constants/theme';
import * as C from '../constants/index';
const {
  DynamicView,
  CText,
  DynamicTouchView
} = require('../styles');

export default function SwitchView (props) {
  const { title1, title2, index, setIndexChange } = props;
  const [refresh, setRefresh] = useState(false);
  const { t } = useTranslation();

  return (
        <DynamicView dynamic dynamicHeightFix height={35} bGC={Colors.switchColor}
        mT={10} pB={5} pT={5} bR={30} pH={5} pV={5} jC={'flex-start'} fD={'row'} >

        <DynamicTouchView sentry-label='show-tokens' dynamic dynamicHeight height={100} bGC={index == 0 ? Colors.appColor : ''}
         bR={30} jC={'center'} onPress={() => {
           setIndexChange(0);
         }}>
            <CText dynamic mL={10} mH={10} fF={C.fontsName.FONT_BOLD} fS={12} color={Colors.primaryTextColor}>{title1}</CText>
        </DynamicTouchView>

        <DynamicTouchView sentry-label='show-nft' dynamic dynamicHeight height={100} bGC={index == 1 ? Colors.appColor : ''}
         bR={30} jC={'center'} onPress={() => {
           setIndexChange(1);
         }}>
            <CText dynamic mL={10} mH={10} fF={C.fontsName.FONT_BOLD} fS={12} color={Colors.primaryTextColor}>{title2}</CText>
        </DynamicTouchView>

        </DynamicView>
  );
}
