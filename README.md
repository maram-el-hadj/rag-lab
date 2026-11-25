# RAG LAB

An interactive lab that teaches Retrieval-Augmented Generation in 7 stages (0 to 6)
and ends with a working chatbot over your own PDFs.

Everything runs **on your own computer**: no cloud service, no API key. After the
first setup it works without an internet connection.

| Part | What it does |
|---|---|
| Ollama | Runs the two AI models locally |
| `nomic-embed-text` | Embedding model: turns chunks and questions into vectors. Never used for chat. |
| `llama3.2` | Chat model: writes the answers from the retrieved chunks |
| `rag-backend/` (Python, FastAPI) | Runs the lesson code, reads PDFs, stores vectors in ChromaDB, calls Ollama |
| `src/` (web app) | The lessons, quizzes, progress and chatbot screen |

## What you need (install once)

1. **Python 3.11 or newer** - https://www.python.org/downloads/ (Windows: tick "Add python.exe to PATH")
2. **Node.js LTS** - https://nodejs.org
3. **Ollama** - https://ollama.com/download
4. The two models (about 2.3 GB together):

   ```
   ollama pull nomic-embed-text
   ollama pull llama3.2
   ```

## Start

- **Windows:** double-click `start.bat`
- **Mac / Linux:** `./start.sh`

The script checks that Ollama is running, downloads a missing model, installs the
Python and app packages the first time, then starts both parts.

Open **http://localhost:8080**, type your name and begin with Stage 0.

The dashboard has a "Lab server" card. It must say **Ready**. If something is
missing, it shows the exact command to run.

## Start by hand (if you prefer)

```
# terminal 1 - Python lab server
cd rag-backend
python -m venv .venv
.venv\Scripts\activate          (Mac/Linux: source .venv/bin/activate)
pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000

# terminal 2 - the app
npm install
npm run dev -- --port 8080
```

## Settings (optional)

No settings are needed. To change a model name or the Ollama address, copy
`rag-backend/.env.example` to `rag-backend/.env` and edit it. There are no secrets.

## Where your data is

`rag-backend/data/` holds your uploaded PDFs, the ChromaDB vector database and the
chat history. It is created automatically and is **not** sent to GitHub (see
`.gitignore`). Delete the folder to start fresh.

## Problems

| Message | What to do |
|---|---|
| Local lab server not connected | Run `start.bat` / `./start.sh` and keep its windows open |
| Can't reach Ollama | Open the Ollama app, or run `ollama serve` |
| The model '...' is not installed | Run the `ollama pull ...` command shown |
| `"nomic-embed-text" does not support chat` | The chat model is set to the embedding model. In `rag-backend/.env`, set `OLLAMA_CHAT_MODEL=llama3.2` |
| No text could be extracted | The PDF is a scan (images). Use a PDF with selectable text |
| Answers are slow | Normal without a graphics card: 10 to 60 seconds per answer |

The lesson "Run" buttons execute real Python on your computer. Keep the lab
server on `127.0.0.1` (the default) so nobody else on the network can reach it.
