# Karaoke App

A self-hosted, multi-client karaoke application designed for local network use.

The project is currently in active development. It provides synchronized karaoke playback across multiple devices, a shared song queue, voting, singer assignment, timed TTML lyrics, runtime library management, and early microphone device support.

## Current Features

- Self-hosted karaoke server and web client
- Multi-device access over a local network
- Shared synchronized playback state
- Timestamp-based playback synchronization between clients
- Shared song request queue
- Per-client queue voting
- Persistent anonymous client identity and display names
- Singer slot assignment
- Active singer highlighting based on song requester
- Four-singer UI groundwork
- Current and next song context
- Timed TTML lyric display
- Word-level lyric highlighting
- Automatic queue advancement
- Runtime music library path changes and rescanning
- Sidebar with Library, Player, and Mic sections
- Local microphone permission and device discovery foundation

## Media Library

The application currently expects:

- Audio: `.opus`
- Lyrics: `.ttml`

Audio and lyric files must use the same filename stem and be located in the same folder.

Example:

```text
Artist - Song.opus
Artist - Song.ttml
```

The `music/` directory is intentionally empty apart from `.gitkeep`.

Media files are not included in the repository.

## Development Status

The application is currently transitioning from prototype infrastructure into an early testable UI and microphone foundation phase.

Current development priorities include:

- improving the base interface for real multi-user testing
- local microphone capture and input-level feedback
- microphone visual feedback around singer areas
- improving mobile and secondary-device interaction
- preparing the architecture for future pitch detection and scoring

Pitch detection, singing scores, microphone streaming, and remote audio capture are not implemented yet.

## Project Structure

```text
backend/     Backend server, session state, queue, and playback coordination
frontend/    React frontend, playback, lyrics, UI, and local device features
shared/      Shared types and contracts
docs/        Architecture and manual testing documentation
scripts/     Validation scripts
```

## Development

Install dependencies:

```powershell
npm install
```

Run the backend and frontend using the project's development scripts.

### Validation

Run the complete validation suite:

```powershell
.\scripts\validate.ps1
```

Frontend-only validation:

```powershell
.\scripts\validate-frontend.ps1
```

Backend-only validation:

```powershell
.\scripts\validate-backend.ps1
```

## LAN Testing

The development setup supports testing from other devices on the same local network.

The frontend derives the backend hostname from the browser hostname, allowing secondary devices to connect to the host machine rather than attempting to use their own `localhost`.

The backend and Vite development server must both be reachable through the host machine's LAN address.

For example, if the host machine is available at `192.168.1.78`:

```text
Frontend: http://192.168.1.78:5173
Backend:  http://192.168.1.78:3001
Health:   http://192.168.1.78:3001/health
```

The exact LAN address depends on the host machine and network configuration.

## Documentation

Current architecture and testing documentation is available in:

```text
docs/multi-client-test-checklist.md
docs/client-session-architecture.md
docs/playback-lifecycle.md
docs/queue-voting-design.md
```

These documents cover the current multi-client testing path, client/session boundaries, playback lifecycle, and queue/voting behaviour.

## Current Development Direction

The current development direction is deliberately focused on functionality before full visual polish.

The next stages are expected to explore:

1. local microphone capture and input-level metering
2. microphone activity feedback in the performance interface
3. microphone-only secondary-device workflows
4. continued real-device and multi-user testing
5. later investigation into pitch detection and singer scoring

The architecture for scoring has not been finalized. Input latency calibration and direct microphone capture are expected to be considered before scoring is introduced.

## Project Status

This project is under active development and should currently be considered experimental.

The focus is on building a functional self-hosted karaoke system first, followed by broader UI refinement, microphone features, and eventually singing analysis and scoring.