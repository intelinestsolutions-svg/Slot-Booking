package my.sabahbuskers.community;

import android.Manifest;
import android.content.pm.PackageManager;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "DevicePermission",
    permissions = {
        @Permission(alias = "microphone", strings = { Manifest.permission.RECORD_AUDIO })
    }
)
public class DevicePermissionPlugin extends Plugin {

    @PluginMethod
    public void requestMicrophone(PluginCall call) {
        requestPermissionForAlias("microphone", call, "microphonePermissionCallback");
    }

    @PermissionCallback
    private void microphonePermissionCallback(PluginCall call) {
        call.resolve();
    }

    @PluginMethod
    public void getMicrophoneStatus(PluginCall call) {
        JSObject out = new JSObject();
        out.put("granted",
            getContext().checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED);
        call.resolve(out);
    }
}