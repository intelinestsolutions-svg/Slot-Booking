package my.sabahbuskers.community;

import android.os.Bundle;

import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;

import com.getcapacitor.BridgeActivity;

import java.util.concurrent.TimeUnit;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(DevicePermissionPlugin.class);
        registerPlugin(TunerPlugin.class);
        registerPlugin(NotifierPlugin.class);
        super.onCreate(savedInstanceState);

        NotificationHelper.ensureChannel(this);

        Constraints network = new Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build();
        PeriodicWorkRequest prayerSync = new PeriodicWorkRequest.Builder(
            PrayerSyncWorker.class, 60, TimeUnit.MINUTES)
            .setConstraints(network)
            .build();
        WorkManager.getInstance(this).enqueueUniquePeriodicWork(
            "prayer_sync", ExistingPeriodicWorkPolicy.UPDATE, prayerSync);
    }
}