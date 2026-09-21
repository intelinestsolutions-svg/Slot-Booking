package my.sabahbuskers.community;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

import androidx.work.Constraints;
import androidx.work.ExistingWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.OneTimeWorkRequest;
import androidx.work.WorkManager;

import java.util.concurrent.TimeUnit;

public class BootReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) {
            return;
        }
        String action = intent.getAction();
        boolean boot = Intent.ACTION_BOOT_COMPLETED.equals(action)
            || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)
            || Intent.ACTION_LOCKED_BOOT_COMPLETED.equals(action);
        if (!boot) {
            return;
        }

        NotificationHelper.ensureChannel(context);
        NotificationHelper.rescheduleAll(context);

        Constraints network = new Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build();
        OneTimeWorkRequest sync = new OneTimeWorkRequest.Builder(PrayerSyncWorker.class)
            .setConstraints(network)
            .setInitialDelay(2, TimeUnit.SECONDS)
            .build();
        WorkManager.getInstance(context).enqueueUniqueWork(
            "prayer_sync_boot", ExistingWorkPolicy.REPLACE, sync);
    }
}