package com.cypherd.androidwallet;

import android.content.Context;
import android.os.RemoteException;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.android.installreferrer.api.InstallReferrerClient;
import com.android.installreferrer.api.InstallReferrerStateListener;
import com.android.installreferrer.api.ReferrerDetails;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.module.annotations.ReactModule;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import java.io.UnsupportedEncodingException;
import java.net.URLDecoder;
import java.util.HashMap;
import java.util.Map;

@ReactModule(name = InstallReferrerModule.NAME)
public class InstallReferrerModule extends ReactContextBaseJavaModule {
    public static final String NAME = "InstallReferrerModule";
    private static final String TAG = "InstallReferrerModule";
    private final ReactApplicationContext reactContext;
    private InstallReferrerClient referrerClient;

    public InstallReferrerModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @NonNull
    @Override
    public String getName() {
        return NAME;
    }

    @ReactMethod
    public void getInstallReferrerDetails(Promise promise) {
        try {
            referrerClient = InstallReferrerClient.newBuilder(reactContext).build();
            referrerClient.startConnection(new InstallReferrerStateListener() {
                @Override
                public void onInstallReferrerSetupFinished(int responseCode) {
                    switch (responseCode) {
                        case InstallReferrerClient.InstallReferrerResponse.OK:
                            try {
                                ReferrerDetails response = referrerClient.getInstallReferrer();
                                String referrerUrl = response.getInstallReferrer();
                                long referrerClickTimeSec = response.getReferrerClickTimestampSeconds();
                                long appInstallTimeSec = response.getInstallBeginTimestampSeconds();
                                String appVersion = response.getInstallVersion();
                                boolean googlePlayInstant = response.getGooglePlayInstantParam();

                                WritableMap referrerMap = Arguments.createMap();
                                referrerMap.putString("install_referrer", referrerUrl);
                                referrerMap.putDouble("referrer_click_timestamp_seconds", referrerClickTimeSec);
                                referrerMap.putDouble("install_begin_timestamp_seconds", appInstallTimeSec);
                                referrerMap.putString("install_version", appVersion);
                                referrerMap.putBoolean("google_play_instant", googlePlayInstant);

                                // Parse the UTM parameters from the referrerUrl
                                Map<String, String> utmParams = parseReferrerUrl(referrerUrl);
                                for (Map.Entry<String, String> entry : utmParams.entrySet()) {
                                    referrerMap.putString(entry.getKey(), entry.getValue());
                                }

                                Log.d(TAG, "Install referrer data retrieved successfully: " + referrerUrl);
                                
                                // Resolve the promise with the referrer data
                                promise.resolve(referrerMap);
                            } catch (RemoteException e) {
                                promise.reject("REMOTE_EXCEPTION", "Error getting referrer details", e);
                                Log.e(TAG, "RemoteException while retrieving referrer: " + e.getMessage());
                            } finally {
                                referrerClient.endConnection();
                            }
                            break;
                        case InstallReferrerClient.InstallReferrerResponse.FEATURE_NOT_SUPPORTED:
                            promise.reject("FEATURE_NOT_SUPPORTED", "Install Referrer API not supported on this device");
                            Log.w(TAG, "Install Referrer API not supported on this device");
                            break;
                        case InstallReferrerClient.InstallReferrerResponse.SERVICE_UNAVAILABLE:
                            promise.reject("SERVICE_UNAVAILABLE", "Connection couldn't be established");
                            Log.w(TAG, "Install Referrer service unavailable");
                            break;
                        default:
                            promise.reject("SETUP_FAILED", "Setup failed with code: " + responseCode);
                            Log.w(TAG, "Install Referrer setup failed with code: " + responseCode);
                    }
                }

                @Override
                public void onInstallReferrerServiceDisconnected() {
                    Log.w(TAG, "Install Referrer service disconnected");
                }
            });
        } catch (Exception e) {
            promise.reject("UNEXPECTED_ERROR", "Error setting up referrer client", e);
            Log.e(TAG, "Exception during referrer setup: " + e.getMessage());
        }
    }
    
    // Required for NativeEventEmitter
    @ReactMethod
    public void addListener(String eventName) {
        // Keep: Required for RN built in Event Emitter support
    }

    // Required for NativeEventEmitter
    @ReactMethod
    public void removeListeners(Integer count) {
        // Keep: Required for RN built in Event Emitter support
    }
    
    private Map<String, String> parseReferrerUrl(String referrerUrl) {
        Map<String, String> params = new HashMap<>();
        
        try {
            String decodedUrl = URLDecoder.decode(referrerUrl, "UTF-8");
            String[] pairs = decodedUrl.split("&");
            
            for (String pair : pairs) {
                int idx = pair.indexOf("=");
                if (idx > 0) {
                    String key = pair.substring(0, idx);
                    String value = pair.substring(idx + 1);
                    params.put(key, value);
                }
            }
        } catch (UnsupportedEncodingException e) {
            Log.e(TAG, "Error decoding referrer URL", e);
        }
        
        return params;
    }
} 