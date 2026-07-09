# Multi-Client Manual Test Checklist

Use this checklist for LAN prototype testing with a host PC and one or more secondary clients.

## LAN Startup

- Start the backend so it listens on the LAN, not only localhost.
  Expected result: `http://192.168.1.78:3001/health` responds from the host PC and secondary devices.
- Start the frontend dev server so it listens on the LAN.
  Expected result: the host PC can open `http://localhost:5173` and `http://192.168.1.78:5173`.
- Open secondary devices at `http://192.168.1.78:5173`.
  Expected result: the app loads, connects to the backend at the same LAN host, and does not fall back to localhost.

## Test Setup

- Open one browser on the host PC.
  Expected result: the host PC acts as the main operator/performance screen.
- Open one browser on a phone or second device.
  Expected result: the second device connects as another client.
- Optionally open a private/incognito window.
  Expected result: the private window behaves like a separate identity for claim/request testing.

## 1. Connection and Library Loading

- Load the app on the host PC.
  Expected result: the socket connects, the library loads, and songs are visible.
- Load the app on the secondary device.
  Expected result: the same library appears without connection errors.
- Request a song from one client and watch the other client.
  Expected result: the queue updates on both clients.

## 2. Display-Name Prompt and Persistent Identity

- Open the app with no stored identity.
  Expected result: the app prompts for a display name.
- Enter a display name and refresh.
  Expected result: the same name and anonymous client identity are reused.
- Open a private/incognito window and enter a different display name.
  Expected result: the private window acts as a separate requester/singer identity.

## 3. Library Sidebar Open/Close

- Collapse the library sidebar.
  Expected result: the sidebar closes and the library tab/button remains visible.
- Reopen the library sidebar.
  Expected result: library controls and song request buttons are available again.
- Repeat on a narrow screen or phone.
  Expected result: the sidebar does not cause horizontal overflow.

## 4. Runtime Library Path and Rescan

- Check the visible library source/path.
  Expected result: the active path and source are shown.
- Click rescan.
  Expected result: the app shows scan feedback and keeps or updates the song list.
- Change the library path to a valid folder.
  Expected result: the active source becomes runtime, songs update, and media URLs still work.
- Change the library path to an invalid folder.
  Expected result: an error is shown and the previous active library remains in use.

## 5. Song Request and Requested-By Metadata

- Request a song from the host PC.
  Expected result: the queue shows the song with `Requested by <host name>`.
- Request another song from the secondary device.
  Expected result: the queue shows that song with the secondary device's display name.
- Try requesting the same song again from another client.
  Expected result: duplicate song requests are rejected or ignored, and the original requester metadata remains.
- Select a requested song.
  Expected result: the requester name appears above the lyrics, and the requester client identity is taken from the socket connection rather than a frontend-supplied requester ID.

## 6. Queue Voting and Select Behaviour

- Vote for a queued song from one client.
  Expected result: the vote count updates on all clients.
- Vote for the same song again from the same client.
  Expected result: the duplicate vote is rejected or ignored.
- Vote from another client.
  Expected result: the vote count increases once for that client.
- Select a queued song manually.
  Expected result: it becomes the current song, is removed from the queue, and remains paused until playback is started.

## 7. Singer Claim and Release

- Claim Singer 1 from the host PC.
  Expected result: Singer 1 shows the host display name and assigned state on all clients.
- Claim Singer 2 from the secondary device.
  Expected result: Singer 2 shows the secondary display name and assigned state on all clients.
- Release a singer slot from the owning client.
  Expected result: the slot becomes unassigned and returns to its default Singer 1 or Singer 2 name.

## 8. Active Singer Highlighting

- Request a song from a client that owns Singer 1, then select that song.
  Expected result: the Singer 1 panel is marked active in the performance stage.
- Request a song from a client that owns Singer 2, then select that song.
  Expected result: the Singer 2 panel is marked active.
- Select a song requested by a client that owns no singer slot.
  Expected result: neither singer panel is marked active.
- Claim a singer slot from the client whose requested song is already current.
  Expected result: after sync, that singer panel becomes active without reselecting the song.
- Release the active singer slot.
  Expected result: the active highlight clears after sync.

## 9. Playback Play/Pause/Seek Sync

- Start playback on the host PC.
  Expected result: all clients enter playing state and seek close to the backend-authoritative timestamp position.
- Pause playback.
  Expected result: all clients stop playback and keep a consistent position.
- Seek to a new position.
  Expected result: all clients move to the new position and lyrics follow.
- Resume playback.
  Expected result: clients continue from the authoritative position without repeated small correction hitches.
- Refresh one secondary client during playback.
  Expected result: it reconnects, receives the current session, estimates the live position from backend timestamp fields, and resumes close to the other clients.
- Let one song play continuously for several minutes.
  Expected result: clients remain close enough for lyric timing, with no repeated small forced seeks or audible correction hitches during normal playback.

## 10. Lyric Sync and Smoothness

- Watch lyrics on the host PC during playback.
  Expected result: line and word highlighting follow the audio smoothly.
- Watch lyrics on the secondary device at the same time.
  Expected result: lyric timing is close to the host and does not visibly lag by whole lines.
- Change songs while lyrics are visible.
  Expected result: lyrics reset to position zero for the new song without briefly showing the previous song timing.

## 11. Automatic Queue Advancement

- Queue at least two songs.
  Expected result: current and next song context panels show the expected songs.
- Let the current song finish.
  Expected result: the highest-priority queued song becomes current automatically.
- Wait for the next song to load.
  Expected result: successful readiness starts playback automatically only for the auto-advanced song.
- Confirm requester context after advancement.
  Expected result: the current song requester and active singer highlight update to the new song.

## 12. Failure and Error Checks

- Temporarily break or remove an audio file.
  Expected result: the player shows an audio load error and does not emit readiness for that song.
- Temporarily break or remove a lyric file.
  Expected result: the lyrics area shows a lyric load error and does not keep stale lyrics from the previous song.
- Switch songs quickly while lyrics are loading.
  Expected result: stale lyric fetch results do not overwrite the current song's lyric state.
- Disconnect or refresh one secondary client.
  Expected result: the remaining clients keep the authoritative session state, and the returning client resyncs.

## Known Prototype Notes

- Phones and tablets may have audio output latency or echo compared with the host PC.
- Future scoring should use input latency calibration or a direct microphone/input mode rather than assuming speaker output timing is exact.
- The backend is still a local development server with no authentication or HTTPS.
