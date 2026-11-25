#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

need() { command -v "$1" >/dev/null 2>&1 || { echo "ERROR: $2"; exit 1; }; }
need ollama "Ollama is not installed."
need npm "Node.js is not installed."
PY=python3; command -v python3 >/dev/null 2>&1 || PY=python
need "$PY" "Python is not installed."

if ! curl -fs http://127.0.0.1:11434/api/version >/dev/null 2>&1; then
  (ollama serve >/dev/null 2>&1 &)
  for _ in $(seq 20); do curl -fs http://127.0.0.1:11434/api/version >/dev/null 2>&1 && break; sleep 1; done
fi

for model in nomic-embed-text llama3.2; do
  if ! ollama list | grep -q "^$model"; then
    ollama pull "$model"
  fi
done

[ -d rag-backend/.venv ] || "$PY" -m venv rag-backend/.venv
rag-backend/.venv/bin/python -m pip install -q --disable-pip-version-check -r rag-backend/requirements.txt
[ -d node_modules ] || npm install --no-audit --no-fund

(cd rag-backend && exec .venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000) &
BACKEND=$!
trap "kill $BACKEND 2>/dev/null || true" EXIT

LAN_IP=$(hostname -I 2>/dev/null | awk "{print \$1}")
echo ""
echo "  Local:   http://localhost:8080"
[ -n "$LAN_IP" ] && echo "  Network: http://$LAN_IP:8080  (share on same Wi-Fi)"
echo ""

npm run dev -- --host 0.0.0.0 --port 8080
