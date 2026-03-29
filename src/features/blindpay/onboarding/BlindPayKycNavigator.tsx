import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BlindPayOnboardingFormProvider } from './BlindPayOnboardingFormContext';
import type { BlindPayKycStackParamList } from './BlindPayKycNavigation.types';
import BlindPayKycWizardScreen from './BlindPayKycWizardScreen';

const Stack = createNativeStackNavigator<BlindPayKycStackParamList>();

export default function BlindPayKycNavigator() {
  return (
    <BlindPayOnboardingFormProvider>
      <Stack.Navigator
        initialRouteName='BlindPayKycWizard'
        screenOptions={{ headerShown: false, animation: 'none' }}>
        <Stack.Screen
          name='BlindPayKycWizard'
          component={BlindPayKycWizardScreen}
        />
      </Stack.Navigator>
    </BlindPayOnboardingFormProvider>
  );
}
