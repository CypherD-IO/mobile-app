import * as React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { screenTitle } from '../constants/index';
import Loading from '../containers/Loading';

const Stack = createNativeStackNavigator();

function LoadingStack () {
  return (
        <Stack.Navigator initialRouteName={screenTitle.LOADING}>
            <Stack.Screen name={screenTitle.LOADING} component={Loading} options={{ headerShown: false }} />
        </Stack.Navigator>
  );
}

export default LoadingStack;
