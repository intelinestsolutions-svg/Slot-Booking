package my.sabahbuskers.community;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        registerPlugin(DevicePermissionPlugin.class);
        registerPlugin(TunerPlugin.class);
        registerPlugin(NotifierPlugin.class);
    }
}
