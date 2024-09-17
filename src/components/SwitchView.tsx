import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Colors } from '../constants/theme';
import { CyDText } from '../styles/tailwindStyles';
const { DynamicView, DynamicTouchView } = require('../styles');

export default function SwitchView(props) {
  const { title1, title2, index, setIndexChange } = props;
  const [refresh, setRefresh] = useState(false);
  const { t } = useTranslation();

  return (
    <DynamicView
      dynamic
      dynamicHeightFix
      height={35}
      bGC={Colors.switchColor}
      mT={10}
      pB={5}
      pT={5}
      bR={30}
      pH={5}
      pV={5}
      jC={'flex-start'}
      fD={'row'}>
      <DynamicTouchView
        sentry-label='show-tokens'
        dynamic
        dynamicHeight
        height={100}
        bGC={index == 0 ? Colors.buttonColor : ''}
        bR={30}
        jC={'center'}
        onPress={() => {
          setIndexChange(0);
        }}>
        <CyDText className='ml-[10px] mx-[10px] font-bold text-[14px]'>
          {title1}
        </CyDText>
      </DynamicTouchView>

      <DynamicTouchView
        sentry-label='show-nft'
        dynamic
        dynamicHeight
        height={100}
        bGC={index == 1 ? Colors.buttonColor : ''}
        bR={30}
        jC={'center'}
        onPress={() => {
          setIndexChange(1);
        }}>
        <CyDText className='ml-[10px] mx-[10px] font-bold text-[14px]'>
          {title2}
        </CyDText>
      </DynamicTouchView>
    </DynamicView>
  );
}
