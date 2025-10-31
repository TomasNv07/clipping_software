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

      // Handle data available - collect chunks for current segment
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.currentSegmentChunks.push(event.data);
        }
      };

      // When recording stops, save the complete segment
      this.mediaRecorder.onstop = () => {
        if (this.currentSegmentChunks.length > 0) {
          // Combine chunks into one complete WebM segment
          const segment = new Blob(this.currentSegmentChunks, { type: 'video/webm' });
          this.segments.push(segment);
          this.currentSegmentChunks = [];

          // Keep only last N seconds of segments
          const maxSegments = this.settings.bufferDuration;
          if (this.segments.length > maxSegments) {
            this.segments = this.segments.slice(-maxSegments);
          }

          console.log('Segment saved, total segments:', this.segments.length);
        }

        // Restart recording for next segment if still active
        if (this.isRecording && this.stream) {
          this.startSegment();
        }
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
      };

      // Start first segment
      this.mediaRecorder.start();

      this.isRecording = true;
      this.startTime = Date.now();

      // Stop after 1 second to create a complete segment
      this.setupSegmentTimer();

      console.log('Recording started with', this.settings.bufferDuration, 'second buffer');

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
    this.isRecording = false;

    // Clear segment timer
    if (this.segmentTimer) {
      clearTimeout(this.segmentTimer);
      this.segmentTimer = null;
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    this.segments = [];
    this.currentSegmentChunks = [];
  }

  /**
   * Start a new 1-second segment
   */
  private startSegment(): void {
    if (!this.stream || !this.isRecording) return;

    try {
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
          this.currentSegmentChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        if (this.currentSegmentChunks.length > 0) {
          const segment = new Blob(this.currentSegmentChunks, { type: 'video/webm' });
          this.segments.push(segment);
          this.currentSegmentChunks = [];

          // Keep only last N seconds
          const maxSegments = this.settings.bufferDuration;
          if (this.segments.length > maxSegments) {
            this.segments = this.segments.slice(-maxSegments);
          }
        }

        // Continue recording next segment
        if (this.isRecording && this.stream) {
          this.startSegment();
        }
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
      };

      this.mediaRecorder.start();
      this.setupSegmentTimer();
    } catch (error) {
      console.error('Failed to start segment:', error);
    }
  }

  /**
   * Set up timer to stop current segment after 1 second
   */
  private setupSegmentTimer(): void {
    if (this.segmentTimer) {
      clearTimeout(this.segmentTimer);
    }

    this.segmentTimer = setTimeout(() => {
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop(); // This will trigger onstop which starts next segment
      }
    }, 1000); // Stop after 1 second to get a complete WebM segment
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
