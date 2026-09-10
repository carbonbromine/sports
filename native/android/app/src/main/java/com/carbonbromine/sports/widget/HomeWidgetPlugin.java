package com.carbonbromine.sports.widget;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "HomeWidget")
public class HomeWidgetPlugin extends Plugin {
    @PluginMethod
    public void requestPin(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            call.unavailable("Android 8.0 or newer is required to pin a widget.");
            return;
        }

        Context context = getContext();
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName provider = new ComponentName(context, HealthSummaryWidget.class);
        boolean supported = manager.isRequestPinAppWidgetSupported();
        boolean requested = supported && manager.requestPinAppWidget(provider, null, null);

        JSObject result = new JSObject();
        result.put("supported", supported);
        result.put("requested", requested);
        call.resolve(result);
    }

    @PluginMethod
    public void update(PluginCall call) {
        Context context = getContext();
        SharedPreferences.Editor editor = context
            .getSharedPreferences(HealthSummaryWidget.PREFERENCES, Context.MODE_PRIVATE)
            .edit();

        editor.putInt("steps", call.getInt("steps", 0));
        editor.putInt("stepGoal", call.getInt("stepGoal", 10000));
        editor.putInt("heartRate", call.getInt("heartRate", 0));
        editor.putInt("sleepMinutes", call.getInt("sleepMinutes", 0));
        editor.putInt("netCalories", call.getInt("netCalories", 0));
        editor.putString("nextPlan", call.getString("nextPlan", "暂无后续计划"));
        editor.putString("nextPlanTime", call.getString("nextPlanTime", ""));
        editor.putString("source", call.getString("source", "律动"));
        editor.putString("updatedAt", call.getString("updatedAt", "--:--"));
        editor.apply();

        HealthSummaryWidget.updateAll(context);
        JSObject result = new JSObject();
        result.put("updated", true);
        call.resolve(result);
    }
}
