# To-do list

A small full-stack to-do app. Each user logs in with a username and password and sees only their own tasks.

- **Front end:** plain HTML, CSS and JavaScript in `public/`
- **API:** Express in `src/`
- **Database:** SQLite through Node's built-in `node:sqlite`

## Run it locally

Needs Node 22.13 or newer.

```bash
npm install
cp .env.example .env   # then set JWT_SECRET to a long random string
npm start
```

Open http://localhost:3000.

## Run the tests

```bash
npm test
```

The tests use an in-memory database, so they never touch `todo.db`.

## API

| Route | Purpose |
|---|---|
| `POST /api/register` | Create a user and log in |
| `POST /api/login` | Log in |
| `POST /api/logout` | Log out |
| `GET /api/me` | The logged-in user |
| `GET /api/tasks` | List your tasks |
| `POST /api/tasks` | Add a task (`{ "title": "..." }`) |
| `PATCH /api/tasks/:id` | Mark done or not done (`{ "done": true }`) |
| `DELETE /api/tasks/:id` | Delete a task |

## Security notes

- Passwords are hashed with bcrypt. The plain password is never stored.
- The login session is a signed token in an `httpOnly` cookie, so page JavaScript cannot read it.
- Every task query filters on the logged-in user's id. Another user's task returns 404.
- `.env` and `*.db` are in `.gitignore`.

## Deploying to Vercel

Set `JWT_SECRET` in the Vercel project's environment variables, then deploy. `vercel.json` sends `/api/*` to `api/index.js`, and Vercel serves `public/` as static files.

### SQLite is for the demo only

On Vercel the only writable path is `/tmp`, so the database file lives at `/tmp/todo.db`. That storage is temporary: it is wiped whenever the function cold-starts and is not shared between function instances. Accounts and tasks will disappear, and two requests can land on different copies of the data.

**Production needs a hosted database** such as Postgres on Supabase or Neon, or hosted SQLite on Turso. Only `src/db.js` and the queries in `src/routes/` would need to change.
# sixseven
