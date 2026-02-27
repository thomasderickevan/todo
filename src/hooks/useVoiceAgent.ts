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

  return { speak, listen };
};
