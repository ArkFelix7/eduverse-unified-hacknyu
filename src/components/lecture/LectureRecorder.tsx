import React, { useState, useRef, useEffect } from 'react';
import { connectToLiveAudio, createAudioBlob, analyzeLecture } from '../../services/geminiService';
import { databaseService } from '../../services/databaseService';
import { supabase, STORAGE_BUCKETS } from '../../lib/supabase';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import toast from 'react-hot-toast';
import { LectureAnalysis } from '../../types';

interface LectureRecorderProps {
  projectId: string;
  onRecordingComplete: (lecture: any, analysis: LectureAnalysis) => void;
  onClose: () => void;
}

type RecordingState = 'idle' | 'recording' | 'processing' | 'completed' | 'error';

const LectureRecorder: React.FC<LectureRecorderProps> = ({ 
  projectId, 
  onRecordingComplete, 
  onClose 
}) => {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  
  // Refs for recording
  const liveSessionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const transcriptPartsRef = useRef<string[]>([]);
  const isNewUtteranceRef = useRef<boolean>(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Add state persistence for tab switches
  const STORAGE_KEY = `lecture_recorder_${projectId}`;

  useEffect(() => {
    // Try to restore recording state on mount
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        if (parsed.recordingState === 'recording') {
          // If we were recording before tab switch, show warning
          toast.error('Previous recording session lost due to tab switch. Please start a new recording.');
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch (err) {
        console.warn('Failed to restore state:', err);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, [STORAGE_KEY]);

  useEffect(() => {
    // Save state to localStorage on state changes
    if (recordingState !== 'idle') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        recordingState,
        liveTranscript,
        finalTranscript,
        recordingTime
      }));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [recordingState, liveTranscript, finalTranscript, recordingTime, STORAGE_KEY]);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      cleanup();
      // Clean up localStorage only if recording is not in progress
      if (recordingState !== 'recording') {
        localStorage.removeItem(STORAGE_KEY);
      }
    };
  }, [STORAGE_KEY, recordingState]);

  const cleanup = () => {
    // Stop media stream tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Close live session
    if (liveSessionRef.current) {
      try {
        liveSessionRef.current.close();
      } catch (err) {
        console.warn('Error closing live session:', err);
      }
      liveSessionRef.current = null;
    }

    // Clean up audio processing interval
    if (scriptProcessorRef.current) {
      try {
        if (typeof scriptProcessorRef.current === 'number') {
          // It's an interval ID
          clearInterval(scriptProcessorRef.current);
        } else {
          // It's an audio node
          scriptProcessorRef.current.disconnect();
        }
      } catch (err) {
        console.warn('Error cleaning up audio processor:', err);
      }
      scriptProcessorRef.current = null;
    }
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch (err) {
        console.warn('Error closing audio context:', err);
      }
      audioContextRef.current = null;
    }
  };

  const handleMessage = (text: string, isFinal: boolean) => {
    console.log('Received transcript:', { text, isFinal, currentParts: transcriptPartsRef.current.length });
    
    // This logic correctly handles streaming transcription services.
    // It builds an array of utterances, updating the last one with partial results
    // until it's marked as final.
    if (text && text.trim()) {
      if (isNewUtteranceRef.current) {
        // Starts a new utterance part
        transcriptPartsRef.current.push(text.trim());
        isNewUtteranceRef.current = false;
      } else {
        // Updates the last utterance part with the new partial transcript
        if (transcriptPartsRef.current.length > 0) {
          transcriptPartsRef.current[transcriptPartsRef.current.length - 1] = text.trim();
        } else {
          transcriptPartsRef.current.push(text.trim());
        }
      }
    }
  
    if (isFinal && text && text.trim()) {
      // The next transcription message will start a new utterance
      isNewUtteranceRef.current = true;
    }
  
    const fullTranscript = transcriptPartsRef.current.join(' ');
    setLiveTranscript(fullTranscript);
    console.log('Current full transcript:', fullTranscript);
  };

  const startRecording = async () => {
    try {
      setError(null);
      setRecordingState('recording');
      setLiveTranscript('');
      setFinalTranscript('');
      setRecordingTime(0);
      transcriptPartsRef.current = [];
      isNewUtteranceRef.current = true;
      recordedChunksRef.current = [];

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });
      
      streamRef.current = stream;

      // Setup MediaRecorder for full audio recording
      const mimeType = MediaRecorder.isTypeSupported('audio/mpeg') 
        ? 'audio/mpeg' 
        : MediaRecorder.isTypeSupported('audio/webm') 
        ? 'audio/webm' 
        : 'audio/mp4';
      
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.start(1000); // Record in 1s chunks

      // Connect to Gemini Live API first
      liveSessionRef.current = await connectToLiveAudio(handleMessage, (error: Error) => {
        console.error('Live session error:', error);
        setError('Live transcription error: ' + error.message);
      });
      
      // Setup Web Audio for real-time processing with proper audio routing
      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      const source = audioContextRef.current.createMediaStreamSource(stream);
      
      // Create a gain node to monitor audio levels
      const gainNode = audioContextRef.current.createGain();
      gainNode.gain.value = 1.0;
      
      // Use AudioWorklet or ScriptProcessor fallback for audio processing
      try {
        // Try to use AudioWorklet (modern approach)
        await audioContextRef.current.audioWorklet.addModule(
          new URL('../../../public/audio-processor.js', import.meta.url)
        );
        const audioWorkletNode = new AudioWorkletNode(audioContextRef.current, 'audio-processor');
        
        audioWorkletNode.port.onmessage = (event) => {
          if (liveSessionRef.current && recordingState === 'recording' && event.data.audioData) {
            const audioBlob = createAudioBlob(new Float32Array(event.data.audioData));
            try {
              liveSessionRef.current.sendRealtimeInput({ media: audioBlob });
            } catch (err) {
              console.error('Error sending audio data:', err);
            }
          }
        };
        
        source.connect(gainNode).connect(audioWorkletNode);
        scriptProcessorRef.current = audioWorkletNode;
      } catch (workletError) {
        console.warn('AudioWorklet not available, falling back to ScriptProcessor:', workletError);
        
        // Fallback to ScriptProcessor (deprecated but widely supported)
        const scriptProcessor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
        
        scriptProcessor.onaudioprocess = (event) => {
          if (liveSessionRef.current && recordingState === 'recording') {
            const inputData = event.inputBuffer.getChannelData(0);
            
            // Check if we have actual audio data
            const hasAudio = inputData.some(sample => Math.abs(sample) > 0.001);
            if (hasAudio) {
              const audioBlob = createAudioBlob(inputData);
              
              try {
                liveSessionRef.current.sendRealtimeInput({ media: audioBlob });
              } catch (err) {
                console.error('Error sending audio data:', err);
              }
            }
          }
        };
        
        source.connect(gainNode).connect(scriptProcessor);
        scriptProcessor.connect(audioContextRef.current.destination);
        scriptProcessorRef.current = scriptProcessor;
      }

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      toast.success('Recording started!');
      
    } catch (err) {
      console.error('Error starting recording:', err);
      setError(err instanceof Error ? err.message : 'Failed to start recording');
      setRecordingState('error');
    }
  };

  const stopRecording = async () => {
    if (recordingState !== 'recording') return;

    try {
      setRecordingState('processing');
      
      // Stop timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Stop MediaRecorder
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }

      // Clean up audio/live session resources
      cleanup();

      // Wait a moment for final chunks and any remaining transcription
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Create audio blob from recorded chunks
      const audioBlob = new Blob(recordedChunksRef.current, { 
        type: mediaRecorderRef.current?.mimeType || 'audio/webm' 
      });

      const completeTranscript = transcriptPartsRef.current.join(' ').trim();
      setFinalTranscript(completeTranscript);
      
      console.log('Final transcript parts:', transcriptPartsRef.current);
      console.log('Complete transcript:', completeTranscript);
      console.log('Audio blob size:', audioBlob.size);
      
      // Upload audio file to Supabase Storage
      let audioFileUrl: string | null = null;
      if (audioBlob.size > 1000) { // Only upload if we have meaningful audio
        try {
          const fileName = `lecture_${Date.now()}_${projectId}.${audioBlob.type.includes('webm') ? 'webm' : 'mp3'}`;
          console.log('Uploading audio file:', fileName, 'Size:', audioBlob.size);
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from(STORAGE_BUCKETS.LECTURE_AUDIO)
            .upload(fileName, audioBlob, {
              contentType: audioBlob.type,
              upsert: false
            });
          
          if (uploadError) {
            console.warn('Audio upload failed:', uploadError);
            toast.error('Failed to upload audio file: ' + uploadError.message);
          } else {
            // Get public URL
            const { data: urlData } = supabase.storage
              .from(STORAGE_BUCKETS.LECTURE_AUDIO)
              .getPublicUrl(fileName);
            audioFileUrl = urlData.publicUrl;
            console.log('Audio uploaded successfully:', audioFileUrl);
            toast.success('Audio file uploaded successfully!');
          }
        } catch (uploadErr) {
          console.warn('Error uploading audio:', uploadErr);
          toast.error('Audio upload failed: ' + (uploadErr instanceof Error ? uploadErr.message : 'Unknown error'));
        }
      } else {
        toast.warning('Audio file too small to upload');
      }
      
      // If no transcript but we have audio, still try to process
      if (!completeTranscript && audioBlob.size < 10000) {
        throw new Error('Recording was too short and no speech was detected. Please try recording for at least 5-10 seconds and speak more clearly.');
      }
      
      if (!completeTranscript) {
        // If we have audio but no live transcript, use a placeholder
        // The analyzeLecture function will process the audio directly
        console.log('No live transcript generated, but audio exists. Will rely on audio analysis.');
      }

      // Analyze the lecture (this will work with audio even if transcript is empty)
      const analysis = await analyzeLecture(
        completeTranscript || 'Audio transcription will be processed from the recorded audio.', 
        audioBlob
      );

      // Save to database
      const lectureSession = await databaseService.createLectureSession({
        project_id: projectId,
        title: analysis.title || 'Recorded Lecture',
        live_transcript: liveTranscript || '',
        final_transcript: completeTranscript || '',
        audio_file_url: audioFileUrl,
        duration: recordingTime,
        status: 'completed' as const,
        analysis: analysis,
        completed_at: new Date().toISOString()
      });
      
      // Generate learning materials from the lecture analysis
      try {
        await databaseService.generateLearningMaterialsFromLecture(
          projectId,
          lectureSession.id,
          analysis
        );
        console.log('Learning materials generated successfully');
      } catch (materialError) {
        console.warn('Failed to generate learning materials:', materialError);
        // Don't fail the entire process if material generation fails
      }

      setRecordingState('completed');
      toast.success('Lecture processed successfully!');
      onRecordingComplete(lectureSession, analysis);
      
    } catch (err) {
      console.error('Error processing recording:', err);
      setError(err instanceof Error ? err.message : 'Failed to process recording');
      setRecordingState('error');
    }
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const renderContent = () => {
    switch (recordingState) {
      case 'idle':
        return (
          <div className="text-center space-y-4">
            <div className="text-6xl mb-4">🎤</div>
            <h3 className="text-xl font-semibold mb-2">Record Lecture</h3>
            <p className="text-gray-600 mb-6">
              Start recording to capture live audio and generate real-time transcription.
            </p>
            <Button onClick={startRecording} className="w-full">
              🔴 Start Recording
            </Button>
          </div>
        );

      case 'recording':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-4xl mb-2">🔴</div>
              <h3 className="text-xl font-semibold">Recording in Progress</h3>
              <p className="text-2xl font-mono text-red-600">{formatTime(recordingTime)}</p>
            </div>
            
            {/* Live Transcript */}
            <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
              <h4 className="font-medium mb-2">Live Transcript:</h4>
              <div className="text-sm space-y-1">
                <p className="text-gray-800">{finalTranscript}</p>
                {liveTranscript && (
                  <p className="text-blue-600 italic">{liveTranscript}...</p>
                )}
              </div>
            </div>

            <Button onClick={stopRecording} variant="outline" className="w-full">
              ⏹️ Stop Recording
            </Button>
          </div>
        );

      case 'processing':
        return (
          <div className="text-center space-y-4">
            <LoadingSpinner size="lg" />
            <h3 className="text-xl font-semibold">Processing Recording...</h3>
            <p className="text-gray-600">
              Analyzing audio and generating structured content. This may take a moment.
            </p>
          </div>
        );

      case 'completed':
        return (
          <div className="text-center space-y-4">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-xl font-semibold">Recording Complete!</h3>
            <p className="text-gray-600">
              Your lecture has been processed and saved to the project.
            </p>
            <Button onClick={onClose} className="w-full">
              View Results
            </Button>
          </div>
        );

      case 'error':
        return (
          <div className="text-center space-y-4">
            <div className="text-6xl mb-4">❌</div>
            <h3 className="text-xl font-semibold">Recording Error</h3>
            <p className="text-red-600">{error}</p>
            <div className="flex space-x-2">
              <Button onClick={() => setRecordingState('idle')} variant="outline" className="flex-1">
                Try Again
              </Button>
              <Button onClick={onClose} variant="outline" className="flex-1">
                Close
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Lecture Recorder</h2>
          {recordingState === 'idle' && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl font-bold"
            >
              ×
            </button>
          )}
        </div>

        {renderContent()}
      </div>
    </div>
  );
};

export default LectureRecorder;