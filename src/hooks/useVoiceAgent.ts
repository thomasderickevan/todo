import { useCallback } from 'react';

export const useVoiceAgent = () => {
  const speak = useCallback((message: string) => {
    const utterance = new SpeechSynthesisUtterance(message);
    window.speechSynthesis.speak(utterance);
  }, []);

  const listen = useCallback((onCommand: (command: string) => void) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn("Speech Recognition not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      const command = event.results[0][0].transcript.toLowerCase();
      onCommand(command);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech Recognition Error:", event.error);
    };

    recognition.start();
  }, []);

  const startWakeWordDetection = useCallback((onWakeWord: () => void) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      const results = event.results;
      const last = results[results.length - 1][0].transcript.toLowerCase();
      
      if (last.includes('hey') || last.includes('ai')) {
        onWakeWord();
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error !== 'no-speech') {
        console.error("Wake Word Error:", event.error);
      }
    };

    recognition.start();
    return recognition;
  }, []);

  return { speak, listen, startWakeWordDetection };
};
