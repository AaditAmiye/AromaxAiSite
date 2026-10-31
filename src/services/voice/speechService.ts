// AROMAXAI Voice Engine - Google Mic Speech-to-Text & Natural TTS Speech Synthesis

type SpeechRecognitionType = any;

export interface VoiceListenerCallbacks {
  onStart?: () => void;
  onTranscript?: (transcript: string, isFinal: boolean) => void;
  onSpeechDetected?: () => void;
  onSilencePause?: (finalTranscript: string) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
}

let activeRecognition: SpeechRecognitionType | null = null;
let silenceTimer: NodeJS.Timeout | null = null;
let currentTranscript = '';
let hasSpoken = false;
let isExplicitlyStopped = false;

/**
 * Checks if browser supports SpeechRecognition (Chrome, Safari, Edge, Android)
 */
export function isSpeechRecognitionSupported(): boolean {
  return typeof window !== 'undefined' && Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
}

/**
 * Checks if browser supports SpeechSynthesis (TTS)
 */
export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/**
 * Tests microphone permission on direct user click and immediately releases the stream
 * so SpeechRecognition has 100% exclusive, unhindered access to the microphone hardware.
 */
export async function testMicrophonePermission(): Promise<{ granted: boolean; error?: string }> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return {
      granted: false,
      error: 'Microphone is not supported in this browser. Please use Chrome, Safari, or Microsoft Edge.'
    };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Crucial: Release stream immediately so the hardware is completely free for SpeechRecognition
    stream.getTracks().forEach((track) => track.stop());
    return { granted: true };
  } catch (err: any) {
    console.warn('[Microphone permission test error]', err);
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      return {
        granted: false,
        error: 'Microphone permission was denied. Please click the lock or tune icon in your browser address bar and set Microphone to "Allow".'
      };
    }
    if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
      return {
        granted: false,
        error: 'No microphone was detected on your device. Please connect a microphone and try again.'
      };
    }
    return {
      granted: false,
      error: err?.message || 'Microphone access failed.'
    };
  }
}

/**
 * Starts Google-style microphone listening with automatic pause/silence detection.
 * SpeechRecognition captures user audio directly without hardware stream contention.
 */
export function startVoiceListening(callbacks: VoiceListenerCallbacks): boolean {
  // Stop any previous instance
  stopVoiceListening();

  isExplicitlyStopped = false;
  currentTranscript = '';
  hasSpoken = false;

  const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRecognitionClass) {
    callbacks.onError?.('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
    return false;
  }

  try {
    const recognition = new SpeechRecognitionClass();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    const clearTimer = () => {
      if (silenceTimer) {
        clearTimeout(silenceTimer);
        silenceTimer = null;
      }
    };

    const resetTimer = () => {
      clearTimer();
      // Auto-submit after 1.4 seconds of silence once user has spoken
      silenceTimer = setTimeout(() => {
        if (hasSpoken && currentTranscript.trim() && !isExplicitlyStopped) {
          const text = currentTranscript.trim();
          stopVoiceListening();
          callbacks.onSilencePause?.(text);
        }
      }, 1400);
    };

    recognition.onstart = () => {
      callbacks.onStart?.();
    };

    recognition.onspeechstart = () => {
      hasSpoken = true;
      callbacks.onSpeechDetected?.();
    };

    recognition.onsoundstart = () => {
      hasSpoken = true;
      callbacks.onSpeechDetected?.();
    };

    recognition.onspeechend = () => {
      if (hasSpoken) {
        resetTimer();
      }
    };

    recognition.onresult = (event: any) => {
      hasSpoken = true;
      callbacks.onSpeechDetected?.();

      let interim = '';
      let finalized = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const result = event.results[i];
        const text = result[0]?.transcript || '';
        if (result.isFinal) {
          finalized += text;
        } else {
          interim += text;
        }
      }

      if (finalized) {
        currentTranscript = (currentTranscript + ' ' + finalized).trim();
      }

      const fullDisplay = (currentTranscript + ' ' + interim).trim();

      if (fullDisplay.length > 0) {
        callbacks.onTranscript?.(fullDisplay, Boolean(finalized));
        resetTimer();
      }
    };

    recognition.onerror = (event: any) => {
      const err = event.error || 'speech_error';
      console.warn('[SpeechRecognition notice]', err);

      if (err === 'no-speech') {
        // User hasn't spoken yet or is thinking - keep listening patiently
        return;
      }

      if (err === 'not-allowed' || err === 'service-not-allowed') {
        callbacks.onError?.('Microphone permission was denied. Please allow microphone access in your browser settings.');
        return;
      }

      if (err === 'network') {
        callbacks.onError?.('Speech service network issue. Please check your connection or tap to try again.');
        return;
      }

      callbacks.onError?.(`Microphone notice: ${err}`);
    };

    recognition.onend = () => {
      clearTimer();
      // If recognition ended naturally after speaking
      if (!isExplicitlyStopped && hasSpoken && currentTranscript.trim()) {
        const text = currentTranscript.trim();
        callbacks.onSilencePause?.(text);
      }
      activeRecognition = null;
      callbacks.onEnd?.();
    };

    activeRecognition = recognition;
    recognition.start();
    return true;
  } catch (err: any) {
    console.warn('[SpeechRecognition start exception]', err);
    callbacks.onError?.(err?.message || 'Could not start speech recognition.');
    return false;
  }
}

/**
 * Stops microphone listening manually
 */
export function stopVoiceListening(): void {
  isExplicitlyStopped = true;
  if (silenceTimer) {
    clearTimeout(silenceTimer);
    silenceTimer = null;
  }
  if (activeRecognition) {
    try {
      activeRecognition.stop();
    } catch {}
    activeRecognition = null;
  }
}

/**
 * Text-to-Speech (TTS): speaks something delightful related to the user's aroma request
 */
export function speakAromaInsight(
  text: string,
  callbacks?: {
    onStart?: () => void;
    onEnd?: () => void;
    onError?: () => void;
  }
): void {
  if (!isSpeechSynthesisSupported()) {
    callbacks?.onEnd?.();
    return;
  }

  try {
    window.speechSynthesis.cancel();

    const cleanText = text
      .replace(/[*_#`]/g, '')
      .replace(/[\n\r]+/g, ' ')
      .trim();

    if (!cleanText) {
      callbacks?.onEnd?.();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.05;
    utterance.volume = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find(
      (v) =>
        v.lang.startsWith('en') &&
        (v.name.includes('Google') ||
          v.name.includes('Natural') ||
          v.name.includes('Samantha') ||
          v.name.includes('Daniel') ||
          v.name.includes('Karen') ||
          v.name.includes('Premium'))
    ) || voices.find((v) => v.lang.startsWith('en'));

    if (naturalVoice) {
      utterance.voice = naturalVoice;
    }

    utterance.onstart = () => {
      callbacks?.onStart?.();
    };

    utterance.onend = () => {
      callbacks?.onEnd?.();
    };

    utterance.onerror = (e) => {
      console.warn('[SpeechSynthesis error]', e);
      callbacks?.onError?.();
    };

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('[SpeechSynthesis exception]', err);
    callbacks?.onEnd?.();
  }
}

/**
 * Stops any active speech output
 */
export function stopSpeaking(): void {
  if (isSpeechSynthesisSupported()) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }
}

/**
 * Checks if speech output is currently active
 */
export function isSpeaking(): boolean {
  return isSpeechSynthesisSupported() && window.speechSynthesis.speaking;
}
