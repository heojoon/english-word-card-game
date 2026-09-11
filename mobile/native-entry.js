import { Capacitor, registerPlugin } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

if (Capacitor.isNativePlatform()) {
  const TextToSpeech = registerPlugin('WordoriaTextToSpeech');

  document.documentElement.classList.add('native-app');
  window.WordoriaNativeSpeech = {
    speak(text, options = {}) {
      return TextToSpeech.speak({
        text,
        lang: options.lang || 'en-US',
        rate: options.rate || 0.82
      });
    },
    cancel() {
      return TextToSpeech.cancel();
    }
  };

  App.addListener('backButton', () => {
    document.dispatchEvent(new CustomEvent('wordoria:native-back'));
  });

  App.addListener('pause', () => {
    document.dispatchEvent(new CustomEvent('wordoria:native-pause'));
  });

  document.addEventListener('wordoria:exit', () => App.exitApp());
  document.addEventListener('wordoria:haptic', async event => {
    try {
      const kind = event.detail?.kind;
      if (kind === 'success') await Haptics.notification({ type: NotificationType.Success });
      else if (kind === 'error') await Haptics.notification({ type: NotificationType.Error });
      else await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      // Haptics are optional on devices without a vibration motor.
    }
  });
}
