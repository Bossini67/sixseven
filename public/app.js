const $ = (id) => document.getElementById(id);

// One helper for every call to the API. The browser attaches the login cookie itself.
async function api(method, path, body) {
  const res = await fetch('/api' + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = res.status === 204 ? null : await res.json().catch(() => null);

  if (!res.ok) {
    const error = new Error(data?.error || `Request failed (${res.status})`);
    error.status = res.status;
    throw error;
  }
  return data;
}

function showError(message) {
  $('error').textContent = message || '';
  $('error').hidden = !message;
}

function showAuth() {
  $('tasks-view').hidden = true;
  $('auth-view').hidden = false;
}

async function showTasks(user) {
  $('current-user').textContent = user.username;
  $('auth-view').hidden = true;
  $('tasks-view').hidden = false;
  await loadTasks();
}

// Runs an action and shows its error, if any. A 401 means the session ended.
async function run(action) {
  showError('');
  try {
    await action();
  } catch (error) {
    if (error.status === 401 && !$('tasks-view').hidden) showAuth();
    showError(error.message);
  }
}

async function loadTasks() {
  const tasks = await api('GET', '/tasks');
  const list = $('task-list');
  list.replaceChildren(...tasks.map(renderTask));
  $('empty-note').hidden = tasks.length > 0;
}

function renderTask(task) {
  const item = document.createElement('li');
  if (task.done) item.classList.add('done');

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = task.done;
  checkbox.addEventListener('change', () =>
    run(async () => {
      await api('PATCH', `/tasks/${task.id}`, { done: checkbox.checked });
      await loadTasks();
    })
  );

  // textContent, not innerHTML, so a task title can never run as HTML.
  const title = document.createElement('span');
  title.textContent = task.title;

  const label = document.createElement('label');
  label.append(checkbox, title);

  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'secondary';
  remove.textContent = 'Delete';
  remove.addEventListener('click', () =>
    run(async () => {
      await api('DELETE', `/tasks/${task.id}`);
      await loadTasks();
    })
  );

  item.append(label, remove);
  return item;
}

function submitCredentials(path) {
  return run(async () => {
    const user = await api('POST', path, {
      username: $('username').value.trim(),
      password: $('password').value,
    });
    $('password').value = '';
    await showTasks(user);
  });
}

$('auth-form').addEventListener('submit', (event) => {
  event.preventDefault();
  submitCredentials('/login');
});

$('register-button').addEventListener('click', () => {
  if ($('auth-form').reportValidity()) submitCredentials('/register');
});

$('logout-button').addEventListener('click', () =>
  run(async () => {
    await api('POST', '/logout');
    showAuth();
  })
);

$('task-form').addEventListener('submit', (event) => {
  event.preventDefault();
  run(async () => {
    await api('POST', '/tasks', { title: $('task-title').value });
    $('task-title').value = '';
    await loadTasks();
  });
});

// On page load: ask the server who we are, then show the matching view.
(async () => {
  try {
    await showTasks(await api('GET', '/me'));
  } catch {
    showAuth();
  }
})();
