// The window's shell and the rooms it answers with, as a deployment supplies them.
//
// The frame reaches a host through a few operations and no more: whether a shell exists, one command, one event, the
// rooms a project may be answered by, the whole screen when the shell owns it, and the form that connects a room. A
// deployment that has none of this gets the browser's answers, which are the refusal every panel already handles.
//
// The frame asks for two commands by name, `front` and `views`, because a launcher's address and a device's picture are
// the same question in every deployment that has a launcher. What the rest of a command means is the deployment's, and
// the frame never learns it.

import type { ComponentType } from 'react';
import type { Prove } from './channel';

/**
 * The whole screen, when the shell owns it.
 *
 * A desktop build is a window and not a page, so the browser's Fullscreen API is not the one that owns the screen: the
 * window's own switch is. A host with no window leaves the browser's API, which is what a cockpit served in a tab uses.
 * `onResize` exists because a person leaves fullscreen with a key the frame never sees, and a webview reports that as a
 * size change and nothing else.
 */
export interface Screen {
  /** Whether the window fills the screen now. */
  whole: () => Promise<boolean>;
  /** Take the screen, or give it back. */
  set: (whole: boolean) => Promise<void>;
  /** Watch the window's size, which is what a webview reports about fullscreen. Absent means the DOM's own event. */
  onResize?: (listener: () => void) => () => void;
}

export interface Host {
  /** Whether this window has a shell to reach. */
  reachable: boolean;
  /** One command of the shell's surface. A host that has none refuses with `NO_SHELL`. */
  ask<T>(command: string, args?: Record<string, unknown>): Promise<T>;
  /** Watch one of the shell's events, and answer how to stop watching. */
  listen<T>(event: string, handler: (payload: T) => void): Promise<() => void>;
  /** The room a project that names none is answered by. Absent means the frame's sim. */
  roomByDefault?: () => string;
  /** The proof a deployment's room asks for, when it holds a credential. */
  prove?: Prove;
  /** Whether a credential a previous run proved is still held, which a panel may say in words. */
  everConnected?: () => boolean;
  /** The connection form, when the deployment has one. */
  connect?: ComponentType;
  /**
   * The whole screen, when the shell owns it. Absent means the browser's Fullscreen API, which is what a tab uses.
   */
  screen?: Screen;
  /**
   * Where this deployment's record stream and chat answer, when they are not the frame's own defaults.
   *
   * The frame's defaults are the demonstration's, on loopback, because that is what an example needs. A deployment
   * that serves them elsewhere says so here rather than in a build-time variable.
   */
  endpoints?: { stream?: string; chat?: string };
  /** Work to do once, when the frame mounts. Returns how to stop. */
  start?: () => (() => void) | void;
}

/** Why there is nothing to reach, said once so every panel and every room says the same thing. */
export const NO_SHELL = 'this view has no shell to reach the stack through';

/**
 * The host a window has when it was given none.
 *
 * A browser is how these surfaces are developed and how a bundle runs: there is no shell, every command refuses with
 * the reason, and an event bus that is not there is a subscription that succeeds and never fires. That is the state a
 * preview is in, and it is legible in a panel rather than thrown at a person as a crash.
 */
const BROWSER: Host = {
  reachable: false,
  ask: () => Promise.reject(new Error(NO_SHELL)),
  listen: async () => () => {},
};

let current: Host = BROWSER;

/** Install the host this window is drawn over. A window with none is drawn over the browser's answers. */
export const setHost = (host: Host | undefined): void => {
  current = host ?? BROWSER;
};

/** The host in force, for the modules that are not components and cannot read a context. */
export const host = (): Host => current;

/**
 * The front the launcher handed this window, when it handed one.
 *
 * A browser, a bundle and a phone have no answer here, so a failure is the absence of a launcher rather than a fault
 * of the frame: what comes back is null and the window keeps the address it already had.
 */
export async function frontUrl(): Promise<string | null> {
  try {
    const value = await host().ask<string | null>('front');
    return typeof value === 'string' && value !== '' ? value : null;
  } catch {
    return null;
  }
}

/**
 * The device view addresses the launcher handed this window, when it handed any.
 *
 * A device's picture carries a token, so the addresses are not in the sources: the launcher writes them to a file only
 * this host can read and names that file to the shell, which hands the text over here. A window with no launcher, a
 * browser and a bundle all answer nothing, and every view keeps the address its project declared.
 */
export async function deviceViews(): Promise<Record<string, string>> {
  try {
    const text = await host().ask<string | null>('views');
    if (typeof text !== 'string' || !text.trim()) return {};
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: Record<string, string> = {};
    for (const [id, source] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof source === 'string') out[id] = source;
    }
    return out;
  } catch {
    return {};
  }
}

/**
 * Watch one of the shell's events, and answer how to stop watching.
 *
 * A browser has no event bus, so what comes back is a no-op rather than a rejection: a panel that subscribed and then
 * failed to subscribe would report a fault about the frame instead of about the stack.
 */
export async function feed<T>(event: string, handler: (payload: T) => void): Promise<() => void> {
  return host().listen<T>(event, handler);
}
