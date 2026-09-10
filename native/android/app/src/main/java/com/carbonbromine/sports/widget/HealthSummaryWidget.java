package com.carbonbromine.sports.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;
import com.carbonbromine.sports.MainActivity;
import com.carbonbromine.sports.R;
import java.util.Locale;

public class HealthSummaryWidget extends AppWidgetProvider {
    static final String PREFERENCES = "rhythm_home_widget";

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, manager, appWidgetId);
        }
    }

    static void updateAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName component = new ComponentName(context, HealthSummaryWidget.class);
        int[] appWidgetIds = manager.getAppWidgetIds(component);
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, manager, appWidgetId);
        }
    }

    private static void updateAppWidget(Context context, AppWidgetManager manager, int appWidgetId) {
        SharedPreferences data = context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE);
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_health_summary);

        int steps = data.getInt("steps", 0);
        int stepGoal = Math.max(1, data.getInt("stepGoal", 10000));
        int heartRate = data.getInt("heartRate", 0);
        int sleepMinutes = data.getInt("sleepMinutes", 0);
        int netCalories = data.getInt("netCalories", 0);
        String nextPlan = data.getString("nextPlan", "打开律动安排今日计划");
        String nextPlanTime = data.getString("nextPlanTime", "");
        String source = data.getString("source", "等待 App 同步");
        String updatedAt = data.getString("updatedAt", "--:--");

        views.setTextViewText(R.id.widget_steps, String.format(Locale.getDefault(), "%,d", steps));
        views.setTextViewText(R.id.widget_step_goal, String.format(Locale.getDefault(), "/ %,d 步", stepGoal));
        views.setProgressBar(R.id.widget_step_progress, stepGoal, Math.min(steps, stepGoal), false);
        views.setTextViewText(R.id.widget_heart_rate, heartRate > 0 ? heartRate + " bpm" : "-- bpm");
        views.setTextViewText(R.id.widget_sleep, sleepMinutes > 0 ? formatSleep(sleepMinutes) : "--");
        views.setTextViewText(
            R.id.widget_calories,
            String.format(Locale.getDefault(), "%+d kcal", netCalories)
        );
        views.setTextViewText(
            R.id.widget_next_plan,
            nextPlanTime.isEmpty() ? nextPlan : nextPlanTime + "  " + nextPlan
        );
        views.setTextViewText(R.id.widget_updated, source + " · " + updatedAt);

        Intent openApp = new Intent(context, MainActivity.class);
        openApp.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            context,
            appWidgetId,
            openApp,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_root, pendingIntent);
        manager.updateAppWidget(appWidgetId, views);
    }

    private static String formatSleep(int minutes) {
        int hours = minutes / 60;
        int remainder = minutes % 60;
        if (hours == 0) return remainder + "分";
        if (remainder == 0) return hours + "小时";
        return hours + "时" + remainder + "分";
    }
}
