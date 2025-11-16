import { useState, useRef, useCallback } from 'react';
import { GoogleGenAI } from '@google/genai';

interface TranscriptionEntry {
  speaker: 'user' | 'model';
  text: string;
}

// Audio Decoding/Encoding Functions (copied from working version)
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function createBlob(data: Float32Array) {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

const useVoiceTutor = (systemInstruction: string) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcriptionHistory, setTranscriptionHistory] = useState<TranscriptionEntry[]>([]);

  const sessionRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  
  const currentInputTranscription = useRef('');
  const currentOutputTranscription = useRef('');

  const stopSession = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if(mediaStreamSourceRef.current) {
      mediaStreamSourceRef.current.disconnect();
      mediaStreamSourceRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsConnecting(false);
  }, []);

  const startSession = useCallback(async () => {
    if (sessionRef.current) return;

    setIsConnecting(true);
    setError(null);
    setTranscriptionHistory([]);
    currentInputTranscription.current = '';
    currentOutputTranscription.current = '';
    
    try {
      const GEMINI_API_KEY = (import.meta as any).env?.VITE_GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
      const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = inputAudioContext;
      const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      let nextStartTime = 0;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: ['audio' as any],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: systemInstruction,
        },
        callbacks: {
          onopen: () => {
            setIsConnecting(false);
            const source = inputAudioContext.createMediaStreamSource(stream);
            mediaStreamSourceRef.current = source;
            const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = scriptProcessor;

            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromise.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContext.destination);
          },
          onmessage: async (message: any) => {
            if (message.serverContent?.inputTranscription) {
              currentInputTranscription.current += message.serverContent.inputTranscription.text;
            }
            if (message.serverContent?.outputTranscription) {
              currentOutputTranscription.current += message.serverContent.outputTranscription.text;
            }
            if (message.serverContent?.turnComplete) {
              const fullInput = currentInputTranscription.current;
              const fullOutput = currentOutputTranscription.current;
              
              setTranscriptionHistory(prev => [
                ...prev,
                { speaker: 'user', text: fullInput },
                { speaker: 'model', text: fullOutput }
              ]);

              currentInputTranscription.current = '';
              currentOutputTranscription.current = '';
            }

            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              nextStartTime = Math.max(nextStartTime, outputAudioContext.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContext, 24000, 1);
              const source = outputAudioContext.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputAudioContext.destination);
              source.start(nextStartTime);
              nextStartTime += audioBuffer.duration;
            }
          },
          onerror: (e: ErrorEvent) => {
            setError(e.message || 'An unknown error occurred.');
            setIsConnecting(false);
            stopSession();
          },
          onclose: () => {
            stopSession();
          },
        },
      });

      sessionRef.current = await sessionPromise;

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start session.');
      setIsConnecting(false);
      stopSession();
    }
  }, [systemInstruction, stopSession]);

  return { startSession, stopSession, transcriptionHistory, isConnecting, error };
};

export default useVoiceTutor;