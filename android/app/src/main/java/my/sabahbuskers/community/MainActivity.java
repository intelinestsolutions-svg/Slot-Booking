package my.sabahbuskers.community;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;

import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;

import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;
import com.getcapacitor.BridgeWebViewClient;

import java.util.concurrent.TimeUnit;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(DevicePermissionPlugin.class);
        registerPlugin(TunerPlugin.class);
        registerPlugin(NotifierPlugin.class);
        super.onCreate(savedInstanceState);

        NotificationHelper.ensureChannel(this);
        hardenWebView();

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

    /**
     * Force external http(s) links (Instagram, Facebook, scam interstitials, etc.) to open in the
     * real browser instead of inside the in-app WebView, and block any window.open() popups so
     * external mobile sites can no longer show "download our app / All Browser" adverts in-app.
     */
    private void hardenWebView() {
        try {
            Bridge bridge = getBridge();
            if (bridge == null) return;
            WebView wv = bridge.getWebView();
            if (wv == null) return;
            wv.getSettings().setSupportMultipleWindows(false);
            wv.setWebViewClient(new SafeWebViewClient(bridge));
            wv.setWebChromeClient(new SafeWebChromeClient(bridge));
        } catch (Exception ignored) {
        }
    }

    private static boolean isExternalUrl(Uri url) {
        if (url == null) return false;
        String scheme = url.getScheme();
        if (scheme == null || (!scheme.equals("http") && !scheme.equals("https"))) return false;
        String host = url.getHost();
        if (host == null) return false;
        return !host.equals("localhost") && !host.equals("127.0.0.1") && !host.endsWith("sabahbuskers.my");
    }

    private void openInBrowser(Uri url) {
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, url);
            startActivity(intent);
        } catch (ActivityNotFoundException | SecurityException ignored) {
        }
    }

    private final class SafeWebViewClient extends BridgeWebViewClient {
        SafeWebViewClient(Bridge bridge) {
            super(bridge);
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri url = request.getUrl();
            if (isExternalUrl(url)) {
                openInBrowser(url);
                return true;
            }
            return super.shouldOverrideUrlLoading(view, request);
        }

        @Override
        @SuppressWarnings("deprecation")
        public boolean shouldOverrideUrlLoading(WebView view, String url) {
            Uri parsed = Uri.parse(url);
            if (isExternalUrl(parsed)) {
                openInBrowser(parsed);
                return true;
            }
            return super.shouldOverrideUrlLoading(view, url);
        }
    }

    private final class SafeWebChromeClient extends BridgeWebChromeClient {
        SafeWebChromeClient(Bridge bridge) {
            super(bridge);
        }

        @Override
        public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, android.os.Message resultMsg) {
            try {
                // target="_blank" links are handled by shouldOverrideUrlLoading above; block popups.
                WebView.HitTestResult hit = view.getHitTestResult();
                String href = hit == null ? null : hit.getExtra();
                if (href != null && isExternalUrl(Uri.parse(href))) {
                    openInBrowser(Uri.parse(href));
                }
            } catch (Exception ignored) {
            }
            return false;
        }
    }
}