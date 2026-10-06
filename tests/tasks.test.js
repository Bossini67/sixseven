const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setup, signUp } = require('./helpers');

test('a new user starts with an empty list', async () => {
  const { app } = setup();
  const alice = await signUp(app, 'alice');

  const res = await alice.get('/api/tasks');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, []);
});

test('add, complete and delete a task', async () => {
  const { app } = setup();
  const alice = await signUp(app, 'alice');

  const added = await alice.post('/api/tasks').send({ title: '  Buy milk  ' });
  assert.equal(added.status, 201);
  assert.equal(added.body.title, 'Buy milk');
  assert.equal(added.body.done, false);

  const completed = await alice.patch(`/api/tasks/${added.body.id}`).send({ done: true });
  assert.equal(completed.status, 200);
  assert.equal(completed.body.done, true);

  const listed = await alice.get('/api/tasks');
  assert.equal(listed.body.length, 1);
  assert.equal(listed.body[0].done, true);

  await alice.delete(`/api/tasks/${added.body.id}`).expect(204);
  assert.deepEqual((await alice.get('/api/tasks')).body, []);
});

test('an empty or blank task is rejected', async () => {
  const { app } = setup();
  const alice = await signUp(app, 'alice');

  assert.equal((await alice.post('/api/tasks').send({ title: '' })).status, 400);
  assert.equal((await alice.post('/api/tasks').send({ title: '   ' })).status, 400);
  assert.equal((await alice.post('/api/tasks').send({})).status, 400);
  assert.equal((await alice.post('/api/tasks').send({ title: 'x'.repeat(201) })).status, 400);
  assert.deepEqual((await alice.get('/api/tasks')).body, []);
});

test('"done" must be a boolean', async () => {
  const { app } = setup();
  const alice = await signUp(app, 'alice');
  const { body: task } = await alice.post('/api/tasks').send({ title: 'Buy milk' });

  assert.equal((await alice.patch(`/api/tasks/${task.id}`).send({ done: 'yes' })).status, 400);
});

test('a missing task returns 404', async () => {
  const { app } = setup();
  const alice = await signUp(app, 'alice');

  assert.equal((await alice.patch('/api/tasks/999').send({ done: true })).status, 404);
  assert.equal((await alice.delete('/api/tasks/999')).status, 404);
  assert.equal((await alice.delete('/api/tasks/abc')).status, 404);
});

test('each user sees only their own tasks', async () => {
  const { app } = setup();
  const alice = await signUp(app, 'alice');
  const bob = await signUp(app, 'bob');

  await alice.post('/api/tasks').send({ title: 'Alice task' });
  await bob.post('/api/tasks').send({ title: 'Bob task' });

  const aliceTitles = (await alice.get('/api/tasks')).body.map((t) => t.title);
  const bobTitles = (await bob.get('/api/tasks')).body.map((t) => t.title);
  assert.deepEqual(aliceTitles, ['Alice task']);
  assert.deepEqual(bobTitles, ['Bob task']);
});

test("a user cannot complete or delete another user's task", async () => {
  const { app } = setup();
  const alice = await signUp(app, 'alice');
  const bob = await signUp(app, 'bob');
  const { body: task } = await alice.post('/api/tasks').send({ title: 'Alice task' });

  assert.equal((await bob.patch(`/api/tasks/${task.id}`).send({ done: true })).status, 404);
  assert.equal((await bob.delete(`/api/tasks/${task.id}`)).status, 404);

  const { body: tasks } = await alice.get('/api/tasks');
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0].done, false);
});
