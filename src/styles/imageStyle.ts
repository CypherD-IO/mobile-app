import styled, { css } from 'styled-components/native';
import { scale, verticalScale } from 'react-native-size-matters';

export const DynamicImage = styled.Image`
  ${props =>
    props.dynamic &&
    css`
      width: ${scale(props.width ? props.width : 20)}px;
      height: ${verticalScale(props.height ? props.height : 20)}px;
      margin-top: ${verticalScale(props.mT ? props.mT : 0)}px;
      margin-left: ${verticalScale(props.mL ? props.mL : 0)}px;
      margin-right: ${verticalScale(props.mR ? props.mR : 0)}px;
      resizemode: ${props.resizemode ? props.resizemode : 'contain'};
    `}
  ${props =>
    props.dynamicHeight &&
    css`
      height: ${props.height ? props.height : 0}%;
      background-color: ${props.bGC ? props.bGC : 'transparent'};
    `}
      ${props =>
    props.dynamicWidth &&
    css`
      width: ${props.width ? props.width : 50}%;
    `}
        ${props =>
    props.dynamicTintColor &&
    css`
      tint-color: ${props.tC ? props.tC : 'black'};
    `}
`;
