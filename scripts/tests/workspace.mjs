import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, cpSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';

// Compile an isolated copy, keeping generated files out of the source tree.
const root = mkdtempSync(join(tmpdir(), 'nekonosha-test-'));
try {
  for (const dir of ['requests', 'office']) mkdirSync(join(root, dir));
  for (const file of ['requests/requests', 'requests/deliverables', 'requests/storage', 'office/staff']) {
    const source = readFileSync(new URL(`../../app/components/${file}.ts`, import.meta.url), 'utf8');
    writeFileSync(join(root, `${file}.js`), ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText);
  }
  cpSync(new URL('../../app/components/office/work-studio.json', import.meta.url), join(root, 'office/work-studio.json'));
  const require = createRequire(import.meta.url);
  const { createRequest, startRequest, progressOf, isFinished, handIn, revise, approve } = require(join(root, 'requests/requests.js'));
  const { loadWorkspace } = require(join(root, 'requests/storage.js'));
  const task = { id: 1, title: 'テスト', project: 'サンプル', owner: 'ぽんず', due: '今日', priority: false, status: 'pending' };
  const defaults = { 広告事業部: [task], EC事業部: [] };
  let request = createRequest('新作商品のページを作って', 'EC事業部', 10000);
  assert.equal(request.status, 'pending');
  assert.equal(progressOf(request, 999999).ratio, 0);
  assert.equal(isFinished(request, 999999), false);
  request = startRequest(request, 20000);
  assert.equal(request.status, 'working');
  assert.equal(isFinished(request, 20000), false);
  assert.equal(isFinished(request, 20000 + request.duration), true);
  request = handIn(request);
  assert.equal(request.status, 'review');
  request = revise(request, '短くして', 40000);
  assert.equal(request.status, 'working');
  assert.equal(request.startedAt, 40000);
  assert.deepEqual(request.revisions, ['短くして']);
  request = approve(handIn(request));
  assert.equal(request.status, 'completed');
  assert.equal(request.versions.length, 2);
  const saved = { version: 2, tasks: defaults, requests: [request] };
  assert.deepEqual(loadWorkspace(JSON.stringify(saved), defaults), JSON.parse(JSON.stringify({ tasks: defaults, requests: [request] })));
  for (const state of ['pending', 'working', 'review', 'completed']) {
    const r = { ...request, status: state };
    assert.equal(loadWorkspace(JSON.stringify({ ...saved, requests: [r] }), defaults).requests[0].status, state);
  }
  const legacy = { tasks: { 広告事業部: [{ ...task, status: undefined, done: false }, { ...task, id: 2, status: undefined, done: true }] }, requests: [{ ...request, status: 'approved' }] };
  const migrated = loadWorkspace(JSON.stringify(legacy), defaults);
  assert.deepEqual(migrated.tasks.広告事業部.map(t => t.status), ['pending', 'completed']);
  assert.equal(migrated.requests[0].status, 'completed');
  assert.deepEqual(loadWorkspace(null, defaults), { tasks: defaults, requests: [] });
  for (const raw of ['{', '{"version":99}', JSON.stringify({ ...saved, requests: [{ ...request, versions: [{}] }] }), JSON.stringify({ ...saved, requests: [request, request] })]) assert.throws(() => loadWorkspace(raw, defaults));
  console.log('PASS: four states, demo lifecycle, revisions, persistence round trips, legacy migration, invalid-data protection');
} finally {
  rmSync(root, { recursive: true, force: true });
}
