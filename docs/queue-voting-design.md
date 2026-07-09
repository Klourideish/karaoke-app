# Queue Voting Design

## Purpose

The karaoke queue lets connected clients request songs and vote on queued songs. The backend is authoritative for queue changes, vote validation, deterministic ordering, and the requester metadata that follows a song into the current performance.

## Client Identity

Each browser has a persistent anonymous client ID stored in `localStorage`. The frontend sends that ID in Socket.IO auth when connecting.

Display name is separate metadata. It is also stored in `localStorage`, prompted for when missing, and sent with song requests as `requesterName`.

The backend uses the socket-authenticated client ID for queue requester identity and voting. It does not trust a requester client ID from the frontend request payload.

## Request Flow

`SongBrowser` shows one Request button per song.

Clicking Request emits `add-to-queue` with:

```ts
{
  song,
  requesterName
}
```

The backend accepts this newer payload shape and also keeps compatibility with the older raw `Song` payload. Raw `Song` payloads can still add a queue item without requester metadata.

## Core Rules

1. The same song may appear in the queue only once.
2. Duplicate song requests are rejected by song ID, regardless of requester.
3. A client may vote once per queued song.
4. Repeated votes from the same client ID for the same song are rejected.
5. Voting targets a song ID, never an array index.
6. Songs are ordered by vote count, highest first.
7. Songs with equal vote counts preserve their original request order.
8. The backend decides whether a request, vote, or select action is accepted.
9. Disconnecting does not remove votes during the current in-memory session.
10. Queue ordering is deterministic.

## Queue Item Model

The backend maintains internal queue state containing requester, ordering, and voting metadata:

```ts
interface InternalQueueItem {
  song: Song;
  requestedByClientId: string | null;
  requestedByName: string | null;
  requestedOrder: number;
  voterIds: Set<string>;
}
```

The public queue exposes:

```ts
interface QueueItem {
  song: Song;
  requestedByClientId: string | null;
  requestedByName: string | null;
  votes: number;
}
```

`requestedByClientId` comes from the authenticated socket client ID for the current connection. `requestedByName` comes from the display-name metadata sent by the frontend.

## Ordering

The public queue is sorted by:

1. Vote count descending.
2. Original request order ascending.

This means the highest-voted song is next, and ties stay stable.

## Selection and Current Song Metadata

When a queued song is selected manually, the backend removes it from the internal queue and copies its requester metadata into current-song session fields:

```ts
currentSongRequestedByClientId
currentSongRequestedByName
```

Automatic queue advancement uses the same public queue ordering and copies the selected queue item's requester metadata in the same way.

The current requester name is shown above the lyrics. The current requester client ID is compared with claimed singer slot client IDs to mark the active performer panel.

## Singer Highlighting Boundary

Queue requester metadata can drive active singer highlighting, but queueing a song does not claim a singer slot. Singer slots remain a separate backend-authoritative state.

Singer slots are not scoring inputs yet. There is no microphone capture, pitch detection, or scoring in the current P3 prototype.
