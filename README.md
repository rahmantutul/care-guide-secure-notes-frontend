# Secure Notes Frontend

Static frontend for the secure note-taking app.

## Configure Backend URL

Edit `config.js` before deploying:

```js
window.API_BASE_URL = 'https://your-backend-host.com';
```

Example:

```js
window.API_BASE_URL = 'https://secure-notes-api.example.com';
```

Do not add `/api` at the end. The frontend already calls routes like `/api/auth/login`.

## Deploy To Vercel

1. Push the full project to GitHub.
2. Go to Vercel.
3. Import the GitHub repository.
4. Set **Root Directory** to:

```txt
frontend
```

5. Framework preset:

```txt
Other
```

6. Build command:

```txt
None
```

7. Output directory:

```txt
.
```

8. Deploy.
