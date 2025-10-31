# FFmpeg Integration Setup

This application requires FFmpeg for video encoding and thumbnail generation.

## Development Setup

For development, FFmpeg should be installed on your system and available in your PATH.

### Windows
1. Download FFmpeg from https://www.gyan.dev/ffmpeg/builds/
2. Extract the archive
3. Add the `bin` folder to your system PATH
4. Verify installation: `ffmpeg -version`

### macOS
```bash
brew install ffmpeg
```

### Linux
```bash
sudo apt update
sudo apt install ffmpeg
```

## Production Build

For production builds, FFmpeg binaries need to be bundled with the application.

### Windows Production Bundle

1. Download FFmpeg Windows build:
   - Visit: https://www.gyan.dev/ffmpeg/builds/
   - Download: ffmpeg-release-essentials.zip

2. Extract and copy files:
   ```
   Create folder: clipping_software/ffmpeg/
   Copy from extracted archive:
   - ffmpeg.exe -> clipping_software/ffmpeg/ffmpeg.exe
   - ffprobe.exe -> clipping_software/ffmpeg/ffprobe.exe
   ```

3. The electron-builder configuration in package.json will automatically bundle these files

### Directory Structure

```
clipping_software/
├── ffmpeg/
│   ├── ffmpeg.exe      (Windows)
│   └── ffprobe.exe     (Windows)
├── electron/
├── src/
└── package.json
```

### Accessing FFmpeg in Code

The recorder module (electron/recorder.ts) accesses FFmpeg at runtime:

**Development:**
```typescript
const ffmpegPath = 'ffmpeg'; // Uses system PATH
```

**Production:**
```typescript
const ffmpegPath = path.join(process.resourcesPath, 'ffmpeg', 'ffmpeg.exe');
```

## Implementation Notes

The current implementation includes placeholder FFmpeg integration in `electron/recorder.ts`:
- `encodeWithFFmpeg()` - Encodes video with specified quality settings
- `generateThumbnail()` - Extracts first frame as thumbnail

To fully implement screen recording:
1. Use Electron's `desktopCapturer` to get screen stream
2. Use `MediaRecorder` API to record to chunks
3. Maintain circular buffer of recent chunks
4. On save, encode buffer chunks to MP4 with FFmpeg

## Current Status

⚠️ **Note**: The screen recording implementation is a framework. Full MediaRecorder integration with circular buffer management needs to be completed for production use.

The architecture is in place:
- ✅ FFmpeg command structure defined
- ✅ Encoding parameters configurable
- ✅ Thumbnail generation ready
- ⚠️  MediaRecorder + circular buffer needs implementation
- ⚠️  Real video chunk handling needed
