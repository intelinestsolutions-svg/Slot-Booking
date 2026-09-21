package my.sabahbuskers.community;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import org.json.JSONException;
import org.json.JSONObject;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;
import java.util.TimeZone;

public final class NotificationHelper {

    public static final String CHANNEL_ID = "sb_reminders";
    private static final int BASE_REQ = 4000;
    private static final Uri CHANNEL_SOUND = Settings.System.DEFAULT_ALARM_ALERT_URI;
    private static final String PREFS = "sb_scheduled_alarms";
    private static final String PREFS_SOUND = "sb_notif_sound";
    private static final String KEY_SOUND_URI = "sound_uri";

    private NotificationHelper() {
    }

    /** Stored value: absent/"default" = system default alarm, "silent" = no sound, else a sound URI. */
    private static String getSoundValue(Context ctx) {
        return ctx.getSharedPreferences(PREFS_SOUND, Context.MODE_PRIVATE)
            .getString(KEY_SOUND_URI, null);
    }

    public static boolean isSilent(Context ctx) {
        return "silent".equals(getSoundValue(ctx));
    }

    public static Uri getSound(Context ctx) {
        String s = getSoundValue(ctx);
        if (s == null || s.isEmpty() || "default".equals(s) || "silent".equals(s)) return null;
        return Uri.parse(s);
    }

    /**
     * Versioned channel id: every distinct sound keeps its own channel, so once a channel is
     * created Android never needs to mutate its sound (which is not reliably applied) — picking
     * a new library sound simply starts using the matching channel and the new sound always plays.
     */
    public static String channelId(Context ctx) {
        String v = getSoundValue(ctx);
        if (v == null || v.isEmpty() || "default".equals(v)) return CHANNEL_ID;
        if ("silent".equals(v)) return CHANNEL_ID + "_silent";
        return CHANNEL_ID + "_" + Integer.toHexString(v.hashCode());
    }

