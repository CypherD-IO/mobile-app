package com.cypherd.androidwallet;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.google.android.play.core.integrity.IntegrityManagerFactory;
import com.google.android.play.core.integrity.IntegrityTokenRequest;
import com.google.android.play.core.integrity.IntegrityTokenResponse;
import android.util.Log;
import java.security.SecureRandom;

public class IntegrityModule extends ReactContextBaseJavaModule {
    private final ReactApplicationContext reactContext;

    public IntegrityModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return "IntegrityModule";
    }

    @ReactMethod
    public void getIntegrityToken(String nonce, Promise promise) {
        Log.d("IntegrityModule", "Requesting integrity token with nonce: " + nonce);
        var integrityManager = IntegrityManagerFactory.create(reactContext);
        integrityManager
            .requestIntegrityToken(
                IntegrityTokenRequest.builder()
                    .setNonce(nonce)
                    .setCloudProjectNumber(BuildConfig.CLOUD_PROJECT_NUMBER)
                    .build())
            .addOnSuccessListener(response -> {
                String token = response.token();
                promise.resolve(token);
            })
            .addOnFailureListener(exception -> {
                promise.reject("ERROR", "Failed to get integrity token: " + exception.getMessage());
            });
    }
}