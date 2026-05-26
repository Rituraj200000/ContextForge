import express from "express";
import path from "path";
import dns from "dns";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import * as dotenv from "dotenv";
import fs from "fs/promises";
import { MemoryEngine } from "./src/core/memory-engine.js";
import { Claim, Contradiction, IngestionResult, CodeIndex } from "./src/types.js";

// Load environment files
dotenv.config();

const app = express();
const PORT = 3000;

// Set up Google GenAI
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

const engine = new MemoryEngine();

app.use(express.json());

// Initialize codebase memory directories and sample demonstration files
engine.init().then(() => {
  console.log("Memory engine successfully booted up.");
});

// ============================================
// PROJECT MANAGEMENT APIS
// ============================================

app.get("/api/projects", async (req, res) => {
  try {
    const projects = await engine.listProjects();
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: "Failed to list projects" });
  }
});

app.post("/api/projects", async (req, res) => {
  try {
    const { id, name, description, localPath } = req.body;
    if (!id || !name) {
      return res.status(400).json({ error: "id and name are required parameters." });
    }
    const slug = id.toLowerCase().replace(/[^a-z0-9_-]/g, "-");
    const project = await engine.createProject(slug, name, description || "", localPath);
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: "Failed to create project" });
  }
});

app.get("/api/projects/:projectId/memory", async (req, res) => {
  try {
    const { projectId } = req.params;
    const notes = await engine.getAllNotes(projectId);
    const claims = await engine.readClaims(projectId);
    const contradictions = await engine.readContradictions(projectId);
    const codeIndex = await engine.readCodeIndex(projectId);

    res.json({
      notes,
      claims,
      contradictions,
      codeIndex
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to load project memory files" });
  }
});

app.post("/api/projects/:projectId/notes", async (req, res) => {
  try {
    const { projectId } = req.params;
    const { relPath, content } = req.body;
    if (!relPath || !content) {
      return res.status(400).json({ error: "relPath and content are required." });
    }
    await engine.writeNote(projectId, relPath, content);
    res.json({ status: "success", written: relPath });
  } catch (error) {
    res.status(500).json({ error: "Failed to save note" });
  }
});

app.get("/api/projects/:projectId/graph", async (req, res) => {
  try {
    const { projectId } = req.params;
    const graphData = await engine.buildProjectGraph(projectId);
    res.json(graphData);
  } catch (error) {
    console.error("Failed to build project graph:", error);
    res.status(500).json({ error: "Failed to construct project network graph" });
  }
});

// ============================================
// DYNAMIC MULTI-PROVIDER LLM ABSTRACTION
// ============================================

function cleanJsonString(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  return cleaned.trim();
}

async function callLLM(
  provider: string,
  apiKey: string,
  model: string,
  endpoint: string,
  systemPrompt: string,
  isJson: boolean
): Promise<string> {
  const selectedProvider = (provider || "gemini").toLowerCase();

  if (selectedProvider === "gemini") {
    const geminiKey = apiKey || process.env.GEMINI_API_KEY || "";
    if (!geminiKey) {
      throw new Error("Gemini API Key is missing. Please select another provider or add your key.");
    }
    const localAi = new GoogleGenAI({
      apiKey: geminiKey,
      httpOptions: {
        headers: { "User-Agent": "aistudio-build" }
      }
    });
    
    const targetModel = model || "gemini-3.5-flash";
    const response = await localAi.models.generateContent({
      model: targetModel,
      contents: systemPrompt,
      config: isJson ? { responseMimeType: "application/json" } : undefined
    });
    return response.text || "";
  }

  if (selectedProvider === "openai") {
    const openaiKey = apiKey || process.env.OPENAI_API_KEY || "";
    if (!openaiKey) {
      throw new Error("OpenAI API Key is missing. Please configure it in Settings.");
    }
    const targetModel = model || "gpt-4o-mini";
    const targetUrl = endpoint || "https://api.openai.com/v1/chat/completions";

    let fetchUrl = targetUrl;
    if (!fetchUrl.endsWith("/chat/completions") && !fetchUrl.endsWith("/completions")) {
      fetchUrl = fetchUrl.replace(/\/?$/, "/chat/completions");
    }

    const payload = {
      model: targetModel,
      messages: [{ role: "user", content: systemPrompt }],
      response_format: isJson ? { type: "json_object" } : undefined
    };

    const res = await fetch(fetchUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI API failed: ${res.statusText} - ${errText}`);
    }

    const resData: any = await res.json();
    return resData.choices?.[0]?.message?.content || "";
  }

  if (selectedProvider === "anthropic") {
    const anthropicKey = apiKey || process.env.ANTHROPIC_API_KEY || "";
    if (!anthropicKey) {
      throw new Error("Anthropic API Key is missing. Please configure it in Settings.");
    }
    const targetModel = model || "claude-3-5-sonnet-20241022";
    const targetUrl = endpoint || "https://api.anthropic.com/v1/messages";

    const payload = {
      model: targetModel,
      max_tokens: 4096,
      messages: [{ role: "user", content: systemPrompt }]
    };

    const res = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Anthropic API failed: ${res.statusText} - ${errText}`);
    }

    const resData: any = await res.json();
    return resData.content?.[0]?.text || "";
  }

  if (selectedProvider === "openrouter") {
    const openrouterKey = apiKey || process.env.OPENROUTER_API_KEY || "";
    if (!openrouterKey) {
      throw new Error("OpenRouter API Key is missing. Please configure it in Settings.");
    }
    const targetModel = model || "google/gemini-2.5-flash";
    const targetUrl = endpoint || "https://openrouter.ai/api/v1/chat/completions";

    const payload = {
      model: targetModel,
      messages: [{ role: "user", content: systemPrompt }],
      response_format: isJson ? { type: "json_object" } : undefined
    };

    const res = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openrouterKey}`,
        "HTTP-Referer": "https://contextforge.local",
        "X-Title": "ContextForge"
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenRouter API failed: ${res.statusText} - ${errText}`);
    }

    const resData: any = await res.json();
    return resData.choices?.[0]?.message?.content || "";
  }

  if (selectedProvider === "local") {
    const defaultEndpoint = "http://localhost:11434/v1";
    const targetUrl = endpoint || process.env.LOCAL_MODEL_ENDPOINT || defaultEndpoint;
    const targetModel = model || "mistral";

    let fetchUrl = targetUrl;
    if (!fetchUrl.endsWith("/chat/completions") && !fetchUrl.endsWith("/completions")) {
      fetchUrl = fetchUrl.replace(/\/?$/, "/chat/completions");
    }

    const payload = {
      model: targetModel,
      messages: [{ role: "user", content: systemPrompt }],
      response_format: isJson ? { type: "json_object" } : undefined
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const res = await fetch(fetchUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Local model endpoint failed: ${res.statusText} - ${errText}`);
    }

    const resData: any = await res.json();
    return resData.choices?.[0]?.message?.content || "";
  }

  throw new Error(`Unsupported AI Provider: "${provider}". Choose Gemini, OpenAI, Anthropic, OpenRouter, or Local.`);
}

// ============================================
// SELF-GROWING COGNITIVE INGESTION APIS
// ============================================

app.post("/api/projects/:projectId/ingest", async (req, res) => {
  try {
    const { projectId } = req.params;
    const { 
      input, 
      source_type, 
      ai_provider, 
      api_key, 
      custom_model, 
      api_endpoint 
    } = req.body;

    if (!input) {
      return res.status(400).json({ error: "Input text is required for ingestion." });
    }

    // Read current memory documents for context
    const currentNotes = await engine.getAllNotes(projectId);
    const currentClaims = await engine.readClaims(projectId);
    const notesSummary = currentNotes.map(n => `- ID: ${n.metadata.id}, Title: ${n.metadata.title}, Type: ${n.metadata.type}\nContent Snippet: ${n.content.substring(0, 150)}...`).join("\n\n");
    const claimsSummary = currentClaims.map(c => `- Claim ${c.claim_id}: "${c.text}" [Linked: ${c.linked_notes.join(", ")}]`).join("\n");

    const systemPrompt = `You are the core Cognitive Ingestion Agent of ContextForge (a self-growing project memory OS).
Your target is to parse new input, extract facts, update relevant long-term markdown memories, define key claims, and flag contradictions.

The active project is: "${projectId}".
Here is what we currently know about this project:
=== EXISTING NOTES ===
${notesSummary}

=== EXISTING VERIFIED CLAIMS ===
${claimsSummary}

=== USER NEW INPUT ===
"${input}"
Input Source Type: "${source_type || "user_input"}"

=== YOUR INSTRUCTION ===
Analyze the input.
1. Determine what existing memory notes must be UPDATED (especially SOUL.md, CRITICAL_FACTS.md, DECISIONS.md, CHANGELOG.md, CURRENT_STATE.md, or custom wiki notes e.g., "wiki/features/xxx.md").
2. Determine if a new custom wiki note should be CREATED to store this feature detail.
3. Extract precise "Claims" (underlying rules or assertions like "Mobile thumbnails appear below").
4. Check if the user's input CONTRADICTS any existing claim or note!
   If a contradiction exists:
   - Formulate a Contradiction object (status "open", assign severity).
   - Flag it so the user can resolve or confirm.
5. Create professional "Thinking Logs" describing your cognitive progression layers (Layer 1: Input Analysis, Layer 2: Contradiction Check, Layer 3: Memory Routing).

Return a single JSON object strictly matching the following JSON schema:
{
  "message": "A supportive human-readable summary of what changes you have executed and why.",
  "thinkingLogs": [
    { "title": "...", "message": "...", "layer": 1 }
  ],
  "actions": [
    {
      "type": "create_note" | "update_note" | "merge_note" | "archive_note" | "create_claim" | "flag_contradiction" | "update_index",
      "target": "wiki/features/example.md",
      "reason": "Why this action is needed"
    }
  ],
  "notesUpdated": [
    {
      "id": "wiki/features/filename.md",
      "title": "Title of file (keep simple)",
      "type": "soul" | "project_core" | "critical_fact" | "current_state" | "decision" | "bug" | "feature" | "research",
      "status": "active",
      "tags": ["#tag1", "#tag2"],
      "content": "A high-quality Markdown template covering these requirements, fully detailed, formatted elegantly with lists."
    }
  ],
  "claims": [
    {
      "claim_id": "string",
      "text": "The precise assertion extracted",
      "status": "active",
      "confidence": 0.95,
      "source_type": "${source_type || "user_input"}",
      "linked_notes": ["wiki/features/example.md"]
    }
  ],
  "contradictions": [
    {
      "id": "contra_unique_id",
      "old_claim": "The exact wording of the old conflicting claim",
      "new_claim": "The conflicting assertion inside the new input",
      "severity": "high" | "medium" | "low",
      "resolution": "Proposed compromise or resolution detail"
    }
  ]
}

CRITICAL: Return ONLY complete executable JSON. Do not wrap in markdown \`\`\`json blocks in your raw text.`;

    const provider = ai_provider || process.env.DEFAULT_PROVIDER || "gemini";
    const apiKey = api_key || "";
    const model = custom_model || "";
    const endpoint = api_endpoint || "";

    const outputText = await callLLM(provider, apiKey, model, endpoint, systemPrompt, true);
    const cleanedOutput = cleanJsonString(outputText);
    const resultObj: IngestionResult = JSON.parse(cleanedOutput);

    // 1. Process Actions: Save updated or created notes to Markdown
    if (resultObj.notesUpdated && resultObj.notesUpdated.length > 0) {
      for (const updatedNote of resultObj.notesUpdated) {
        // Construct markdown with YAML frontmatter
        const dateStr = new Date().toISOString().split("T")[0];
        const yamlFrontmatter = `---
id: "${updatedNote.id}"
title: "${updatedNote.title}"
type: "${updatedNote.type}"
status: "${updatedNote.status || "active"}"
project: "${projectId}"
recency_marker: "${dateStr}"
confidence_score: 0.95
tags: ${JSON.stringify(updatedNote.tags || [])}
source_type: "${source_type || "user_input"}"
verification_status: "verified"
---

${updatedNote.content}
`;
        await engine.writeNote(projectId, updatedNote.id, yamlFrontmatter);
      }
    }

    // Update changelog dynamically with a small record
    try {
      const dateStr = new Date().toISOString().split("T")[0];
      const changelogPath = "CHANGELOG.md";
      let existingChangelog = "";
      try {
        existingChangelog = await fs.readFile(path.join("./local_workspace_memory", projectId, changelogPath), "utf-8");
      } catch {
        // Ignored
      }
      if (existingChangelog) {
        // Append entry
        const appendText = `\n- **${dateStr}**: Auto-ingested user requirements and synthesized factual links. Details: ${resultObj.message.substring(0, 100)}...`;
        await fs.writeFile(path.join("./local_workspace_memory", projectId, changelogPath), existingChangelog + appendText, "utf-8");
      }
    } catch (e) {
      console.error("Failed to append changelog entry:", e);
    }

    // 2. Align Claims
    if (resultObj.claims && resultObj.claims.length > 0) {
      const mergedClaims = [...currentClaims];
      for (const reqClaim of resultObj.claims) {
        // Assign unique id if missing
        if (!reqClaim.claim_id) {
          reqClaim.claim_id = "claim_" + Math.random().toString(36).substring(2, 9);
        }
        mergedClaims.push(reqClaim);
      }
      await engine.writeClaims(projectId, mergedClaims);
    }

    // 3. Align Contradictions
    if (resultObj.contradictions && resultObj.contradictions.length > 0) {
      const currentContradictions = await engine.readContradictions(projectId);
      const mergedContras = [...currentContradictions];
      for (const contra of resultObj.contradictions) {
        mergedContras.push({
          ...contra,
          detectedAt: new Date().toISOString(),
          status: "open"
        });
      }
      await engine.writeContradictions(projectId, mergedContras);
    }

    res.json(resultObj);
  } catch (error: any) {
    console.error("Ingestion error:", error);
    res.status(500).json({ error: error.message || "Failed to ingest project information" });
  }
});

