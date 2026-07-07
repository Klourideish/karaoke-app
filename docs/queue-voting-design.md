# Queue Voting Design

## Purpose

The karaoke queue allows connected users to request songs and vote on queued songs.

The backend is authoritative for all queue changes, vote validation, and queue ordering.

## Core Rules

1. Each connected client is assigned a temporary user ID.
2. A user may vote once per queued song.
3. Repeated votes from the same user for the same song are rejected.
4. Songs are ordered by vote count, highest first.
5. Songs with equal vote counts preserve their original request order.
6. Voting targets a song ID, never an array index.
7. The backend decides whether a vote is accepted.
8. Disconnecting does not remove votes during the current session.
9. The same song may appear in the queue only once.
10. Queue ordering must be deterministic.

## Queue Item Model

The backend maintains internal queue state containing voting metadata:

```ts
interface InternalQueueItem {
  song: Song;
  requestedOrder: number;
  voterIds: Set<string>;
}