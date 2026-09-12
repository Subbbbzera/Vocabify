# Vocabulary Learning App

A full-stack vocabulary learning web application with spaced practice, daily streak tracking, and real-time messaging between friends.

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, React Router
- **Backend:** NestJS, TypeScript, PostgreSQL, TypeORM, Socket.io, Passport JWT
- **Performance & Media:** Web Workers (off-thread search), Web Audio API (sound alerts), WebSockets

## Features

- **Dictionaries & Words:** Create custom dictionaries, organize words with translations and examples, mark favorites, and track learning progress (New, Learning, Mastered).
- **Practice Mode:** Flashcard-based vocabulary practice with customizable letter filters and saved presets.
- **Streaks & Progress:** Daily streak tracker with end-of-day reminders, XP leveling system, weekly activity calendar, and achievement badges.
- **Social & Chat:** Add friends, see live online/offline presence, send direct messages in real time with audio chimes.
- **Notifications:** Configurable reminders for streaks and practice reviews with a master toggle and category preferences.
- **Responsive UI:** Dark slate interface optimized for both mobile (bottom navigation bar) and desktop (collapsible sidebar).

## Project Structure

```
nestproj/
├── backend/       # NestJS REST API and WebSocket gateway
├── frontend/      # React 19 single-page application
└── README.md
```

## Quick Start with Docker

Run the entire application stack (Frontend, Backend, and PostgreSQL) with a single command:

```bash
docker compose up --build
```

- **Frontend:** `http://localhost:5173`
- **Backend API:** `http://localhost:5000/api`
- **PostgreSQL:** `localhost:5432`

To stop all services:
```bash
docker compose down
```

---

## Manual Local Setup

### Prerequisites

- Node.js (v18+)
- PostgreSQL

### 1. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

Configure your database connection in `backend/.env`:

```env
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_postgres_password
DB_DATABASE=nestProject
JWT_SECRET=your_jwt_secret
```

Run in development mode:

```bash
npm run start:dev
```

Server runs at `http://localhost:5000`.

### 2. Frontend Setup

In another terminal:

```bash
cd frontend
npm install
npm run dev
```

App runs at `http://localhost:5173`.

### 3. Production Build

```bash
# Backend
cd backend && npm run build

# Frontend
cd frontend && npm run build
```
