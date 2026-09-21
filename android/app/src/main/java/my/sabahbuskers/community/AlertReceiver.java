package my.sabahbuskers.community;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

public class AlertReceiver extends BroadcastReceiver {

    private static final String CHANNEL_ID = "sb_reminders";
    private static final Uri CHANNEL_SOUND = Settings.System.DEFAULT_ALARM_ALERT_URI;

    private void ensureChannel(Context ctx) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = ctx.getSystemService(NotificationManager.class);
            NotificationChannel existing = nm.getNotificationChannel(CHANNEL_ID);
            if (existing != null && !CHANNEL_SOUND.equals(existing.getSound())) {
                nm.deleteNotificationChannel(CHANNEL_ID);
            }
            NotificationChannel ch = new NotificationChannel(
                CHANNEL_ID, "Peringatan & Waktu Solat", NotificationManager.IMPORTANCE_HIGH);
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

    @Override
    public void onReceive(Context context, Intent intent) {
        String title = intent.getStringExtra("title");
        String body = intent.getStringExtra("body");
        if (title == null) title = "SBC";
        if (body == null) body = "";
        ensureChannel(context);
        NotificationCompat.Builder b = new NotificationCompat.Builder(context, CHANNEL_ID)
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
            NotificationManagerCompat.from(context)
                .notify((int) (Math.abs(title.hashCode() * 31L + body.hashCode()) % 100000), b.build());
        } catch (SecurityException ignored) {
        }
    }
}