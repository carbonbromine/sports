package com.carbonbromine.sports;

import android.os.Bundle;
import com.carbonbromine.sports.widget.HomeWidgetPlugin;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(HomeWidgetPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
