/**
 * @format
 * @flow
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator } from 'react-native';
import { Colors } from '../../constants/theme';
const {
  SafeAreaView,
  DynamicView
} = require('../../styles');

export default function Loading (props) {
  // NOTE: DEFINE VARIABLE 🍎🍎🍎🍎🍎🍎
  const { t } = useTranslation();

  // NOTE: LIFE CYCLE METHOD 🍎🍎🍎🍎🍎

  // NOTE: HELPER METHOD 🍎🍎🍎🍎🍎

  // NOTE: LIFE CYCLE METHOD 🍎🍎🍎🍎
  return (
        <SafeAreaView dynamic>
            <DynamicView dynamic dynamicWidth dynamicHeight height={100} width={100} jC='center'>
            <ActivityIndicator size="large" color={Colors.appColor} />
            </DynamicView>
        </SafeAreaView>
  );
}
