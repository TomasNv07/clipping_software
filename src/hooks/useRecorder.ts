import { useState, useEffect, useRef } from 'react';
import { RecordingState } from '../types';
import { ScreenRecorder } from '../utils/screenRecorder';

export function useRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [bufferTime, setBufferTime] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const recorderRef = useRef<ScreenRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Listen to recording state changes from main process
    window.electron.onRecordingStateChange((state: RecordingState) => {
      setIsRecording(state.isRecording);
      setBufferTime(state.bufferTime);
      setIsSaving(state.isSaving);
    });

    // Listen for notification events
    window.electron.onNotification((notification) => {
      console.log(notification.message);
    });

    // Listen for hotkey press
    window.electron.onHotkeyPressed(() => {
      saveClip();
    });

    // Cleanup on unmount
    return () => {
      if (recorderRef.current) {
        recorderRef.current.stop();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const toggleRecording = async () => {
    if (isRecording) {
      // Stop recording
      if (recorderRef.current) {
        recorderRef.current.stop();
        recorderRef.current = null;
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      await window.electron.stopRecording();
      setIsRecording(false);
      setBufferTime(0);
    } else {
      // Start recording
      try {
        // Get current settings
        const settings = await window.electron.getSettings();

        // Get screen sources
        const sources = await window.electron.getScreenSources();
        if (sources.length === 0) {
          alert('No screen sources available. Please grant screen recording permissions.');
          return;
        }

        // Create recorder instance
        const recorder = new ScreenRecorder(settings);
        const result = await recorder.start(sources[0].id);

        if (result.success) {
          recorderRef.current = recorder;

          // Notify main process
          await window.electron.startRecording();

          setIsRecording(true);

          // Start timer for buffer tracking
          timerRef.current = setInterval(() => {
            if (recorderRef.current) {
              const duration = recorderRef.current.getCurrentDuration();
              setBufferTime(Math.min(duration, settings.bufferDuration));
            }
          }, 1000);
        } else {
          alert(`Failed to start recording: ${result.error}`);
        }
      } catch (error: any) {
        console.error('Error starting recording:', error);
        alert(`Failed to start recording: ${error.message}`);
      }
    }
  };

  const saveClip = async () => {
    if (!isRecording || !recorderRef.current) {
      alert('Recording not active. Start recording first.');
      return;
    }

    try {
      setIsSaving(true);

      // Get current settings for buffer duration
      const settings = await window.electron.getSettings();

      // Get video blob from recorder
      const videoBlob = await recorderRef.current.getLastNSeconds(settings.bufferDuration);

      if (!videoBlob) {
        alert('No video data available. Record for a few seconds first.');
        setIsSaving(false);
        return;
      }

      // Convert blob to array buffer for IPC
      const arrayBuffer = await videoBlob.arrayBuffer();

      // Send to main process for encoding
      const result = await window.electron.saveClip(arrayBuffer);

      if (result.success) {
        console.log('Clip saved successfully!');
      } else if (result.error) {
        alert(`Failed to save clip: ${result.error}`);
      }

      setIsSaving(false);
    } catch (error: any) {
      console.error('Error saving clip:', error);
      alert(`Failed to save clip: ${error.message}`);
      setIsSaving(false);
    }
  };

  return {
    isRecording,
    bufferTime,
    isSaving,
    toggleRecording,
    saveClip,
  };
}
