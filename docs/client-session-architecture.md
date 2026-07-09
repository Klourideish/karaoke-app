# Client Session Architecture

This document describes the current P3 prototype behavior. It does not describe planned features as if they already exist.

## LAN Topology

In development, the frontend runs on port `5173` and the backend runs on port `3001`.

The backend listens on `0.0.0.0:3001`, so it is reachable from other devices on the local network. The frontend can also be served on the LAN and tested from secondary devices at:

```text
http://192.168.1.78:5173
```

The frontend derives the backend base URL from the browser hostname:

- `http://localhost:5173` uses `http://localhost:3001`.
- `http://192.168.1.78:5173` uses `http://192.168.1.78:3001`.

The backend CORS allow-list currently includes:

- `http://localhost:5173`
- `http://192.168.1.78:5173`

This is a local development setup. It uses HTTP, has no real authentication, and is scoped to trusted LAN testing.

## Persistent Client Identity

The frontend stores an anonymous client ID in `localStorage` under the existing client ID key. If an ID already exists, it is reused unchanged.

When a new ID is needed, the frontend uses `crypto.randomUUID()` when available. For plain HTTP LAN environments where that API may not exist, it falls back to a prototype ID built from time and `Math.random()`.

The frontend also stores a display name in `localStorage`. If no display name exists, the app prompts the user. The client ID and display name are separate:

- The client ID is the stable anonymous identity used for socket-authoritative actions.
- The display name is user-facing metadata shown for requests and singer slots.

Socket.IO receives the client ID through `socket.handshake.auth.clientId`. For queue requests, the backend uses this server-known socket client ID instead of trusting a requester client ID from the frontend payload. The frontend still sends `requesterName`, which is currently treated as display metadata.

## Queue and Requester Flow

`SongBrowser` shows one Request button per song. Clicking it emits `add-to-queue` with:

- the song
- the current display name as `requesterName`

The backend stores queue items with:

- `requestedByClientId`
- `requestedByName`
- vote count
- request order

Duplicate queue entries are rejected by song ID, regardless of requester. Voting is tracked per client ID, and repeat votes from the same client are rejected. Public queue ordering sorts by vote count descending, then request order ascending.

When a queued song is selected manually or by automatic queue advancement, the queue item's requester metadata is copied into:

- `currentSongRequestedByClientId`
- `currentSongRequestedByName`

The current-song requester name is shown above the lyrics, and the requester client ID is used to determine active singer highlighting.

## Singer Slot Flow

The prototype has two backend-authoritative singer slots:

- `singer-1`
- `singer-2`

Each slot has an ID, name, and `clientId`.

Claiming a slot associates the current socket client ID with that slot and updates the slot name to the current display name. Releasing a slot is allowed only by the client that currently owns it. Release clears the `clientId` and resets the slot name to its default, `Singer 1` or `Singer 2`.

The performance stage compares `currentSongRequestedByClientId` with each claimed singer slot's `clientId`. If there is a match, that performer panel receives the active state. No slot is claimed automatically.

Singer slots are presentation and ownership groundwork only. They are not scoring inputs yet.

## Playback Synchronization

The backend remains authoritative for playback state. Session state includes:

- `isPlaying`
- `position`
- `startedAtServerTime`
- `positionAtStart`

When playback starts, the backend records the server timestamp and the position at that start. When playback pauses, it settles `position` from the timestamp estimate and clears the active timestamp. When playback seeks, it updates both `position` and `positionAtStart`, and refreshes the start timestamp if playback is active.

The frontend measures a lightweight client/server clock offset with `clock-sync`. During playback, it estimates the live authoritative position using the backend timestamp fields and this offset.

`AudioPlayer` seeks the audio element to the estimated authoritative position when playback starts or the song changes. It keeps backend sync authoritative, but while audio is already playing it tolerates small drift to avoid repeated `audio.currentTime` corrections that can cause hitches. Paused correction remains tighter so stopped clients settle accurately.

The local playback clock is separate from backend session state. It is updated from `audio.currentTime`, primarily with `requestAnimationFrame` while audio is playing. `LyricDisplay` uses that local clock for smooth line and word timing.

## Multi-Device Behavior

Multiple browsers or devices share:

- session state
- queue state
- requester metadata
- singer slots
- playback state
- library source and scan results through backend endpoints

This keeps operator and secondary devices coordinated. It does not make browser audio output sample-accurate across devices. Phones, tablets, Bluetooth outputs, and browser media stacks may add their own latency. Playing speakers from multiple devices at once can produce echo.

The current sync design is primarily for shared state, coordinated start/seek behavior, and lyric timing, not distributed audio playback.

## Future Scoring Boundary

Scoring is not implemented. There is no pitch detection, microphone capture, account system, or duet lyric splitting.

Future scoring should avoid assuming that speaker playback latency equals input timing. A likely direction is a direct microphone/input-client mode with independent input latency calibration, possibly including a per-client timing offset.

## Component Responsibility Map

### Backend

- `backend/src/server.ts`: Express routes, Socket.IO setup, CORS, LAN listening, library source endpoints, media routes, socket event handlers, and periodic session broadcast.
- `backend/src/session/sessionManager.ts`: Authoritative in-memory session state, queue ordering, playback timestamp lifecycle, readiness flags, requester metadata, singer slots, voting, and test reset helpers.

### Frontend

- `frontend/src/App.tsx`: Single-page shell, socket connection wiring, session sync subscription, library sidebar state, operator controls, singer claim/release controls, and main layout composition.
- `SongBrowser`: Library source display, rescan/change-path controls, song list, and one Request button per song.
- `QueuePanel`: Ordered queue display, requested-by labels, voting, and manual select actions.
- `SongContextPanel`: Compact current and next song context.
- `PerformanceStage`: Left/right singer presentation, current requester label above lyrics, and active performer highlighting.
- `AudioPlayer`: Browser audio element, readiness handshake, audio load errors, timestamp-based playback synchronization, duration/progress display, and RAF local clock updates.
- `LyricDisplay`: Lyric fetch, stale fetch/error protection, TTML parsing, lyric display state, and line/word rendering from the local playback clock.
- `playbackClockStore`: Local frontend playback clock used by lyrics and elapsed-time display.
- `sessionStore`: Frontend mirror of backend `sync-state`.
- `libraryStore`: Library songs, active source/path, rescan, and runtime path change state.
- `backendUrl`: Browser-hostname-based backend URL helper.
- `clientIdentity`: Persistent anonymous client ID, LAN HTTP fallback ID generation, and display name persistence.
