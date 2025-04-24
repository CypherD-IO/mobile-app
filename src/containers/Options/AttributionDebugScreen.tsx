import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  RefreshControl,
  Alert,
  NativeModules,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CyDText } from '../../styles/tailwindComponents';
import analytics from '@react-native-firebase/analytics';
import { useInstallReferrer } from '../../hooks';
import { AsyncStorageKeys } from '../../constants/data';

interface AttributionData {
  [key: string]: any;
}

const { AttributionModule } = NativeModules;

const AttributionDebugScreen = ({ navigation }: any) => {
  const [attributionData, setAttributionData] =
    useState<AttributionData | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('Never');
  const [loading, setLoading] = useState(false);
  const [sentToFirebase, setSentToFirebase] = useState(false);
  const [testCampaignId, setTestCampaignId] = useState<string>('');
  const { referrerData, loading: hookLoading, error } = useInstallReferrer();

  const loadAttributionData = async () => {
    try {
      setLoading(true);
      // Get the stored attribution data
      const storedData = await AsyncStorage.getItem(
        AsyncStorageKeys.PROCESSED_REFERRER_CODE,
      );
      if (storedData) {
        setAttributionData(JSON.parse(storedData));
        setSentToFirebase(true); // Assume it was sent since it's stored
      } else {
        setAttributionData(null);
        setSentToFirebase(false);
      }

      // Update timestamp
      setLastUpdated(new Date().toLocaleString());
    } catch (error) {
      console.error('Error loading attribution data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAttributionData();
  }, []);

  // Update attribution data when referrerData from hook changes
  useEffect(() => {
    if (referrerData) {
      setAttributionData(referrerData);
      setLastUpdated(new Date().toLocaleString() + ' (From Hook)');
    }
  }, [referrerData]);

  const triggerRefresh = async () => {
    try {
      setLoading(true);

      if (Platform.OS === 'android' && NativeModules.InstallReferrerModule) {
        // Android implementation
        const result =
          await NativeModules.InstallReferrerModule.getInstallReferrerDetails();
        console.log('Fresh Android attribution data:', result);

        if (result) {
          await AsyncStorage.setItem(
            AsyncStorageKeys.PROCESSED_REFERRER_CODE,
            JSON.stringify(result),
          );
          setAttributionData(result);
          await analytics().logEvent('test_attribution', result);
          setSentToFirebase(true);
        }
      } else if (Platform.OS === 'ios' && NativeModules.AttributionModule) {
        console.log('Fetching iOS attribution data...');
        // iOS implementation
        const result =
          await NativeModules.AttributionModule.getAttributionData();
        console.log('Fresh iOS attribution data:', result);

        if (result) {
          await AsyncStorage.setItem(
            AsyncStorageKeys.PROCESSED_REFERRER_CODE,
            JSON.stringify(result),
          );
          setAttributionData(result);
          await analytics().logEvent('test_attribution', result);
          setSentToFirebase(true);
        }
      } else {
        Alert.alert(
          'Not Available',
          'Attribution module not available on this platform',
        );
      }

      setLastUpdated(new Date().toLocaleString());
    } catch (error) {
      console.error('Error getting attribution data:', error);
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      setLoading(false);
    }
  };

  const clearData = async () => {
    try {
      await AsyncStorage.removeItem(AsyncStorageKeys.PROCESSED_REFERRER_CODE);
      setAttributionData(null);
      setSentToFirebase(false);
      setLastUpdated(new Date().toLocaleString() + ' (Cleared)');
      Alert.alert('Success', 'Attribution data cleared');
    } catch (error) {
      Alert.alert('Error', 'Error clearing data: ' + String(error));
    }
  };

  const resendToFirebase = async () => {
    if (!attributionData) {
      Alert.alert('Error', 'No attribution data to send');
      return;
    }

    try {
      await analytics().logEvent('test_attribution', attributionData);
      setSentToFirebase(true);
      Alert.alert('Success', 'Data sent to Firebase');
    } catch (error) {
      Alert.alert('Error', 'Error sending to Firebase: ' + String(error));
    }
  };

  // New function to test with a custom campaign ID
  const testWithCustomCampaignId = async () => {
    if (
      Platform.OS !== 'ios' ||
      !AttributionModule ||
      !AttributionModule.getDebugAttributionData
    ) {
      Alert.alert(
        'Not Available',
        'Debug attribution is only available on iOS',
      );
      return;
    }

    try {
      setLoading(true);

      // Call the debug method with the custom campaign ID
      const result =
        await AttributionModule.getDebugAttributionData(testCampaignId);
      console.log('Test attribution data:', result);

      if (result) {
        await AsyncStorage.setItem(
          AsyncStorageKeys.PROCESSED_REFERRER_CODE,
          JSON.stringify(result),
        );
        setAttributionData(result);
        await analytics().logEvent('test_attribution', result);
        setSentToFirebase(true);
      }

      setLastUpdated(new Date().toLocaleString() + ' (Test Data)');
      Alert.alert(
        'Success',
        `Test attribution data created with campaign ID: ${testCampaignId}`,
      );
    } catch (error) {
      console.error('Error creating test attribution data:', error);
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      className='flex-1 bg-white'
      refreshControl={
        <RefreshControl
          refreshing={loading || hookLoading}
          onRefresh={loadAttributionData}
        />
      }>
      <View className='p-4'>
        <CyDText className='text-xl font-bold mb-2'>Attribution Debug</CyDText>

        <View className='bg-gray-100 p-3 rounded-lg mb-4'>
          <CyDText className='text-sm text-gray-500'>
            Platform: {Platform.OS}
          </CyDText>
          <CyDText className='text-sm text-gray-500'>
            Last Updated: {lastUpdated}
          </CyDText>
          <CyDText className='text-sm text-gray-500'>
            Sent to Firebase:{' '}
            <CyDText
              className={sentToFirebase ? 'text-green-500' : 'text-red-500'}>
              {sentToFirebase ? 'Yes' : 'No'}
            </CyDText>
          </CyDText>
          {error && (
            <CyDText className='text-sm text-red-500'>
              Error: {error.message}
            </CyDText>
          )}
        </View>

        <View className='flex-row justify-between mb-6'>
          <TouchableOpacity
            className='bg-blue-500 px-4 py-2 rounded-lg'
            onPress={triggerRefresh}>
            <CyDText className='text-white'>Refresh Attribution</CyDText>
          </TouchableOpacity>

          <TouchableOpacity
            className='bg-green-500 px-4 py-2 rounded-lg'
            onPress={resendToFirebase}>
            <CyDText className='text-white'>Resend to Firebase</CyDText>
          </TouchableOpacity>

          <TouchableOpacity
            className='bg-red-500 px-4 py-2 rounded-lg'
            onPress={clearData}>
            <CyDText className='text-white'>Clear Data</CyDText>
          </TouchableOpacity>
        </View>

        {Platform.OS === 'ios' && (
          <View className='bg-blue-50 p-4 rounded-lg mb-6'>
            <CyDText className='text-lg font-bold mb-2'>
              Test with Custom Campaign ID
            </CyDText>
            <CyDText className='text-sm mb-2'>
              Enter a campaign ID to simulate attribution data without going
              through the App Store.
            </CyDText>

            <TextInput
              className='border border-gray-300 rounded-lg p-2 mb-3'
              value={testCampaignId}
              onChangeText={setTestCampaignId}
              placeholder='Enter campaign ID (e.g., MYCAMPAIGN123)'
            />

            <TouchableOpacity
              className='bg-purple-500 px-4 py-2 rounded-lg'
              onPress={testWithCustomCampaignId}>
              <CyDText className='text-white text-center'>
                Test with This Campaign ID
              </CyDText>
            </TouchableOpacity>
          </View>
        )}

        <CyDText className='text-lg font-bold mb-2'>Attribution Data:</CyDText>

        <View className='bg-gray-100 p-4 rounded-lg mb-4'>
          {attributionData ? (
            Object.entries(attributionData).map(([key, value]) => (
              <View key={key} style={styles.row}>
                <CyDText className='font-bold'>{key}:</CyDText>
                <CyDText className='flex-1 ml-2'>
                  {typeof value === 'object'
                    ? JSON.stringify(value)
                    : String(value)}
                </CyDText>
              </View>
            ))
          ) : (
            <CyDText>No attribution data found</CyDText>
          )}
        </View>

        <View className='bg-gray-100 p-4 rounded-lg'>
          <CyDText className='font-bold mb-2'>Testing Instructions:</CyDText>
          <CyDText className='text-sm'>
            {Platform.OS === 'ios' ? (
              <>
                1. Use the "Test with Custom Campaign ID" section above for
                local testing{'\n'}
                2. For real attribution testing:{'\n'}
                3. Uninstall the app completely{'\n'}
                4. Install via this App Store link:{'\n'}
                https://apps.apple.com/us/app/cypherd-wallet/id1604120414?ct=YOURCAMPAIGN
                {'\n'}
                5. Open app and check this screen{'\n'}
                6. The "ct" parameter value will appear as the campaign ID
              </>
            ) : (
              <>
                1. Uninstall the app completely{'\n'}
                2. Use a test link with UTM parameters{'\n'}
                3. Install from Play Store via link{'\n'}
                4. Open app and check this screen{'\n'}
                5. Pull down to refresh if needed
              </>
            )}
          </CyDText>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: '#ddd',
  },
});

export default AttributionDebugScreen;
