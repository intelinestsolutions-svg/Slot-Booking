package my.sabahbuskers.community;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.activity.result.ActivityResult;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
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

    @PluginMethod
    public void bootstrap(PluginCall call) {
        NotificationHelper.ensureChannel(getContext());
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
        NotificationHelper.ensureChannel(getContext());
        NotificationCompat.Builder b = new NotificationCompat.Builder(getContext(), NotificationHelper.channelId(getContext()))
            .setSmallIcon(R.mipmap.ic_launcher_foreground)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_ALARM);
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O && !NotificationHelper.isSilent(getContext())) {
            Uri custom = NotificationHelper.getSound(getContext());
            b.setSound(custom != null ? custom : Settings.System.DEFAULT_ALARM_ALERT_URI);
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
        NotificationHelper.schedule(getContext(), id, (long) epochMs, title, body);
        call.resolve();
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        String id = call.getString("id", "default");
        NotificationHelper.cancel(getContext(), id);
        call.resolve();
    }

    @PluginMethod
    public void getSound(PluginCall call) {
        JSObject out = new JSObject();
        Uri s = NotificationHelper.getSound(getContext());
        out.put("uri", s == null ? "" : s.toString());
        out.put("default", !NotificationHelper.isSilent(getContext()) && s == null);
        out.put("silent", NotificationHelper.isSilent(getContext()));
        call.resolve(out);
    }

    @PluginMethod
    public void listSounds(PluginCall call) {
        try {
            RingtoneManager rm = new RingtoneManager(getContext());
            rm.setType(RingtoneManager.TYPE_NOTIFICATION);
            java.util.List<JSObject> items = new java.util.ArrayList<>();
            android.database.Cursor cursor = rm.getCursor();
            int idx = 0;
            while (cursor.moveToNext()) {
                String uriStr = cursor.getString(RingtoneManager.URI_COLUMN_INDEX);
                if (uriStr == null) continue;
                String id = cursor.getString(RingtoneManager.ID_COLUMN_INDEX);
                String title = cursor.getString(RingtoneManager.TITLE_COLUMN_INDEX);
                Uri uri = Uri.parse("content://media/internal/audio/media/" + id);
                JSObject o = new JSObject();
                o.put("uri", uri.toString());
                o.put("title", title == null ? "Bunyi " + (idx + 1) : title);
                items.add(o);
                idx++;
            }
            JSObject out = new JSObject();
            out.put("sounds", items.toArray(new JSObject[0]));
            call.resolve(out);
        } catch (Exception e) {
            call.reject("Gagal memuat senarai bunyi: " + e.getMessage());
        }
    }

    @PluginMethod
    public void previewSound(PluginCall call) {
        stopPreviewInternal();
        String uriStr = call.getString("uri", "");
        try {
            if (!uriStr.isEmpty()) {
                Uri u = Uri.parse(uriStr);
                Ringtone rt = RingtoneManager.getRingtone(getContext(), u);
                if (rt != null) {
                    rt.play();
                    activePreview = rt;
                }
            }
            call.resolve();
        } catch (Exception e) {
            call.resolve();
        }
    }

    @PluginMethod
    public void stopPreview(PluginCall call) {
        stopPreviewInternal();
        call.resolve();
    }

    @PluginMethod
    public void setSound(PluginCall call) {
        String mode = call.getString("mode", "default"); // "default" | "silent" | "custom"
        String uri = call.getString("uri", "");
        String value = "default";
        if ("silent".equals(mode)) value = "silent";
        else if ("custom".equals(mode) && !uri.isEmpty()) value = uri;
        NotificationHelper.applySound(getContext(), value);
        JSObject out = new JSObject();
        Uri s = NotificationHelper.getSound(getContext());
        out.put("uri", s == null ? "" : s.toString());
        out.put("default", !NotificationHelper.isSilent(getContext()) && s == null);
        out.put("silent", NotificationHelper.isSilent(getContext()));
        call.resolve(out);
    }

    @PluginMethod
    public void pickSound(PluginCall call) {
        try {
            Intent intent = new Intent(RingtoneManager.ACTION_RINGTONE_PICKER);
            intent.putExtra(RingtoneManager.EXTRA_RINGTONE_TYPE, RingtoneManager.TYPE_NOTIFICATION);
            intent.putExtra(RingtoneManager.EXTRA_RINGTONE_TITLE, "Pilih bunyi pemberitahuan");
            intent.putExtra(RingtoneManager.EXTRA_RINGTONE_SHOW_DEFAULT, true);
            intent.putExtra(RingtoneManager.EXTRA_RINGTONE_SHOW_SILENT, true);
            Uri current = NotificationHelper.getSound(getContext());
            if (current != null) {
                intent.putExtra(RingtoneManager.EXTRA_RINGTONE_EXISTING_URI, current);
            }
            startActivityForResult(call, intent, "soundPicked");
        } catch (Exception e) {
            call.reject("Gagal membuka pemilih bunyi: " + e.getMessage());
        }
    }

    @ActivityCallback
    private void soundPicked(PluginCall call, ActivityResult result) {
        JSObject out = new JSObject();
        if (result != null && result.getResultCode() == Activity.RESULT_OK && result.getData() != null) {
            Uri picked = result.getData().getParcelableExtra(RingtoneManager.EXTRA_RINGTONE_PICKED_URI);
            NotificationHelper.applySound(getContext(), picked == null ? "silent" : picked.toString());
            out.put("uri", picked == null ? "" : picked.toString());
            out.put("default", false);
            out.put("silent", picked == null);
            call.resolve(out);
            return;
        }
        Uri current = NotificationHelper.getSound(getContext());
        out.put("uri", current == null ? "" : current.toString());
        out.put("default", !NotificationHelper.isSilent(getContext()) && current == null);
        out.put("silent", NotificationHelper.isSilent(getContext()));
        call.resolve(out);
    }

    private Ringtone activePreview = null;

    private void stopPreviewInternal() {
        try {
            if (activePreview != null && activePreview.isPlaying()) activePreview.stop();
        } catch (Exception ignored) {
        }
        activePreview = null;
    }

    @Override
    public void handleOnPause() {
        stopPreviewInternal();
        super.handleOnPause();
    }

    @Override
    public void handleOnDestroy() {
        stopPreviewInternal();
        super.handleOnDestroy();
    }

    private static int hash(String s) {
        int h = 7;
        for (int i = 0; i < s.length(); i++) h = h * 31 + s.charAt(i);
        return h;
    }
}