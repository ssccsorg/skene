import { useCallback, useEffect, useState } from 'react';
import { host } from '../lib/host';

/**
 * Whether the cockpit is filling the screen, and the press that puts it there or takes it back.
 *
 * The window holds this and not the store: a person leaves fullscreen with a key the cockpit never sees, so the state is
 * read back from the window on every change rather than kept beside it, where it would go on saying the screen was full
 * after it had stopped being. The refusal case is reported rather than swallowed, because a press that does nothing has
 * to say why: a browser that has not been touched yet refuses the request, and the pilot pressing again is the answer.
 * What it is reported to is the control's own hint, because a message in a console is a message the pilot does not have.
 *
 * Which switch owns the screen is the deployment's, through `Host.screen`. A desktop build is a window, so its own
 * switch is the one that matters; a cockpit in a tab has no window, and the browser's Fullscreen API is the answer. The
 * frame asks for neither by name, which is what keeps it off a platform it does not ship on.
 */
export function useFullscreen(): [boolean, () => void, string | null] {
  const [whole, setWhole] = useState(() => document.fullscreenElement !== null);
  const [refusal, setRefusal] = useState<string | null>(null);

  useEffect(() => {
    const screen = host().screen;
    if (screen) {
      let live = true;
      const read = () => {
        void screen
          .whole()
          .then((value) => {
            if (live) setWhole(value);
          })
          .catch(() => {});
      };
      read();
      const stop = screen.onResize
        ? screen.onResize(read)
        : (() => {
            window.addEventListener('resize', read);
            return () => window.removeEventListener('resize', read);
          })();
      return () => {
        live = false;
        stop();
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
    const screen = host().screen;
    if (screen) {
      void screen
        .whole()
        .then((value) => screen.set(!value))
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
