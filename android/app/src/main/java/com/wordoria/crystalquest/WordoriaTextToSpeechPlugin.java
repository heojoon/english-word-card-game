package com.wordoria.crystalquest;

import android.speech.tts.TextToSpeech;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@CapacitorPlugin(name = "WordoriaTextToSpeech")
public class WordoriaTextToSpeechPlugin extends Plugin implements TextToSpeech.OnInitListener {
    private TextToSpeech textToSpeech;
    private boolean ready = false;
    private boolean failed = false;
    private final List<PluginCall> pendingCalls = new ArrayList<>();

    @Override
    public void load() {
        textToSpeech = new TextToSpeech(getContext().getApplicationContext(), this);
    }

    @Override
    public void onInit(int status) {
        synchronized (this) {
            ready = status == TextToSpeech.SUCCESS;
            failed = !ready;

            if (ready) {
                int languageResult = textToSpeech.setLanguage(Locale.US);
                if (languageResult == TextToSpeech.LANG_MISSING_DATA || languageResult == TextToSpeech.LANG_NOT_SUPPORTED) {
                    ready = false;
                    failed = true;
                }
            }

            List<PluginCall> calls = new ArrayList<>(pendingCalls);
            pendingCalls.clear();

            for (PluginCall call : calls) {
                if (ready) {
                    speakNow(call);
                } else {
                    call.reject("Android English text-to-speech is not available on this device.");
                }
            }
        }
    }

    @PluginMethod
    public void speak(PluginCall call) {
        String text = call.getString("text", "").trim();
        if (text.isEmpty()) {
            call.resolve();
            return;
        }

        synchronized (this) {
            if (failed || textToSpeech == null) {
                call.reject("Android text-to-speech is not available.");
                return;
            }

            if (!ready) {
                pendingCalls.add(call);
                return;
            }

            speakNow(call);
        }
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        if (textToSpeech != null) {
            textToSpeech.stop();
        }
        call.resolve();
    }

    private void speakNow(PluginCall call) {
        String text = call.getString("text", "").trim();
        String lang = call.getString("lang", "en-US");
        Float rate = call.getFloat("rate", 0.82F);

        Locale locale = "ko-KR".equalsIgnoreCase(lang) ? Locale.KOREA : Locale.US;
        textToSpeech.setLanguage(locale);
        textToSpeech.setSpeechRate(rate == null ? 0.82F : rate);
        textToSpeech.stop();

        int result = textToSpeech.speak(text, TextToSpeech.QUEUE_FLUSH, null, "wordoria-tts");
        if (result == TextToSpeech.SUCCESS) {
            JSObject response = new JSObject();
            response.put("spoken", true);
            call.resolve(response);
        } else {
            call.reject("Android text-to-speech failed to speak.");
        }
    }

    @Override
    protected void handleOnDestroy() {
        if (textToSpeech != null) {
            textToSpeech.stop();
            textToSpeech.shutdown();
            textToSpeech = null;
        }
    }
}
