import { useCallback, useEffect, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';

/**
 * Whether the cockpit is filling the screen, and the press that puts it there or takes it back.
 *
 * The window holds this and not the store: a person leaves fullscreen with a key the cockpit never sees, so the state is
 * read back from the window on every resize rather than kept beside it, where it would go on saying the screen was full
 * after it had stopped being. The refusal case is reported rather than swallowed, because a press that does nothing has
 * to say why: a browser that has not been touched yet refuses the request, and the pilot pressing again is the answer.
 * What it is reported to is the control's own hint, because a message in a console is a message the pilot does not have.
 *
 * A desktop build is a Tauri window and not a page, so the browser's Fullscreen API is not the one that owns the screen:
 * the window's own `setFullscreen` is. The two are told apart by the internals the shell installs, and the browser path
 * stays for the cockpit served in a tab.
 */
const inShell = (): boolean => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export function useFullscreen(): [boolean, () => void, string | null] {
  const [whole, setWhole] = useState(() => document.fullscreenElement !== null);
  const [refusal, setRefusal] = useState<string | null>(null);

  useEffect(() => {
    if (inShell()) {
      const frame = getCurrentWindow();
      let live = true;
      const read = () => {
        void frame
          .isFullscreen()
          .then((value) => {
            if (live) setWhole(value);
          })
          .catch(() => {});
      };
      read();
      // A fullscreen change resizes the window, which is the one event the webview reports for it.
      const listening = frame.onResized(read);
      return () => {
        live = false;
        void listening.then((off) => off()).catch(() => {});
      };
    }
    const onChange = () => setWhole(document.fullscreenElement !== null);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const report = useCallback((error: unknown) => {
    setRefusal(error instanceof Error ? error.message : String(error));
  }, []);

  const toggle = useCallback(() => {
    setRefusal(null);
    if (inShell()) {
      const frame = getCurrentWindow();
      void frame
        .isFullscreen()
        .then((value) => frame.setFullscreen(!value))
        .then(() => setWhole((value) => !value))
        .catch(report);
      return;
    }
    const want = document.fullscreenElement === null;
    const asked = want ? document.documentElement.requestFullscreen() : document.exitFullscreen();
    asked.catch(report);
  }, [report]);

  return [whole, toggle, refusal];
}
