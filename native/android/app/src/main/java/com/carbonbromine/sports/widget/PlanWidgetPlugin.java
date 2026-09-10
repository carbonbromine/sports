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

@CapacitorPlugin(name = "PlanWidget")
public class PlanWidgetPlugin extends Plugin {
    @PluginMethod
    public void requestPin(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            call.unavailable("Android 8.0 or newer is required to pin a widget.");
            return;
        }

        Context context = getContext();
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName provider = new ComponentName(context, PlanWidget.class);
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
            .getSharedPreferences(PlanWidget.PREFERENCES, Context.MODE_PRIVATE)
            .edit();

        editor.putString("dateLabel", call.getString("dateLabel", "今天"));
        editor.putInt("completed", call.getInt("completed", 0));
        editor.putInt("total", call.getInt("total", 0));
        editor.putString("nextTitle", call.getString("nextTitle", "暂无待办计划"));
        editor.putString("nextTime", call.getString("nextTime", ""));
        editor.putString("nextMeta", call.getString("nextMeta", ""));
        editor.putString("plansJson", call.getString("plansJson", "[]"));
        editor.apply();

        PlanWidget.updateAll(context);
        JSObject result = new JSObject();
        result.put("updated", true);
        call.resolve(result);
    }
}
