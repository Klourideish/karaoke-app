# Playback Lifecycle

## Purpose

Playback is coordinated by backend-authoritative session state and frontend media events. The backend decides which song is current, whether playback is playing, readiness state, queue advancement, and the timestamp fields used to estimate the live position. The frontend owns each browser audio element and keeps a local playback clock for responsive lyric display.

## Backend Session State

The backend session state is the source of truth for:

1. The current song.
2. Current-song requester metadata.
3. Whether playback is playing.
4. The last settled playback position.
5. `startedAtServerTime` and `positionAtStart` for live playback estimation.
6. Whether the current song is ready for playback.
7. Whether automatic playback should start after the next song becomes ready.
8. The ordered public queue.
9. The two prototype singer slots.

The frontend receives this state through `sync-state` Socket.IO events.

## Timestamp Playback State

When playback starts, `play()` records:

- `startedAtServerTime`: backend `Date.now()` at the start point.
- `positionAtStart`: the playback position at that moment.

While playing, the live authoritative position is estimated as:

```ts
positionAtStart + (serverNow - startedAtServerTime) / 1000
```

The backend still broadcasts `position` for compatibility and debug visibility. During timestamp playback, `advancePosition()` refreshes `position` from the timestamp estimate instead of adding elapsed seconds on top of it.

When playback pauses, `pause()` settles `position` to the timestamp estimate, clears `startedAtServerTime`, and stores the settled value in `positionAtStart`.

When seeking, `seek()` sets both `position` and `positionAtStart`. If playback is already active, it also resets `startedAtServerTime` to the current backend time.

Timestamp-based sync replaced relying only on periodic position broadcasts because one-second broadcasts are too coarse for multi-client playback start and lyric timing. Clients can estimate the same live backend position between broadcasts without increasing Socket.IO traffic.

## Frontend Clock Offset and Audio Sync

The frontend sends a lightweight `clock-sync` socket event and receives the backend time. It uses the round-trip time to estimate a client/server clock offset.

When the session is playing and timestamp fields are present, the frontend estimates the authoritative position using:

```ts
positionAtStart + (Date.now() + serverClockOffsetMs - startedAtServerTime) / 1000
```

On playback start or song change, the audio element seeks to this estimated position before playing. During normal playback, small drift is tolerated to avoid audible seek hitches. The hard correction threshold is intentionally wider while playing and tighter while paused.

## Local Playback Clock

The frontend keeps a local playback clock in `playbackClockStore`. This clock follows the browser audio element's `currentTime`.

While audio is playing, `AudioPlayer` updates the local clock with `requestAnimationFrame`. The audio `timeupdate` event remains a fallback path. Lyrics use this local clock so line and word highlighting can follow actual media playback smoothly instead of waiting for backend sync broadcasts.

When the current song changes, the local playback clock resets to `0` immediately. If the audio element exists, its `currentTime` is also reset. This prevents the lyric display from briefly rendering the previous song's timing against the new song.

## Manual Song Selection

Manual song selection happens when a client asks the backend to select a queued song.

The backend:

1. Removes the selected song from the internal queue.
2. Copies the queue item's requester metadata into current-song requester fields.
3. Sets the song as `currentSong`.
4. Sets `isPlaying` to `false`.
5. Sets `playbackReady` to `false`.
6. Sets `autoStartPending` to `false`.
7. Resets `position`, `startedAtServerTime`, and `positionAtStart`.
8. Broadcasts the updated session.

Manual selections load on clients but remain paused after they become ready.

## Automatic Queue Advancement

When the current audio element ends, the frontend emits `finish-playback`.

The backend:

1. Pauses playback.
2. Clears `playbackReady`.
3. Clears timestamp playback fields.
4. Resets position to `0`.
5. Tries to select the next queued song using public queue ordering.
6. Leaves the finished song as current if the queue is empty.

If a next queued song is selected automatically, the backend sets `autoStartPending` to `true` and copies that queue item's requester metadata into current-song requester fields. The next song still does not play until a client confirms that its audio can play.

## Playback Readiness

The browser audio element emits readiness after the media for the current song can play. The frontend responds with:

```ts
socket.emit("ready-for-playback", currentSong.id);
```

The backend accepts readiness only when the provided song ID matches `getSession().currentSong?.id`. If the ID does not match, the event is ignored. This prevents stale readiness events from a previous song from starting or marking the wrong song as ready.

When readiness is accepted, the backend:

1. Calls `markPlaybackReady()`.
2. Starts playback only if `autoStartPending` is `true`.
3. Clears `autoStartPending` after auto-starting.
4. Broadcasts the updated session.

This preserves the difference between manual selection and automatic queue advancement.

## Media Load Failures

Audio load failures are shown in the Player UI.

When audio fails to load:

1. The player records a visible audio error.
2. The failed load does not emit `ready-for-playback`.
3. Stale audio events from a previous song are ignored where practical.

Lyric load or parse failures are shown in the Lyrics UI.

When the current song changes, the lyric display immediately clears previous lyrics and clears any previous lyric error. Lyric fetches track whether they are still current before writing lines or errors, so a late result from a previous song cannot overwrite the current song's lyric state.

## TTML Timing

Lyrics are parsed from TTML.

Each lyric line has start and end timing used to decide previous, current, and next displayed lines. Individual words also carry start and end timing, allowing the current active line to show word-level progress.

The local playback clock drives both line selection and word highlighting.

## Multi-Device Limits

Multiple browsers and devices share session, queue, singer slots, and playback state. The current synchronization is intended for shared state, coordinated playback starts, and lyric timing. It is not sample-accurate distributed audio.

Phones, tablets, Bluetooth devices, and browser autoplay behavior can still introduce hardware or output latency. Simultaneous speaker playback on multiple devices may produce echo.

## Future Work Boundary

Pitch detection, scoring, microphones, duet lyric splitting, and calibrated input timing are not implemented yet.

Future scoring should treat microphone or input timing separately from speaker playback timing. A direct input-client mode and per-client input latency calibration are likely directions.
