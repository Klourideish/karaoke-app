# Secure LAN Development

Some browsers require a secure context before microphone APIs are available on secondary LAN devices. Normal HTTP development remains supported. Use this optional HTTPS path only for trusted local testing.

## Chromium HTTP LAN Allowlist

Ordinary LAN HTTP, such as `http://192.168.1.78:5173`, is not normally a secure context. For short-term microphone testing on Chrome-based browsers, the app can guide a user through Chromium's local testing allowlist.

When microphone APIs are unavailable on an insecure LAN HTTP origin, the Mic tab shows the exact current app origin from the browser, including protocol and port. Add that exact karaoke LAN address to Chrome's `Insecure origins treated as secure` flag.

Suggested flow:

1. Open `chrome://flags/#unsafely-treat-insecure-origin-as-secure`.
2. Find `Insecure origins treated as secure`.
3. Paste the exact karaoke app origin shown in the Mic setup modal.
4. Enable the setting.
5. Restart or relaunch the browser when prompted.
6. Reopen the karaoke app.
7. Re-check microphone support from the Mic tab.

Some browsers block direct navigation to `chrome://` pages from a web app, so the modal also provides copy buttons for the app origin and flags URL. Browser and version support may vary.

The optional HTTPS setup below remains available for trusted LAN testing and is the cleaner secure-context path when local certificates are practical.

## Certificate Files

Generate local certificates with `mkcert`:

```powershell
mkcert -install
mkdir frontend\certs
mkcert -cert-file frontend\certs\karaoke-local.pem -key-file frontend\certs\karaoke-local-key.pem localhost 127.0.0.1 192.168.1.78
```

Certificate and key files are ignored by git and must not be committed.

## Frontend HTTPS

Start the frontend with certificate paths:

```powershell
$env:VITE_DEV_HTTPS_CERT_PATH="frontend\certs\karaoke-local.pem"
$env:VITE_DEV_HTTPS_KEY_PATH="frontend\certs\karaoke-local-key.pem"
npm run dev:frontend
```

If these variables are absent, Vite uses the existing HTTP dev server.

## Same-Origin Backend Proxy

For HTTPS LAN testing, use the Vite proxy so browser API, media, and Socket.IO traffic goes through the trusted frontend origin:

```powershell
$env:VITE_USE_BACKEND_PROXY="true"
npm run dev:frontend
```

The proxy forwards:

- `/health`
- `/library`
- `/library/source`
- `/library/rescan`
- `/media`
- `/socket.io`

Socket.IO proxying supports WebSocket upgrades.

## Backend CORS

The backend remains HTTP on port `3001` in development. If a browser talks to the backend directly from an HTTPS Vite origin, add that origin explicitly:

```powershell
$env:FRONTEND_ORIGINS="https://192.168.1.78:5173"
npm run dev:backend
```

Multiple origins can be comma-separated. Existing HTTP localhost and HTTP LAN development continue to work.
