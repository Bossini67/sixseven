const path = require('node:path');
const express = require('express');
const cookieParser = require('cookie-parser');
const { requireAuth } = require('./auth');
const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');

// Takes the database and secret as arguments so tests can pass in throwaway ones.
function createApp({ db, jwtSecret }) {
  const app = express();
  const auth = requireAuth({ db, jwtSecret });

  app.use(express.json());
  app.use(cookieParser());
  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.use('/api/tasks', auth, taskRoutes({ db }));
  app.use('/api', authRoutes({ db, jwtSecret, auth }));

  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Request body is not valid JSON' });
    }
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  });

  return app;
}

module.exports = { createApp };
