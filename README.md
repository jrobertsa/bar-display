# Bar Display

A full-stack digital menu board system with an Express/Socket.io backend, a React admin panel, and a React display frontend.

## Requirements

- **Node.js 22 or later** (required for the built-in `node:sqlite` module)
- npm

## Installation

Install dependencies for each of the three packages:

```bash
# Backend
npm install

# Admin frontend
cd admin && npm install && cd ..

# Display frontend
cd display && npm install && cd ..
```

## Environment setup

The repo ships with `.env` files that are gitignored. Create them before starting:

**`.env`** (backend — project root)
```
JWT_SECRET=your_secret_here
PORT=3000
```

**`admin/.env`**
```
VITE_API_URL=
```

**`display/.env`**
```
VITE_API_URL=
```

> `VITE_API_URL` can be left blank when the frontends are served from the same Express server (the default). Set it to `http://localhost:3000` only if you run the Vite dev servers standalone.

## Build the frontends

The admin and display apps are built once and served as static files by the Express server. Rebuild after any frontend changes:

```bash
cd admin   && npm run build && cd ..
cd display && npm run build && cd ..
```

## Start the server

**Development** (auto-restarts on backend changes via nodemon):
```bash
npm run dev
```

**Production**:
```bash
npm start
```

## Stop the server

Press `Ctrl + C` in the terminal where the server is running.

## URLs

| URL | Description |
|-----|-------------|
| `http://localhost:3000/admin` | Admin panel |
| `http://localhost:3000/display` | Display / menu board |
| `http://localhost:3000/health` | Health check |

## First-time setup

On first run, create your initial admin user:

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpassword"}'
```

After that, log in at `/admin` and manage additional users from the **Users** section of the sidebar.

## Project structure

```
bar-display/
├── src/                 # Express backend
│   ├── server.js
│   ├── db/              # SQLite schema & connection
│   ├── middleware/      # JWT auth
│   └── routes/          # auth, food, drinks, slides, settings
├── admin/               # React admin panel (Vite)
│   └── src/
│       ├── pages/       # Dashboard, MenuPage, Slides, Settings, Users
│       └── components/
├── display/             # React display frontend (Vite)
│   └── src/
│       └── components/  # MenuSlide, PhotoSlide, AnnouncementSlide, ClockWidget
└── package.json
```
