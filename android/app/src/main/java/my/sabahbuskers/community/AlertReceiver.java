package my.sabahbuskers.community;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

public class AlertReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        String title = intent.getStringExtra("title");
        String body = intent.getStringExtra("body");
        if (title == null) title = "SBC";
        if (body == null) body = "";
        NotificationHelper.ensureChannel(context);
        NotificationCompat.Builder b = new NotificationCompat.Builder(context, NotificationHelper.channelId(context))
            .setSmallIcon(R.mipmap.ic_launcher_foreground)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_ALARM);
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O && !NotificationHelper.isSilent(context)) {
            Uri custom = NotificationHelper.getSound(context);
            b.setSound(custom != null ? custom : Settings.System.DEFAULT_ALARM_ALERT_URI);
            b.setVibrate(new long[]{800, 600, 800, 600, 1200});
        }
        try {
            NotificationManagerCompat.from(context)
                .notify((int) (Math.abs(title.hashCode() * 31L + body.hashCode()) % 100000), b.build());
        } catch (SecurityException ignored) {
        }
    }
}