import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as React from 'react';
import { screenTitle } from '../constants';
import ConfirmPin from '../containers/PinAuthetication/confirmPin';
import PinValidation from '../containers/PinAuthetication/pinValidation';
import SetPin from '../containers/PinAuthetication/setPin';

const Stack = createNativeStackNavigator();

export default function PinAuthRoute (props: AnalyserNode) {
  return (
    <Stack.Navigator initialRouteName={props.initialScreen}>
      <Stack.Screen name={screenTitle.SET_PIN} component={SetPin} options={{ headerShown: false }} initialParams={{ setPinAuthentication: props.setPinAuthentication }} />
      <Stack.Screen name={screenTitle.CONFIRM_PIN} component={ConfirmPin} options={{ headerShown: false }} />
      <Stack.Screen name={screenTitle.PIN_VALIDATION} component={PinValidation} options={{ headerShown: false }} initialParams={{ setPinAuthentication: props.setPinAuthentication }} />
    </Stack.Navigator>
  );
}
