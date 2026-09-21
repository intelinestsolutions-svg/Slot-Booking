package my.sabahbuskers.community;

import android.Manifest;
import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "Notifier",
    permissions = {
        @Permission(alias = "notifications", strings = { Manifest.permission.POST_NOTIFICATIONS })
    }
)
public class NotifierPlugin extends Plugin {

    private static final String CHANNEL_ID = "sb_reminders";
    private static final int BASE_REQ = 4000;
    private static final Uri CHANNEL_SOUND = Settings.System.DEFAULT_ALARM_ALERT_URI;

    private void ensureChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = getContext().getSystemService(NotificationManager.class);
            NotificationChannel existing = nm.getNotificationChannel(CHANNEL_ID);
            if (existing != null && !CHANNEL_SOUND.equals(existing.getSound())) {
                nm.deleteNotificationChannel(CHANNEL_ID);
            }
            NotificationChannel ch = new NotificationChannel(
                CHANNEL_ID, "Peringatan & Waktu Solat", NotificationManager.IMPORTANCE_HIGH);
            ch.setDescription("Peringatan tempahan slot, waktu setup dan waktu solat.");
            ch.enableVibration(true);
            ch.setVibrationPattern(new long[]{800, 600, 800, 600, 1200});
            ch.setSound(CHANNEL_SOUND,
                new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .setFlags(AudioAttributes.FLAG_AUDIBILITY_ENFORCED)
                    .build());
            nm.createNotificationChannel(ch);
        }
    }

    @PluginMethod
    public void bootstrap(PluginCall call) {
        ensureChannel();
        call.resolve();
    }

    @PluginMethod
    public void request(PluginCall call) {
        requestPermissionForAlias("notifications", call, "notifPermissionCallback");
    }

    @PermissionCallback
    private void notifPermissionCallback(PluginCall call) {
        call.resolve();
    }

    @PluginMethod
    public void status(PluginCall call) {
        JSObject out = new JSObject();
        out.put("granted", getContext().checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
            == PackageManager.PERMISSION_GRANTED);
        call.resolve(out);
    }

    @PluginMethod
    public void notify(PluginCall call) {
        String title = call.getString("title", "");
        String body = call.getString("body", "");
        ensureChannel();
        NotificationCompat.Builder b = new NotificationCompat.Builder(getContext(), CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher_foreground)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_ALARM);
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            b.setSound(CHANNEL_SOUND);
            b.setVibrate(new long[]{800, 600, 800, 600, 1200});
        }
        try {
            NotificationManagerCompat.from(getContext())
                .notify((int) (Math.abs(hash(title + body)) % 100000), b.build());
        } catch (SecurityException ignored) {
        }
        call.resolve();
    }

    @PluginMethod
    public void schedule(PluginCall call) {
        String id = call.getString("id", "default");
        double epochMs = call.getDouble("date", 0.0);
        String title = call.getString("title", "");
        String body = call.getString("body", "");
        ensureChannel();

        long t = (long) epochMs;
        if (t <= System.currentTimeMillis()) {
            call.resolve();
            return;
        }

        Intent intent = new Intent(getContext(), AlertReceiver.class);
        intent.setAction("SBC_REMINDER");
        intent.putExtra("title", title);
        intent.putExtra("body", body);
        int requestCode = BASE_REQ + Math.abs(id.hashCode() % 20000);
        PendingIntent pi = PendingIntent.getBroadcast(getContext(), requestCode, intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        AlarmManager am = (AlarmManager) getContext().getSystemService(Context.ALARM_SERVICE);
        try {
            am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, t, pi);
        } catch (SecurityException e) {
            am.set(AlarmManager.RTC_WAKEUP, t, pi);
        } catch (Exception e) {
            try {
                am.set(AlarmManager.RTC_WAKEUP, t, pi);
            } catch (Exception ignored) {
            }
        }
        call.resolve();
    }

    private static int hash(String s) {
        int h = 7;
        for (int i = 0; i < s.length(); i++) h = h * 31 + s.charAt(i);
        return h;
    }
}