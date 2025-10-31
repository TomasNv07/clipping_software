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

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    this.chunks = [];
  }

  /**
   * Get last N seconds of recording as blob
   * Returns chunks from the buffer - may have duration issues but will play
   */
  async getLastNSeconds(seconds: number): Promise<Blob | null> {
    if (this.chunks.length === 0) {
      return null;
    }

    // Ensure we only include first chunk (has WebM header) + recent chunks
    const firstChunk = this.chunks[0];
    const cutoffTime = Date.now() - (seconds * 1000);
    const recentChunks = this.chunks.filter(c => c.addedAt >= cutoffTime);

    // Always include first chunk for WebM header
    const chunksToSave = [firstChunk, ...recentChunks.filter(c => c !== firstChunk)];

    console.log(`Creating clip from ${chunksToSave.length} chunks`);

    const blobs = chunksToSave.map(c => c.blob);
    return new Blob(blobs, { type: 'video/webm' });
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
