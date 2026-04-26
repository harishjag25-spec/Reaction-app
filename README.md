# Minimalist Dynamics - Reaction Test

High-precision reaction time testing tool built with React and Express.

## ⚡ Quick Start

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- npm (installed with Node.js)

### 2. Installation
```bash
npm install
```

### 3. Environment Setup
Copy the example environment file:
```bash
cp .env.example .env
```
Update the `.env` file with your preferred settings:
- `PORT`: Server port (default: 3000)
- `JWT_SECRET`: Used for authenticating sessions
- `DATABASE_URL`: Path to the SQLite database file

### 4. Running the App

#### Development Mode
Runs the frontend with Hot Module Replacement and the server with live reload.
```bash
npm run dev
```

#### Production Mode
Builds the frontend for optimal performance and starts the server.
```bash
npm run build
npm start
```

## 📂 Project Structure

- `src/`: React frontend source code
- `server.ts`: Express backend server & API (using SQLite)
- `public/`: Static assets
- `dist/`: Compiled production build (generated after `npm run build`)

## 🛠 Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Lucide React
- **Backend**: Express, SQLite (better-sqlite3), JSON Web Tokens (JWT), bcrypt.js
- **Tooling**: Vite, tsx

## 🚀 Deployment (Render/Heroku/Vercel)

1. Connect your repository.
2. Set Build Command: `npm run build`
3. Set Start Command: `npm start`
4. Define Environment Variables: `PORT`, `JWT_SECRET`, `NODE_ENV=production`

---
© 2024 Minimalist Dynamics
