const express = require('express');
const {
  hashPassword,
  verifyPassword,
  setSessionCookie,
  clearSessionCookie,
} = require('../auth');

const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,30}$/;
const MIN_PASSWORD = 8;
const MAX_PASSWORD = 72; // bcrypt ignores anything past 72 bytes

module.exports = function authRoutes({ db, jwtSecret, auth }) {
  const router = express.Router();

  const findByUsername = db.prepare(
    'SELECT id, username, password_hash FROM users WHERE username = ?'
  );
  const insertUser = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)');

  router.post('/register', async (req, res) => {
    const { username, password } = req.body ?? {};

    if (typeof username !== 'string' || !USERNAME_PATTERN.test(username)) {
      return res
        .status(400)
        .json({ error: 'Username must be 3-30 letters, numbers or underscores' });
    }
    if (
      typeof password !== 'string' ||
      password.length < MIN_PASSWORD ||
      password.length > MAX_PASSWORD
    ) {
      return res
        .status(400)
        .json({ error: `Password must be ${MIN_PASSWORD}-${MAX_PASSWORD} characters` });
    }
    if (findByUsername.get(username)) {
      return res.status(409).json({ error: 'Username is already taken' });
    }

    const passwordHash = await hashPassword(password);
    const { lastInsertRowid } = insertUser.run(username, passwordHash);
    const id = Number(lastInsertRowid);

    setSessionCookie(res, id, jwtSecret);
    res.status(201).json({ id, username });
  });

  router.post('/login', async (req, res) => {
    const { username, password } = req.body ?? {};
    if (typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Same message for "no such user" and "wrong password", so neither leaks.
    const user = findByUsername.get(username);
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    setSessionCookie(res, user.id, jwtSecret);
    res.json({ id: user.id, username: user.username });
  });

  router.post('/logout', (req, res) => {
    clearSessionCookie(res);
    res.status(204).end();
  });

  router.get('/me', auth, (req, res) => {
    res.json(req.user);
  });

  return router;
};
