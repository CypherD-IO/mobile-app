package com.cypherd.androidwallet

import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.google.android.play.core.integrity.IntegrityManager
import com.google.android.play.core.integrity.IntegrityManagerFactory
import com.google.android.play.core.integrity.IntegrityTokenRequest

class IntegrityModule(context: ReactApplicationContext) :
    ReactContextBaseJavaModule(context) {

    private val integrityManager: IntegrityManager =
        IntegrityManagerFactory.create(context)

    override fun getName(): String = "IntegrityModule"

    @ReactMethod
    fun getIntegrityToken(nonce: String, promise: Promise) {
        // Nonce is backend-sensitive — never log its raw value.
        Log.d(TAG, "Requesting integrity token")

        val request = IntegrityTokenRequest.builder()
            .setNonce(nonce)
            .build()

        integrityManager
            .requestIntegrityToken(request)
            .addOnSuccessListener { response ->
                promise.resolve(response.token())
            }
            .addOnFailureListener { err ->
                Log.e(TAG, "Play Integrity failed: ${err.message}")
                promise.reject("INTEGRITY_FAILED", err.message, err)
            }
    }

    private companion object {
        private const val TAG = "IntegrityModule"
    }
}
