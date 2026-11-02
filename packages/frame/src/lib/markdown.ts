import MarkdownIt from 'markdown-it';

/**
 * The one renderer, and the one place a body becomes markup.
 *
 * An agent writes markdown, and a console that shows it as text is a console where a table is a paragraph and a fence is
 * a run of backticks: the body is the agent's own writing and it is meant to be read, so it goes through a renderer
 * rather than into a text node.
 *
 * `html: false` is what makes the result safe to put in the document without a sanitizer on top of it. Markup in the
 * source is escaped and drawn as it arrived, so every tag in the output is one the renderer wrote itself, and the
 * renderer refuses the link schemes that execute (`javascript:`, `vbscript:`, and `data:` except for images). That is
 * the whole of the safety here, and it is why the option is load-bearing rather than tidy. `breaks` keeps one newline
 * one line, which is how a message is read rather than how a document is laid out, and `linkify` makes a bare address
 * something a reader can follow.
 *
 * It is built once for the module because a renderer holds its own state and a second one would be a second opinion
 * about what a body is.
 */
const renderer = new MarkdownIt({ html: false, linkify: true, breaks: true });

/** A body as markup, with every tag of it written by the renderer. */
export function markdownOf(text: string): string {
  return renderer.render(text ?? '');
}
