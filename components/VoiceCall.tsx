import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveSession, LiveServerMessage, Modality } from '@google/genai';
import { SessionStatus, Transcription } from '../types';
import { ENGLICHAT_SYSTEM_PROMPT } from '../constants';
import { createBlob, decode, decodeAudioData } from '../utils/audio';
import { MicIcon, StopCircleIcon } from './icons';

const VoiceCall: React.FC = () => {
  const [status, setStatus] = useState<SessionStatus>('idle');
  const [transcripts, setTranscripts] = useState<Transcription[]>([]);

  const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const currentInputTranscriptionRef = useRef('');
  const currentOutputTranscriptionRef = useRef('');

  const addOrUpdateTranscript = useCallback((sender: 'user' | 'ai', text: string, isFinal: boolean) => {
    setTranscripts(prev => {
        const last = prev[prev.length - 1];
        if (last && last.sender === sender && !last.isFinal) {
            const updated = [...prev];
            updated[updated.length - 1] = { ...last, text: last.text + text, isFinal };
            return updated;
        } else {
             // If the last final transcript was from the same sender, append. Otherwise, new entry.
            if(last && last.sender === sender && last.isFinal) {
                 const updated = [...prev];
                 updated[updated.length - 1] = { ...last, text: last.text + ' ' + text, isFinal };
                 return updated;
            }
            return [...prev, { id: Date.now().toString(), sender, text, isFinal }];
        }
    });
  }, []);


  const stopConversation = useCallback(async () => {
    setStatus('closing');
    
    // Stop microphone stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    // Disconnect audio processing
    if (scriptProcessorRef.current) {
        scriptProcessorRef.current.disconnect();
        scriptProcessorRef.current = null;
    }
    // Close audio contexts
    if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
      await inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }
    if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
        // Stop any playing audio
        audioSourcesRef.current.forEach(source => source.stop());
        audioSourcesRef.current.clear();
        await outputAudioContextRef.current.close();
        outputAudioContextRef.current = null;
    }

    // Close Gemini session
    if (sessionPromiseRef.current) {
      const session = await sessionPromiseRef.current;
      session.close();
      sessionPromiseRef.current = null;
    }
    
    setStatus('idle');
  }, []);

  const startConversation = async () => {
    if (status !== 'idle') return;

    setStatus('connecting');
    setTranscripts([{ id: 'start', text: "Connecting to EngliChat...", sender: 'ai', isFinal: true }]);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      
      // FIX: Cast window to `any` to support `webkitAudioContext` for older browsers without TypeScript errors.
      inputAudioContextRef.current = new ((window as any).AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      // FIX: Cast window to `any` to support `webkitAudioContext` for older browsers without TypeScript errors.
      outputAudioContextRef.current = new ((window as any).AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      nextStartTimeRef.current = 0;

      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          systemInstruction: ENGLICHAT_SYSTEM_PROMPT,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            setStatus('active');
            setTranscripts(prev => [...prev.slice(0, prev.length-1), {id: 'connected', text: "Connected! Start speaking.", sender: 'ai', isFinal: true}]);
            
            const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = scriptProcessor;
            
            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              if (sessionPromiseRef.current) {
                 sessionPromiseRef.current.then((session) => {
                    session.sendRealtimeInput({ media: pcmBlob });
                 });
              }
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContextRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription) {
                const { text } = message.serverContent.inputTranscription;
                currentInputTranscriptionRef.current += text;
                addOrUpdateTranscript('user', text, false);
            }
            if(message.serverContent?.outputTranscription) {
                const { text } = message.serverContent.outputTranscription;
                currentOutputTranscriptionRef.current += text;
                addOrUpdateTranscript('ai', text, false);
            }
             if (message.serverContent?.turnComplete) {
                if (currentInputTranscriptionRef.current) {
                    setTranscripts(prev => prev.map(t => t.sender === 'user' && !t.isFinal ? {...t, text: currentInputTranscriptionRef.current, isFinal: true} : t));
                    currentInputTranscriptionRef.current = '';
                }
                 if (currentOutputTranscriptionRef.current) {
                    setTranscripts(prev => prev.map(t => t.sender === 'ai' && !t.isFinal ? {...t, text: currentOutputTranscriptionRef.current, isFinal: true} : t));
                    currentOutputTranscriptionRef.current = '';
                }
            }

            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current) {
              const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContextRef.current, 24000, 1);
              const sourceNode = outputAudioContextRef.current.createBufferSource();
              sourceNode.buffer = audioBuffer;
              sourceNode.connect(outputAudioContextRef.current.destination);
              
              const currentTime = outputAudioContextRef.current.currentTime;
              const startTime = Math.max(currentTime, nextStartTimeRef.current);
              sourceNode.start(startTime);

              nextStartTimeRef.current = startTime + audioBuffer.duration;
              audioSourcesRef.current.add(sourceNode);
              sourceNode.onended = () => {
                  audioSourcesRef.current.delete(sourceNode);
              };
            }
             if (message.serverContent?.interrupted) {
                audioSourcesRef.current.forEach(source => source.stop());
                audioSourcesRef.current.clear();
                nextStartTimeRef.current = 0;
            }
          },
          onerror: (e: ErrorEvent) => {
            console.error('Session error:', e);
            setStatus('error');
            setTranscripts(prev => [...prev, {id: 'error', text: "Connection error. Please try again.", sender: 'ai', isFinal: true}]);
            stopConversation();
          },
          onclose: (e: CloseEvent) => {
             stopConversation();
          },
        },
      });
    } catch (error) {
      console.error('Failed to start conversation:', error);
      setStatus('error');
      setTranscripts([{id: 'fail', text: "Could not start the session. Please check microphone permissions and refresh.", sender: 'ai', isFinal: true}]);
    }
  };

  const transcriptsEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    transcriptsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);
  
  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-250px)]">
        <div className="flex-grow overflow-y-auto pr-2 space-y-4">
            {transcripts.map((t) => (
                <div key={t.id} className={`flex ${t.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <p className={`max-w-xl p-3 rounded-2xl text-sm ${t.sender === 'user' ? 'bg-sky-600 text-white rounded-br-none' : 'bg-slate-700 text-slate-200 rounded-bl-none'} ${!t.isFinal ? 'opacity-70' : ''}`}>
                        {t.sender === 'user' ? 'You: ' : 'AI: '} {t.text}
                    </p>
                </div>
            ))}
             <div ref={transcriptsEndRef} />
        </div>
        <div className="pt-4 mt-auto flex flex-col items-center justify-center gap-4">
            {status === 'idle' && (
                <button onClick={startConversation} className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded-full flex items-center gap-2 transition-transform transform hover:scale-105">
                    <MicIcon /> Start Voice Call
                </button>
            )}
            {status === 'connecting' && <p className="text-slate-400">Connecting...</p>}
            {status === 'active' && (
                <>
                    <div className="relative flex items-center justify-center">
                        <div className="absolute w-16 h-16 bg-green-500/50 rounded-full animate-ping"></div>
                        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
                            <MicIcon className="w-8 h-8 text-white" />
                        </div>
                    </div>
                    <button onClick={stopConversation} className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded-full flex items-center gap-2 text-sm mt-2">
                        <StopCircleIcon className="w-4 h-4" /> End Call
                    </button>
                </>
            )}
            {status === 'error' && <p className="text-red-400">An error occurred. Please try again.</p>}
        </div>
    </div>
  );
};

export default VoiceCall;
