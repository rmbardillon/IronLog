package com.example.ironlog;

import android.content.pm.ActivityInfo;
import android.content.res.Configuration;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        updateOrientationPolicy(getResources().getConfiguration());
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        updateOrientationPolicy(newConfig);
    }

    private void updateOrientationPolicy(Configuration config) {
        // Lock orientation to portrait on phones (< 600dp), allow all on tablets (>= 600dp)
        if (config.smallestScreenWidthDp < 600) {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
        } else {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
        }
    }
}
