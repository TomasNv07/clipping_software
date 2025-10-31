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
