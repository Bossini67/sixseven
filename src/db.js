const { DatabaseSync } = require('node:sqlite');

// Vercel functions can only write to /tmp, and that directory is temporary.
function defaultPath() {
  if (process.env.DB_PATH) return process.env.DB_PATH;
  return process.env.VERCEL ? '/tmp/todo.db' : 'todo.db';
}

function openDb(path = defaultPath()) {
  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title      TEXT NOT NULL,
      done       INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS tasks_user_id ON tasks(user_id);
  `);
  return db;
}

module.exports = { openDb };