// Resolving a contradiction manually
app.post("/api/projects/:projectId/contradictions/:contraId/resolve", async (req, res) => {
  try {
    const { projectId, contraId } = req.params;
    const { resolutionText, removeClaimId } = req.body;

    const list = await engine.readContradictions(projectId);
    const updatedContras = list.map(c => {
      if (c.id === contraId) {
        return { ...c, status: "resolved" as const, resolution: resolutionText };
      }
      return c;
    });
    await engine.writeContradictions(projectId, updatedContras);

    if (removeClaimId) {
      const claims = await engine.readClaims(projectId);
      const filteredClaims = claims.map(c => {
        if (c.claim_id === removeClaimId) {
          return { ...c, status: "archived" };
        }
        return c;
      });
      await engine.writeClaims(projectId, filteredClaims);
    }

    res.json({ status: "success", resolved: contraId });
  } catch (error) {
    res.status(500).json({ error: "Failed to resolve contradiction" });
  }
});

// ============================================
// AI SEMANTIC CHAT & RETRIEVAL APIS
// ============================================

app.post("/api/projects/:projectId/query", async (req, res) => {
  try {
    const { projectId } = req.params;
    const { 
      prompt, 
      chatHistory,
      ai_provider,
      api_key,
      custom_model,
      api_endpoint
    } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required." });
    }

    const notes = await engine.getAllNotes(projectId);
    const claims = await engine.readClaims(projectId);
    const codeIndex = await engine.readCodeIndex(projectId);

    // 1. Keyword search to extract context
    const lowerPrompt = prompt.toLowerCase();
    const matchedNotes = notes.filter(note => {
      return (
        note.metadata.title.toLowerCase().includes(lowerPrompt) ||
        note.content.toLowerCase().includes(lowerPrompt) ||
        note.metadata.tags.some(t => t.toLowerCase().includes(lowerPrompt))
      );
    }).slice(0, 5); // top 5 notes

    // 2. Fetch critical guardrail
    const soulNote = notes.find(n => n.metadata.type === "soul");
    const soulContext = soulNote ? soulNote.content : "No primary Project Rule registry.";

    // 3. Structure context bundle
    const notesContextStr = matchedNotes.map(n => `### Note: ${n.metadata.id} (${n.metadata.title})
Type: ${n.metadata.type}
Tags: ${n.metadata.tags.join(", ")}
${n.content}`).join("\n\n");

    const claimsContextStr = claims.filter(c => c.status === "active")
      .map(c => `- Claim ${c.claim_id}: "${c.text}" (linked: ${c.linked_notes.join(", ")})`).join("\n");

    const systemPrompt = `You are the primary "Writer Agent" of ContextForge, a project memory OS.
Answering the developer's question about the active workspace: "${projectId}".

Use the retrieved memory documents and verified requirements rules below to formulate your answer.
Always trace back to the project Soul rulebook to avoid over-engineering. Keep answer highly practical, scannable, and clean!

=== non-negotiable PROJECT SOUL ===
${soulContext}

=== RETRIEVED MEMORY KNOWLEDGE ===
${notesContextStr || "No direct matching memory notes found."}

=== VERIFIED ARCHITECTURE CLAIMS ===
${claimsContextStr || "No matching factual claims recorded."}

=== PREVIOUS CONVERSATION HISTORY ===
${(chatHistory || []).map((m: any) => `${m.sender.toUpperCase()}: ${m.text}`).join("\n")}

USER QUESTION: "${prompt}"

Provide a comprehensive, styled, professional Markdown response. Highlight matched requirements or risk notes.`;

    const provider = ai_provider || process.env.DEFAULT_PROVIDER || "gemini";
    const apiKey = api_key || "";
    const model = custom_model || "";
    const endpoint = api_endpoint || "";

    const textAnswer = await callLLM(provider, apiKey, model, endpoint, systemPrompt, false);

    res.json({
      answer: textAnswer,
      retrievedContext: {
        notes: matchedNotes.map(n => ({ id: n.metadata.id, title: n.metadata.title, snippet: n.content.substring(0, 150) + "..." })),
        claims: claims.filter(c => c.status === "active" && lowerPrompt.split(" ").some(w => w.length > 3 && c.text.toLowerCase().includes(w))).map(c => c.text),
        riskWarnings: notes.filter(n => n.metadata.type === "bug").map(n => n.metadata.title)
      }
    });

  } catch (error: any) {
    console.error("Query error:", error);
    res.status(500).json({ error: error.message || "Failed to process query against project memory" });
  }
});

