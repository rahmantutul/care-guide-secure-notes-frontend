const state = {
  token: localStorage.getItem('token'),
  user: JSON.parse(localStorage.getItem('user') || 'null')
};
const API_BASE_URL = window.API_BASE_URL || '';

const currentUser = document.getElementById('currentUser');
const sessionPanel = document.getElementById('sessionPanel');
const authView = document.getElementById('authView');
const appView = document.getElementById('appView');
const adminSection = document.getElementById('adminSection');
const notesView = document.getElementById('notesView');
const postsView = document.getElementById('postsView');
const notesMenuButton = document.getElementById('notesMenuButton');
const publicPostsMenuButton = document.getElementById('publicPostsMenuButton');
const adminMenuButton = document.getElementById('adminMenuButton');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const authTitle = document.getElementById('authTitle');
const authSubtitle = document.getElementById('authSubtitle');

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatDate(value) {
  if (!value) return 'Unknown date';
  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

function updateHeader() {
  currentUser.textContent = state.user
    ? `${state.user.name} (${state.user.role})`
    : 'Not logged in';
  sessionPanel.style.display = state.user ? 'flex' : 'none';
  authView.classList.toggle('hidden', Boolean(state.user));
  appView.classList.toggle('hidden', !state.user);
  adminMenuButton.style.display = state.user?.role === 'admin' ? 'inline-flex' : 'none';
}

function showAppView(viewName) {
  notesView.classList.toggle('hidden', viewName !== 'notes');
  postsView.classList.toggle('hidden', viewName !== 'posts');
  adminSection.classList.toggle('hidden', viewName !== 'admin');

  notesMenuButton.classList.toggle('active', viewName === 'notes');
  publicPostsMenuButton.classList.toggle('active', viewName === 'posts');
  adminMenuButton.classList.toggle('active', viewName === 'admin');

  if (viewName === 'notes') loadNotes();
  if (viewName === 'posts') loadPosts();
}

function showLogin() {
  loginForm.classList.remove('hidden');
  registerForm.classList.add('hidden');
  authTitle.textContent = 'Login';
  authSubtitle.textContent = 'Sign in to manage your secure notes.';
}

function showRegister() {
  loginForm.classList.add('hidden');
  registerForm.classList.remove('hidden');
  authTitle.textContent = 'Register';
  authSubtitle.textContent = 'Create an account, then start managing notes.';
}

function saveSession(data) {
  state.token = data.token;
  state.user = data.user;
  localStorage.setItem('token', data.token);
  localStorage.setItem('user', JSON.stringify(data.user));
  updateHeader();
  showAppView('notes');
}

function clearSession() {
  state.token = null;
  state.user = null;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  document.getElementById('notesList').innerHTML = '';
  document.getElementById('postsList').innerHTML = '';
  document.getElementById('adminOutput').innerHTML = '';
  showLogin();
  showAppView('notes');
  updateHeader();
}

async function api(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }

  return data;
}

function formData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function renderJson(elementId, data) {
  document.getElementById(elementId).innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
}

function renderEmpty(message) {
  return `<div class="empty">${escapeHtml(message)}</div>`;
}

