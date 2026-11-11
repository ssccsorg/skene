import { afterEach, expect, test, vi } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NO_SHELL, offTheShelf } from '@/lib/host';
import { setHost, host } from '@/lib/host';
import { boardIntoBuild } from '../tools/vite-board.mjs';
import { SKENE_DEDUPE, skeneChunks } from '../tools/vite-chunks.mjs';
import { mediaProxy } from '../tools/media-proxy.mjs';

// The parts of a deployment that are the same everywhere: the host a shipped board stands over, the chunks its build is
// cut into, and the footage it serves from its own origin. Each is here because two deployments wrote it twice.

test('a shipped board has no shell and no feed', async () => {
  expect(offTheShelf.reachable).toBe(false);
  expect(offTheShelf.static).toBe(true);
  await expect(offTheShelf.ask('health')).rejects.toThrow(NO_SHELL);
  expect(typeof (await offTheShelf.listen('stack-state', () => {}))).toBe('function');
});

test('a shipped board is not the browser default, which may still expect a room', () => {
  setHost(offTheShelf);
  expect(host().static).toBe(true);
  setHost(undefined);
  expect(host().static).toBeUndefined();
});

test('one copy of the renderer, React, and the store', () => {
  expect(SKENE_DEDUPE).toEqual(['react', 'react-dom', 'three', 'zustand']);
});

test('each engine is its own chunk and the frame gathers the rest', () => {
  expect(skeneChunks('/app/node_modules/maplibre-gl/dist/maplibre.js')).toBe('maplibre');
  expect(skeneChunks('/app/node_modules/three/build/three.module.js')).toBe('three');
  expect(skeneChunks('/app/node_modules/@react-three/fiber/dist/index.js')).toBe('skene');
  expect(skeneChunks('/app/node_modules/react-dom/client.js')).toBe('react');
  expect(skeneChunks('/app/node_modules/@ssccsorg/skene-frame/src/Frame.tsx')).toBe('skene');
  expect(skeneChunks('/app/src/main.tsx')).toBeUndefined();
});

const bucket = 'https://footage.example';

const answer = (status, headers = {}, body = 'body') =>
  new Response(body, { status, headers });

afterEach(() => {
  vi.unstubAllGlobals();
});

test('footage is fetched from the bucket under the path that was asked for', async () => {
  const asked = [];
  vi.stubGlobal('fetch', async (url) => {
    asked.push(url);
    return answer(200, { 'content-type': 'video/mp4', 'content-length': '21' });
  });
  const proxy = mediaProxy(bucket + '/');
  const response = await proxy.onRequest({
    request: new Request('https://demo/media/robot_1.mp4'),
    params: { path: 'robot_1.mp4' },
  });
  expect(asked).toEqual([bucket + '/robot_1.mp4']);
  expect(response.headers.get('content-type')).toBe('video/mp4');
  expect(response.headers.get('cache-control')).toBe('public, max-age=86400');
  expect(response.status).toBe(200);
});

test('the range a player asked for is the range the bucket is asked for', async () => {
  const asked = [];
  vi.stubGlobal('fetch', async (url, init) => {
    asked.push(init?.headers?.range ?? null);
    return answer(206, { 'content-range': 'bytes 0-1023/177339359' });
  });
  const proxy = mediaProxy(bucket);
  const response = await proxy.onRequest({
    request: new Request('https://demo/media/robot_2.mp4', { headers: { range: 'bytes=0-1023' } }),
    params: { path: 'robot_2.mp4' },
  });
  expect(asked).toEqual(['bytes=0-1023']);
  expect(response.status).toBe(206);
  expect(response.headers.get('content-range')).toBe('bytes 0-1023/177339359');
});

test('a request that names no file is refused', async () => {
  const response = await mediaProxy(bucket).onRequest({
    request: new Request('https://demo/media/'),
    params: {},
  });
  expect(response.status).toBe(400);
});

test('a path that climbs out of the bucket is refused', async () => {
  let called = false;
  vi.stubGlobal('fetch', async () => {
    called = true;
    return answer(200);
  });
  const proxy = mediaProxy(bucket);
  const response = await proxy.onRequest({
    request: new Request('https://demo/media/../../secrets'),
    params: { path: ['..', '..', 'secrets'] },
  });
  expect(response.status).toBe(400);
  expect(called).toBe(false);
});

// Every deployment on Pages needs the same host rule, and one that wrote its own has decided something about its host.
test('a build carries the fallback, and a deployment that ships one keeps it', async () => {
  const root = mkdtempSync(join(tmpdir(), 'board-'));
  writeFileSync(join(root, 'projects.json'), '{"projects":[]}');
  mkdirSync(join(root, 'scenario'));
  mkdirSync(join(root, 'dist'));
  const plugin = boardIntoBuild();
  plugin.configResolved({ root, build: { outDir: 'dist' } });

  await plugin.closeBundle();
  expect(readFileSync(join(root, 'dist', '_redirects'), 'utf8')).toContain('/*    /index.html    200');

  writeFileSync(join(root, 'dist', '_redirects'), '/*    /elsewhere    200\n');
  await plugin.closeBundle();
  expect(readFileSync(join(root, 'dist', '_redirects'), 'utf8')).toBe('/*    /elsewhere    200\n');
});