// ============================================
// CODEBASE MAPPING & SCANNING APIS
// ============================================

app.post("/api/projects/:projectId/scan-code", async (req, res) => {
  try {
    const { projectId } = req.params;
    
    const projects = await engine.listProjects();
    const project = projects.find(p => p.id === projectId);
    const targetPath = (project && project.localPath) ? project.localPath : "./src";
    const codeIndex: CodeIndex = {};

    const recurseScan = async (dir: string) => {
      try {
        const list = await fs.readdir(dir, { withFileTypes: true });
        for (const file of list) {
          const fullPath = path.join(dir, file.name);
          const relPath = path.relative(targetPath, fullPath).replace(/\\/g, "/");

          if (file.isDirectory()) {
            if (
              file.name !== "node_modules" && 
              file.name !== "dist" && 
              file.name !== ".git" && 
              file.name !== ".next" && 
              file.name !== "build" && 
              file.name !== "local_workspace_memory"
            ) {
              await recurseScan(fullPath);
            }
          } else if (
            file.name.endsWith(".tsx") || 
            file.name.endsWith(".ts") || 
            file.name.endsWith(".jsx") || 
            file.name.endsWith(".js") || 
            file.name.endsWith(".css")
          ) {
            // Read lines to guess imports/exports
            const content = await fs.readFile(fullPath, "utf-8");
            const imports: string[] = [];
            const exports: string[] = [];
            
            // Basic regex imports
            const importRegex = /import\s+.*?from\s+['"](.*?)['"]/g;
            let m;
            while ((m = importRegex.exec(content)) !== null) {
              imports.push(m[1]);
            }

            // Basic exports extraction
            const exportRegex = /export\s+(const|interface|type|default|function|class)\s+(\w+)/g;
            while ((m = exportRegex.exec(content)) !== null) {
              exports.push(m[2]);
            }

            const isRisky = content.includes("process.env") || content.includes("localStorage") || content.includes("dangerouslySetInnerHTML");

            codeIndex[relPath] = {
              type: file.name.endsWith(".tsx") ? "component" : file.name.endsWith(".css") ? "style" : "logical",
              framework: file.name.endsWith(".tsx") || file.name.endsWith(".jsx") ? "React" : "TypeScript",
              exports: exports.slice(0, 5),
              imports: imports.filter(imp => !imp.startsWith(".") && imp.length < 25).slice(0, 5),
              risk_level: isRisky ? "high" : "low",
              related_styles: content.includes("import './index.css'") ? ["src/index.css"] : [],
              related_notes: []
            };
          }
        }
      } catch (e) {
        console.error("Error reading dir", e);
      }
    };

    await recurseScan(targetPath);

    // Save scan to code index
    await engine.writeCodeIndex(projectId, codeIndex);

    res.json({
      status: "success",
      totalMapped: Object.keys(codeIndex).length,
      index: codeIndex
    });

  } catch (error) {
    console.error("Code scan failed:", error);
    res.status(500).json({ error: "Failed to scan codebase layout" });
  }
});

app.post("/api/projects/:projectId/coding-context", async (req, res) => {
  try {
    const { projectId } = req.params;
    const { task } = req.body;

    if (!task) {
      return res.status(400).json({ error: "Task description is required." });
    }

    const notes = await engine.getAllNotes(projectId);
    const codeIndex = await engine.readCodeIndex(projectId);
    const claims = await engine.readClaims(projectId);

    // Filter relevant files
    const relevantFiles = Object.keys(codeIndex).filter(filePath => {
      const parts = filePath.toLowerCase().replace(/\./g, " ").split("/");
      return task.toLowerCase().split(" ").some((word: string) => word.length > 3 && parts.includes(word));
    }).slice(0, 5);

    // Filter relevant rules
    const soul = notes.find(n => n.metadata.type === "soul")?.content || "";
    const relevantClaims = claims.filter(c => c.status === "active").map(c => `- ${c.text}`);

    const contextResult = {
      task,
      projectSoul: soul.substring(0, 1000),
      detectedFiles: relevantFiles,
      verifiedRules: relevantClaims,
      promptSnippet: `=== CONTEXTFORGE CODING ENVELOPE ===
Active Project: ${projectId}
Soul Directives:
${soul.substring(0, 600)}

Verified Functional Rules:
${relevantClaims.join("\n")}

Identified Code Modules:
${relevantFiles.map(f => `- ${f}`).join("\n")}

Please execute the following command precisely inside the bounds of the specified constraints:
"${task}"`
    };

    res.json(contextResult);

  } catch (error) {
    res.status(500).json({ error: "Failed to generate context budget." });
  }
});

// ============================================
// SERVER ORCHESTRATION & VITE STATIC SERVING
// ============================================

async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`ContextForge running on port ${PORT}`);
  });
}

start();
export default app;
