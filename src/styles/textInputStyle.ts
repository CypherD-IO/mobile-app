/**
 * @format
 * @flow
 */
/* eslint-disable */
import styled, {css} from 'styled-components/native';
import {scale} from 'react-native-size-matters';

export const Input = styled.TextInput`
  padding: ${scale(2)}px;
  margin: ${scale(2)}px;
  border: 2px solid ${(props) => props.theme.secondaryColor};
  border-radius: ${scale(3)}px;
  ${props =>
    props.dynamicBorderColor &&
    css`
      border: 1px solid ${props.borderColor};
      margin-top: ${scale(props.mT ? props.mT : 0)}px;
    `}
`;

export const WebsiteInput = styled.TextInput`
  padding: ${scale(3)}px;
  ${props =>
    props.dynamicBorderColor &&
    css`
      border: 1px solid ${props.borderColor};
      margin-top: ${scale(props.mT ? props.mT : 0)}px;
      margin-left: ${scale(props.mL ? props.mL : 10)}px;
      padding-left: ${scale(props.pL ? props.pL : 20)}px;
      background-color: ${props.bGC ? props.bGC : '#F5F7FF'};
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
`;
