#!/usr/bin/env bash
# RAG LAB - start everything on this computer (Mac / Linux).
set -euo pipefail
cd "$(dirname "$0")"

need() { command -v "$1" >/dev/null 2>&1 || { echo "ERROR: $2"; exit 1; }; }
need ollama "Ollama is not installed. Get it from https://ollama.com/download"
need npm "Node.js is not installed. Get the LTS version from https://nodejs.org"
PY=python3; command -v python3 >/dev/null 2>&1 || PY=python
need "$PY" "Python is not installed. Get Python 3.11 or newer from https://www.python.org/downloads/"

echo "[1/5] Checking that Ollama is running..."
if ! curl -fs http://127.0.0.1:11434/api/version >/dev/null 2>&1; then
  echo "      Starting Ollama..."
  (ollama serve >/dev/null 2>&1 &)
  for _ in $(seq 20); do curl -fs http://127.0.0.1:11434/api/version >/dev/null 2>&1 && break; sleep 1; done
fi
curl -fs http://127.0.0.1:11434/api/version >/dev/null 2>&1 || { echo "ERROR: Ollama did not start. Open the Ollama app, then run this script again."; exit 1; }

echo "[2/5] Checking the two models..."
for model in nomic-embed-text llama3.2; do
  if ! ollama list | grep -q "^$model"; then
    echo "      Downloading $model (only the first time)..."
    ollama pull "$model"
  fi
done

echo "[3/5] Preparing Python..."
[ -d rag-backend/.venv ] || "$PY" -m venv rag-backend/.venv
rag-backend/.venv/bin/python -m pip install -q --disable-pip-version-check -r rag-backend/requirements.txt

echo "[4/5] Preparing the app..."
[ -d node_modules ] || npm install --no-audit --no-fund

echo "[5/5] Starting RAG LAB..."
(cd rag-backend && exec .venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000) &
BACKEND=$!
trap 'kill $BACKEND 2>/dev/null || true' EXIT
echo
echo "  RAG LAB is starting. Open  http://localhost:8080  in your browser."
echo "  Press Ctrl+C here to stop."
echo
npm run dev -- --port 8080
