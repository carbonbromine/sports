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
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import org.json.JSONArray;
import org.json.JSONObject;

public class PlanWidget extends AppWidgetProvider {
    static final String PREFERENCES = "rhythm_plan_widget";

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, manager, appWidgetId);
        }
    }

    static void updateAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName component = new ComponentName(context, PlanWidget.class);
        for (int appWidgetId : manager.getAppWidgetIds(component)) {
            updateAppWidget(context, manager, appWidgetId);
        }
    }

    private static void updateAppWidget(Context context, AppWidgetManager manager, int appWidgetId) {
        SharedPreferences data = context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE);
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_plan);

        WidgetState state = readState(data);

        views.setTextViewText(R.id.widget_date, state.dateLabel);
        views.setTextViewText(
            R.id.widget_progress_text,
            String.format(Locale.getDefault(), "%d / %d 已完成", state.completed, state.total)
        );
        views.setProgressBar(
            R.id.widget_progress,
            Math.max(1, state.total),
            Math.min(state.completed, state.total),
            false
        );
        views.setTextViewText(R.id.widget_next_time, state.nextTime.isEmpty() ? "下一项" : state.nextTime);
        views.setTextViewText(R.id.widget_next_title, state.nextTitle);
        views.setTextViewText(
            R.id.widget_next_meta,
            state.nextMeta.isEmpty() ? "点击打开律动安排计划" : state.nextMeta
        );

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

    private static WidgetState readState(SharedPreferences data) {
        WidgetState state = new WidgetState();
        state.dateLabel = data.getString("dateLabel", "今天");
        state.completed = data.getInt("completed", 0);
        state.total = data.getInt("total", 0);
        state.nextTitle = data.getString("nextTitle", "暂无待办计划");
        state.nextTime = data.getString("nextTime", "");
        state.nextMeta = data.getString("nextMeta", "");

        String today = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(new Date());
        state.dateLabel = new SimpleDateFormat("M月d日", Locale.getDefault()).format(new Date());
        String nextKey = null;
        try {
            JSONArray plans = new JSONArray(data.getString("plansJson", "[]"));
            state.completed = 0;
            state.total = 0;
            state.nextTitle = "暂无待办计划";
            state.nextTime = "";
            state.nextMeta = "";

            for (int index = 0; index < plans.length(); index++) {
                JSONObject plan = plans.getJSONObject(index);
                String date = plan.optString("date");
                String time = plan.optString("time");
                boolean done = plan.optBoolean("done");
                if (today.equals(date)) {
                    state.total++;
                    if (done) state.completed++;
                }

                String key = date + " " + time;
                if (!done && date.compareTo(today) >= 0 && (nextKey == null || key.compareTo(nextKey) < 0)) {
                    nextKey = key;
                    state.nextTitle = plan.optString("title", "未命名计划");
                    state.nextTime = today.equals(date)
                        ? "今天 " + time
                        : date.substring(5).replace("-", "/") + " " + time;
                    String type = "meal".equals(plan.optString("type")) ? "饮食" : "运动";
                    int duration = plan.optInt("duration", 0);
                    String note = plan.optString("note");
                    state.nextMeta = type;
                    if (duration > 0) state.nextMeta += " · " + duration + " 分钟";
                    if (!note.isEmpty()) state.nextMeta += " · " + note;
                }
            }
        } catch (Exception ignored) {
            // Retain the latest summary if the persisted plan list is unavailable.
        }
        return state;
    }

    private static class WidgetState {
        String dateLabel;
        int completed;
        int total;
        String nextTitle;
        String nextTime;
        String nextMeta;
    }
}
