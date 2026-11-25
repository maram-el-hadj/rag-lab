// Lesson content for RAG LAB. Code lines may carry an explanation shown when clicked.
// Tokens like @@NAME@@ are replaced with the learner's parameter values before display and run.

export type CodeLine = string | [string, string];
export type CodeBlock = { title: string; purpose: string; lines: CodeLine[] };
export type QuizQuestion = { q: string; options: string[]; answer: number; explain: string };
export type Param =
  | { key: string; label: string; kind: "number"; min: number; max: number; step: number; default: number; help: string }
  | { key: string; label: string; kind: "text"; default: string; help: string };

export type Stage = {
  id: number;
  title: string;
  short: string;
  goal: string;
  robot: string;
  intro: string[];
  learn: string[];
  flow: string[];
  concepts: { term: string; text: string }[];
  needsDocument: boolean;
  params: Param[];
  blocks: CodeBlock[];
  activity: string;
  quiz: QuizQuestion[];
};

const RESULT_NOTE = "Prints a special line starting with __RESULT__ so RAG LAB can show the output as tables. It does not change the result.";

export const STAGES: Stage[] = [
  {
    id: 0,
    title: "Environment Setup",
    short: "Python, packages and Ollama",
    goal: "Understand and prepare everything needed to build a RAG chatbot.",
    robot: "Let's check your computer is ready! Try a few commands in the terminal.",
    intro: [
      "Before we build anything, we need the right tools. A RAG chatbot is a Python program that reads documents, turns them into numbers and asks an AI model to answer questions about them.",
      "In this stage you will meet each tool, run real commands on your own computer, and check that everything is ready.",
    ],
    learn: [
      "Python is the programming language we use. It is simple to read and has great AI libraries.",
      "pip installs Python packages (ready-made code written by others).",
      "A virtual environment (.venv) is a private folder of packages for one project, so projects don't conflict.",
      "requirements.txt lists the packages a project needs, so anyone can install the same versions.",
      "Environment variables and the .env file store settings (like the Ollama address) outside the code.",
      "Ollama runs AI models on your own computer. No cloud service, no API key, and it works without internet once the models are downloaded.",
      "An LLM (llama3.2) writes answers. An embedding model (nomic-embed-text) turns text into numbers. RAG needs both.",
    ],
    flow: ["Python", "pip packages", ".env settings", "Ollama models"],
    concepts: [
      { term: "pypdf", text: "Opens a PDF and extracts the text of each page. Without it, Python sees a PDF only as unreadable bytes." },
      { term: "langchain-text-splitters", text: "Cuts long text into small chunks at natural places (paragraphs, sentences), so each chunk can be searched on its own." },
      { term: "langchain-ollama", text: "Lets Python talk to Ollama: OllamaEmbeddings for nomic-embed-text (vectors) and ChatOllama for llama3.2 (answers)." },
      { term: "chromadb", text: "A small database saved in a folder on your disk. It stores the vectors and finds the ones closest to a question." },
      { term: "python-dotenv", text: "Reads the .env file so settings such as the Ollama address and model names are not written inside the code." },
    ],
    needsDocument: false,
    params: [],
    blocks: [
      {
        title: "Load settings and check Python",
        purpose: "First we load the .env file and print the Python version, so we know which Python runs our code.",
        lines: [
          ["import sys, os, json", "Built-in modules: sys knows about Python itself, os reads environment variables, json formats data."],
          ["import importlib.metadata as metadata", "Lets us ask which version of each installed package we have."],
          ["import urllib.request", "A built-in way to call a web address — we use it to talk to Ollama."],
          ["from dotenv import load_dotenv", "python-dotenv gives us load_dotenv()."],
          "",
          ["load_dotenv()", "Reads the .env file and puts its values into environment variables."],
          ['print("Python", sys.version.split()[0])', "Prints only the version number, e.g. 3.11.9."],
        ],
      },
      {
        title: "Check the installed packages",
        purpose: "Each RAG step needs one package. We ask pip's records which version is installed.",
        lines: [
          ['packages = ["pypdf", "langchain-text-splitters", "langchain-ollama", "chromadb", "python-dotenv"]', "The five packages our RAG chatbot needs."],
          "versions = {}",
          ["for name in packages:", "Loop over each package name."],
          ["    versions[name] = metadata.version(name)", "Look up the installed version. This fails if a package is missing."],
          ['    print(f"{name:<26} {versions[name]}")', "Print the name padded to 26 characters, then its version."],
        ],
      },
      {
        title: "Ask Ollama which models it has",
        purpose: "Ollama has a small web API. /api/tags lists the downloaded models.",
        lines: [
          ['base_url = os.getenv("OLLAMA_BASE_URL")', "The Ollama address comes from .env, not from the code."],
          ['with urllib.request.urlopen(base_url + "/api/tags", timeout=10) as response:', "Call Ollama's list-models endpoint, waiting at most 10 seconds."],
          ['    models = [m["name"] for m in json.load(response)["models"]]', "Read the JSON answer and keep only the model names."],
          ['print("Ollama models:", ", ".join(models))', "Show the models, like `ollama list`."],
          "",
          ['chat_model = os.getenv("OLLAMA_CHAT_MODEL")', "llama3.2 — writes answers."],
          ['embed_model = os.getenv("OLLAMA_EMBED_MODEL")', "nomic-embed-text — turns text into vectors."],
          ["has_chat = any(m.startswith(chat_model) for m in models)", "True if the chat model is downloaded."],
          ["has_embed = any(m.startswith(embed_model) for m in models)", "True if the embedding model is downloaded."],
          ['print("Ready to build RAG!" if has_chat and has_embed else "A model is missing: run ollama pull")', "Our final verdict."],
        ],
      },
      {
        title: "Send results to the lab screen",
        purpose: RESULT_NOTE,
        lines: [
          'print("__RESULT__", json.dumps({"python": sys.version.split()[0], "packages": versions, "models": models, "chat_model": chat_model, "embed_model": embed_model, "ready": has_chat and has_embed}))',
        ],
      },
    ],
    activity: "Run the environment check successfully. Also try the terminal commands.",
    quiz: [
      {
        q: "Why do we use a virtual environment (.venv)?",
        options: ["To make Python run faster", "To keep each project's packages separate", "To connect to the internet", "To store PDF files"],
        answer: 1,
        explain: "A virtual environment is a private set of packages for one project, so different projects don't break each other.",
      },
      {
        q: "Which model turns text into vectors (numbers)?",
        options: ["llama3.2", "nomic-embed-text", "chromadb", "pypdf"],
        answer: 1,
        explain: "nomic-embed-text is the embedding model. llama3.2 is the LLM that writes answers.",
      },
      {
        q: "What does `pip freeze > requirements.txt` do?",
        options: ["Deletes all packages", "Saves the list of installed packages and versions to a file", "Downloads Ollama models", "Starts a virtual environment"],
        answer: 1,
        explain: "pip freeze lists installed packages with versions; `>` writes that list into requirements.txt.",
      },
    ],
  },
  {
    id: 1,
    title: "Loading & Chunking",
    short: "Read a PDF and split it",
    goal: "Understand the first part of the indexing process.",
    robot: "Upload a PDF and let's read it together!",
    intro: [
      "A RAG chatbot can only answer from documents it has read. Document loading means getting the text out of a file, page by page.",
      "Whole documents are too long to search and to give to an AI model, so we split the text into small pieces called chunks.",
    ],
    learn: [
      "Document loading: opening a file and extracting its text.",
      "PDF text extraction reads the text stored in each page. Scanned images have no text unless OCR is used.",
      "A chunk is a short piece of text, for example 800 characters.",
      "We chunk so that search can find the exact passage that answers a question.",
      "Chunk size = how long each piece is. Chunk overlap = how many characters neighbouring chunks share, so sentences cut in half are not lost.",
    ],
    flow: ["PDF file", "Page text", "Full text", "Chunks"],
    concepts: [
      { term: "Chunk size", text: "Maximum characters per chunk. Small = precise but little context. Large = more context but less precise." },
      { term: "Chunk overlap", text: "Characters repeated between neighbouring chunks, so ideas at the boundary stay together." },
    ],
    needsDocument: true,
    params: [
      { key: "CHUNK_SIZE", label: "Chunk size", kind: "number", min: 100, max: 3000, step: 50, default: 800, help: "Maximum characters in each chunk." },
      { key: "CHUNK_OVERLAP", label: "Chunk overlap", kind: "number", min: 0, max: 1000, step: 10, default: 100, help: "Characters shared by neighbouring chunks. Must be smaller than the chunk size." },
    ],
    blocks: [
      {
        title: "Import the tools and set parameters",
        purpose: "We import pypdf and the text splitter, and set which PDF and which chunk settings to use.",
        lines: [
          ["import json", "Used at the end to send results to the lab screen."],
          ["from pypdf import PdfReader", "PdfReader opens a PDF and gives us its pages."],
          ["from langchain_text_splitters import RecursiveCharacterTextSplitter", "A splitter that tries to cut at paragraphs, then sentences, then words."],
          "",
          ["PDF_PATH = @@PDF_PATH@@", "The PDF you selected, stored in your own private folder on this computer."],
          ["CHUNK_SIZE = @@CHUNK_SIZE@@", "Change this in the Experiment section."],
          ["CHUNK_OVERLAP = @@CHUNK_OVERLAP@@", "Change this in the Experiment section."],
        ],
      },
      {
        title: "Load the PDF page by page",
        purpose: "We extract the text of every page and remember its page number — useful later for showing sources.",
        lines: [
          ["reader = PdfReader(PDF_PATH)", "Open the PDF file."],
          "pages = []",
          ["for number, page in enumerate(reader.pages, start=1):", "Go through the pages, counting from 1."],
          ['    text = page.extract_text() or ""', "Get the page text. `or \"\"` handles pages with no text (e.g. images)."],
          ['    pages.append({"page": number, "text": text})', "Keep the text together with its page number."],
          ['print(f"Loaded {len(pages)} pages")', ""],
          "",
          ['full_text = "\\n".join(p["text"] for p in pages)', "Join all pages into one long text."],
          ['print(f"Extracted {len(full_text)} characters")', ""],
        ],
      },
      {
        title: "Split the text into chunks",
        purpose: "The splitter cuts the long text into overlapping pieces of at most CHUNK_SIZE characters.",
        lines: [
          ["splitter = RecursiveCharacterTextSplitter(chunk_size=CHUNK_SIZE, chunk_overlap=CHUNK_OVERLAP)", "Create a splitter with our settings."],
          ["chunks = splitter.split_text(full_text)", "Returns a Python list of strings — our chunks."],
          ['print(f"Created {len(chunks)} chunks")', ""],
          ["for i, chunk in enumerate(chunks[:3]):", "Show the first three chunks as examples."],
          ['    print(f"--- chunk {i} ({len(chunk)} characters) ---")', ""],
          ["    print(chunk[:300])", "Print only the first 300 characters to keep the output short."],
        ],
      },
      {
        title: "Send results to the lab screen",
        purpose: RESULT_NOTE,
        lines: [
          "average = round(sum(len(c) for c in chunks) / len(chunks)) if chunks else 0",
          'print("__RESULT__", json.dumps({"pages": len(pages), "characters": len(full_text), "first_page": pages[0]["text"][:2000] if pages else "", "chunk_count": len(chunks), "average_length": average, "chunks": [{"index": i, "length": len(c), "text": c[:500]} for i, c in enumerate(chunks[:40])]}))',
        ],
      },
    ],
    activity: "Upload a PDF and run the chunking code successfully.",
    quiz: [
      {
        q: "Why do we split documents into chunks?",
        options: ["To make the PDF smaller on disk", "So search can find the exact passage that answers a question", "Because Python can't read long text", "To translate the document"],
        answer: 1,
        explain: "Small chunks let retrieval find precise passages and keep the prompt short enough for the LLM.",
      },
      {
        q: "What is chunk overlap?",
        options: ["Text shared between neighbouring chunks", "The number of chunks", "The number of PDF pages", "Duplicate PDF files"],
        answer: 0,
        explain: "Overlap repeats a few characters at the boundary so an idea cut in half still appears whole in one chunk.",
      },
      {
        q: "A scanned PDF (only images) gives empty text. Why?",
        options: ["The chunk size is too big", "There is no text layer, only pictures — OCR is needed", "Ollama is not running", "The overlap is zero"],
        answer: 1,
        explain: "pypdf extracts stored text. A scanned page is a picture, so you need OCR to turn it into text first.",
      },
    ],
  },
  {
    id: 2,
    title: "Embeddings",
    short: "Turn text into vectors",
    goal: "Understand how text becomes numerical vectors.",
    robot: "Computers love numbers. Let's turn words into vectors!",
    intro: [
      "Computers can't compare meanings directly, but they can compare numbers. An embedding is a list of numbers (a vector) that represents the meaning of a text.",
      "Texts with similar meaning get vectors that point in a similar direction. This is how a RAG chatbot finds relevant chunks.",
    ],
    learn: [
      "An embedding is a vector: a long list of numbers, e.g. 768 numbers for nomic-embed-text.",
      "We need vectors so we can measure how close two meanings are.",
      "An embedding model has learned from huge amounts of text which words and ideas go together.",
      "We call nomic-embed-text through Ollama with the langchain-ollama package.",
      "Cosine similarity measures the angle between two vectors: close to 1 means very similar meaning.",
    ],
    flow: ["Chunk text", "nomic-embed-text", "Vector [0.12, -0.03, …]", "Similarity"],
    concepts: [
      { term: "Vector", text: "An ordered list of numbers, like coordinates on a map of meanings. Every embedding from the same model has the same length (768 here), so any two can be compared." },
      { term: "Cosine similarity", text: "A score from about -1 to 1 showing how similar two vectors are in direction." },
    ],
    needsDocument: true,
    params: [
      { key: "NUM_CHUNKS", label: "Chunks to embed", kind: "number", min: 1, max: 20, step: 1, default: 5, help: "How many chunks of your PDF to turn into vectors." },
      { key: "SENTENCE_A", label: "Sentence A", kind: "text", default: "The cat sat on the mat.", help: "Compare the meaning of three sentences." },
      { key: "SENTENCE_B", label: "Sentence B", kind: "text", default: "A kitten was resting on the rug.", help: "Try a sentence with similar meaning to A." },
      { key: "SENTENCE_C", label: "Sentence C", kind: "text", default: "Interest rates rose last quarter.", help: "Try a sentence about something unrelated." },
    ],
    blocks: [
      {
        title: "Connect to the embedding model",
        purpose: "We create an OllamaEmbeddings object that sends text to nomic-embed-text and returns vectors.",
        lines: [
          "import os, json, math",
          ["from dotenv import load_dotenv", ""],
          ["from pypdf import PdfReader", ""],
          ["from langchain_text_splitters import RecursiveCharacterTextSplitter", ""],
          ["from langchain_ollama import OllamaEmbeddings", "The bridge between Python and Ollama's embedding models."],
          "",
          ["load_dotenv()", "Load the Ollama address and model names from .env."],
          ['embedder = OllamaEmbeddings(model=os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text"), base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"))', "Our embedding model: nomic-embed-text."],
        ],
      },
      {
        title: "Embed chunks from your PDF",
        purpose: "We recreate the chunks from Stage 1 and turn the first few into vectors.",
        lines: [
          ["reader = PdfReader(@@PDF_PATH@@)", "Your selected PDF."],
          ['text = "\\n".join(page.extract_text() or "" for page in reader.pages)', "Same extraction as Stage 1."],
          ["chunks = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=100).split_text(text)[:@@NUM_CHUNKS@@]", "Split, then keep only the first NUM_CHUNKS chunks."],
          ["vectors = embedder.embed_documents(chunks)", "One call to Ollama: a list of texts in, a list of vectors out."],
          ['print(f"Embedded {len(vectors)} chunks. Each vector has {len(vectors[0])} numbers.")', "All vectors have the same length (the model's dimension)."],
          ['print("First 8 numbers of chunk 0:", [round(x, 4) for x in vectors[0][:8]])', "A peek inside a vector. The numbers alone mean nothing — only comparisons do."],
        ],
      },
      {
        title: "Compare the meaning of sentences",
        purpose: "Cosine similarity tells us how close two meanings are. Similar sentences score higher.",
        lines: [
          ["def cosine(a, b):", "A small function that measures the angle between two vectors."],
          ["    dot = sum(x * y for x, y in zip(a, b))", "Multiply matching numbers and add them up (the dot product)."],
          ["    return dot / (math.sqrt(sum(x * x for x in a)) * math.sqrt(sum(y * y for y in b)))", "Divide by both lengths so only direction matters."],
          "",
          ["sentences = [@@SENTENCE_A@@, @@SENTENCE_B@@, @@SENTENCE_C@@]", "Your three sentences from the Experiment section."],
          ["sentence_vectors = embedder.embed_documents(sentences)", "Turn each sentence into a vector."],
          ["matrix = [[round(cosine(a, b), 3) for b in sentence_vectors] for a in sentence_vectors]", "Compare every sentence with every other sentence."],
          ['for label, row in zip("ABC", matrix):', ""],
          ['    print(label, row)', "Each row shows how similar one sentence is to A, B and C."],
        ],
      },
      {
        title: "Send results to the lab screen",
        purpose: RESULT_NOTE,
        lines: [
          'print("__RESULT__", json.dumps({"dimensions": len(vectors[0]), "chunks": [{"text": c[:200], "first": [round(x, 4) for x in v[:8]]} for c, v in zip(chunks, vectors)], "sentences": sentences, "matrix": matrix}))',
        ],
      },
    ],
    activity: "Generate real embeddings from your PDF and compare sentences.",
    quiz: [
      {
        q: "What is an embedding?",
        options: ["A compressed PDF", "A list of numbers that represents the meaning of a text", "A chatbot answer", "A database table"],
        answer: 1,
        explain: "An embedding is a vector — numbers that capture meaning so computers can compare texts.",
      },
      {
        q: "Two sentences mean almost the same thing. Their cosine similarity will be…",
        options: ["Close to 1", "Exactly 0", "Negative", "Equal to the number of words"],
        answer: 0,
        explain: "Similar meanings point in similar directions, so the cosine similarity is close to 1.",
      },
      {
        q: "Why must documents and questions use the same embedding model?",
        options: ["It's cheaper", "Vectors from different models live in different 'spaces' and can't be compared", "Ollama only allows one model", "It makes chunks smaller"],
        answer: 1,
        explain: "Each model creates its own vector space. Comparing vectors from two different models gives meaningless results.",
      },
    ],
  },
  {
    id: 3,
    title: "Vector Database",
    short: "Store vectors in ChromaDB",
    goal: "Understand how embeddings are stored and organized.",
    robot: "Time to give our vectors a home in ChromaDB!",
    intro: [
      "Creating embeddings takes time. We don't want to redo it for every question, so we store them in a vector database.",
      "ChromaDB keeps each chunk's text, its vector and extra information (metadata) like the file name and page number, and can search them very quickly.",
    ],
    learn: [
      "A vector database stores vectors and finds the closest ones to a new vector.",
      "ChromaDB organises data in collections (like tables).",
      "Each item has an id, the document text, its embedding and metadata (source file, page, chunk number).",
      "Persistent storage saves the collection to disk, so it is still there after the program stops.",
    ],
    flow: ["Chunks + pages", "Embeddings", "ChromaDB collection", "Saved on disk"],
    concepts: [
      { term: "Collection", text: "A named group of items in ChromaDB, like one table in a spreadsheet. Ours is called 'lesson' and holds every chunk of your PDF." },
      { term: "Metadata", text: "Extra facts about a chunk, such as its source file and page. Used to show sources." },
    ],
    needsDocument: true,
    params: [
      { key: "CHUNK_SIZE", label: "Chunk size", kind: "number", min: 200, max: 3000, step: 50, default: 800, help: "Characters per chunk." },
      { key: "CHUNK_OVERLAP", label: "Chunk overlap", kind: "number", min: 0, max: 1000, step: 10, default: 100, help: "Characters shared by neighbouring chunks." },
      { key: "MAX_CHUNKS", label: "Maximum chunks", kind: "number", min: 10, max: 500, step: 10, default: 150, help: "A limit to keep this step fast. Large PDFs take longer to embed." },
    ],
    blocks: [
      {
        title: "Open a persistent ChromaDB",
        purpose: "PersistentClient saves everything into a folder in your private workspace.",
        lines: [
          "import os, json",
          "from dotenv import load_dotenv",
          "from pypdf import PdfReader",
          "from langchain_text_splitters import RecursiveCharacterTextSplitter",
          "from langchain_ollama import OllamaEmbeddings",
          ["import chromadb", "The vector database library."],
          "",
          "load_dotenv()",
          'embedder = OllamaEmbeddings(model=os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text"), base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"))',
          ['client = chromadb.PersistentClient(path="chroma_lessons")', "Data is saved to the chroma_lessons folder on disk."],
          ["try:", "Start fresh each time you run this stage."],
          ['    client.delete_collection("lesson")', "Remove an old 'lesson' collection if it exists."],
          ["except Exception:", ""],
          ["    pass", "Nothing to delete the first time — that's fine."],
          ['collection = client.create_collection("lesson", metadata={"hnsw:space": "cosine"})', "Create the collection and tell it to compare vectors with cosine similarity."],
        ],
      },
      {
        title: "Prepare chunks with metadata",
        purpose: "We split each page separately so every chunk remembers its page number.",
        lines: [
          ["reader = PdfReader(@@PDF_PATH@@)", ""],
          "splitter = RecursiveCharacterTextSplitter(chunk_size=@@CHUNK_SIZE@@, chunk_overlap=@@CHUNK_OVERLAP@@)",
          ["ids, documents, metadatas = [], [], []", "Three lists that ChromaDB needs, in the same order."],
          "for page_number, page in enumerate(reader.pages, start=1):",
          ['    for i, chunk in enumerate(splitter.split_text(page.extract_text() or "")):', "Split this page into chunks."],
          ['        ids.append(f"p{page_number}-c{i}")', "A unique id such as p3-c1 (page 3, chunk 1)."],
          ["        documents.append(chunk)", "The chunk text itself."],
          ['        metadatas.append({"source": @@FILENAME@@, "page": page_number, "chunk": i})', "Where the chunk came from."],
          ["ids, documents, metadatas = ids[:@@MAX_CHUNKS@@], documents[:@@MAX_CHUNKS@@], metadatas[:@@MAX_CHUNKS@@]", "Keep at most MAX_CHUNKS chunks."],
        ],
      },
      {
        title: "Embed and store",
        purpose: "We create the vectors and add everything to the collection in one call.",
        lines: [
          ["embeddings = embedder.embed_documents(documents)", "One vector per chunk, from nomic-embed-text."],
          ["collection.add(ids=ids, documents=documents, embeddings=embeddings, metadatas=metadatas)", "Store text, vector and metadata together."],
          ['print(f"Stored {collection.count()} chunks in the \'lesson\' collection")', "count() asks the database how many items it holds."],
          "",
          ['sample = collection.get(limit=8, include=["documents", "metadatas"])', "Read a few items back to inspect them."],
          'for item_id, meta in zip(sample["ids"], sample["metadatas"]):',
          '    print(item_id, meta)',
        ],
      },
      {
        title: "Send results to the lab screen",
        purpose: RESULT_NOTE,
        lines: [
          'print("__RESULT__", json.dumps({"collection": "lesson", "count": collection.count(), "dimensions": len(embeddings[0]) if embeddings else 0, "items": [{"id": i, "text": d[:300], "metadata": m} for i, d, m in zip(sample["ids"], sample["documents"], sample["metadatas"])]}))',
        ],
      },
    ],
    activity: "Create your ChromaDB collection and store your PDF's chunks.",
    quiz: [
      {
        q: "Why store embeddings in a vector database?",
        options: ["So we don't recompute them for every question, and can search fast", "To make the PDF readable", "To train the LLM", "To delete old chunks"],
        answer: 0,
        explain: "Embedding is slow. Storing vectors once lets us search them quickly for every question.",
      },
      {
        q: "What is metadata in our collection?",
        options: ["The vector numbers", "Extra facts like source file and page number", "The user's question", "The Ollama model"],
        answer: 1,
        explain: "Metadata describes each chunk — we use it to show which file and page an answer came from.",
      },
      {
        q: "What does 'persistent' storage mean?",
        options: ["The data is kept on disk after the program stops", "The data is deleted after each question", "The data is stored in the browser", "The data is encrypted"],
        answer: 0,
        explain: "PersistentClient writes the collection to disk, so it survives restarts.",
      },
    ],
  },
  {
    id: 4,
    title: "Retrieval",
    short: "Find the relevant chunks",
    goal: "Understand how RAG finds relevant information.",
    robot: "Ask a question and I'll find the best passages!",
    intro: [
      "Retrieval is the 'R' in RAG. When someone asks a question, we search the vector database for the chunks whose meaning is closest to the question.",
      "Good retrieval is essential: if the right chunk isn't found, even the best AI model can't answer correctly.",
    ],
    learn: [
      "The question is turned into a vector with the same embedding model as the chunks.",
      "Similarity search compares the question vector with every stored vector.",
      "Top-K means we keep the K most similar chunks, e.g. the best 4.",
      "Retrieval quality depends on chunk size, the embedding model and how the question is written.",
    ],
    flow: ["Question", "Question vector", "Similarity search", "Top-K chunks"],
    concepts: [
      { term: "Top-K", text: "How many of the most similar chunks to return. Top-K 4 means: give me the 4 best passages. Too few can miss the answer; too many adds noise." },
      { term: "Distance", text: "ChromaDB returns a distance: smaller is closer. Similarity = 1 − distance (for cosine)." },
    ],
    needsDocument: false,
    params: [
      { key: "QUESTION", label: "Your question", kind: "text", default: "What is the main topic of this document?", help: "Try a question your PDF answers, then an unrelated one." },
      { key: "TOP_K", label: "Top-K", kind: "number", min: 1, max: 10, step: 1, default: 4, help: "How many chunks to retrieve." },
    ],
    blocks: [
      {
        title: "Open the collection from Stage 3",
        purpose: "We reopen the 'lesson' collection that was saved to disk.",
        lines: [
          "import os, sys, json",
          "from dotenv import load_dotenv",
          "from langchain_ollama import OllamaEmbeddings",
          "import chromadb",
          "",
          "load_dotenv()",
          'embedder = OllamaEmbeddings(model=os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text"), base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"))',
          'client = chromadb.PersistentClient(path="chroma_lessons")',
          "try:",
          ['    collection = client.get_collection("lesson")', "Load the saved collection."],
          "except Exception:",
          ['    print("No collection found. Run Stage 3 first.")', "A friendly message if Stage 3 wasn't run."],
          ["    sys.exit(1)", "Stop with an error code."],
        ],
      },
      {
        title: "Turn the question into a vector",
        purpose: "The question must use the same embedding model as the chunks, so the vectors can be compared.",
        lines: [
          ["QUESTION = @@QUESTION@@", "Your question from the Experiment section."],
          ["question_vector = embedder.embed_query(QUESTION)", "embed_query is for a single search text."],
          ['print(f"Question vector has {len(question_vector)} numbers")', ""],
        ],
      },
      {
        title: "Search for the most similar chunks",
        purpose: "ChromaDB compares the question vector with all stored vectors and returns the Top-K closest.",
        lines: [
          ['results = collection.query(query_embeddings=[question_vector], n_results=@@TOP_K@@, include=["documents", "metadatas", "distances"])', "Ask for the TOP_K nearest chunks with their text, metadata and distance."],
          "hits = []",
          'for rank, (doc, meta, dist) in enumerate(zip(results["documents"][0], results["metadatas"][0], results["distances"][0]), start=1):',
          ["    similarity = 1 - dist", "With cosine space, similarity = 1 − distance. Higher is better."],
          '    print(f"#{rank}  page {meta[\'page\']}  similarity {similarity:.3f}")',
          "    print(doc[:200])",
          '    hits.append({"rank": rank, "similarity": round(similarity, 4), "page": meta["page"], "source": meta["source"], "text": doc})',
        ],
      },
      {
        title: "Send results to the lab screen",
        purpose: RESULT_NOTE,
        lines: ['print("__RESULT__", json.dumps({"question": QUESTION, "dimensions": len(question_vector), "hits": hits}))'],
      },
    ],
    activity: "Search your collection with a question and see the retrieved chunks.",
    quiz: [
      {
        q: "How is the user's question compared with the chunks?",
        options: ["By counting shared words only", "It is embedded into a vector and compared with the stored vectors", "The LLM reads every chunk", "By alphabetical order"],
        answer: 1,
        explain: "The question becomes a vector with the same model, and similarity search finds the closest chunk vectors.",
      },
      {
        q: "What does Top-K = 3 mean?",
        options: ["Use 3 PDFs", "Return the 3 most similar chunks", "Split text into 3 chunks", "Ask the LLM 3 times"],
        answer: 1,
        explain: "Top-K is the number of best-matching chunks returned by the search.",
      },
      {
        q: "You ask something your PDF doesn't cover. What do you expect?",
        options: ["Very high similarity scores", "Lower similarity scores — the chunks are only loosely related", "An error from ChromaDB", "No results at all, ever"],
        answer: 1,
        explain: "Search always returns the closest chunks, but for unrelated questions they are far away, so similarity is low.",
      },
    ],
  },
  {
    id: 5,
    title: "Generation",
    short: "Connect retrieval to the LLM",
    goal: "Connect retrieval with an LLM to generate answers.",
    robot: "Let's put it all together and generate a real answer!",
    intro: [
      "Generation is the 'G' in RAG: the step where a chat model writes the answer. Retrieval (Stage 4) only finds passages; generation turns those passages into a clear sentence that replies to the question.",
      "We do not ask llama3.2 what it 'knows'. We paste the retrieved chunks into the prompt as context and tell it to answer using only that context. This keeps answers tied to your documents and lets us show exactly which pages were used.",
      "Two different models work together here. nomic-embed-text turns the question into a vector for the search. llama3.2 writes the answer. An embedding model cannot chat, and a chat model is not used for the search.",
    ],
    learn: [
      "What generation means: the chat model reads a prompt and writes new text, one word at a time.",
      "How chunks enter the prompt: each retrieved chunk is pasted under a label such as [report.pdf p.3], one after another. Together they are called the context.",
      "What the chat model receives: one text made of three parts: instructions (the rules), the context (the chunks) and the question.",
      "How the answer is produced: llama3.2 reads the whole prompt and writes a reply based on the context it was given.",
      "How sources are kept: every chunk carries its file name and page from ChromaDB, so we can list the pages the answer came from.",
      "Unsupported questions: if no chunk is similar enough, we do not call the model at all and reply that the answer was not found. The prompt also tells the model to say so instead of guessing.",
    ],
    flow: ["Question", "Question vector", "Similarity search", "Retrieved context", "Prompt", "llama3.2", "Answer + sources"],
    concepts: [
      { term: "Context", text: "The retrieved chunks pasted into the prompt. It is the only information the model is allowed to use for its answer." },
      { term: "Prompt", text: "The full text sent to the chat model: instructions + context + question. Change the prompt and the answer changes." },
      { term: "Temperature", text: "How much randomness the model uses. Low (0 to 0.3) gives focused, repeatable, factual answers, which is what we want for documents." },
      { term: "Minimum similarity", text: "A safety limit. If the best chunk scores below it, nothing relevant was found, so we reply 'not found' without calling the model." },
      { term: "Grounding", text: "Making the answer rest on the documents instead of the model's memory. This is the main reason RAG reduces made-up answers." },
      { term: "Sources", text: "The file and page of each chunk used. They let a reader open the document and check the answer." },
    ],
    needsDocument: false,
    params: [
      { key: "QUESTION", label: "Your question", kind: "text", default: "Summarise the key points of this document.", help: "Ask about your PDF, then try something unrelated." },
      { key: "TOP_K", label: "Top-K", kind: "number", min: 1, max: 10, step: 1, default: 4, help: "How many chunks to put in the context." },
      { key: "MIN_SIMILARITY", label: "Minimum similarity", kind: "number", min: 0, max: 0.9, step: 0.05, default: 0.35, help: "Below this, we answer 'not found' without calling the LLM." },
      { key: "TEMPERATURE", label: "Temperature", kind: "number", min: 0, max: 1, step: 0.1, default: 0.1, help: "0 = focused and repeatable, 1 = more creative." },
    ],
    blocks: [
      {
        title: "Retrieve the context",
        purpose: "Exactly like Stage 4: embed the question and find the closest chunks.",
        lines: [
          "import os, sys, json",
          "from dotenv import load_dotenv",
          ["from langchain_ollama import OllamaEmbeddings, ChatOllama", "Two tools for two jobs: OllamaEmbeddings makes vectors, ChatOllama writes answers."],
          "import chromadb",
          "",
          "load_dotenv()",
          'embedder = OllamaEmbeddings(model=os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text"), base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"))',
          'client = chromadb.PersistentClient(path="chroma_lessons")',
          "try:",
          '    collection = client.get_collection("lesson")',
          "except Exception:",
          '    print("No collection found. Run Stage 3 first.")',
          "    sys.exit(1)",
          "",
          "QUESTION = @@QUESTION@@",
          'results = collection.query(query_embeddings=[embedder.embed_query(QUESTION)], n_results=@@TOP_K@@, include=["documents", "metadatas", "distances"])',
          'docs, metas = results["documents"][0], results["metadatas"][0]',
          ['similarities = [1 - d for d in results["distances"][0]]', "Higher = more relevant."],
          'sources = [{"source": m["source"], "page": m["page"], "similarity": round(s, 3), "text": d} for d, m, s in zip(docs, metas, similarities)]',
        ],
      },
      {
        title: "Handle questions with no relevant information",
        purpose: "If even the best chunk is not similar enough, we stop and say so — no invented answers.",
        lines: [
          ["if not similarities or max(similarities) < @@MIN_SIMILARITY@@:", "Compare the best score with our minimum."],
          ['    answer = "I couldn\'t find that in the documents."', "An honest answer instead of a guess."],
          '    print(answer)',
          '    print("__RESULT__", json.dumps({"question": QUESTION, "answer": answer, "prompt": None, "sources": sources, "skipped_llm": True, "answered": False}))',
          ["    sys.exit(0)", "Finish here without calling the LLM."],
        ],
      },
      {
        title: "Build the prompt",
        purpose: "We combine instructions, the retrieved context (with page labels) and the question.",
        lines: [
          ['context = "\\n\\n".join(f"[{m[\'source\']} p.{m[\'page\']}]\\n{d}" for d, m in zip(docs, metas))', "Each chunk is labelled with its file and page so the model can cite it."],
          'prompt = f"""Answer the question using ONLY the context below.',
          ['If the answer is not in the context, say exactly: I couldn\'t find that in the documents.', "This instruction stops the model from making things up."],
          "Mention the page numbers you used.",
          "",
          "Context:",
          "{context}",
          "",
          "Question: {QUESTION}",
          'Answer:"""',
        ],
      },
      {
        title: "Ask llama3.2",
        purpose: "ChatOllama sends the prompt to the LLM running in Ollama and returns its answer.",
        lines: [
          ['llm = ChatOllama(model=os.getenv("OLLAMA_CHAT_MODEL", "llama3.2"), base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"), temperature=@@TEMPERATURE@@, num_predict=400)', "Our chat model: llama3.2. Never put nomic-embed-text here: an embedding model cannot chat. num_predict limits the answer to about 400 tokens so it finishes in time."],
          ["answer = llm.invoke(prompt).content.strip()", "Send the prompt and read the text of the reply."],
          ["if not answer:", "A safety check: an empty reply is a failure, not an answer."],
          '    print("The model returned an empty answer. Try again.")',
          "    sys.exit(1)",
          ['answered = not answer.lower().startswith(("i couldn\'t find", "i could not find"))', "Did the model find an answer in the context, or did it say 'not found'?"],
          'print(answer)',
          'print()',
          ["if answered:", "We only list sources when the documents really supported the answer."],
          '    for s in sources:',
          '        print(f"Source: {s[\'source\']} page {s[\'page\']} (similarity {s[\'similarity\']})")',
        ],
      },
      {
        title: "Send results to the lab screen",
        purpose: RESULT_NOTE,
        lines: ['print("__RESULT__", json.dumps({"question": QUESTION, "answer": answer, "prompt": prompt, "sources": sources, "skipped_llm": False, "answered": answered}))'],
      },
    ],
    activity: "Run the full RAG pipeline and get a real answer from llama3.2.",
    quiz: [
      {
        q: "In RAG, what is the 'context'?",
        options: ["The chat history", "The retrieved chunks added to the prompt", "The model's training data", "The PDF file name"],
        answer: 1,
        explain: "Context is the set of retrieved chunks we place in the prompt so the model answers from them.",
      },
      {
        q: "Why tell the model to answer ONLY from the context?",
        options: ["To make answers longer", "To keep answers grounded in the documents and avoid made-up facts", "Because llama3.2 has no knowledge", "To speed up ChromaDB"],
        answer: 1,
        explain: "Restricting the model to the context reduces hallucinations and makes answers traceable to sources.",
      },
      {
        q: "No chunk is similar enough to the question. What should a good RAG system do?",
        options: ["Guess an answer", "Say it couldn't find the answer in the documents", "Pick a random chunk", "Crash"],
        answer: 1,
        explain: "An honest 'not found' is better than an invented answer.",
      },
    ],
  },
  {
    id: 6,
    title: "Your RAG Chatbot",
    short: "Build and use your own chatbot",
    goal: "Create and use your own real RAG chatbot.",
    robot: "This is your chatbot. Add your PDFs and ask away!",
    intro: [
      "You now know every part of RAG. In this final stage you build your own chatbot from your own PDFs.",
      "Add documents, build your knowledge base, then ask questions. Answers come from llama3.2 running on your computer and show the source pages.",
      "The chatbot only uses the PDFs you upload. If they do not contain the answer, it says so instead of inventing one.",
    ],
    learn: [
      "Indexing: PDFs → text → chunks → embeddings → ChromaDB (done once, or when documents change).",
      "Answering: question → embedding → retrieval → prompt → llama3.2 → answer with sources.",
      "When you add or remove documents, rebuild the knowledge base so the vectors match.",
      "The conversation is saved, so the chatbot can follow a short exchange. You can clear it at any time.",
      "Your documents, vectors and conversation stay on this computer.",
    ],
    flow: ["PDFs", "Chunks", "Embeddings", "ChromaDB", "Retrieve", "llama3.2", "Answer"],
    concepts: [
      { term: "Knowledge base", text: "Your 'chatbot' collection in ChromaDB: every chunk of every PDF you uploaded, with its vector, file name and page." },
      { term: "Rebuild", text: "Read, chunk and embed every document again, so the knowledge base matches your current files and settings." },
      { term: "Not found", text: "When no passage is close enough to the question, the chatbot replies that it couldn't find enough information, with no sources." },
    ],
    needsDocument: false,
    params: [],
    blocks: [
      {
        title: "Build the knowledge base (indexing)",
        purpose: "This is what the local lab server does when you press 'Build knowledge base'.",
        lines: [
          ['client = chromadb.PersistentClient(path="chroma")', "Your chatbot's own database folder."],
          ['collection = client.create_collection("chatbot", metadata={"hnsw:space": "cosine"})', "A fresh collection on every rebuild."],
          "splitter = RecursiveCharacterTextSplitter(chunk_size=chunk_size, chunk_overlap=chunk_overlap)",
          ["for document in documents:", "Every PDF you uploaded."],
          ["    reader = PdfReader(document.path)", ""],
          ["    for page_number, page in enumerate(reader.pages, start=1):", "Page by page, so sources can show page numbers."],
          ['        for i, chunk in enumerate(splitter.split_text(page.extract_text() or "")):', ""],
          ["            vector = embedder.embed_documents([chunk])[0]", "The real server embeds in batches of 32 for speed."],
          ['            collection.add(ids=[f"{document.id}-p{page_number}-c{i}"], documents=[chunk], embeddings=[vector],', ""],
          ['                           metadatas=[{"filename": document.filename, "page": page_number}])', "Remember file and page for every chunk."],
        ],
      },
      {
        title: "Answer a question",
        purpose: "This runs every time you send a message.",
        lines: [
          ["results = collection.query(query_embeddings=[embedder.embed_query(question)], n_results=top_k)", "Retrieve the Top-K chunks."],
          ['context = "\\n\\n".join(f"[{m[\'filename\']} p.{m[\'page\']}]\\n{d}" for d, m in zip(results["documents"][0], results["metadatas"][0]))', "Label each chunk with file and page."],
          ['system = "Answer ONLY from the context. If it is not there, reply: I couldn\'t find enough information in your documents to answer that."', "The grounding rule: use the documents, or say you can't."],
          ['answer = llm.invoke([("system", system), ("user", f"Context:\\n{context}\\n\\nQuestion: {question}")]).content', "llama3.2 writes the answer."],
          ["history.append({\"question\": question, \"answer\": answer, \"sources\": results[\"metadatas\"][0]})", "Saved to your private conversation history."],
        ],
      },
    ],
    activity: "Build your knowledge base and get an answer from your own chatbot.",
    quiz: [
      {
        q: "You added a new PDF. What must you do before asking about it?",
        options: ["Nothing", "Rebuild the knowledge base", "Restart Ollama", "Clear the chat history"],
        answer: 1,
        explain: "New documents must be chunked, embedded and stored — that's what rebuilding does.",
      },
      {
        q: "Which order is correct for answering a question?",
        options: [
          "LLM → retrieval → embedding",
          "Embedding the question → retrieval → prompt with context → LLM answer",
          "Chunking → LLM → ChromaDB",
          "Answer → question → sources",
        ],
        answer: 1,
        explain: "The question is embedded, similar chunks are retrieved, put into a prompt, and the LLM writes the answer.",
      },
      {
        q: "Why show sources (file and page) with each answer?",
        options: ["It looks nice", "So users can check the answer against the original document", "It makes answers faster", "Ollama requires it"],
        answer: 1,
        explain: "Sources make answers verifiable — a key benefit of RAG over a plain chatbot.",
      },
    ],
  },
];

export function getStage(id: number): Stage | undefined {
  return STAGES.find((s) => s.id === id);
}

export function lineText(l: CodeLine): string {
  return typeof l === "string" ? l : l[0];
}

export function lineNote(l: CodeLine): string | null {
  return typeof l === "string" ? null : l[1] || null;
}

export type ParamValues = Record<string, string | number>;

/** Python literal for a value: JSON strings are valid Python string literals. */
export function pyLiteral(v: string | number): string {
  return typeof v === "number" ? String(v) : JSON.stringify(v);
}

export function fillTokens(text: string, values: ParamValues): string {
  return text.replace(/@@([A-Z_]+)@@/g, (_, k: string) => (k in values ? pyLiteral(values[k]!) : `None  # ${k} not set`));
}

export function buildScript(stage: Stage, values: ParamValues): string {
  return stage.blocks
    .map((b) => `# --- ${b.title} ---\n` + b.lines.map((l) => fillTokens(lineText(l), values)).join("\n"))
    .join("\n\n");
}

export function defaultParams(stage: Stage): ParamValues {
  return Object.fromEntries(stage.params.map((p) => [p.key, p.default]));
}
