# Playback Lifecycle

## Purpose

Playback is coordinated by backend-authoritative session state and frontend media events.

The backend decides which song is current, whether playback should be playing, the shared playback position, readiness state, and whether the next song should auto-start. The frontend owns the browser audio element and a local playback clock used for responsive lyric display.

## Session State

The backend session state is the source of truth for:

1. The current song.
2. Whether playback is playing.
3. The shared playback position.
4. Whether the current song is ready for playback.
5. Whether automatic playback should start after the next song becomes ready.
6. The ordered public queue.

The frontend receives this state through `sync-state` socket events.

## Local Playback Clock

The frontend keeps a local playback clock separate from backend session state.

This clock follows the browser audio element's `currentTime` through audio `timeupdate` events. Lyrics use this local value so line and word highlighting can follow actual media playback instead of waiting for backend clock updates.

When the current song changes, the local playback clock resets to `0` immediately. This prevents the lyric display from briefly rendering the previous song's timing against the new song.

## Manual Song Selection

Manual song selection happens when a client asks the backend to select a queued song.

The backend:

1. Removes the selected song from the internal queue.
2. Sets it as the current song.
3. Sets `isPlaying` to `false`.
4. Sets `playbackReady` to `false`.
5. Sets `autoStartPending` to `false`.
6. Resets `position` to `0`.
7. Broadcasts the updated session.

Manual selected songs load on clients but remain paused after they become ready.

## Automatic Queue Advancement

When the current song finishes, the frontend emits `finish-playback`.

The backend:

1. Pauses playback.
2. Resets `position` to `0`.
3. Clears `playbackReady`.
4. Tries to select the next queued song using public queue ordering.
5. Leaves the finished song as current if the queue is empty.

If a next queued song is selected automatically, the backend sets `autoStartPending` to `true`. The selected song is still not played until the frontend confirms that its audio can play.

## Playback Readiness

The browser audio element emits readiness after the media for the current song can play.

The frontend responds by emitting:

```ts
socket.emit("ready-for-playback", currentSong.id);
```

The backend accepts readiness only when the provided song ID matches the current backend song ID. If the ID does not match, the event is ignored. This prevents stale readiness events from a previous song from starting or marking the wrong song as ready.

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

Each lyric line has start and end timing used to decide the current and next displayed line. Individual words also carry start and end timing, allowing the current line to show word-level progress.

The local playback clock drives both line selection and word highlighting.

## Future Work

P2 focuses on correct playback lifecycle, state ownership, readiness, and failure handling.

Visual styling and smoother lyric animation, including any requestAnimationFrame-based lyric timing, are future P3+ work.
