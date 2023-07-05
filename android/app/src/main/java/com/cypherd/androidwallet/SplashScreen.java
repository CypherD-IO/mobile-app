package com.cypherd.androidwallet;

import androidx.appcompat.app.AppCompatActivity;

import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;

import com.cypherd.androidwallet.R;
import com.facebook.react.ReactActivity;

public class SplashScreen extends AppCompatActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Intent intent = new Intent(this, com.cypherd.androidwallet.MainActivity.class);
        // Fix : https://github.com/invertase/react-native-firebase/issues/3469#issuecomment-614990736
        Bundle extras = getIntent().getExtras();
        if (extras != null) {
            intent.putExtras(extras);
        }
        startActivity(intent);
        finish();
    }
}