import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as React from 'react';
import { screenTitle } from '../constants';
import ConfirmPin from '../containers/PinAuthetication/confirmPin';
import PinValidation from '../containers/PinAuthetication/pinValidation';
import SetPin from '../containers/PinAuthetication/setPin';

const Stack = createNativeStackNavigator();

export default function PinAuthRoute({
  setPinAuthentication,
  initialScreen,
}: {
  setPinAuthentication: (pinAuthentication: boolean) => void;
  initialScreen: string;
}): JSX.Element {
  return (
    <Stack.Navigator initialRouteName={initialScreen}>
      <Stack.Screen name={screenTitle.SET_PIN} options={{ headerShown: false }}>
        {props => (
          <SetPin {...props} setPinAuthentication={setPinAuthentication} />
        )}
      </Stack.Screen>
      <Stack.Screen
        name={screenTitle.CONFIRM_PIN}
        options={{ headerShown: false }}>
        {props => (
          <ConfirmPin {...props} setPinAuthentication={setPinAuthentication} />
        )}
      </Stack.Screen>
      <Stack.Screen
        name={screenTitle.PIN_VALIDATION}
        options={{ headerShown: false }}>
        {props => (
          <PinValidation
            {...props}
            setPinAuthentication={setPinAuthentication}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