function renderTable(headers, rows) {
  if (!rows.length) return renderEmpty('No records found.');

  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr>
        </thead>
        <tbody>${rows.join('')}</tbody>
      </table>
    </div>
  `;
}

document.getElementById('showRegisterButton').addEventListener('click', showRegister);
document.getElementById('showLoginButton').addEventListener('click', showLogin);
notesMenuButton.addEventListener('click', () => showAppView('notes'));
publicPostsMenuButton.addEventListener('click', () => showAppView('posts'));
adminMenuButton.addEventListener('click', () => {
  if (state.user?.role === 'admin') showAppView('admin');
});

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const data = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(formData(event.target))
    });
    saveSession(data);
    event.target.reset();
  } catch (error) {
    alert(error.message);
  }
});

registerForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const values = formData(event.target);
    const data = await api('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        ...values,
        interests: values.interests
          ? values.interests.split(',').map((item) => item.trim()).filter(Boolean)
          : []
      })
    });
    saveSession(data);
    event.target.reset();
  } catch (error) {
    alert(error.message);
  }
});

document.getElementById('logoutButton').addEventListener('click', clearSession);

document.getElementById('noteForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    await api('/api/notes', {
      method: 'POST',
      body: JSON.stringify(formData(event.target))
    });
    event.target.reset();
    loadNotes();
  } catch (error) {
    alert(error.message);
  }
});

async function loadNotes() {
  try {
    const data = await api('/api/notes?page=1&limit=10');
    document.getElementById('notesList').innerHTML = data.data.length
      ? data.data.map((note) => `
      <div class="item">
        <div class="item-header">
          <h3 class="item-title">${escapeHtml(note.title)}</h3>
          <span class="badge">Private</span>
        </div>
        <p class="item-body">${escapeHtml(note.body)}</p>
        <p class="meta">Created ${formatDate(note.createdAt)}</p>
        <div class="actions">
          <button class="button button-danger" onclick="deleteNote('${note._id}')">Delete</button>
        </div>
      </div>
    `).join('')
      : renderEmpty('No notes yet. Create your first private note.');
  } catch (error) {
    alert(error.message);
  }
}

async function deleteNote(id) {
  try {
    await api(`/api/notes/${id}`, { method: 'DELETE' });
    loadNotes();
  } catch (error) {
    alert(error.message);
  }
}

document.getElementById('loadNotesButton').addEventListener('click', loadNotes);

document.getElementById('postForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    await api('/api/posts', {
      method: 'POST',
      body: JSON.stringify(formData(event.target))
    });
    event.target.reset();
    loadPosts();
  } catch (error) {
    alert(error.message);
  }
});

async function loadPosts() {
  try {
    const data = await api('/api/posts?page=1&limit=10');
    document.getElementById('postsList').innerHTML = data.data.length
      ? data.data.map((post) => `
      <div class="item">
        <div class="item-header">
          <h3 class="item-title">${escapeHtml(post.title)}</h3>
          <span class="badge">Public</span>
        </div>
        <p class="item-body">${escapeHtml(post.body)}</p>
        <p class="meta">By ${escapeHtml(post.author?.name || 'Unknown')} - ${formatDate(post.createdAt)}</p>
      </div>
    `).join('')
      : renderEmpty('No public posts yet.');
  } catch (error) {
    alert(error.message);
  }
}

document.getElementById('loadPostsButton').addEventListener('click', loadPosts);

document.getElementById('loadUsersButton').addEventListener('click', async () => {
  try {
    const data = await api('/api/admin/users?page=1&limit=10');
    const rows = data.data.map((user) => `
      <tr>
        <td>${escapeHtml(user.name)}</td>
        <td>${escapeHtml(user.email)}</td>
        <td><span class="badge">${escapeHtml(user.role)}</span></td>
        <td>${escapeHtml((user.interests || []).join(', ') || 'None')}</td>
        <td>${formatDate(user.createdAt)}</td>
      </tr>
    `);
    document.getElementById('adminOutput').innerHTML = renderTable(
      ['Name', 'Email', 'Role', 'Interests', 'Created'],
      rows
    );
  } catch (error) {
    alert(error.message);
  }
});

document.getElementById('loadAllNotesButton').addEventListener('click', async () => {
  try {
    const data = await api('/api/admin/notes?page=1&limit=10');
    const rows = data.data.map((note) => `
      <tr>
        <td>${escapeHtml(note.title)}</td>
        <td>${escapeHtml(note.owner?.name || 'Unknown')}</td>
        <td>${escapeHtml(note.owner?.email || 'Unknown')}</td>
        <td>${formatDate(note.createdAt)}</td>
      </tr>
    `);
    document.getElementById('adminOutput').innerHTML = renderTable(
      ['Title', 'Owner', 'Owner Email', 'Created'],
      rows
    );
  } catch (error) {
    alert(error.message);
  }
});

document.getElementById('groupInterestsButton').addEventListener('click', async () => {
  try {
    const data = await api('/api/admin/users/grouped-by-interests');
    const rows = data.data.map((group) => `
      <tr>
        <td><span class="badge">${escapeHtml(group._id)}</span></td>
        <td>${group.count}</td>
        <td>${escapeHtml(group.users.map((user) => user.name).join(', '))}</td>
      </tr>
    `);
    document.getElementById('adminOutput').innerHTML = renderTable(
      ['Interest', 'Users Count', 'Users'],
      rows
    );
  } catch (error) {
    alert(error.message);
  }
});

updateHeader();
if (state.user) {
  showAppView('notes');
} else {
  showLogin();
}
