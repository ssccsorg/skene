// The footage, served from the deployment's own origin.
//
// A video is sampled into a texture by the media view, and a cross-origin video taints the canvas it is uploaded from.
// A dev server hides that behind a proxy; a static deployment has none, so this is that proxy as a Pages Function. The
// board keeps the `/media/...` addresses it was written with, and the browser sees one origin.
//
// The range header is passed through rather than dropped, because a video is fetched in parts and a proxy that answered
// the whole file would move tens of megabytes for a second of playback.
//
// It is plain ESM so a deployment's `functions/` can import it: the function is bundled by the deploy, not by the app.

/**
 * One proxy per bucket.
 *
 * @param {string} bucket the public base a file's own path is appended to
 * @returns {{ onRequest: (context: { request: Request, params: { path?: string | string[] } }) => Promise<Response> }}
 */
export function mediaProxy(bucket) {
  const base = bucket.replace(/\/+$/, '');
  return {
    async onRequest({ request, params }) {
      const path = Array.isArray(params.path) ? params.path.join('/') : params.path;
      if (!path) return new Response('no footage was named', { status: 400 });
      // A path from the address bar is not allowed to climb out of the bucket it was named for.
      if (path.split('/').includes('..')) return new Response('that path is not footage', { status: 400 });

      const range = request.headers.get('range');
      // A ranged request is not cached at either end: the cache is keyed by the URL, so a part of a file stored under it
      // would answer a request that asked for the whole.
      const upstream = await fetch(`${base}/${path}`, {
        headers: range ? { range } : {},
        cf: range ? {} : { cacheEverything: true },
      });

      // The body streams through as it arrives, so a large file costs the response and not the request that started it.
      const headers = new Headers();
      for (const name of [
        'content-type',
        'content-length',
        'content-range',
        'accept-ranges',
        'etag',
        'last-modified',
      ]) {
        const value = upstream.headers.get(name);
        if (value) headers.set(name, value);
      }
      // A whole file is worth caching and nothing else is: an error cached for a day is a file published after a 404 that
      // stays missing for as long as the entry lives.
      const whole = upstream.status === 200 && !range;
      headers.set('cache-control', whole ? 'public, max-age=86400' : 'no-store');

      return new Response(upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers,
      });
    },
  };
}
