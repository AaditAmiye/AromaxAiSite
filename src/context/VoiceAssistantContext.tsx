import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { generateAromaExperience } from '../services/ai/aiService';
import { useActiveSession } from '../hooks/useActiveSession';
import { playWakeChime, playSuccessChime, playCancelChime, speakResponse } from '../services/voice/voiceAudio';
import { ValidatedAiExperience } from '../services/ai/aiSchema';

// Standard Web Speech API TypeScript definitions
interface SpeechRecognitionResultItem {
  transcript: string;
  confidence: number;
}
interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResultItem[];
  [index: number]: {
    isFinal: boolean;
    [index: number]: SpeechRecognitionResultItem;
  };
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

export type AssistantState =
  | 'off'
  | 'wake_listening'
  | 'listening_for_command'
  | 'processing'
  | 'diffusing'
  | 'error';

interface VoiceAssistantContextType {
  state: AssistantState;
  isWakeWordEnabled: boolean;
  isSupported: boolean;
  transcript: string;
  interimTranscript: string;
  responseMessage: string | null;
  lastSynthesizedBlend: ValidatedAiExperience | null;
  silenceSecondsLeft: number | null;
  toggleWakeWord: () => void;
  startManualListening: () => void;
  finishAndProcessNow: () => void;
  cancelAssistant: () => void;
  processDirectCommand: (text: string) => Promise<void>;
}

const VoiceAssistantContext = createContext<VoiceAssistantContextType | undefined>(undefined);

// Tolerant wake word matching for "Aro" (handles phonetic variations: "aro", "arrow", "aroma", "aromax", "hiro", "airo")
const WAKE_WORD_REGEX = /\b(hey\s+aro|ok\s+aro|hello\s+aro|aro|arrow|aroma|aromax|hiro|airo)\b/i;

