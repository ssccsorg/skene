import type { Entry, NodeKind } from '@ssccsorg/skene-kernel';
import { POLICY } from '../lib/world';
import { KindTag } from './KindTag';
import { useKindWords } from '../lib/words';
import { LABEL, ROW, TITLE } from '@ssccsorg/skene-ui';
import { cn } from '@ssccsorg/skene-ui';

/**
 * The fields the format gives each kind of record, one entry a kind.
 *
 * It is a table and not a run of tests because the kinds are the format's own closed set: a kind added to the format is
 * a missing entry here, which the compiler names, where a chain of tests would draw that record with no fields at all
 * and say nothing about it. What every record carries (its kind and when it was written) is drawn by the panel rather
 * than stated four times; this is what each kind adds.
 */
const FIELDS: Record<NodeKind, (record: Entry) => [string, string][]> = {
  fact: () => [['address', 'derived from the payload, the origin and the creator']],
  hint: (record) => [
    ['content', record.content ?? ''],
    ['author', POLICY],
  ],
  intent: (record) => [
    ['description', record.description ?? ''],
    ['from_facts', record.from?.label ?? record.fromLabel ?? 'nothing in the record'],
    ['worker', record.worker ?? 'unclaimed'],
    ['to_fact_id', record.produced?.label ?? 'not concluded'],
  ],
  claim: (record) => [
    ['record', 'a claim writes none'],
    ['declaration', record.label ?? ''],
    ['worker', record.worker ?? ''],
  ],
};

/**
 * The envelope: the fields the format gives a record, read off the record rather than restated.
 *
 * It fills the panel it is opened in. A record is the panel's whole subject, so a card floating inside
 * the panel with its own border and its own margin would say the panel is the subject and the record is
 * a note sitting in it. There is no card here: the header is a band of the panel and every field is a
 * row of it, edge to edge.
 */
export function InspectorPanel({ selected }: { selected: Entry | null }) {
  const words = useKindWords();
  if (!selected) {
    return <p className="px-3 py-2 text-[11.5px] text-muted-foreground">no record is picked.</p>;
  }

  const rows: [string, string][] = [
    ['kind', selected.kind === 'claim' ? 'claim' : words[selected.kind]],
    ['written at', `${selected.at}s`],
  ];
  if (selected.origin) rows.push(['origin', selected.origin], ['payload', `${selected.bytes ?? 0} bytes`]);
  rows.push(...FIELDS[selected.kind](selected));
  if (selected.producedBy) rows.push(['produced by', selected.producedBy.label ?? '']);

  return (
    <div className="flex flex-col">
      <div className={cn(ROW, 'gap-2 border-b')}>
        <KindTag kind={selected.kind} />
        <span className={cn(TITLE, 'min-w-0 truncate')}>
          {selected.label ?? selected.origin ?? 'the record'}
        </span>
      </div>
      <dl className="flex flex-col">
        {rows.map(([name, value]) => (
          <div
            key={name}
            className="flex flex-col gap-0.5 border-b border-border/50 px-3 py-1.5 last:border-b-0"
          >
            <dt className={LABEL}>{name}</dt>
            <dd className="text-[11.5px] break-words">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
