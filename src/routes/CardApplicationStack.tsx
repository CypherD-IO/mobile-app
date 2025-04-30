import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { screenTitle } from '../constants';
import BasicDetails from '../containers/DebitCard/CardV2/signup/application/basicDetails';
import ShippingAddress from '../containers/DebitCard/CardV2/signup/application/shippingAddress';
import AdditionalDetails from '../containers/DebitCard/CardV2/signup/application/additionalDetails';
import { FormProvider } from '../containers/DebitCard/CardV2/signup/application/FormContext';

const Stack = createNativeStackNavigator();

const CardApplicationStack = () => {
  return (
    <FormProvider>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}>
        <Stack.Screen
          name={screenTitle.BASIC_DETAILS}
          component={BasicDetails}
        />
        <Stack.Screen
          name={screenTitle.SHIPPING_ADDRESS}
          component={ShippingAddress}
        />
        <Stack.Screen
          name={screenTitle.ADDITIONAL_DETAILS}
          component={AdditionalDetails}
        />
      </Stack.Navigator>
    </FormProvider>
  );
};

export default CardApplicationStack;
