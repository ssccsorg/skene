import { useEffect, useRef } from 'react';
import type { Message } from '../lib/channel';
import { roomOf, useChat } from '../stores/chat';
import { useLive } from '../stores/live';

/**
 * The room a project is answered by, watched for as long as the project is open.
 *
 * The panel does not poll. A turn arrives as it is thought and a call that is waiting arrives when it starts
 * waiting, so what this hook does is hand the room's pushes to the store and report whether the room is up. The
 * handlers live in a ref because the subscription is not rebuilt when a render changes what the callbacks close
 * over: rebuilding it would drop every update between the two.
 *
 * Which room is not this hook's question. The project declares its channel and the store resolves it, so a hook
 * that opened a socket here would be a hook that knew which kind of room it was over, and the two rooms reach
 * their own channels in ways that have nothing in common: one socket, and one shell.
 *
 * A room that was down when the window opened is reached for again when the pilot asks, which is the attempt the store
 * counts: the subscription is the only thing that knows how the room is reached, so asking again is a new subscription
 * rather than a second path to the same room.
 */
export function useRoom(project: string | null): void {
  const applyProgress = useChat((state) => state.applyProgress);
  const applyWaiting = useChat((state) => state.applyWaiting);
  const applyAgents = useChat((state) => state.applyAgents);
  const applyThreads = useChat((state) => state.applyThreads);
  const applyFailure = useChat((state) => state.applyFailure);
  const setLink = useChat((state) => state.setLink);
  const attempt = useChat((state) => state.attempt);
  const applyLive = useLive((state) => state.apply);

  const handlers = useRef({ applyProgress, applyWaiting, applyAgents, applyThreads, applyFailure, setLink, applyLive });
  handlers.current = { applyProgress, applyWaiting, applyAgents, applyThreads, applyFailure, setLink, applyLive };

  // A project's positions are its own: opening another one is a board that has not been told anything yet.
  useEffect(() => {
    if (project) useLive.getState().reset(project);
  }, [project]);

  useEffect(() => {
    if (!project) return undefined;
    const here = handlers.current;
    return roomOf(project).watch(project, {
      link: (link, detail) => here.setLink(link, detail ?? null),
      agents: (agents) => here.applyAgents(agents),
      threads: (threads) => here.applyThreads(threads),
      waiting: (waiting) => here.applyWaiting(waiting),
      progress: (progress) => {
        here.applyProgress(progress);
        here.applyLive(project, progress);
      },
      failure: (agent, detail) => here.applyFailure(agent, detail),
    });
  }, [project, attempt]);
}

/** The messages a panel draws for a thread: what has settled, and the turn standing at the end of it. */
export function drawn(messages: Message[], turn: { messages: Message[] } | null): Message[] {
  return turn ? [...messages, ...turn.messages] : messages;
}
