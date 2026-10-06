const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const COOKIE_NAME = 'token';
const SESSION_DAYS = 7;

function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function cookieOptions() {
  return {
    httpOnly: true, // page JavaScript cannot read the cookie
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL),
    path: '/',
  };
}

function setSessionCookie(res, userId, jwtSecret) {
  const token = jwt.sign({ uid: userId }, jwtSecret, { expiresIn: `${SESSION_DAYS}d` });
  res.cookie(COOKIE_NAME, token, {
    ...cookieOptions(),
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
  });
}

function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, cookieOptions());
}

// Middleware: rejects the request unless it carries a valid login cookie.
function requireAuth({ db, jwtSecret }) {
  const findById = db.prepare('SELECT id, username FROM users WHERE id = ?');

  return (req, res, next) => {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) return res.status(401).json({ error: 'Not logged in' });

    let payload;
    try {
      payload = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] });
    } catch {
      return res.status(401).json({ error: 'Not logged in' });
    }

    // The user row can be gone even when the token is valid (e.g. database reset).
    const user = findById.get(payload.uid);
    if (!user) return res.status(401).json({ error: 'Not logged in' });

    req.user = { id: user.id, username: user.username };
    next();
  };
}

module.exports = {
  hashPassword,
  verifyPassword,
  setSessionCookie,
  clearSessionCookie,
  requireAuth,
};
