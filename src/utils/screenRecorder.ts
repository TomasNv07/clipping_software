/**
 * Screen Recorder Utility
 * Handles MediaRecorder setup and circular buffer management in renderer process
 */

import { Settings } from '../types';

interface TimedChunk {
  blob: Blob;
  addedAt: number;
}

export class ScreenRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: TimedChunk[] = [];
  private settings: Settings;
  private startTime: number = 0;
  private isRecording: boolean = false;

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

      // Handle data available - track when chunks are added
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.chunks.push({
            blob: event.data,
            addedAt: Date.now()
          });

          // Remove chunks older than buffer duration
          const cutoffTime = Date.now() - (this.settings.bufferDuration * 1000);
          this.chunks = this.chunks.filter(c => c.addedAt >= cutoffTime);

          console.log('Chunk added, buffer has', this.chunks.length, 'chunks');
        }
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
      };

      // Request chunks frequently (every 100ms) for smooth buffer
      this.mediaRecorder.start(100);

      this.isRecording = true;
      this.startTime = Date.now();

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
   * Get last N seconds of recording as blob
   * Combines all 1-second segments into a single WebM file
   */
  async getLastNSeconds(seconds: number): Promise<Blob | null> {
    if (this.segments.length === 0) {
      return null;
    }

    console.log(`Creating clip from ${this.segments.length} segments (${this.segments.length} seconds of video)`);

    // Each segment is a complete 1-second WebM file with timestamps 0-1000ms
    // Simply combine all segments - they're all complete WebM files
    return new Blob(this.segments, { type: 'video/webm' });
  }

  /**
   * Get current recording duration (number of seconds in buffer)
   */
  getCurrentDuration(): number {
    if (!this.isRecording) return 0;
    // Return number of complete 1-second segments in buffer
    return this.segments.length;
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
