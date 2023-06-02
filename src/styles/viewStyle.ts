import React from 'react';
import styled, { css } from 'styled-components/native';
import { scale, verticalScale } from 'react-native-size-matters';
import { Colors } from '../constants/theme';

export const SafeAreaView = styled.SafeAreaView`
  flex: 1;
  ${(props) =>
    props.dynamic &&
    css`
       background: ${props.bC ? props.bC : Colors.whiteColor};;
    `}
`;

export const DynamicView = styled.View`
  ${(props) =>
    props.dynamic &&
    css`
      justify-content: ${props.jC ? props.jC : 'space-between'};
      margin-vertical: ${scale(props.mV ? props.mV : 0)}px;
      margin-horizontal: ${scale(props.mH ? props.mH : 0)}px;
      padding-horizontal: ${scale(props.pH ? props.pH : 0)}px;
      padding-vertical: ${scale(props.pV ? props.pV : 0)}px;
      flex-direction: ${props.fD ? props.fD : 'column'};
      align-items: ${props.aLIT ? props.aLIT : 'center'};
      border-radius: ${scale(props.bR ? props.bR : 0)}px;
      background-color: ${props.bGC ? props.bGC : 'transparent'};
      border-color: ${props.bC ? props.bC : 'transparent'};
      margin-top: ${scale(props.mT ? props.mT : 0)}px;
      margin-right: ${scale(props.mR ? props.mR : 0)}px;
      margin-left: ${scale(props.mL ? props.mL : 0)}px;
      margin-bottom: ${scale(props.mB ? props.mB : 0)}px;
      padding-bottom: ${scale(props.pB ? props.pB : 0)}px;
      padding-top: ${scale(props.pT ? props.pT : 0)}px;
      border: ${scale(props.bO ? props.bO : 0)}px;
    `}
    ${(props) =>
    props.dynamicWidthFix &&
    css`
        width: ${scale(props.width ? props.width : 0)}px;
        `}
        ${(props) =>
    props.dynamicHeightFix &&
    css`
            height: ${scale(props.height ? props.height : 0)}px;
            `}
        ${(props) =>
    props.dynamicHeight &&
    css`
              height: ${props.height ? props.height : 0}%;
            `}
          ${(props) =>
    props.dynamicWidth &&
    css`
              width: ${props.width ? props.width : 0}%;
            `}
    `;

export const DynamicScrollView = styled.ScrollView`
  ${(props) =>
    props.dynamic &&
    css`
      margin-vertical: ${scale(props.mV ? props.mV : 0)}px;
      margin-horizontal: ${scale(props.mH ? props.mH : 0)}px;
      padding-horizontal: ${scale(props.pH ? props.pH : 0)}px;
      padding-vertical: ${scale(props.pV ? props.pV : 0)}px;
      flex-direction: ${props.fD ? props.fD : 'column'};
      border-radius: ${scale(props.bR ? props.bR : 0)}px;
      background-color: ${props.bGC ? props.bGC : 'transparent'};
      border-color: ${props.bC ? props.bC : 'transparent'};
      margin-top: ${scale(props.mT ? props.mT : 0)}px;
      border: ${scale(props.bO ? props.bO : 0)}px;
    `}
    ${(props) =>
    props.dynamicWidthFix &&
    css`
        width: ${scale(props.width ? props.width : 0)}px;
        `}
        ${(props) =>
    props.dynamicHeightFix &&
    css`
            height: ${scale(props.height ? props.height : 0)}px;
            `}
        ${(props) =>
    props.dynamicHeight &&
    css`
              height: ${props.height ? props.height : 0}%;
            `}
          ${(props) =>
    props.dynamicWidth &&
    css`
              width: ${props.width ? props.width : 0}%;
            `}
    `;

