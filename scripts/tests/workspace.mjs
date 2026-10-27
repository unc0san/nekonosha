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
  for (const file of ['requests/requests', 'requests/deliverables', 'requests/storage', 'requests/intake', 'requests/assignment', 'requests/quality', 'requests/workflow-office', 'office/staff']) {
    const source = readFileSync(new URL(`../../app/components/${file}.ts`, import.meta.url), 'utf8');
    writeFileSync(join(root, `${file}.js`), ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText);
  }
  cpSync(new URL('../../app/components/office/work-studio.json', import.meta.url), join(root, 'office/work-studio.json'));
  const require = createRequire(import.meta.url);
  const { createRequest, startRequest, progressOf, isFinished, handIn, revise, approve, advanceRequest } = require(join(root, 'requests/requests.js'));
  const { emptyIntake, ruleBasedInterpreter, draftQuestions, confirmDraft, readDeadline, validDate } = require(join(root, 'requests/intake.js'));
  const { CAT_ROLES } = require(join(root, 'requests/assignment.js'));
  const { STAFF } = require(join(root, 'office/staff.js'));
  assert.ok(STAFF.every(cat => CAT_ROLES[cat.id] === cat.role));
  const { requestOfficeTasks } = require(join(root, 'requests/workflow-office.js'));
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
  assert.deepEqual(loadWorkspace(JSON.stringify(saved), defaults), JSON.parse(JSON.stringify({ tasks: defaults, requests: [request], intake: emptyIntake() })));
  for (const state of ['pending', 'working', 'review', 'completed']) {
    const r = { ...request, status: state };
    assert.equal(loadWorkspace(JSON.stringify({ ...saved, requests: [r] }), defaults).requests[0].status, state);
  }
  const legacy = { tasks: { 広告事業部: [{ ...task, status: undefined, done: false }, { ...task, id: 2, status: undefined, done: true }] }, requests: [{ ...request, status: 'approved' }] };
  const migrated = loadWorkspace(JSON.stringify(legacy), defaults);
  assert.deepEqual(migrated.tasks.広告事業部.map(t => t.status), ['pending', 'completed']);
  assert.equal(migrated.requests[0].status, 'completed');
  assert.deepEqual(loadWorkspace(null, defaults), { tasks: defaults, requests: [], intake: emptyIntake() });
  for (const raw of ['{', '{"version":99}', JSON.stringify({ ...saved, requests: [{ ...request, versions: [{}] }] }), JSON.stringify({ ...saved, requests: [request, request] })]) assert.throws(() => loadWorkspace(raw, defaults));
  const plan = ruleBasedInterpreter.interpret('来週までに秋のキャンペーン企画をまとめて', 'EC事業部');
  assert.equal(plan.department, '広告事業部');
  assert.equal(plan.kind, 'plan');
  assert.equal(plan.staff, 'kohaku');
  assert.equal(plan.dueDate, '2026-10-30');
  assert.equal(draftQuestions(plan).length, 0);
  assert.equal(confirmDraft(plan, 50000).status, 'pending');
  assert.equal(confirmDraft(plan, 50000).department, '広告事業部');
  const product = ruleBasedInterpreter.interpret('みつまめに新作グッズの商品ページを明日までに作ってほしい', '広告事業部');
  assert.equal(product.department, 'EC事業部');
  assert.equal(product.kind, 'product');
  assert.equal(product.staff, 'mitsumame');
  const unknown = ruleBasedInterpreter.interpret('これをお願い', '広告事業部');
  assert.deepEqual(draftQuestions(unknown).map(q => q.field), ['department', 'dueDate', 'details']);
  assert.throws(() => confirmDraft(unknown, 60000));
  const conflict = ruleBasedInterpreter.interpret('広告事業部とEC事業部の商品企画を明日までにお願い', '広告事業部');
  assert.equal(conflict.department, '');
  assert.equal(ruleBasedInterpreter.interpret('こはくとむぎに広告の企画を明日までにお願い', '広告事業部').staff, 'kohaku');
  assert.equal(readDeadline('来週火曜日まで').date, '2026-10-27');
  assert.equal(readDeadline('再来週まで').date, '2026-11-06');
  assert.equal(readDeadline('2月30日まで').date, '');
  assert.equal(validDate('2026-02-29'), false);
  assert.equal(validDate('2028-02-29'), true);
  const external = ruleBasedInterpreter.interpret('ねこ日和のSNS投稿案を明日までに作って投稿して', '広告事業部');
  assert.equal(confirmDraft(external, 70000).external, true);
  const edited = { ...product, subject: '編集した仕事', staff: 'mugi', details: '猫グッズの特徴を3点にまとめる', dueDate: '2026-11-03' };
  const confirmed = confirmDraft(edited, 80000);
  assert.equal(confirmed.subject, edited.subject);
  assert.equal(confirmed.staff, 'mitsumame'); // Old manual choices cannot bypass Ponzu's assignment.
  assert.equal(confirmed.details, edited.details);
  assert.equal(confirmed.due.date, edited.dueDate);
  const intake = emptyIntake();
  intake.inputs.広告事業部 = plan.text;
  intake.drafts.広告事業部 = plan;
  intake.inputs.EC事業部 = edited.text;
  intake.drafts.EC事業部 = edited;
  const restored = loadWorkspace(JSON.stringify({ version: 3, tasks: defaults, requests: [confirmed], intake }), defaults);
  assert.deepEqual(restored.intake, intake);
  assert.equal(restored.requests[0].details, edited.details);
  assert.equal(restored.requests.length, 1); // Unapproved previews never enter the task list.
  assert.deepEqual(loadWorkspace(JSON.stringify(saved), defaults).intake, emptyIntake());
  assert.throws(() => loadWorkspace(JSON.stringify({ ...saved, intake: { inputs: {}, drafts: {} } }), defaults));
  // One complete new-flow request, including cooperative work and the president's correction.
  const teamDraft = ruleBasedInterpreter.interpret('広告事業部の秋キャンペーン企画とSNS投稿、競合調査を来週までにまとめて', '広告事業部');
  let job = confirmDraft(teamDraft, 90000);
  assert.equal(job.staff, 'kohaku');
  assert.deepEqual(job.team.map(m => m.staff), ['kohaku', 'mugi', 'kurogoma']);
  assert.equal(job.workflow.phase, 'assigned');
  assert.equal(approve(job), job);
  job = startRequest(job, 100000);
  assert.equal(job.workflow.phase, 'staff_work');
  assert.equal(requestOfficeTasks(job).filter(t => !t.done).length, 3);
  const roundTrip = r => loadWorkspace(JSON.stringify({ version: 4, tasks: defaults, requests: [r], intake: emptyIntake() }), defaults).requests[0];
  job = roundTrip(job);
  job = advanceRequest(job, job.startedAt + job.duration);
  assert.equal(job.workflow.phase, 'president_review');
  assert.equal(job.status, 'working');
  assert.equal(job.versions.length, 1);
  assert.equal(approve(job), job); // Shirasu's review cannot complete a task or accept final approval early.
  assert.equal(requestOfficeTasks(job)[0].owner, 'しらす');
  job = roundTrip(job);
  job = advanceRequest(job, job.startedAt + job.duration);
  assert.equal(job.workflow.phase, 'internal_revision');
  assert.equal(job.workflow.reviews[0].verdict, 'changes');
  assert.match(job.workflow.reviews[0].comments[0], /完成条件/);
  job = roundTrip(job);
  job = advanceRequest(job, job.startedAt + job.duration);
  assert.equal(job.workflow.phase, 'president_review');
  assert.equal(job.versions.length, 2);
  assert.ok(job.versions[1].sections.some(s => s.heading === '品質確認メモ'));
  job = roundTrip(job);
  const noDuplicate = advanceRequest(job, job.startedAt);
  assert.equal(noDuplicate.versions.length, 2);
  job = advanceRequest(job, job.startedAt + job.duration);
  assert.equal(job.status, 'review');
  assert.equal(job.workflow.phase, 'user_review');
  assert.equal(job.workflow.reviews[1].verdict, 'passed');
  assert.equal(requestOfficeTasks(job).filter(t => !t.done).length, 0);
  job = roundTrip(job);
  const userRevision = revise(job, 'もっと短くして', job.startedAt + job.duration + 1);
  assert.equal(userRevision.workflow.phase, 'staff_work');
  assert.equal(userRevision.workflow.reviews.length, 2);
  let resubmitted = advanceRequest(userRevision, userRevision.startedAt + userRevision.duration);
  resubmitted = advanceRequest(resubmitted, resubmitted.startedAt + resubmitted.duration);
  assert.equal(resubmitted.workflow.phase, 'user_review');
  assert.equal(resubmitted.workflow.reviews.at(-1).verdict, 'passed');
  job = approve(job);
  assert.equal(job.status, 'completed');
  assert.equal(job.workflow.phase, 'completed');
  assert.deepEqual(roundTrip(job), job);
  // A failed recheck is reported to the user instead of entering an endless repair loop.
  const needsDecision = { ...resubmitted, status: 'working', workflow: { ...resubmitted.workflow, phase: 'president_review', autoRevisions: 1 }, versions: resubmitted.versions.map(v => ({ ...v, sections: v.sections.filter(s => s.heading !== '品質確認メモ') })) };
  const unresolved = advanceRequest(needsDecision, needsDecision.startedAt + needsDecision.duration);
  assert.equal(unresolved.workflow.phase, 'user_review');
  assert.equal(unresolved.workflow.reviews.at(-1).verdict, 'changes');
  assert.equal(approve(unresolved).status, 'completed'); // Final decision stays with the user.
  const invalidFlow = { ...job, workflow: { ...job.workflow, phase: 'staff_work' } };
  assert.throws(() => roundTrip(invalidFlow));
  assert.throws(() => roundTrip({ ...job, team: [...job.team, job.team[0]] }));
  assert.equal(migrated.requests[0].workflow, undefined); // Historical data is not reset or put through a new review.
  for (const kind of ['plan', 'copy', 'sns', 'email', 'report', 'product', 'memo']) {
    let sample = startRequest(confirmDraft({ ...teamDraft, kind }, 200000), 210000);
    for (let stage = 0; stage < 4; stage++) sample = advanceRequest(sample, sample.startedAt + sample.duration);
    assert.equal(sample.status, 'review', kind);
    assert.equal(sample.workflow.reviews.at(-1).verdict, 'passed', kind);
  }
  console.log('PASS: automatic team assignment, president review, concrete corrections, bounded rework, final user decision, workflow persistence and legacy preservation');
  console.log('PASS: Japanese intake, questions, preview edits, department isolation, deadline parsing, v2/v3 migration and draft persistence');
  console.log('PASS: four states, demo lifecycle, revisions, persistence round trips, legacy migration, invalid-data protection');
} finally {
  rmSync(root, { recursive: true, force: true });
}