export const VoiceAssistantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { startSession } = useActiveSession();

  const [isSupported, setIsSupported] = useState(false);
  // Default to off so it does not conflict with active microphone listening
  const [isWakeWordEnabled, setIsWakeWordEnabled] = useState(false);
  const [state, setState] = useState<AssistantState>('off');
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [responseMessage, setResponseMessage] = useState<string | null>(null);
  const [lastSynthesizedBlend, setLastSynthesizedBlend] = useState<ValidatedAiExperience | null>(null);
  const [silenceSecondsLeft, setSilenceSecondsLeft] = useState<number | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const stateRef = useRef<AssistantState>(state);
  const isWakeEnabledRef = useRef<boolean>(isWakeWordEnabled);
  const currentCommandRef = useRef<string>('');
  const wakeWordFoundRef = useRef<boolean>(false);
  const sessionStartIndexRef = useRef<number>(0);

  // Keep refs synced
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    isWakeEnabledRef.current = isWakeWordEnabled;
  }, [isWakeWordEnabled]);

  // Check speech recognition capability
  useEffect(() => {
    const hasSpeech = Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
    setIsSupported(hasSpeech);
  }, []);

  const clearTimers = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setSilenceSecondsLeft(null);
  }, []);

  // Process aromatic command with AI & hardware actuation
  const processDirectCommand = useCallback(
    async (commandText: string) => {
      clearTimers();
      const cleanCommand = commandText
        .replace(WAKE_WORD_REGEX, '')
        .replace(/^[\s,.;:!?\-+]+/, '')
        .trim();

      if (!cleanCommand || cleanCommand.length < 2) {
        // Nothing substantial said yet, revert to listening
        return;
      }

      setState('processing');
      setTranscript(cleanCommand);
      setInterimTranscript('');
      setResponseMessage('Formulating scent chord with AI...');

      try {
        const result = await generateAromaExperience(cleanCommand);

        if (result.success && result.blend) {
          const blend = result.blend;
          setLastSynthesizedBlend(blend);
          setState('diffusing');
          playSuccessChime();

          const activePins = blend.channels.map((c) => c.channelId).join(', ');
          const spokenNotice = `Producing ${blend.title}. Actuating ${activePins}.`;
          setResponseMessage(spokenNotice);

          // Energize physical hardware pins immediately
          await startSession({
            title: blend.title,
            type: 'text',
            channels: blend.channels,
            durationSeconds: blend.durationSeconds || 180,
            light: blend.light,
            batchId: blend.batchId || '#48-A',
            profileName: blend.description
          });

          // Speak voice confirmation
          speakResponse(spokenNotice, () => {
            // Once spoken, auto-settle back to wake listening
            setTimeout(() => {
              if (isWakeEnabledRef.current) {
                setState('wake_listening');
              } else {
                setState('off');
              }
              setTranscript('');
              setInterimTranscript('');
              currentCommandRef.current = '';
              wakeWordFoundRef.current = false;
            }, 3000);
          });
        } else {
          setState('error');
          const errorMsg = result.error || 'Could not synthesize aroma for this request.';
          setResponseMessage(errorMsg);
          speakResponse("I couldn't formulate a scent for that. Try asking for pizza, rain, or coffee.");
        }
      } catch (err: unknown) {
        setState('error');
        const errStr = err instanceof Error ? err.message : String(err);
        setResponseMessage(`Error: ${errStr}`);
      }
    },
    [startSession, clearTimers]
  );

  // User taps "Done / Process Now"
  const finishAndProcessNow = useCallback(() => {
    const textToProcess = currentCommandRef.current.trim() || transcript.trim() || interimTranscript.trim();
    if (textToProcess) {
      processDirectCommand(textToProcess);
    }
  }, [processDirectCommand, transcript, interimTranscript]);

  // Restart speech recognition engine safely
  const restartRecognition = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch {}
    setTimeout(() => {
      if (isWakeEnabledRef.current && stateRef.current !== 'processing') {
        try {
          recognitionRef.current?.start();
        } catch {}
      }
    }, 150);
  }, []);

  // Initialize SpeechRecognition instance
  const initRecognition = useCallback(() => {
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) return null;

    try {
      const rec = new SpeechRecognitionClass();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';
      rec.maxAlternatives = 1;

      rec.onstart = () => {
        // Recognition started
      };

      rec.onerror = (e: { error: string }) => {
        if (e.error === 'no-speech') return;
        console.warn('[VoiceAssistant] Speech error:', e.error);
        if (e.error === 'not-allowed') {
          setIsWakeWordEnabled(false);
          setState('off');
        }
      };

      rec.onend = () => {
        // Auto-restart if user still has wake word enabled and not currently processing
        if (isWakeEnabledRef.current && stateRef.current !== 'processing' && stateRef.current !== 'off') {
          setTimeout(() => {
            try {
              rec.start();
            } catch {}
          }, 150);
        }
      };

      rec.onresult = (e: SpeechRecognitionEventLike) => {
        // Accumulate full speech across results from current session
        let fullTranscript = '';
        for (let i = sessionStartIndexRef.current; i < e.results.length; ++i) {
          const item = e.results[i];
          if (item && item[0]) {
            fullTranscript += item[0].transcript + ' ';
          }
        }
        fullTranscript = fullTranscript.trim();
        if (!fullTranscript) return;

        const currentState = stateRef.current;

        // ========================================================
        // 1. IN WAKE LISTENING MODE: Listening for "Aro"
        // ========================================================
        if (currentState === 'wake_listening') {
          const match = fullTranscript.match(WAKE_WORD_REGEX);
          if (match && match.index !== undefined) {
            wakeWordFoundRef.current = true;
            playWakeChime();
            if (navigator.vibrate) {
              navigator.vibrate([40, 50, 40]);
            }

            // Immediately switch to listening for the question/command
            setState('listening_for_command');

            // Extract whatever text followed "Aro" in the same utterance
            const commandAfterWake = fullTranscript.slice(match.index + match[0].length).trim();
            currentCommandRef.current = commandAfterWake;
            setTranscript(commandAfterWake);
            setInterimTranscript('');

            // Start silence detection timer (1600ms of silence triggers processing)
            clearTimers();
            silenceTimerRef.current = setTimeout(() => {
              if (currentCommandRef.current.trim().length >= 3) {
                processDirectCommand(currentCommandRef.current);
              }
            }, 1800);
          }
        }
        // ========================================================
        // 2. IN COMMAND LISTENING MODE: Listening to user's question
        // ========================================================
        else if (currentState === 'listening_for_command') {
          // If wake word was detected, strip it out so we only have the actual scent question
          let cleanCommand = fullTranscript;
          const wakeMatch = fullTranscript.match(WAKE_WORD_REGEX);
          if (wakeMatch && wakeMatch.index !== undefined) {
            cleanCommand = fullTranscript.slice(wakeMatch.index + wakeMatch[0].length).trim();
          }

          currentCommandRef.current = cleanCommand;
          setTranscript(cleanCommand);

          // User is actively speaking! Reset silence timer every time new words arrive
          clearTimers();

          // Only schedule silence auto-submit if the user has said at least something
          if (cleanCommand.length >= 3) {
            silenceTimerRef.current = setTimeout(() => {
              // The user has stopped speaking! Process with AI now!
              if (currentCommandRef.current.trim().length >= 3) {
                processDirectCommand(currentCommandRef.current);
              }
            }, 1600);
          }
        }
      };

      return rec;
    } catch (e) {
      console.warn('[VoiceAssistant] Failed to init speech recognition:', e);
      return null;
    }
  }, [clearTimers, processDirectCommand]);

  // Start continuous listening when mounted or when wake word enabled
  useEffect(() => {
    if (!isSupported) return;

    if (!recognitionRef.current) {
      recognitionRef.current = initRecognition();
    }

    if (isWakeWordEnabled && state === 'wake_listening') {
      try {
        recognitionRef.current?.start();
      } catch {}
    }

    return () => {
      clearTimers();
    };
  }, [isSupported, isWakeWordEnabled, state, initRecognition, clearTimers]);

  // Toggle Wake Word Listening on / off
  const toggleWakeWord = useCallback(() => {
    if (!isSupported) {
      alert('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    if (isWakeWordEnabled) {
      // Turn OFF
      setIsWakeWordEnabled(false);
      setState('off');
      clearTimers();
      try {
        recognitionRef.current?.stop();
      } catch {}
      playCancelChime();
    } else {
      // Turn ON
      setIsWakeWordEnabled(true);
      setState('wake_listening');
      playWakeChime();

      if (!recognitionRef.current) {
        recognitionRef.current = initRecognition();
      }
      try {
        recognitionRef.current?.start();
      } catch {}
    }
  }, [isSupported, isWakeWordEnabled, clearTimers, initRecognition]);

  // Manual 1-Tap Listening (bypasses saying "Aro")
  const startManualListening = useCallback(() => {
    if (!isSupported) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    playWakeChime();
    currentCommandRef.current = '';
    wakeWordFoundRef.current = false;
    setState('listening_for_command');
    setTranscript('');
    setInterimTranscript('');
    setResponseMessage(null);
    clearTimers();

    if (!recognitionRef.current) {
      recognitionRef.current = initRecognition();
    }

    try {
      recognitionRef.current?.start();
    } catch {}
  }, [isSupported, clearTimers, initRecognition]);

  // Cancel / Close Assistant Modal
  const cancelAssistant = useCallback(() => {
    playCancelChime();
    clearTimers();
    currentCommandRef.current = '';
    wakeWordFoundRef.current = false;

    if (isWakeWordEnabled) {
      setState('wake_listening');
    } else {
      setState('off');
      try {
        recognitionRef.current?.stop();
      } catch {}
    }
    setTranscript('');
    setInterimTranscript('');
    setResponseMessage(null);
  }, [isWakeWordEnabled, clearTimers]);

  return (
    <VoiceAssistantContext.Provider
      value={{
        state,
        isWakeWordEnabled,
        isSupported,
        transcript,
        interimTranscript,
        responseMessage,
        lastSynthesizedBlend,
        silenceSecondsLeft,
        toggleWakeWord,
        startManualListening,
        finishAndProcessNow,
        cancelAssistant,
        processDirectCommand
      }}
    >
      {children}
    </VoiceAssistantContext.Provider>
  );
};

export function useVoiceAssistant() {
  const context = useContext(VoiceAssistantContext);
  if (!context) {
    throw new Error('useVoiceAssistant must be used within a VoiceAssistantProvider');
  }
  return context;
}
