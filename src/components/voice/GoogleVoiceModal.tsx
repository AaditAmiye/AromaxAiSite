import React, { useEffect, useState, useRef } from 'react';
import {
  startVoiceListening,
  stopVoiceListening,
  isSpeechRecognitionSupported,
  testMicrophonePermission
} from '../../services/voice/speechService';

interface GoogleVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitPrompt: (spokenPrompt: string) => void;
}

export const GoogleVoiceModal: React.FC<GoogleVoiceModalProps> = ({
  isOpen,
  onClose,
  onSubmitPrompt
}) => {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeakingActive, setIsSpeakingActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const transcriptRef = useRef('');
  transcriptRef.current = transcript;

  const hasSubmittedRef = useRef(false);

  // Suggested scent prompts
  const suggestions = [
    'A cozy cafe with fresh roast espresso and vanilla...',
    'First monsoon rain on warm red clay loam...',
    'Crackling birchwood campfire under a starry sky...',
    'Dewy morning lavender garden with alpine breeze...',
    'Warm bakery with cinnamon rolls and melted butter...'
  ];
  const [suggestionIdx] = useState(() => Math.floor(Math.random() * suggestions.length));

  const startListening = () => {
    if (!isSpeechRecognitionSupported()) {
      setErrorMessage(
        'Speech recognition is not supported in this browser. Please use Chrome, Safari, or Microsoft Edge.'
      );
      return;
    }

    hasSubmittedRef.current = false;
    setTranscript('');
    setErrorMessage(null);
    setIsProcessing(false);
    setIsSpeakingActive(false);

    const started = startVoiceListening({
      onStart: () => {
        setIsListening(true);
        setErrorMessage(null);
      },
      onSpeechDetected: () => {
        setIsSpeakingActive(true);
      },
      onTranscript: (liveText) => {
        setTranscript(liveText);
        setIsSpeakingActive(true);
      },
      onSilencePause: (finalText) => {
        if (hasSubmittedRef.current) return;
        const clean = finalText.trim();
        if (clean.length > 0) {
          hasSubmittedRef.current = true;
          setIsListening(false);
          setIsSpeakingActive(false);
          setIsProcessing(true);
          setTimeout(() => {
            onSubmitPrompt(clean);
          }, 350);
        }
      },
      onError: (err) => {
        setIsListening(false);
        setIsSpeakingActive(false);
        setErrorMessage(err);
      },
      onEnd: () => {
        setIsListening(false);
        setIsSpeakingActive(false);
      }
    });

    if (started) {
      setIsListening(true);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      stopVoiceListening();
      setIsListening(false);
      setIsProcessing(false);
      setIsSpeakingActive(false);
      setTranscript('');
      setErrorMessage(null);
      hasSubmittedRef.current = false;
      return;
    }

    startListening();

    return () => {
      stopVoiceListening();
    };
  }, [isOpen]);

  const handleManualSubmit = () => {
    const text = transcriptRef.current.trim();
    if (text.length > 0 && !hasSubmittedRef.current) {
      hasSubmittedRef.current = true;
      stopVoiceListening();
      setIsListening(false);
      setIsProcessing(true);
      onSubmitPrompt(text);
    }
  };

  const handleCheckPermissionAndRetry = async () => {
    setErrorMessage(null);
    const test = await testMicrophonePermission();
    if (test.granted) {
      startListening();
    } else {
      setErrorMessage(test.error || 'Microphone access denied. Please allow microphone permissions in your browser.');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="voice-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-[440px] bg-white dark:bg-zinc-900 rounded-t-[32px] sm:rounded-[32px] p-6 sm:p-8 flex flex-col items-center shadow-2xl border border-black/5 dark:border-white/10 animate-slideUp relative"
      >
        {/* Top Header */}
        <div className="w-full flex items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-neutral-100 dark:bg-zinc-800 px-3 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-[#4285F4]" />
              <span className="w-2 h-2 rounded-full bg-[#EA4335]" />
              <span className="w-2 h-2 rounded-full bg-[#FBBC05]" />
              <span className="w-2 h-2 rounded-full bg-[#34A853]" />
              <span className="text-[11.5px] font-semibold text-neutral-700 dark:text-neutral-200 ml-0.5">
                Google Voice
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close voice input"
            className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-zinc-800 hover:bg-neutral-200 dark:hover:bg-zinc-700 flex items-center justify-center text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Central Display Area */}
        <div className="w-full min-h-[140px] flex flex-col items-center justify-center text-center px-2 py-3">
          {isProcessing ? (
            <div className="flex flex-col items-center gap-2 animate-pulse">
              <span className="text-[20px] font-semibold text-[#1D1D1F] dark:text-[#F4F4F5]">
                Synthesizing with Gemini...
              </span>
              <p className="text-[14px] text-neutral-500 font-medium">
                Formulating fragrance accord & spoken notes
              </p>
            </div>
          ) : errorMessage ? (
            <div className="flex flex-col items-center gap-2.5 px-3">
              <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/40 text-red-500 flex items-center justify-center">
                <span className="material-symbols-outlined text-[28px]">mic_off</span>
              </div>
              <h3 className="text-[17px] font-bold text-neutral-900 dark:text-neutral-100">
                Microphone Notice
              </h3>
              <p className="text-[13px] text-red-600 dark:text-red-400 max-w-[320px] leading-relaxed">
                {errorMessage}
              </p>
            </div>
          ) : transcript ? (
            <div className="flex flex-col items-center gap-2">
              <p className="text-[19px] sm:text-[21px] font-semibold text-[#111111] dark:text-[#F4F4F5] leading-snug break-words">
                "{transcript}"
              </p>
              <span className="text-[12px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                Listening... pause when done speaking
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 animate-fadeIn">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <h3 id="voice-modal-title" className="text-[22px] font-bold text-[#111111] dark:text-[#F4F4F5]">
                  Listening...
                </h3>
              </div>
              <p className="text-[14px] text-neutral-600 dark:text-neutral-300 font-medium">
                Speak what you'd like to smell
              </p>
              <p className="text-[12.5px] text-neutral-400 italic max-w-[320px] mt-1">
                "{suggestions[suggestionIdx]}"
              </p>
            </div>
          )}
        </div>

        {/* Google 4-Color Audio Wave / Bouncing Dots */}
        <div className="h-16 flex items-center justify-center gap-3.5 my-2">
          {isProcessing ? (
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-full bg-[#4285F4] animate-bounce [animation-delay:0ms]" />
              <div className="w-3.5 h-3.5 rounded-full bg-[#EA4335] animate-bounce [animation-delay:150ms]" />
              <div className="w-3.5 h-3.5 rounded-full bg-[#FBBC05] animate-bounce [animation-delay:300ms]" />
              <div className="w-3.5 h-3.5 rounded-full bg-[#34A853] animate-bounce [animation-delay:450ms]" />
            </div>
          ) : isListening ? (
            <div className="flex items-center gap-2.5">
              <div
                className={`w-2.5 rounded-full bg-[#4285F4] transition-all duration-150 ${
                  isSpeakingActive ? 'h-11 animate-pulse' : 'h-6'
                }`}
              />
              <div
                className={`w-2.5 rounded-full bg-[#EA4335] transition-all duration-150 ${
                  isSpeakingActive ? 'h-14 animate-pulse' : 'h-9'
                }`}
              />
              <div
                className={`w-2.5 rounded-full bg-[#FBBC05] transition-all duration-150 ${
                  isSpeakingActive ? 'h-10 animate-pulse' : 'h-5'
                }`}
              />
              <div
                className={`w-2.5 rounded-full bg-[#34A853] transition-all duration-150 ${
                  isSpeakingActive ? 'h-12 animate-pulse' : 'h-7'
                }`}
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 opacity-40">
              <div className="w-2.5 h-2.5 rounded-full bg-[#4285F4]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#EA4335]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#FBBC05]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#34A853]" />
            </div>
          )}
        </div>

        {/* Central Action Button */}
        <div className="flex items-center gap-4 mt-2 mb-2">
          {errorMessage ? (
            <button
              type="button"
              onClick={handleCheckPermissionAndRetry}
              className="px-6 py-2.5 rounded-full bg-[#4285F4] hover:bg-blue-600 active:scale-95 text-white text-[13px] font-semibold transition-all cursor-pointer shadow-md flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">refresh</span>
              <span>Allow & Try Again</span>
            </button>
          ) : isListening ? (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  stopVoiceListening();
                  setIsListening(false);
                }}
                className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 active:scale-95 text-white flex items-center justify-center transition-all cursor-pointer shadow-lg shadow-red-500/30"
                aria-label="Pause listening"
                title="Pause listening"
              >
                <span className="material-symbols-outlined text-[26px]">mic</span>
              </button>

              {transcript.trim() && (
                <button
                  type="button"
                  onClick={handleManualSubmit}
                  className="px-5 py-2.5 rounded-full bg-black hover:bg-neutral-800 active:scale-95 text-white text-[13px] font-semibold transition-all cursor-pointer shadow-md flex items-center gap-1.5"
                >
                  <span>Synthesize</span>
                  <span className="material-symbols-outlined text-[17px]">arrow_forward</span>
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={startListening}
              className="w-14 h-14 rounded-full bg-neutral-900 hover:bg-black active:scale-95 text-white flex items-center justify-center transition-all cursor-pointer shadow-lg"
              aria-label="Start speaking"
            >
              <span className="material-symbols-outlined text-[26px]">mic</span>
            </button>
          )}
        </div>

        {/* Helper Note */}
        <p className="text-[11.5px] text-neutral-400 dark:text-neutral-500 text-center mt-3">
          {isListening
            ? 'Speak clearly into your microphone. Automatically sends when you pause.'
            : 'Tap the mic to speak your fragrance prompt.'}
        </p>
      </div>
    </div>
  );
};
