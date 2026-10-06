const express = require('express');

const MAX_TITLE = 200;

function toTask(row) {
  return { id: row.id, title: row.title, done: row.done === 1, created_at: row.created_at };
}

// Mounted behind requireAuth, so req.user is always set here.
// Every query filters on user_id: that is what keeps users out of each other's tasks.
module.exports = function taskRoutes({ db }) {
  const router = express.Router();

  const listTasks = db.prepare(
    'SELECT id, title, done, created_at FROM tasks WHERE user_id = ? ORDER BY id DESC'
  );
  const getTask = db.prepare(
    'SELECT id, title, done, created_at FROM tasks WHERE id = ? AND user_id = ?'
  );
  const insertTask = db.prepare('INSERT INTO tasks (user_id, title) VALUES (?, ?)');
  const setDone = db.prepare('UPDATE tasks SET done = ? WHERE id = ? AND user_id = ?');
  const deleteTask = db.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?');

  router.get('/', (req, res) => {
    res.json(listTasks.all(req.user.id).map(toTask));
  });

  router.post('/', (req, res) => {
    const rawTitle = req.body?.title;
    const title = typeof rawTitle === 'string' ? rawTitle.trim() : '';

    if (!title) return res.status(400).json({ error: 'Task title cannot be empty' });
    if (title.length > MAX_TITLE) {
      return res.status(400).json({ error: `Task title must be ${MAX_TITLE} characters or fewer` });
    }

    const { lastInsertRowid } = insertTask.run(req.user.id, title);
    res.status(201).json(toTask(getTask.get(Number(lastInsertRowid), req.user.id)));
  });

  router.patch('/:id', (req, res) => {
    const id = Number(req.params.id);
    const done = req.body?.done;

    if (typeof done !== 'boolean') {
      return res.status(400).json({ error: '"done" must be true or false' });
    }
    // A task that belongs to someone else looks exactly like a task that does not exist.
    if (!Number.isInteger(id) || setDone.run(done ? 1 : 0, id, req.user.id).changes === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(toTask(getTask.get(id, req.user.id)));
  });

  router.delete('/:id', (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || deleteTask.run(id, req.user.id).changes === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.status(204).end();
  });

  return router;
};
