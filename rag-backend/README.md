# RAG LAB local backend

Python server used by the RAG LAB app. See the main `README.md` for how to start.

- `app/main.py` - FastAPI app: lesson code runner, lab terminal, PDF upload,
  ChromaDB knowledge base, chatbot (question -> embedding -> similarity search ->
  prompt -> llama3.2 -> answer + sources).
- `requirements.txt` - Python packages.
- `.env.example` - optional, non-secret settings.
- `data/` - created at first start: PDFs, vectors, chat history (git-ignored).

`GET /health` reports whether Ollama is running, which models are installed and
the exact `ollama pull` command for a missing one.
