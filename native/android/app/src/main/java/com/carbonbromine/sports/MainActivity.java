package com.carbonbromine.sports;

import android.os.Bundle;
import com.carbonbromine.sports.widget.PlanWidgetPlugin;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PlanWidgetPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
