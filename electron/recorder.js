"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Recorder = void 0;
const electron_1 = require("electron");
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
class Recorder {
    constructor(settings, window) {
        this.isRecording = false;
        this.chunks = [];
        this.mediaRecorder = null;
        this.startTime = 0;
        this.bufferInterval = null;
        this.settings = settings;
        this.window = window;
    }
    async startRecording() {
        try {
            // Get screen sources
            const sources = await electron_1.desktopCapturer.getSources({
                types: ['screen'],
                thumbnailSize: { width: 1920, height: 1080 },
            });
            if (sources.length === 0) {
                return { success: false, error: 'No screen sources available' };
            }
            // Use the primary screen (first source)
            const primarySource = sources[0];
            // Note: Actual MediaRecorder setup would happen in the renderer process
            // This is a simplified implementation showing the structure
            // In a real implementation, we would send the source ID to the renderer
            // and set up MediaRecorder there with proper constraints
            this.isRecording = true;
            this.startTime = Date.now();
            this.chunks = [];
            // Emit state change
            this.window.webContents.send('recording-state-change', {
                isRecording: true,
                bufferTime: 0,
                isSaving: false,
            });
            // Start buffer time tracking
            this.bufferInterval = setInterval(() => {
                if (this.isRecording) {
                    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
                    const bufferTime = Math.min(elapsed, this.settings.bufferDuration);
                    this.window.webContents.send('recording-state-change', {
                        isRecording: true,
                        bufferTime,
                        isSaving: false,
                    });
                }
            }, 1000);
            return { success: true };
        }
        catch (error) {
            console.error('Error starting recording:', error);
            return { success: false, error: error.message };
        }
    }
    async stopRecording() {
        this.isRecording = false;
        this.chunks = [];
        if (this.bufferInterval) {
            clearInterval(this.bufferInterval);
            this.bufferInterval = null;
        }
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
        // Emit state change
        this.window.webContents.send('recording-state-change', {
            isRecording: false,
            bufferTime: 0,
            isSaving: false,
        });
    }
    async saveClip() {
        if (!this.isRecording) {
            return { success: false, error: 'Recording not active' };
        }
        try {
            // Emit saving state
            this.window.webContents.send('recording-state-change', {
                isRecording: true,
                bufferTime: Math.floor((Date.now() - this.startTime) / 1000),
                isSaving: true,
            });
            // Generate filename with timestamp
            const now = new Date();
            const timestamp = now
                .toISOString()
                .replace(/T/, '_')
                .replace(/\..+/, '')
                .replace(/:/g, '-');
            const filename = `Clip_${timestamp}.mp4`;
            const clipPath = path.join(this.settings.savePath, filename);
            // In a real implementation, this would:
            // 1. Get the last N seconds of chunks from the circular buffer
            // 2. Use FFmpeg to encode them to MP4 with specified settings
            // 3. Generate a thumbnail from the first frame
            // 4. Save both files to disk
            // For now, we'll create a placeholder structure
            // The actual implementation would use FFmpeg via child_process
            // Simulate clip creation (in real app, this would be actual video data)
            // This is where FFmpeg encoding would happen
            // Example: await this.encodeWithFFmpeg(chunks, clipPath);
            // Create clip metadata
            const clip = {
                id: filename,
                path: clipPath,
                filename,
                duration: this.settings.bufferDuration,
                createdAt: now,
                size: 0, // Would be actual file size
                thumbnail: clipPath.replace('.mp4', '_thumb.jpg'),
            };
            // Generate thumbnail (simplified - real implementation would use FFmpeg)
            // await this.generateThumbnail(clipPath, clip.thumbnail);
            // Reset saving state
            this.window.webContents.send('recording-state-change', {
                isRecording: true,
                bufferTime: Math.floor((Date.now() - this.startTime) / 1000),
                isSaving: false,
            });
            return { success: true, clipPath, clip };
        }
        catch (error) {
            console.error('Error saving clip:', error);
            // Reset saving state
            this.window.webContents.send('recording-state-change', {
                isRecording: true,
                bufferTime: Math.floor((Date.now() - this.startTime) / 1000),
                isSaving: false,
            });
            return { success: false, error: error.message };
        }
    }
    // Helper method for FFmpeg encoding (implementation reference)
    async encodeWithFFmpeg(inputPath, outputPath) {
        return new Promise((resolve, reject) => {
            // Parse resolution
            const [width, height] = this.settings.resolution.split('x').map(Number);
            // FFmpeg command
            // In production, ffmpegPath would be: process.resourcesPath + '/ffmpeg/ffmpeg.exe'
            const ffmpegPath = 'ffmpeg'; // Placeholder - would be bundled FFmpeg
            const args = [
                '-i', inputPath,
                '-c:v', 'libx264',
                '-preset', 'fast',
                '-crf', '23',
                '-b:v', `${this.settings.bitrate}M`,
                '-r', this.settings.fps.toString(),
                '-s', `${width}x${height}`,
                '-y',
                outputPath,
            ];
            const ffmpeg = (0, child_process_1.spawn)(ffmpegPath, args);
            ffmpeg.on('close', (code) => {
                if (code === 0) {
                    resolve();
                }
                else {
                    reject(new Error(`FFmpeg exited with code ${code}`));
                }
            });
            ffmpeg.on('error', (error) => {
                reject(error);
            });
        });
    }
    // Helper method for thumbnail generation (implementation reference)
    async generateThumbnail(videoPath, thumbnailPath) {
        return new Promise((resolve, reject) => {
            // FFmpeg command to extract first frame
            const ffmpegPath = 'ffmpeg'; // Placeholder
            const args = [
                '-i', videoPath,
                '-ss', '00:00:00',
                '-vframes', '1',
                '-s', '320x180',
                '-y',
                thumbnailPath,
            ];
            const ffmpeg = (0, child_process_1.spawn)(ffmpegPath, args);
            ffmpeg.on('close', (code) => {
                if (code === 0) {
                    resolve();
                }
                else {
                    reject(new Error(`FFmpeg thumbnail generation failed with code ${code}`));
                }
            });
            ffmpeg.on('error', (error) => {
                reject(error);
            });
        });
    }
}
exports.Recorder = Recorder;