    /** Persist a sound choice and rebuild the channel set so the change applies immediately. */
    public static void applySound(Context ctx, String value) {
        ctx.getSharedPreferences(PREFS_SOUND, Context.MODE_PRIVATE)
            .edit().putString(KEY_SOUND_URI, value == null || value.isEmpty() ? "default" : value).apply();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = ctx.getSystemService(NotificationManager.class);
            for (NotificationChannel ch : nm.getNotificationChannels()) {
                if (ch != null && ch.getId().startsWith(CHANNEL_ID)) {
                    nm.deleteNotificationChannel(ch.getId());
                }
            }
        }
        ensureChannel(ctx);
    }

    public static void ensureChannel(Context ctx) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = ctx.getSystemService(NotificationManager.class);
            String id = channelId(ctx);
            Uri custom = getSound(ctx);
            boolean silent = isSilent(ctx);
            Uri effectiveSound = silent ? null : (custom != null ? custom : CHANNEL_SOUND);
            NotificationChannel existing = nm.getNotificationChannel(id);
            if (existing != null) {
                boolean soundOk = effectiveSound == null
                    ? existing.getSound() == null
                    : effectiveSound.equals(existing.getSound());
                if (soundOk && existing.getImportance() == NotificationManager.IMPORTANCE_HIGH) return;
                nm.deleteNotificationChannel(id);
            }
            NotificationChannel ch = new NotificationChannel(
                id, "Peringatan & Waktu Solat", NotificationManager.IMPORTANCE_HIGH);
            ch.setDescription("Peringatan tempahan slot, waktu setup dan waktu solat.");
            if (silent) {
                ch.setSound(null, null);
                ch.enableVibration(false);
            } else {
                ch.enableVibration(true);
                ch.setVibrationPattern(new long[]{800, 600, 800, 600, 1200});
                ch.setSound(effectiveSound,
                    new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .setFlags(AudioAttributes.FLAG_AUDIBILITY_ENFORCED)
                        .build());
            }
            nm.createNotificationChannel(ch);
        }
    }

    public static void schedule(Context ctx, String id, long when, String title, String body) {
        if (id == null || when <= System.currentTimeMillis()) {
            return;
        }
        ensureChannel(ctx);

        Intent intent = new Intent(ctx, AlertReceiver.class);
        intent.setAction("SBC_REMINDER");
        intent.putExtra("id", id);
        intent.putExtra("title", title);
        intent.putExtra("body", body);
        int requestCode = BASE_REQ + Math.abs(id.hashCode() % 20000);
        PendingIntent pi = PendingIntent.getBroadcast(ctx, requestCode, intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        try {
            am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, when, pi);
        } catch (SecurityException e) {
            am.set(AlarmManager.RTC_WAKEUP, when, pi);
        } catch (Exception e) {
            try {
                am.set(AlarmManager.RTC_WAKEUP, when, pi);
            } catch (Exception ignored) {
            }
        }
        persist(ctx, id, when, title, body);
    }

    public static void cancel(Context ctx, String id) {
        if (id == null) {
            return;
        }
        Intent intent = new Intent(ctx, AlertReceiver.class);
        intent.setAction("SBC_REMINDER");
        PendingIntent pi = PendingIntent.getBroadcast(ctx,
            BASE_REQ + Math.abs(id.hashCode() % 20000), intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        try {
            am.cancel(pi);
        } catch (Exception ignored) {
        }
        remove(ctx, id);
    }

    /** Re-arm every persisted, future alarm (called on BOOT_COMPLETED / app update). */
    public static void rescheduleAll(Context ctx) {
        List<StoredAlarm> alarms = loadAll(ctx);
        for (StoredAlarm a : alarms) {
            if (a.when > System.currentTimeMillis()) {
                schedule(ctx, a.id, a.when, a.title, a.body);
            } else {
                remove(ctx, a.id);
            }
        }
    }

    private static void persist(Context ctx, String id, long when, String title, String body) {
        try {
            SharedPreferences sp = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            JSONObject all = loadJson(sp);
            JSONObject one = new JSONObject();
            one.put("when", when);
            one.put("title", title == null ? "" : title);
            one.put("body", body == null ? "" : body);
            all.put(id, one);
            sp.edit().putString("alarms", all.toString()).apply();
        } catch (JSONException ignored) {
        }
    }

    private static void remove(Context ctx, String id) {
        SharedPreferences sp = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        JSONObject all = loadJson(sp);
        all.remove(id);
        sp.edit().putString("alarms", all.toString()).apply();
    }

    private static List<StoredAlarm> loadAll(Context ctx) {
        List<StoredAlarm> out = new ArrayList<>();
        SharedPreferences sp = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        JSONObject all = loadJson(sp);
        Iterator<String> it = all.keys();
        while (it.hasNext()) {
            try {
                String id = it.next();
                JSONObject one = all.getJSONObject(id);
                out.add(new StoredAlarm(id, one.optLong("when"), one.optString("title"), one.optString("body")));
            } catch (JSONException ignored) {
            }
        }
        return out;
    }

    private static JSONObject loadJson(SharedPreferences sp) {
        try {
            String raw = sp.getString("alarms", "{}");
            JSONObject all = new JSONObject(raw == null ? "{}" : raw);
            return all;
        } catch (JSONException e) {
            return new JSONObject();
        }
    }

    /** Epoch ms for "yyyy-MM-dd" + minutes-of-day, interpreted in Asia/Kuching. */
    public static long minutesToEpoch(String date, int minutes) {
        try {
            SimpleDateFormat df = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US);
            df.setTimeZone(TimeZone.getTimeZone("Asia/Kuching"));
            Date midnight = df.parse(date + "T00:00:00");
            return midnight.getTime() + minutes * 60000L;
        } catch (ParseException e) {
            return 0;
        }
    }

    private static final class StoredAlarm {
        final String id;
        final long when;
        final String title;
        final String body;

        StoredAlarm(String id, long when, String title, String body) {
            this.id = id;
            this.when = when;
            this.title = title;
            this.body = body;
        }
    }
}