import { useState, useEffect } from 'react';
import { RecordingState } from '../types';

export function useRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [bufferTime, setBufferTime] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Listen to recording state changes from main process
    window.electron.onRecordingStateChange((state: RecordingState) => {
      setIsRecording(state.isRecording);
      setBufferTime(state.bufferTime);
      setIsSaving(state.isSaving);
    });

    // Listen for notification events
    window.electron.onNotification((notification) => {
      // Could show toast notifications here
      console.log(notification.message);
    });
  }, []);

  const toggleRecording = async () => {
    if (isRecording) {
      // Stop recording
      const result = await window.electron.stopRecording();
      if (result.success) {
        setIsRecording(false);
        setBufferTime(0);
      }
    } else {
      // Start recording
      const result = await window.electron.startRecording();
      if (result.success) {
        setIsRecording(true);
      } else if (result.error) {
        alert(`Failed to start recording: ${result.error}`);
      }
    }
  };

  const saveClip = async () => {
    if (!isRecording) {
      alert('Recording not active. Start recording first.');
      return;
    }

    const result = await window.electron.saveClip();
    if (!result.success && result.error) {
      alert(`Failed to save clip: ${result.error}`);
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
