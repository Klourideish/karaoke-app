import { useState } from "react";
import { CHROMIUM_INSECURE_ORIGIN_FLAG_URL } from "./micSetupGuidance";

interface MicSetupModalProps {
  appOrigin: string;
  isOpen: boolean;
  onClose: () => void;
  onRecheckSupport: () => boolean;
}

type CopyTarget = "origin" | "flags" | null;

export function MicSetupModal({
  appOrigin,
  isOpen,
  onClose,
  onRecheckSupport,
}: MicSetupModalProps) {
  const [copyTarget, setCopyTarget] = useState<CopyTarget>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  if (!isOpen) {
    return null;
  }

  const copyText = async (text: string, target: CopyTarget) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyTarget(target);
      setCopyMessage("Copied");
    } catch {
      setCopyTarget(target);
      setCopyMessage("Copy failed. Select and copy the text manually.");
    }
  };

  const handleRecheckSupport = () => {
    if (onRecheckSupport()) {
      onClose();
    }
  };

  return (
    <div className="mic-setup-modal-backdrop">
      <section
        aria-labelledby="mic-setup-title"
        aria-modal="true"
        className="mic-setup-modal"
        role="dialog"
      >
        <header className="mic-setup-modal-header">
          <h2 id="mic-setup-title">Microphone setup</h2>
          <button onClick={onClose}>Close</button>
        </header>

        <p>
          Add this karaoke LAN address to Chrome&apos;s local testing
          allowlist.
        </p>

        <div className="mic-setup-copy-row">
          <code>{appOrigin}</code>
          <button
            onClick={() => {
              void copyText(appOrigin, "origin");
            }}
          >
            Copy address
          </button>
        </div>

        {copyTarget === "origin" && copyMessage && (
          <p>{copyMessage}</p>
        )}

        <ol>
          <li>Open the browser flags page.</li>
          <li>Find "Insecure origins treated as secure".</li>
          <li>Paste the exact karaoke app address shown above.</li>
          <li>Enable the setting.</li>
          <li>Restart or relaunch the browser when prompted.</li>
          <li>Reopen the karaoke app.</li>
          <li>Re-check microphone support.</li>
        </ol>

        <div className="mic-setup-copy-row">
          <a
            href={CHROMIUM_INSECURE_ORIGIN_FLAG_URL}
            rel="noreferrer"
            target="_blank"
          >
            Open Chrome flags
          </a>
          <button
            onClick={() => {
              void copyText(
                CHROMIUM_INSECURE_ORIGIN_FLAG_URL,
                "flags",
              );
            }}
          >
            Copy flags URL
          </button>
        </div>

        {copyTarget === "flags" && copyMessage && <p>{copyMessage}</p>}

        <p>
          This workaround is intended for the local karaoke LAN app.
          Browser and version support may vary, and some browsers block
          direct links to internal settings pages.
        </p>

        <div className="mic-setup-modal-actions">
          <button onClick={handleRecheckSupport}>
            Re-check microphone support
          </button>
          <button onClick={onClose}>Dismiss</button>
        </div>
      </section>
    </div>
  );
}
