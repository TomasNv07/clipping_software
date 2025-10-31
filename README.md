# Desktop Clipping Software

A desktop application for continuous screen recording with instant replay capability, similar to NVIDIA ShadowPlay and SteelSeries Moments.

## Features

- **Instant Replay**: Continuously records your screen in a buffer, press F3 to save the last 30 seconds (configurable)
- **Global Hotkey**: Works even when the app is not focused
- **Quality Control**: Customize resolution (720p-4K), FPS (30/60), and bitrate (5-50 Mbps)
- **Configurable Buffer**: Set clip length from 15 seconds to 2 minutes
- **Dark Gaming UI**: Modern, clean interface matching SteelSeries Moments aesthetic
- **Clip Management**: View, organize, and manage all your saved clips

## Screenshots

The UI features:
- Left sidebar navigation (Clips / Settings)
- Top bar with recording controls and status
- Clip gallery with thumbnails
- Settings panel with full quality control

## Technology Stack

- **Electron**: Desktop application framework
- **React + TypeScript**: Frontend UI
- **Vite**: Build tooling
- **Tailwind CSS**: Styling
- **FFmpeg**: Video encoding
- **electron-store**: Settings persistence

## Setup

### Prerequisites

- Node.js 18+ and npm
- FFmpeg (see FFMPEG_SETUP.md)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd clipping_software
```

2. Install dependencies:
```bash
npm install
```

3. Set up FFmpeg (required for video encoding):
   - See [FFMPEG_SETUP.md](./FFMPEG_SETUP.md) for detailed instructions
   - For development: Install FFmpeg on your system PATH
   - For production: Place FFmpeg binaries in `ffmpeg/` folder

### Development

Run the development server:
```bash
npm run dev
```

This will:
- Start Vite dev server (React hot reload)
- Launch Electron app
- Open dev tools automatically

### Building for Production

1. Compile TypeScript and build React:
```bash
npm run build
npm run build:electron
```

2. Package the application:
```bash
npm run package:win    # Windows installer
npm run package        # Current platform
```

The installer will be created in `dist/` folder.

## Project Structure

```
clipping_software/
├── electron/               # Electron main process
│   ├── main.ts            # Main process, window management, IPC
│   ├── preload.ts         # IPC bridge (renderer ↔ main)
│   └── recorder.ts        # Screen recording logic
├── src/                   # React frontend
│   ├── components/        # UI components
│   │   ├── Sidebar.tsx
│   │   ├── TopBar.tsx
│   │   ├── ClipGallery.tsx
│   │   ├── ClipCard.tsx
│   │   └── SettingsPanel.tsx
│   ├── hooks/            # Custom React hooks
│   │   ├── useRecorder.ts
│   │   └── useSettings.ts
│   ├── types/            # TypeScript definitions
│   │   └── index.ts
│   ├── App.tsx           # Main app component
│   ├── main.tsx          # React entry point
│   └── index.css         # Global styles
├── ffmpeg/               # FFmpeg binaries (for production)
├── package.json          # Dependencies & scripts
├── tsconfig.json         # TypeScript config (React)
├── tsconfig.electron.json # TypeScript config (Electron)
├── vite.config.ts        # Vite configuration
└── tailwind.config.js    # Tailwind CSS config
```

## Usage

1. **Start Recording**: Click the toggle switch in the top bar
2. **Save a Clip**: Press F3 (or your configured hotkey) at any time
3. **View Clips**: Click on any clip to open it in your default video player
4. **Settings**: Click the settings icon to adjust quality, buffer length, save location, and hotkey

### Settings

**Video Quality**:
- Resolution: 720p, 1080p, 1440p, or 4K
- Frame Rate: 30 fps or 60 fps
- Bitrate: 5-50 Mbps (controls file size and quality)

**Recording**:
- Buffer Duration: 15-120 seconds (how much to save when you press the hotkey)

**Files**:
- Save Location: Choose where clips are saved (default: Videos/Clips)

**Hotkeys**:
- Save Replay: Customize the hotkey (default: F3)

## How It Works

1. When recording is started, the app continuously captures your screen
2. Video data is stored in a circular buffer (keeps only the last N seconds)
3. When you press the hotkey, the buffer is encoded to MP4 and saved
4. The recording continues without interruption

## Known Limitations

- **Screen Recording Implementation**: The current version includes the framework and architecture for screen recording, but the MediaRecorder circular buffer implementation needs completion for production use
- **Audio**: Audio recording is not yet implemented
- **Multiple Monitors**: Currently captures primary monitor only
- **Windows Only**: While the code is cross-platform, only Windows has been tested

## Future Enhancements

- Audio recording (microphone and system audio)
- Multiple monitor selection
- Webcam overlay
- Basic clip editing (trim, merge)
- Cloud upload integration
- System tray integration
- Performance overlays (FPS counter)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Support

For issues and feature requests, please use the GitHub issue tracker.
