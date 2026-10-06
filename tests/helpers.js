const request = require('supertest');
const { createApp } = require('../src/app');
const { openDb } = require('../src/db');

// A fresh app on an in-memory database, so tests never touch todo.db or each other.
function setup() {
  const db = openDb(':memory:');
  const app = createApp({ db, jwtSecret: 'test-secret' });
  return { db, app };
}

// Registers a user and returns an agent that keeps that user's login cookie.
async function signUp(app, username, password = 'correct-horse') {
  const agent = request.agent(app);
  await agent.post('/api/register').send({ username, password }).expect(201);
  return agent;
}

module.exports = { setup, signUp };
