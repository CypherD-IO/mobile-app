import React, { useState } from 'react';
import AppImages from '../../../assets/images/appImages';
import { useTranslation } from 'react-i18next';
import { CyDImage, CyDText, CyDView, CyDImageBackground, CyDTouchView } from '../../styles/tailwindStyles';
import clsx from 'clsx';
import { screenTitle } from '../../constants';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SolidCardScreen ({ navigation }) {
  const { t } = useTranslation();

  return (
        <SafeAreaView>
            <CyDText>Solid Card Page</CyDText>
        </SafeAreaView>
  );
}
