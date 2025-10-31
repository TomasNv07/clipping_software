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

  constructor(settings: Settings) {
    this.settings = settings;
  }

  /**
   * Start recording with given screen source
   */
  async start(sourceId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get screen stream with constraints
      const constraints = {
        audio: false, // Can be enabled for system audio later
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
   * Get last N seconds of recording as blob
   */
  async getLastNSeconds(seconds: number): Promise<Blob | null> {
    if (this.chunks.length === 0) {
      return null;
    }

    const now = Date.now();
    const cutoffTime = now - seconds * 1000;

    // Filter chunks within time window
    const recentChunks = this.chunks.filter(
      (chunk) => chunk.timestamp >= cutoffTime
    );

    if (recentChunks.length === 0) {
      return null;
    }

    // Combine chunks into single blob
    const blobs = recentChunks.map((chunk) => chunk.data);
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

    // Remove old chunks beyond buffer duration
    const cutoffTime = Date.now() - this.settings.bufferDuration * 1000;
    this.chunks = this.chunks.filter((c) => c.timestamp >= cutoffTime);
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
