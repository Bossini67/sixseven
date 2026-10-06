// Vercel entry point: every /api/* request is rewritten to this file.
const { createApp } = require('../src/app');
const { openDb } = require('../src/db');

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is not set in the Vercel project settings');
}

module.exports = createApp({ db: openDb(), jwtSecret: process.env.JWT_SECRET });
