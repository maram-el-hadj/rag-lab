@echo off
rem RAG LAB - start everything on this computer (Windows).
setlocal
cd /d "%~dp0"

where ollama >nul 2>nul || (echo ERROR: Ollama is not installed. Get it from https://ollama.com/download & pause & exit /b 1)
where npm >nul 2>nul || (echo ERROR: Node.js is not installed. Get the LTS version from https://nodejs.org & pause & exit /b 1)
set PY=python
where python >nul 2>nul || set PY=py
where %PY% >nul 2>nul || (echo ERROR: Python is not installed. Get Python 3.11 or newer from https://www.python.org/downloads/ and tick "Add python.exe to PATH". & pause & exit /b 1)

echo [1/5] Checking that Ollama is running...
curl -fs http://127.0.0.1:11434/api/version >nul 2>nul
if errorlevel 1 (
  echo       Starting Ollama...
  start "Ollama" /min ollama serve
  timeout /t 8 /nobreak >nul
)
curl -fs http://127.0.0.1:11434/api/version >nul 2>nul
if errorlevel 1 (echo ERROR: Ollama did not start. Open the Ollama app, then run start.bat again. & pause & exit /b 1)

echo [2/5] Checking the two models...
ollama list | findstr /b /c:"nomic-embed-text" >nul || (echo       Downloading nomic-embed-text ^(only the first time^)... & ollama pull nomic-embed-text)
ollama list | findstr /b /c:"llama3.2" >nul || (echo       Downloading llama3.2 ^(only the first time^)... & ollama pull llama3.2)

echo [3/5] Preparing Python...
if not exist rag-backend\.venv\Scripts\python.exe %PY% -m venv rag-backend\.venv
rag-backend\.venv\Scripts\python.exe -m pip install -q --disable-pip-version-check -r rag-backend\requirements.txt
if errorlevel 1 (echo ERROR: Installing the Python packages failed. & pause & exit /b 1)

echo [4/5] Preparing the app...
if not exist node_modules call npm install --no-audit --no-fund
if errorlevel 1 (echo ERROR: npm install failed. & pause & exit /b 1)

echo [5/5] Starting RAG LAB...
start "RAG LAB - Python lab server (keep open)" /min cmd /k "cd /d "%~dp0rag-backend" && .venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000"
echo.
echo   RAG LAB is starting. Open  http://localhost:8080  in your browser.
echo   Close this window and the "Python lab server" window to stop.
echo.
call npm run dev -- --port 8080
