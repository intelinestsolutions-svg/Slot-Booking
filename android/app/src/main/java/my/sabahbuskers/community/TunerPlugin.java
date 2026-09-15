package my.sabahbuskers.community;

import android.Manifest;
import android.content.pm.PackageManager;
import android.media.AudioFormat;
import android.media.AudioRecord;
import android.media.MediaRecorder;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.util.ArrayList;

@CapacitorPlugin(
    name = "Tuner",
    permissions = {
        @Permission(alias = "microphone", strings = { Manifest.permission.RECORD_AUDIO })
    }
)
public class TunerPlugin extends Plugin {

    private static final int FRAME = 2048;

    private AudioRecord recorder;
    private Thread thread;
    private volatile short[] shared = new short[0];
    private int sampleRate = 0;

    @PluginMethod
    public void requestMicrophone(PluginCall call) {
        requestPermissionForAlias("microphone", call, "microphonePermissionCallback");
    }

    @PermissionCallback
    private void microphonePermissionCallback(PluginCall call) {
        call.resolve();
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        JSObject out = new JSObject();
        out.put("granted",
            getContext().checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED);
        call.resolve(out);
    }

    @PluginMethod
    public void start(PluginCall call) {
        if (recorder != null) {
            call.resolve();
            return;
        }
        final int sr = call.getInt("sampleRate", 44100);
        final int min = AudioRecord.getMinBufferSize(sr,
            AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT);
        if (min <= 0) {
            call.reject("Peranti tidak menyokong mikrofon pada kadar sampel ini.");
            return;
        }
        final int buf = Math.max(min * 2, sr);
        try {
            recorder = new AudioRecord(MediaRecorder.AudioSource.MIC, sr,
                AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT, buf);
        } catch (Exception e) {
            call.reject("Mikrofon tidak tersedia: " + e.getMessage());
            return;
        }
        if (recorder.getState() != AudioRecord.STATE_INITIALIZED) {
            recorder.release();
            recorder = null;
            call.reject("Mikrofon tidak tersedia. Periksa kebenaran audio.");
            return;
        }
        try {
            recorder.startRecording();
        } catch (Exception e) {
            recorder.release();
            recorder = null;
            call.reject("Mikrofon tidak boleh dimulakan: " + e.getMessage());
            return;
        }
        sampleRate = sr;
        final short[] frame = new short[FRAME];
        thread = new Thread(() -> {
            while (thread != null && !thread.isInterrupted()) {
                int n;
                try {
                    n = recorder.read(frame, 0, frame.length, AudioRecord.READ_BLOCKING);
                } catch (RuntimeException e) {
                    break;
                }
                if (n > 0) {
                    short[] copy = new short[n];
                    System.arraycopy(frame, 0, copy, 0, n);
                    shared = copy;
                }
            }
        }, "sbc-tuner");
        thread.start();
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        if (thread != null) {
            thread.interrupt();
            thread = null;
        }
        if (recorder != null) {
            try {
                recorder.stop();
            } catch (Exception ignored) {
            }
            recorder.release();
            recorder = null;
        }
        shared = new short[0];
        call.resolve();
    }

    @PluginMethod
    public void read(PluginCall call) {
        JSObject out = new JSObject();
        short[] f = shared;
        ArrayList<Object> floats = new ArrayList<>(f.length);
        for (short s : f) {
            floats.add(Double.valueOf(s / 32768.0));
        }
        out.put("samples", new JSArray(floats));
        out.put("len", f.length);
        out.put("sampleRate", sampleRate);
        call.resolve(out);
    }
}