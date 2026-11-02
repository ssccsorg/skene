import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from './ui/button';
import { Hint } from './ui/hint';
import type { AddResult, NewProject } from '../stores/scenario';
import { placeIn, validateSubmission, type ProjectIssue } from '../lib/contract';
import type { SourceSpec } from '../lib/types';

/**
 * A project added from the frame.
 *
 * The record text is the one thing every project has, so it is the one field the form insists on: a file fills it, and a
 * pasted text does the same. The source is the member's own answer to what it holds, which is what lets a mock tree and a
 * folder stand in one list without the frame learning a kind for either.
 *
 * A pasted object is a declaration instead of a run, and then the text is the submission the contract names: the id, the
 * title, the run, and the resources. It is proved here before the frame is handed anything, and what it says wrong is
 * drawn under the form. That is the shape a model can write and a person can check, and the reason the proof is a list of
 * places rather than one message.
 */
export function AddProject({
  onAdd,
  onClose,
}: {
  onAdd: (input: NewProject) => AddResult;
  onClose: () => void;
}) {
  const [id, setId] = useState('');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [kind, setKind] = useState<SourceSpec['kind']>('mock');
  const [path, setPath] = useState('.');
  const [parts, setParts] = useState('');
  const [issues, setIssues] = useState<ProjectIssue[]>([]);
  // A declaration carries its own name, so a pasted object is ready as soon as it is there.
  const ready = text.trim().length > 0 && (text.trim().startsWith('{') || id.trim().length > 0);

  const source = (): SourceSpec => {
    if (kind === 'mock') {
      const names = parts
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean);
      return {
        member: 'workspace',
        kind: 'mock',
        tree: [{ name: 'parts', holds: names.map((name) => ({ name })) }],
      };
    }
    if (kind === 'room') return { member: 'workspace', kind: 'room' };
    return { member: 'workspace', kind, at: path.trim() || '.' };
  };

  /** Add the project, or say what the declaration is missing. */
  const submit = () => {
    const written = text.trim();
    if (written.startsWith('{')) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(written);
      } catch (error) {
        setIssues([{ path: 'record', message: error instanceof Error ? error.message : 'is not JSON' }]);
        return;
      }
      const proof = validateSubmission(parsed, []);
      if (!proof.ok) {
        setIssues(proof.issues);
        return;
      }
      const answer = onAdd({
        id: proof.submission.id,
        title: proof.submission.title,
        text: proof.submission.record,
        place: placeIn(proof.submission),
        resources: proof.submission.resources,
      });
      if (!answer.ok) {
        setIssues(answer.issues);
        return;
      }
      onClose();
      return;
    }
    const answer = onAdd({ id, title: title.trim() || undefined, text, source: source() });
    if (!answer.ok) {
      setIssues(answer.issues);
      return;
    }
    onClose();
  };

  return (
    <div data-region="project-add" className="border-b p-2 text-[11.5px]">
      <div className="mb-1 flex items-center gap-1">
        <span className="flex-1 tracking-wide text-muted-foreground uppercase">new project</span>
        <Hint label="close">
          <Button size="icon-xs" variant="ghost" onClick={onClose}>
            <X />
          </Button>
        </Hint>
      </div>

      <div className="flex flex-col gap-1">
        <input
          data-region="project-add-id"
          value={id}
          spellCheck={false}
          placeholder="a name for the project"
          onChange={(event) => setId(event.target.value)}
          className="rounded-sm border border-border bg-transparent px-1.5 py-0.5 outline-none focus-visible:border-ring"
        />
        <input
          value={title}
          spellCheck={false}
          placeholder="what it is called, when it is not the name"
          onChange={(event) => setTitle(event.target.value)}
          className="rounded-sm border border-border bg-transparent px-1.5 py-0.5 outline-none focus-visible:border-ring"
        />
        <div className="flex items-center gap-1">
          <select
            value={kind}
            onChange={(event) => setKind(event.target.value as SourceSpec['kind'])}
            className="rounded-sm border border-border bg-transparent px-1 py-0.5 outline-none"
          >
            <option value="mock">mock</option>
            <option value="folder">folder</option>
            <option value="room">room</option>
          </select>
          <input
            value={kind === 'mock' ? parts : path}
            spellCheck={false}
            placeholder={kind === 'mock' ? 'parts, comma separated' : 'the folder the workspace stands over'}
            onChange={(event) => (kind === 'mock' ? setParts(event.target.value) : setPath(event.target.value))}
            className="min-w-0 flex-1 rounded-sm border border-border bg-transparent px-1.5 py-0.5 outline-none focus-visible:border-ring"
          />
        </div>
        <input
          data-region="project-add-file"
          type="file"
          accept=".txt,.md,.yaml,.yml"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            void file.text().then((read) => {
              setText(read);
              if (!id.trim()) setId(file.name.replace(/\.[^.]+$/, ''));
            });
          }}
          className="text-[10px] text-muted-foreground file:mr-1 file:rounded-sm file:border file:border-border file:bg-transparent file:px-1 file:py-0.5 file:text-[10px] file:text-foreground"
        />
        <textarea
          data-region="project-add-text"
          value={text}
          spellCheck={false}
          placeholder="or paste the record here, or a project declaration as JSON"
          onChange={(event) => {
            setText(event.target.value);
            if (issues.length) setIssues([]);
          }}
          className="h-16 resize-none rounded-sm border border-border bg-transparent px-1.5 py-0.5 font-mono outline-none focus-visible:border-ring"
        />
        {/* What the declaration says wrong, in the order a reader would find it. A project that is not proved is not
            added: the board never draws a space the contract refused. */}
        {issues.length ? (
          <ul data-region="project-add-issues" className="flex flex-col gap-0.5 text-[10px] text-claim">
            {issues.map((issue, index) => (
              <li key={`${issue.path}-${index}`}>
                {issue.path ? `${issue.path}: ` : ''}
                {issue.message}
              </li>
            ))}
          </ul>
        ) : null}
        <div className="flex justify-end">
          <Button size="xs" variant="outline" disabled={!ready} onClick={submit}>
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}
