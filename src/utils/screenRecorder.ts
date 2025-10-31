/**
 * Screen Recorder Utility
 * Handles MediaRecorder setup and circular buffer management in renderer process
 */

import { Settings } from '../types';

interface VideoChunk {
  data: Blob;
  timestamp: number;
}

export class ScreenRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: VideoChunk[] = [];
  private settings: Settings;
  private startTime: number = 0;
  private isRecording: boolean = false;
  private restartTimer: NodeJS.Timeout | null = null;
  private sessionStartTime: number = 0; // Track when current recording session started

  constructor(settings: Settings) {
    this.settings = settings;
  }

  /**
   * Get restart interval based on buffer duration to ensure clean session boundaries
   */
  private getRestartInterval(): number {
    // Restart at 3x buffer duration or max 3 minutes, whichever is shorter
    return Math.min(this.settings.bufferDuration * 3 * 1000, 180000);
  }

  /**
   * Start recording with given screen source
   */
  async start(sourceId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get screen stream with system audio
      const constraints = {
        audio: this.settings.speakerId !== 'none' ? {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: sourceId,
          },
        } : false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: sourceId,
            minWidth: 1280,
            maxWidth: 3840,
            minHeight: 720,
            maxHeight: 2160,
          },
        },
      } as any;

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);

      // Get microphone stream if enabled
      if (this.settings.microphoneId !== 'none') {
        try {
          const micConstraints: MediaStreamConstraints = {
            audio: this.settings.microphoneId === 'default'
              ? true
              : { deviceId: { exact: this.settings.microphoneId } },
            video: false,
          };
          const micStream = await navigator.mediaDevices.getUserMedia(micConstraints);

          // Add microphone audio track to the main stream
          micStream.getAudioTracks().forEach(track => {
            this.stream!.addTrack(track);
          });
        } catch (error) {
          console.warn('Failed to get microphone stream:', error);
          // Continue without microphone
        }
      }

      // Configure MediaRecorder with codec fallback
      let mimeType = 'video/webm;codecs=vp9';

      // Try different codecs in order of preference
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp8';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }

      console.log('Using mimeType:', mimeType);

      const options: MediaRecorderOptions = {
        mimeType,
        videoBitsPerSecond: this.settings.bitrate * 1000000, // Convert Mbps to bps
      };

      this.mediaRecorder = new MediaRecorder(this.stream, options);

      // Handle data available event
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.addChunk(event.data);
        }
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
      };

      // Request data every second for fine-grained circular buffer
      this.mediaRecorder.start(1000);

      this.isRecording = true;
      this.startTime = Date.now();
      this.sessionStartTime = Date.now();

      // Set up periodic restart to reset timestamps
      this.setupPeriodicRestart();

      console.log('Recording started, will restart every', this.getRestartInterval() / 1000, 'seconds');

      return { success: true };
    } catch (error: any) {
      console.error('Error starting recording:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Stop recording
   */
  stop(): void {
    // Clear restart timer
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    this.chunks = [];
    this.isRecording = false;
  }

  /**
   * Set up periodic restart to reset timestamps
   */
  private setupPeriodicRestart(): void {
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
    }

    this.restartTimer = setTimeout(() => {
      if (this.isRecording) {
        this.restartMediaRecorder();
      }
    }, this.getRestartInterval());
  }

  /**
   * Restart MediaRecorder to reset timestamps while keeping stream
   */
  private async restartMediaRecorder(): Promise<void> {
    if (!this.stream || !this.isRecording) return;

    try {
      console.log('Restarting MediaRecorder to reset timestamps...');

      // Stop current MediaRecorder
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      }

      // Wait a moment for the stop to complete and for final chunks
      await new Promise(resolve => setTimeout(resolve, 200));

      // Clear old chunks - we're starting a fresh session with new timestamps
      // This prevents mixing chunks with different timestamp bases
      console.log('Clearing', this.chunks.length, 'old chunks from previous session');
      this.chunks = [];

      // Configure new MediaRecorder with same settings
      let mimeType = 'video/webm;codecs=vp9';

      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp8';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }

      const options: MediaRecorderOptions = {
        mimeType,
        videoBitsPerSecond: this.settings.bitrate * 1000000,
      };

      // Create new MediaRecorder with the existing stream
      this.mediaRecorder = new MediaRecorder(this.stream, options);

      // Set up event handlers
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.addChunk(event.data);
        }
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
      };

      // Start recording again
      this.mediaRecorder.start(1000);

      // Reset session start time for the new session
      this.sessionStartTime = Date.now();

      // Schedule next restart
      this.setupPeriodicRestart();

      console.log('MediaRecorder restarted successfully, new session started');
    } catch (error) {
      console.error('Failed to restart MediaRecorder:', error);
      // Continue with old recorder if restart fails
      this.setupPeriodicRestart();
    }
  }

  /**
   * Get last N seconds of recording as blob
   */
  async getLastNSeconds(seconds: number): Promise<Blob | null> {
    if (this.chunks.length === 0) {
      return null;
    }

    const now = Date.now();
    const cutoffTime = now - seconds * 1000;

    // Find the index of the first chunk we want to include
    let startIndex = 0;
    for (let i = 0; i < this.chunks.length; i++) {
      if (this.chunks[i].timestamp >= cutoffTime) {
        startIndex = i;
        break;
      }
    }

    // IMPORTANT: Always include the first chunk (index 0) as it contains
    // the WebM initialization segment (headers) needed for playback
    // If we don't have the first chunk anymore, include all available chunks
    if (startIndex > 0 && this.chunks.length > 0) {
      // Include at least the first chunk for headers
      startIndex = Math.max(0, startIndex - 1);
    }

    const selectedChunks = this.chunks.slice(startIndex);

    if (selectedChunks.length === 0) {
      return null;
    }

    // Combine chunks into single blob
    const blobs = selectedChunks.map((chunk) => chunk.data);
    return new Blob(blobs, { type: 'video/webm' });
  }

  /**
   * Add chunk to circular buffer
   */
  private addChunk(blob: Blob): void {
    const chunk: VideoChunk = {
      data: blob,
      timestamp: Date.now(),
    };

    this.chunks.push(chunk);

    // Remove old chunks beyond buffer duration, but ALWAYS keep the first chunk
    // as it contains the WebM initialization segment (headers) needed for playback
    if (this.chunks.length > 1) {
      const cutoffTime = Date.now() - this.settings.bufferDuration * 1000;
      const firstChunk = this.chunks[0];
      const remainingChunks = this.chunks.slice(1).filter((c) => c.timestamp >= cutoffTime);
      this.chunks = [firstChunk, ...remainingChunks];
    }
  }

  /**
   * Get current recording duration
   */
  getCurrentDuration(): number {
    if (!this.isRecording) return 0;
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  /**
   * Check if currently recording
   */
  isActive(): boolean {
    return this.isRecording;
  }

  /**
   * Update settings (for when user changes settings while recording)
   */
  updateSettings(settings: Settings): void {
    this.settings = settings;
  }
}
