/**
 * Screen Recorder Utility
 * Handles MediaRecorder setup and circular buffer management in renderer process
 */

import { Settings } from '../types';

export class ScreenRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private segments: Blob[] = []; // Each segment is a complete 1-second WebM file
  private settings: Settings;
  private startTime: number = 0;
  private isRecording: boolean = false;
  private segmentTimer: NodeJS.Timeout | null = null;
  private currentSegmentChunks: Blob[] = []; // Temporary storage for current segment

  constructor(settings: Settings) {
    this.settings = settings;
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

      // Handle data available event - simple circular buffer
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.chunks.push(event.data);
          console.log('Chunk added, total chunks:', this.chunks.length);
        }
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
      };

      // Request data every second
      this.mediaRecorder.start(1000);

      this.isRecording = true;
      this.startTime = Date.now();

      // Restart every bufferDuration seconds to keep timestamps in correct range
      this.setupRestartTimer();

      console.log('Recording started, will restart every', this.settings.bufferDuration, 'seconds');

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
   * Set up timer to restart MediaRecorder at buffer duration interval
   * This keeps all chunks within 0-bufferDuration timestamp range
   */
  private setupRestartTimer(): void {
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
    }

    // Restart at bufferDuration interval
    this.restartTimer = setTimeout(() => {
      if (this.isRecording) {
        this.restartRecording();
      }
    }, this.settings.bufferDuration * 1000);
  }

  /**
   * Restart MediaRecorder to reset timestamps
   */
  private async restartRecording(): Promise<void> {
    if (!this.stream || !this.isRecording) return;

    try {
      console.log('Restarting recording to reset timestamps...');

      // Stop current MediaRecorder
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      // Clear chunks - start fresh buffer
      this.chunks = [];

      // Configure MediaRecorder
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

      this.mediaRecorder = new MediaRecorder(this.stream, options);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.chunks.push(event.data);
        }
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
      };

      this.mediaRecorder.start(1000);

      // Schedule next restart
      this.setupRestartTimer();

      console.log('Recording restarted');
    } catch (error) {
      console.error('Failed to restart recording:', error);
      this.setupRestartTimer();
    }
  }

  /**
   * Get last N seconds of recording as blob
   * Since we restart every bufferDuration seconds, all chunks are from current session
   */
  async getLastNSeconds(seconds: number): Promise<Blob | null> {
    if (this.chunks.length === 0) {
      return null;
    }

    console.log(`Creating clip from ${this.chunks.length} chunks`);

    // Combine all chunks - they're all from the current session
    return new Blob(this.chunks, { type: 'video/webm' });
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
