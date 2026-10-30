#!/bin/bash
# Mac/Linux: installs dependencies (first run) and starts backend + frontend.
cd "$(dirname "$0")"
if [ ! -f backend/.env ]; then echo "Create backend/.env first (copy backend/.env.example and fill it in)."; exit 1; fi
[ -f .env ] || cp .env.example .env
[ -d node_modules ] || npm install
[ -d backend/node_modules ] || (cd backend && npm install)
(cd backend && npm start) &
BACK=$!
trap "kill $BACK 2>/dev/null" EXIT
npm run dev
