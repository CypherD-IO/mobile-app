import styled, { css } from 'styled-components/native';
import { scale, verticalScale } from 'react-native-size-matters';
import * as C from '../constants';
import { Colors } from '../constants/theme';

export const CText = styled.Text`
  ${(props) =>
    props.dynamic &&
    css`
      font-family: ${props.fF ? props.fF : C.fontsName.FONT_REGULAR};
      text-align: ${props.tA ? props.tA : 'center'};
      color: ${props.color ? props.color : Colors.secondaryColor};
      font-size: ${scale(props.fS ? props.fS : 16)}px;
      margin-top: ${scale(props.mT ? props.mT : 0)}px;
      margin-left: ${scale(props.mL ? props.mL : 0)}px;
      margin-horizontal: ${scale(props.mH ? props.mH : 0)}px;
      padding-vertical: ${scale(props.pV ? props.pV : 0)}px;
      background-color: ${props.bGC ? props.bGC : 'transparent'};
      margin-bottom: ${scale(props.mB ? props.mB : 0)}px;
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
