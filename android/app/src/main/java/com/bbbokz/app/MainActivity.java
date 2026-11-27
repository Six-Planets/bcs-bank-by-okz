package com.bbbokz.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        forwardOAuthDeepLink(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        forwardOAuthDeepLink(intent);
    }

    private void forwardOAuthDeepLink(Intent intent) {
        if (intent == null) return;
        Uri data = intent.getData();
        if (data == null || !"ozbcsbank".equals(data.getScheme())) return;
        String fragment = data.getEncodedFragment();
        if (fragment == null || fragment.isEmpty()) return;
        final String safeHash = "#" + fragment.replace("\\", "\\\\").replace("'", "\\'");
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().post(() ->
                getBridge().getWebView().evaluateJavascript(
                    "window.location.hash='" + safeHash + "';window.dispatchEvent(new HashChangeEvent('hashchange'));",
                    null
                )
            );
        }
    }
}
