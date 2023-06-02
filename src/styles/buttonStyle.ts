import React from 'react';
import styled, { css } from 'styled-components/native';
import { scale, verticalScale } from 'react-native-size-matters';

export const DynamicButton = styled.TouchableOpacity`
  ${(props) =>
    props.dynamic &&
    css`
      padding-vertical: ${scale(props.pV ? props.pV : 0)}px;
      padding-horizontal: ${scale(props.pH ? props.pH : 0)}px;
      margin-horizontal: ${scale(props.mH ? props.mH : 0)}px;
      border-radius: ${scale(props.bR ? props.bR : 0)}px;
      background-color: ${props.bGC ? props.bGC : 'transparent'};
      border-width: ${scale(props.bW ? props.bW : 0)}px;
      border-color: ${props.bC ? props.bC : 'transparent'};
      width: ${scale(props.width ? props.width : 0)}px;
      height: ${scale(props.height ? props.height : 0)}px;
      flex-direction: ${props.fD ? props.fD : 'row'};
      margin-top: ${scale(props.mT ? props.mT : 0)}px;
      align-items: ${props.aLIT ? props.aLIT : 'center'};
      justify-content: ${props.jC ? props.jC : 'center'};
      margin-bottom : ${props.mB ? props.mB : 0}px;
    `}
    ${(props) =>
        props.dynamicWidth &&
        css`
          width: ${props.width ? props.width : 0}%;
        `}
    `;
