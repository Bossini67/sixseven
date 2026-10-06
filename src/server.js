// Local entry point: `npm start`.
try {
  process.loadEnvFile();
} catch {
  // No .env file; fall back to variables already in the environment.
}

const { createApp } = require('./app');
const { openDb } = require('./db');

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is not set. Copy .env.example to .env and fill it in.');
  process.exit(1);
}

const port = process.env.PORT || 3000;
const app = createApp({ db: openDb(), jwtSecret: process.env.JWT_SECRET });

app.listen(port, () => {
  console.log(`To-do app running at http://localhost:${port}`);
});
