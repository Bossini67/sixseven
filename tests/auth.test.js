const { test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { setup, signUp } = require('./helpers');

test('register stores a hash, never the plain password', async () => {
  const { app, db } = setup();
  await signUp(app, 'alice', 'correct-horse');

  const row = db.prepare('SELECT password_hash FROM users WHERE username = ?').get('alice');
  assert.notEqual(row.password_hash, 'correct-horse');
  assert.match(row.password_hash, /^\$2[aby]\$/);
});

test('register rejects a duplicate username', async () => {
  const { app } = setup();
  await signUp(app, 'alice');

  const res = await request(app)
    .post('/api/register')
    .send({ username: 'alice', password: 'another-password' });
  assert.equal(res.status, 409);
});

test('register rejects a short password and a bad username', async () => {
  const { app } = setup();

  const short = await request(app).post('/api/register').send({ username: 'alice', password: 'short' });
  assert.equal(short.status, 400);

  const badName = await request(app)
    .post('/api/register')
    .send({ username: 'a b', password: 'correct-horse' });
  assert.equal(badName.status, 400);
});

test('login with the right password starts a session', async () => {
  const { app } = setup();
  await signUp(app, 'alice', 'correct-horse');

  const agent = request.agent(app);
  const login = await agent.post('/api/login').send({ username: 'alice', password: 'correct-horse' });
  assert.equal(login.status, 200);
  assert.equal(login.body.username, 'alice');

  const cookie = login.headers['set-cookie'].join(';');
  assert.match(cookie, /HttpOnly/i);

  const me = await agent.get('/api/me');
  assert.equal(me.status, 200);
  assert.equal(me.body.username, 'alice');
});

test('login with the wrong password is rejected', async () => {
  const { app } = setup();
  await signUp(app, 'alice', 'correct-horse');

  const res = await request(app).post('/api/login').send({ username: 'alice', password: 'wrong-password' });
  assert.equal(res.status, 401);
  assert.equal(res.headers['set-cookie'], undefined);
});

test('login for an unknown user is rejected with the same message', async () => {
  const { app } = setup();
  await signUp(app, 'alice', 'correct-horse');

  const wrong = await request(app).post('/api/login').send({ username: 'alice', password: 'wrong-password' });
  const unknown = await request(app).post('/api/login').send({ username: 'nobody', password: 'correct-horse' });
  assert.equal(unknown.status, 401);
  assert.deepEqual(unknown.body, wrong.body);
});

test('protected routes need a login', async () => {
  const { app } = setup();

  assert.equal((await request(app).get('/api/me')).status, 401);
  assert.equal((await request(app).get('/api/tasks')).status, 401);
  assert.equal((await request(app).post('/api/tasks').send({ title: 'x' })).status, 401);
});

test('a forged cookie is rejected', async () => {
  const { app } = setup();

  const res = await request(app).get('/api/tasks').set('Cookie', 'token=not-a-real-token');
  assert.equal(res.status, 401);
});

test('logout ends the session', async () => {
  const { app } = setup();
  const agent = await signUp(app, 'alice');

  await agent.post('/api/logout').expect(204);
  assert.equal((await agent.get('/api/me')).status, 401);
});