export const DynamicTouchView = styled.TouchableOpacity`
  ${(props) =>
    props.dynamic &&
    css`
      justify-content: ${props.jC ? props.jC : 'space-between'};
      margin-vertical: ${scale(props.mV ? props.mV : 0)}px;
      margin-left: ${scale(props.mL ? props.mL : 0)}px;
      margin-horizontal: ${scale(props.mH ? props.mH : 0)}px;
      padding-horizontal: ${scale(props.pH ? props.pH : 0)}px;
      padding-vertical: ${scale(props.pV ? props.pV : 0)}px;
      flex-direction: ${props.fD ? props.fD : 'column'};
      align-items: ${props.aLIT ? props.aLIT : 'center'};
      border-radius: ${scale(props.bR ? props.bR : 0)}px;
      background-color: ${props.bGC ? props.bGC : 'transparent'};
      margin-top: ${scale(props.mT ? props.mT : 0)}px;
      margin-Bottom: ${scale(props.mB ? props.mB : 0)}px;
      border-width: ${scale(props.bO ? props.bO : 0)}px;
      border-color: ${props.bC ? props.bC : 'black'};
    `}
    ${(props) =>
    props.dynamicWidthFix &&
    css`
        width: ${scale(props.width ? props.width : 0)}px;
        `}
        ${(props) =>
    props.dynamicHeightFix &&
    css`
            height: ${scale(props.height ? props.height : 0)}px;
            `}
        ${(props) =>
    props.dynamicHeight &&
    css`
              height: ${props.height ? props.height : 0}%;
            `}
          ${(props) =>
    props.dynamicWidth &&
    css`
              width: ${props.width ? props.width : 0}%;
            `}
    `;

export const SepraterView = styled.View`
    ${(props) =>
    props.dynamic &&
    css`
        margin-vertical: ${scale(props.mV ? props.mV : 0)}px;
        margin-horizontal: ${scale(props.mH ? props.mH : 0)}px;
        margin-bottom: ${scale(props.mT ? props.mT : 0)}px;
        padding-horizontal: ${scale(props.pH ? props.pH : 0)}px;
        padding-vertical: ${scale(props.pV ? props.pV : 0)}px;
        flex-direction: ${props.fD ? props.fD : 'column'};
        align-items: ${props.aLIT ? props.aLIT : 'center'};
        border-radius: ${scale(props.bR ? props.bR : 0)}px;
        background-color: ${props.bGC ? props.bGC : Colors.sepratorColor};
        border-color: ${props.bC ? props.bC : 'transparent'};
        height: ${props.hE ? props.hE : 1}px;
        width: ${props.width ? props.width : 85}%;
      `}
      `;

export const ModalView = styled.View`
  ${(props) =>
    props.dynamic &&
    css`
      justify-content: ${props.jC ? props.jC : 'space-between'};
      margin-vertical: ${scale(props.mV ? props.mV : 0)}px;
      margin-horizontal: ${scale(props.mH ? props.mH : 0)}px;
      padding-horizontal: ${scale(props.pH ? props.pH : 0)}px;
      padding-vertical: ${scale(props.pV ? props.pV : 0)}px;
      flex-direction: ${props.fD ? props.fD : 'column'};
      align-items: ${props.aLIT ? props.aLIT : 'center'};
      border-radius: ${scale(props.bR ? props.bR : 0)}px;
      background-color: ${props.bGC ? props.bGC : 'transparent'};
      border-color: ${props.bC ? props.bC : 'transparent'};
    `}
    ${(props) =>
    props.dynamicWidthFix &&
    css`
        width: ${scale(props.width ? props.width : 0)}px;
        `}
        ${(props) =>
    props.dynamicHeightFix &&
    css`
            height: ${scale(props.height ? props.height : 0)}px;
            `}
        ${(props) =>
    props.dynamicHeight &&
    css`
              height: ${props.height ? props.height : 0}%;
            `}
          ${(props) =>
    props.dynamicWidth &&
    css`
              width: ${props.width ? props.width : 0}%;
            `}
    `;
