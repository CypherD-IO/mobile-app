import React from 'react';
import { useTranslation } from 'react-i18next';
import { Colors } from '../constants/theme';
import * as C from '../constants/index';

const {
  DynamicView,
  DynamicImage,
  CText
} = require('../styles');

export default function BottomTracker (props) {
  const { index } = props;
  const { t } = useTranslation();

  return (
    <DynamicView dynamic dynamicWidth dynamicHeightFix width={100} height={50} pH={20} jC={'space-between'} fD={'row'} bGC={'white'} style={{
      shadowColor: Colors.borderColor,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.9,
      shadowRadius: 4,
      elevation: 5
    }}>
      <DynamicView dynamic dynamicHeightFix dynamicWidth width={16} height={4} bGC={index == 1 ? Colors.appColor : Colors.trackerColor} jC={'center'}>
      </DynamicView>
      <DynamicView dynamic dynamicHeightFix dynamicWidth width={16} height={4} bGC={index == 2 ? Colors.appColor : Colors.trackerColor} jC={'center'}>
      </DynamicView>
      <DynamicView dynamic dynamicHeightFix dynamicWidth width={16} height={4} bGC={index == 3 ? Colors.appColor : Colors.trackerColor} jC={'center'}>
      </DynamicView>
      <DynamicView dynamic dynamicHeightFix dynamicWidth width={16} height={4} bGC={index == 4 ? Colors.appColor : Colors.trackerColor} jC={'center'}>
      </DynamicView>
      <DynamicView dynamic dynamicHeightFix dynamicWidth width={20} height={50} jC={'center'}>
        <CText dynamic fF={C.fontsName.FONT_REGULAR} fS={15} color={Colors.primaryTextColor}>
          {index}/4
        </CText>

      </DynamicView>
    </DynamicView>
  );
}
