# ContextForge — Self-Growing AI Project Memory OS

ContextForge is an **AI-first, self-growing project memory operating system** for any AI model, coding agent, or project codebase. 

It keeps a persistent external "brain" for your projects by storing knowledge as structured Markdown files, tracking non-negotiable architectural constraints, detecting conflicting requirements, and auto-compiling concise context envelopes directly prepared for Cursor, Copilot, or general coding agents.

---

## 🚀 How to Run Locally (After Cloning from GitHub)

If you have downloaded or cloned ContextForge to run on your local machine, follow these steps to connect and see your own notes/codebase.

### 1. Installation & Environment Configuration
Ensure you have [Node.js](https://nodejs.org/) installed, then set up the workspace:

```bash
# Install required dependencies
npm install

# Copy the environment file
cp .env.example .env
```

Open `.env` in your editor and provide your own Gemini API Key:
```env
# Get yours from https://aistudio.google.com/
GEMINI_API_KEY="AIzaSyYourKeyHere..."
```

### 2. Boot Up the Memory OS Server
Start the Express API server and the Vite SPA frontend:
```bash
npm run dev
```
Open your browser and navigate to the address shown (usually `http://localhost:3000`).

---

## 🔌 Connecting & Viewing Your Own Codebase & Notes

ContextForge is built to index your actual work, not just default mock data. To connect your own project directory:

1. Click on the **`New`** button next to the project sector dropdown in the header of the app.
2. Under **`Connect Local Codebase / Folder Path`**, specify the absolute path on your filesystem (e.g. `/Users/dev/my-brand-new-react-app` or relative path `.` to index ContextForge itself).
3. Tap **`Bootstrap Project`**. 
4. Head to the **Code Scanner** tab and hit **Scan Codebase**. ContextForge will crawl your project files, map imports, analyze potential risks, and generate visual nodes in the **Knowledge Galaxy**!
5. Now you can feed raw inputs under the **Cognitive Ingestor** tab, update your `Project Soul` (governance files), and query your codebase memory dynamically.

---

## 🛠 Features Matrix

*   **Knowledge Galaxy**: An interactive infinite-view physics-directed canvas where documents, code files, claims, and identified contradictions float and link like stars.
*   **Cognitive Ingestor Hub**: Feed raw instructions, client feedback, or bug reports. Our self-growing AI loop extracts claims, creates/updates Markdown wiki notes, and maps relational graph links automatically.
*   **Contradiction Harness**: Raises alerts if two specs or requirements conflict with each other (e.g., mobile thumbnail layouts). Enables overwriting override resolutions directly in the UI.
*   **Agent Context Envelope**: Enter any task (e.g., "Fix gallery swiping layout") to dynamically package non-negotiable soul directives, active bugs, and relevant source file pointers into a single compact context block to paste into Cursor/Copilot instructions.
*   **Markdown Source of Truth**: All memories are stored cleanly in your local directory as Obsidian-compatible markdown notes under `/local_workspace_memory` with custom YAML frontmatters and wikilinks. Rebuildable at any point!

---

*Made with 💖 by Rituraj Bharti.*
