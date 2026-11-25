# RAG LAB roadmap

Direction (user, Nov 2026): local-only app on the user's computer with Ollama. No cloud, hosting or redesign.

- [x] Restore the original design, stages 0-6, run buttons, terminal, quizzes, robot
- [x] Local architecture: app -> local Python backend -> Ollama; no token needed; fonts/images offline
- [x] Ollama checks: running, both models installed, exact `ollama pull` command, embedding model never used for chat
- [x] Stage 5 generation works end to end; not marked done if generation fails
- [x] Stage 6 chatbot: upload/remove PDFs, rebuild, ask, sources + pages, history, clear, honest "not found"
- [x] Lesson explanations improved (Stage 0, 5, 6 and short definitions)
- [x] README, start.bat, start.sh, .gitignore, .env.example
- [ ] Not testable here: start.bat on a real Windows PC
- [ ] Waiting on user (optional): the 7 stage images
