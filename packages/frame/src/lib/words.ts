// What a screen calls the three kinds of record.
//
// A record's kind is the engine's: `fact`, `intent` and `hint` are what a run is made of, and a reader is not shown a run
// as the engine holds it. A domain names the same three things its own way, so the words are read from the project and
// then the deployment, and the format's names are only what stands when neither has said anything.
//
// One module rather than a word per screen. A row, a tag, and a panel's field are three places that name a kind, and two
// spellings of one projection would be a board that called the same record two things.

import { useMemo } from 'react';
import type { Kind, KindWords } from '@ssccsorg/skene-kernel';
import { useBrand } from './brand';
import { useScenario } from '../stores/scenario';

/** The format's own names, which is what stands when no one has named a kind. */
export const FORMAT_WORDS: Record<Kind, string> = {
  fact: 'fact',
  intent: 'intent',
  hint: 'hint',
};

/**
 * The words in force, laid over the ones under them in the order given.
 *
 * It is a function rather than a hook because it is the whole rule and a test can ask it without a store: the project
 * speaks for its own domain, the deployment for everything it draws, and the format for the rest.
 */
export function wordsOf(...layers: (KindWords | undefined)[]): Record<Kind, string> {
  const words = { ...FORMAT_WORDS };
  // The first layer is the loudest, so they are laid down from the quietest: a name given closer to the record wins.
  for (const layer of [...layers].reverse()) {
    if (!layer) continue;
    for (const kind of ['fact', 'intent', 'hint'] as const) {
      const word = layer[kind];
      if (word) words[kind] = word;
    }
  }
  return words;
}

/**
 * The words for the open project, read from its bundle and from the brand the frame is drawn under.
 *
 * A claim is not one of the three kinds: it writes no record, so it has no word of a project's and is named by the
 * format alone.
 */
export function useKindWords(): Record<Kind, string> {
  const brand = useBrand();
  const project = useScenario(
    (state) => state.projects.find((each) => each.id === state.projectId)?.words,
  );
  return useMemo(() => wordsOf(project, brand.words), [project, brand.words]);
}
