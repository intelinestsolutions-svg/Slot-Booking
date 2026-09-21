package my.sabahbuskers.community;

import android.content.Context;

import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Locale;

/**
 * Periodic background sync that keeps today's prayer alarms armed even when the
 * app is not opened. Runs on boot and on a repeating schedule; fetches the same
 * prayer data the web app uses and re-arms any prayer still in the future.
 */
public class PrayerSyncWorker extends Worker {

    private static final String PRAYER_API =
        "https://apps.sabahbuskers.my/api/prayer.php?action=today";

    public PrayerSyncWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        try {
            JSONObject data = fetchPrayerTimes();
            if (data == null || !data.optBoolean("ok", true)) {
                return Result.retry();
            }
            String date = data.optString("date", "");
            JSONArray prayers = data.optJSONArray("prayers");
            if (date.isEmpty() || prayers == null) {
                return Result.success();
            }

            Context ctx = getApplicationContext();
            long now = System.currentTimeMillis();

            for (int i = 0; i < prayers.length(); i++) {
                JSONObject pr = prayers.optJSONObject(i);
                if (pr == null) {
                    continue;
                }
                String name = pr.optString("name", "");
                long minutes = pr.optLong("minutes", -1);
                if (name.isEmpty() || minutes < 0) {
                    continue;
                }
                long when = NotificationHelper.minutesToEpoch(date, (int) minutes);
                if (when <= 0 || when <= now) {
                    continue;
                }
                NotificationHelper.schedule(ctx,
                    "sch:prayer:" + name + ":" + date, when, "Waktu Solat",
                    "Telah masuk waktu solat " + prayerLabel(name)
                        + ". Jika anda sedang busking, sila berhenti seketika.");
            }

            NotificationHelper.rescheduleAll(ctx);
            return Result.success();
        } catch (Exception e) {
            return Result.retry();
        }
    }

    private static String prayerLabel(String name) {
        switch (name) {
            case "Fajr": return "Subuh";
            case "Dhuhr": return "Zuhur";
            case "Asr": return "Asar";
            case "Maghrib": return "Maghrib";
            case "Isha": return "Isyak";
            case "Fajr (esok)": return "Subuh (esok)";
            default: return name;
        }
    }

    private JSONObject fetchPrayerTimes() {
        HttpURLConnection conn = null;
        try {
            URL url = new URL(PRAYER_API);
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setRequestProperty("Accept", "application/json");
            conn.setRequestProperty("User-Agent", "SBCAndroid/1.9");
            conn.setConnectTimeout(8000);
            conn.setReadTimeout(8000);
            int code = conn.getResponseCode();
            if (code != 200) {
                return null;
            }
            InputStream in = conn.getInputStream();
            BufferedReader r = new BufferedReader(
                new InputStreamReader(in, StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = r.readLine()) != null) {
                sb.append(line);
            }
            return new JSONObject(sb.toString());
        } catch (Exception e) {
            return null;
        } finally {
            if (conn != null) {
                try {
                    conn.disconnect();
                } catch (Exception ignored) {
                }
            }
        }
    }
}