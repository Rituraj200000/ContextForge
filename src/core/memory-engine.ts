import fs from "fs/promises";
import path from "path";
import { 
  MemoryNote, 
  MemoryNoteMetadata, 
  MemoryNoteType, 
  MemoryNodeStatus,
  ProjectGraph,
  GraphNode,
  GraphLink,
  CodeIndex,
  Contradiction,
  Claim,
  Project
} from "../types.js";

const DEFAULT_METADATA_DIR = "./local_workspace_memory";

export class MemoryEngine {
  private baseDir: string;

  constructor(baseDir: string = DEFAULT_METADATA_DIR) {
    this.baseDir = baseDir;
  }

  // Ensure directories exist and populate with demo projects if empty
  async init(): Promise<void> {
    try {
      await fs.mkdir(this.baseDir, { recursive: true });
      const projects = await this.listProjects();
      if (projects.length === 0) {
        await this.createDemoProject("shopify-store", "Shopify E-Commerce Store", "Memory and rules for a premium Shopify PDP gallery project.");
        await this.createDemoProject("ai-customer-agent", "Autonomous AI Support Bot", "Knowledge hub and prompt workspace for an AI support system.");
      }
    } catch (error) {
      console.error("Failed to initialize memory engine workspace:", error);
    }
  }

  async listProjects(): Promise<Project[]> {
    try {
      const entries = await fs.readdir(this.baseDir, { withFileTypes: true });
      const projects: Project[] = [];

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const configPath = path.join(this.baseDir, entry.name, "project-info.json");
          try {
            const data = await fs.readFile(configPath, "utf-8");
            projects.push(JSON.parse(data));
          } catch {
            // Fallback project details
            const stats = await fs.stat(path.join(this.baseDir, entry.name));
            projects.push({
              id: entry.name,
              name: entry.name.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
              description: "No description available",
              createdAt: stats.birthtime.toISOString(),
              updatedAt: stats.mtime.toISOString()
            });
          }
        }
      }
      return projects;
    } catch {
      return [];
    }
  }

  async createProject(id: string, name: string, description: string, localPath?: string): Promise<Project> {
    const projectDir = path.join(this.baseDir, id);
    await fs.mkdir(projectDir, { recursive: true });
    await fs.mkdir(path.join(projectDir, "wiki"), { recursive: true });
    await fs.mkdir(path.join(projectDir, "wiki", "features"), { recursive: true });
    await fs.mkdir(path.join(projectDir, "wiki", "bugs"), { recursive: true });
    await fs.mkdir(path.join(projectDir, "wiki", "design"), { recursive: true });

    const now = new Date().toISOString();
    const project: Project = {
      id,
      name,
      description,
      createdAt: now,
      updatedAt: now,
      localPath
    };

    await fs.writeFile(
      path.join(projectDir, "project-info.json"),
      JSON.stringify(project, null, 2),
      "utf-8"
    );

    // Bootstrap standard core memory files
    await this.bootstrapCoreFiles(id, name, description);

    return project;
  }

  private async bootstrapCoreFiles(projectId: string, name: string, description: string): Promise<void> {
    const pD = (f: string) => path.join(this.baseDir, projectId, f);
    const dateStr = new Date().toISOString().split("T")[0];

    // SOUL.md - Strict core instructions
    const soulMd = `---
id: "SOUL.md"
title: "Project Soul"
type: "soul"
status: "active"
project: "${projectId}"
recency_marker: "${dateStr}"
confidence_score: 1.0
tags: ["#soul", "#governance", "#rules"]
source_type: "user_definition"
verification_status: "verified"
---

# Project Soul - Non-Negotiable Governance Layer

## Purpose
${description}

## Core Guardrails
1. **Always Follow UI Cleanliness**: Maintain elegant spaces, balanced colors, and legible margins. Avoid high-contrast blinking sections unless requested.
2. **Follow Type-Safety Strictly**: Write clear TypeScript interfaces, avoiding the 'any' type. Declare types early.
3. **Never Destructively Overwrite Working Behaviors**: Respect established functional elements. Incremental edits are preferred.
4. **Client-side API Safeguards**: Never make public raw keys on browsers. Keep logic routed serverside.

## Instructions for AI Agents
You are a context-informed agent working on the project "${name}". Read and respect this governance structure before writing/editing code. Keep code simple and reliable.
`;

    // PROJECT.md
    const projectMd = `---
id: "PROJECT.md"
title: "Project Architecture & Boundaries"
type: "project_core"
status: "active"
project: "${projectId}"
recency_marker: "${dateStr}"
confidence_score: 0.95
tags: ["#architecture", "#manifest", "#general"]
source_type: "system_generated"
---

# Project Overview & Visual Map

## Architecture Stack
- **Languages**: TypeScript, HTML5, CSS3
- **Framework**: Vite, React
- **Styles**: Tailwind CSS
- **Layouts**: Responsive screen configurations

## Core Entrypoints
- \`src/main.tsx\` - Application entry booster
- \`src/App.tsx\` - Main hub
- \`server.ts\` - API routing server

## Expected Deliverables
A self-contained, production-ready full-stack layout showcasing visual quality and seamless interaction mechanics.
`;

    // CRITICAL_FACTS.md
    const criticalFactsMd = `---
id: "CRITICAL_FACTS.md"
title: "Critical Project Facts"
type: "critical_fact"
status: "active"
project: "${projectId}"
recency_marker: "${dateStr}"
confidence_score: 0.98
tags: ["#facts", "#critical", "#reference"]
source_type: "user_input"
---

# Critical Facts We Cannot Forget

These represent the absolute truth about implementation guidelines.

## Verified Fact Registry
- **UI Resolution**: Default design scales fluidly between standard viewport profiles.
- **Port Assignment**: External ingress maps strictly to **Port 3000**.
- **HMR Behavior**: Hot Module Replacement is disabled in sandbox; state is preserved manually.
`;

    // CURRENT_STATE.md
    const currentStateMd = `---
id: "CURRENT_STATE.md"
title: "Current Engineering State"
type: "current_state"
status: "active"
project: "${projectId}"
recency_marker: "${dateStr}"
confidence_score: 0.9
tags: ["#state", "#progress", "#milestones"]
source_type: "system_generated"
---

# Current Engineering & Feature Milestones

## Completed Milestones
- [x] Initial full-stack workspace initialization.
- [x] Setting up global style layouts and typography configurations.

## Active Works in Progress
- [ ] Compiling specific functional components for user dashboard systems.
- [ ] Integrating interactive memory models on backend.
`;

    // DECISIONS.md
    const decisionsMd = `---
id: "DECISIONS.md"
title: "Key Architecture Decisions"
type: "decision"
status: "active"
project: "${projectId}"
recency_marker: "${dateStr}"
confidence_score: 0.95
tags: ["#decisions", "#history"]
source_type: "user_input"
---

# Architecture Decisions (ADR Register)

## ADR-001: Separate Server API Endpoint Strategy
- **Status**: Accepted
- **Context**: Accessing model features safely in full-stack configurations requires private keys.
- **Decision**: Proxy all Gemini interactions through Express APIs. Do not expose GEMINI_API_KEY to browser bundles.
- **Consequences**: Easy maintenance and protected security.
`;

    // OPEN_QUESTIONS.md
    const openQuestionsMd = `---
id: "OPEN_QUESTIONS.md"
title: "Open Questions & Risks"
type: "decision"
status: "active"
project: "${projectId}"
recency_marker: "${dateStr}"
confidence_score: 0.8
tags: ["#questions", "#risks"]
source_type: "system_generated"
---

# Unresolved Questions & Implementation Risks

## High Priority Questions
1. *Performance scale*: What layout rendering model handles large graphs gracefully?
   - **Hypothesis**: HTML5 Canvas elements reduce browser DOM overhead cleanly.

## Key Risk Markers
- Exceeding Gemini context budget limits when importing rich codebases. Mitigate via prompt-budget filters.
`;

    // CHANGELOG.md
    const changelogMd = `---
id: "CHANGELOG.md"
title: "Project Changelog"
type: "current_state"
status: "active"
project: "${projectId}"
recency_marker: "${dateStr}"
confidence_score: 1.0
tags: ["#changelog", "#history"]
source_type: "system_generated"
---

# Project History Changelog

- **${dateStr}**: Boostrapped core memory files ('SOUL.md', 'PROJECT.md', 'CRITICAL_FACTS.md', 'CURRENT_STATE.md', 'DECISIONS.md', 'OPEN_QUESTIONS.md', 'CHANGELOG.md') automatically on project creation.
`;

    await fs.writeFile(pD("SOUL.md"), soulMd, "utf-8");
    await fs.writeFile(pD("PROJECT.md"), projectMd, "utf-8");
    await fs.writeFile(pD("CRITICAL_FACTS.md"), criticalFactsMd, "utf-8");
    await fs.writeFile(pD("CURRENT_STATE.md"), currentStateMd, "utf-8");
    await fs.writeFile(pD("DECISIONS.md"), decisionsMd, "utf-8");
    await fs.writeFile(pD("OPEN_QUESTIONS.md"), openQuestionsMd, "utf-8");
    await fs.writeFile(pD("CHANGELOG.md"), changelogMd, "utf-8");

    // Create a dummy JSON for claims, contradictions, and code index
    await fs.writeFile(pD("claim-index.json"), "[]", "utf-8");
    await fs.writeFile(pD("contradictions.json"), "[]", "utf-8");
    await fs.writeFile(pD("code-index.json"), "{}", "utf-8");
  }

  async createDemoProject(projectId: string, name: string, description: string): Promise<void> {
    await this.createProject(projectId, name, description);
    const pD = (f: string) => path.join(this.baseDir, projectId, f);
    const dateStr = new Date().toISOString().split("T")[0];

    // Let's write some rich wiki pages for the demo project to make the visual graph breathtaking!
    if (projectId === "shopify-store") {
      const pdpGalleryMd = `---
id: "wiki/features/pdp-gallery.md"
title: "PDP Gallery Component"
type: "feature"
status: "active"
project: "shopify-store"
recency_marker: "${dateStr}"
confidence_score: 0.94
tags: ["#shopify", "#gallery", "#pdp", "#mobile"]
source_type: "user_input"
verification_status: "verified"
---

# PDP Mobile Image Gallery Implementation

## Summary
The gallery renders high-resolution product imagery and enables swift touch-swipes.

## Layout Specification
- **Mobile thumbnails MUST stay below the main image**. This prevents visual side clutter on narrow viewports.
- Related breakpoints are defined in [[wiki/design/mobile-breakpoints.md]].
- Active thumbnails apply a 2px glowing slate frame accent.

## Related Files
- [[src/components/ProductGallery.tsx]]
- [[src/styles/product-gallery.css]]
- [[wiki/bugs/gallery-overflow.md]]
`;

      const bugsMd = `---
id: "wiki/bugs/gallery-overflow.md"
title: "Active Gallery Overflow Bug"
type: "bug"
status: "active"
project: "shopify-store"
recency_marker: "${dateStr}"
confidence_score: 0.85
tags: ["#bugs", "#gallery", "#touch"]
source_type: "system_generated"
---

# Bug: Touch-Swipe Gallery Overflow

## Description
Under specific circumstances on iOS Safari, quick lateral swipes cause double-render width jumps, pushing the gallery off-stage.

## Current Hypothesis
- Missing \`touch-action: pan-y\` overlay causes viewport tracking conflicts during drag cycles.
- Linked to responsive rules in [[wiki/design/mobile-breakpoints.md]].

## Workaround & Resolution
Ensure container possesses \`overflow-x-hidden\` wrapper frame.
`;

      const designMd = `---
id: "wiki/design/mobile-breakpoints.md"
title: "Mobile Viewport Grid Layout"
type: "research"
status: "active"
project: "shopify-store"
recency_marker: "${dateStr}"
confidence_score: 0.96
tags: ["#design", "#grid", "#responsive"]
source_type: "developer_notes"
---

# Mobile Breakpoints & Responsive Standard

## Breakpoint Matrix
- **Mobile Portrait**: \`sm (641px)\` down to standard grid frames
- **Desktop Layout**: \`md (768px)\` and higher styles with sidebar lists

## Application Instructions
All gallery assets and widgets like [[wiki/features/pdp-gallery.md]] must adhere to these standard fluid thresholds.
`;

      await fs.writeFile(pD("wiki/features/pdp-gallery.md"), pdpGalleryMd, "utf-8");
      await fs.writeFile(pD("wiki/bugs/gallery-overflow.md"), bugsMd, "utf-8");
      await fs.writeFile(pD("wiki/design/mobile-breakpoints.md"), designMd, "utf-8");

      // Set some initial claims
      const claims: Claim[] = [
        {
          claim_id: "claim_001",
          text: "Mobile PDP gallery thumbnails should always stick below the main slider image.",
          status: "active",
          confidence: 0.98,
          source_type: "user_instruction",
          linked_notes: ["wiki/features/pdp-gallery.md"]
        },
        {
          claim_id: "claim_002",
          text: "Mobile layout switches cleanly under 768px threshold with responsive grids.",
          status: "active",
          confidence: 0.94,
          source_type: "design_note",
          linked_notes: ["wiki/design/mobile-breakpoints.md", "wiki/features/pdp-gallery.md"]
        }
      ];
      await fs.writeFile(pD("claim-index.json"), JSON.stringify(claims, null, 2), "utf-8");

      // Set a sample contradiction
      const contradictions: Contradiction[] = [
        {
          id: "contra_001",
          old_claim: "Maintain thumbnails on the right edge for consistent styling across viewports.",
          new_claim: "Show thumbnails underneath the gallery slider on touchscreens and small resolutions.",
          severity: "medium",
          resolution: "Desktop retains standard rightward listing; responsive styles force horizontal bottom-strip lists.",
          detectedAt: new Date().toISOString(),
          status: "resolved"
        }
      ];
      await fs.writeFile(pD("contradictions.json"), JSON.stringify(contradictions, null, 2), "utf-8");

      // Set initial code index
      const codeIndex: CodeIndex = {
        "src/components/ProductGallery.tsx": {
          type: "component",
          framework: "React",
          exports: ["ProductGallery", "ThumbnailRail"],
          imports: ["useState", "useEffect", "motion"],
          risk_level: "medium",
          related_styles: ["src/styles/product-gallery.css"],
          related_notes: ["wiki/features/pdp-gallery.md"]
        },
        "src/styles/product-gallery.css": {
          type: "style",
          framework: "CSS3 / Tailwind",
          exports: [],
          imports: [],
          risk_level: "low",
          related_styles: [],
          related_notes: ["wiki/features/pdp-gallery.md", "wiki/design/mobile-breakpoints.md"]
        }
      };
      await fs.writeFile(pD("code-index.json"), JSON.stringify(codeIndex, null, 2), "utf-8");
    }
  }

  // Parse custom YAML block and extract clean object properties
  parseNoteMarkdown(rawContent: string, fileName: string, projectId: string): MemoryNote {
    const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
    const match = rawContent.match(frontmatterRegex);
    const dateStr = new Date().toISOString().split("T")[0];

    const defaultMeta: MemoryNoteMetadata = {
      id: fileName,
      title: path.basename(fileName, ".md"),
      type: "feature",
      status: "active",
      project: projectId,
      recency_marker: dateStr,
      confidence_score: 1.0,
      tags: [],
      source_type: "user_input",
      verification_status: "unverified"
    };

    if (!match) {
      return {
        metadata: defaultMeta,
        content: rawContent,
        rawMarkdown: rawContent
      };
    }

    const yamlBlock = match[1];
    const content = match[2];
    const metadata: any = { ...defaultMeta };

    const lines = yamlBlock.split("\n");
    for (const line of lines) {
      const idx = line.indexOf(":");
      if (idx > 0) {
        const key = line.slice(0, idx).trim();
        let val = line.slice(idx + 1).trim();

        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }

        if (val.startsWith("[") && val.endsWith("]")) {
          try {
            metadata[key] = JSON.parse(val.replace(/'/g, '"'));
          } catch {
            metadata[key] = val.slice(1, -1).split(",").map(item => item.trim().replace(/"/g, ""));
          }
        } else if (key === "confidence_score") {
          metadata[key] = parseFloat(val) || 1.0;
        } else {
          metadata[key] = val;
        }
      }
    }

    return {
      metadata: metadata as MemoryNoteMetadata,
      content,
      rawMarkdown: rawContent
    };
  }

  // Recursive read directory md files helper
  async scanDirForMd(dirPath: string, relativeRootPath: string = ""): Promise<string[]> {
    let results: string[] = [];
    try {
      const list = await fs.readdir(dirPath, { withFileTypes: true });
      for (const file of list) {
        const fullPath = path.join(dirPath, file.name);
        const relPath = relativeRootPath ? `${relativeRootPath}/${file.name}` : file.name;
        if (file.isDirectory()) {
          const res = await this.scanDirForMd(fullPath, relPath);
          results = results.concat(res);
        } else if (file.name.endsWith(".md") && file.name !== "project-info.json") {
          results.push(relPath);
        }
      }
    } catch {
      // Ignored
    }
    return results;
  }

  async getAllNotes(projectId: string): Promise<MemoryNote[]> {
    const projectDir = path.join(this.baseDir, projectId);
    const mdFiles = await this.scanDirForMd(projectDir);
    const notes: MemoryNote[] = [];

    for (const file of mdFiles) {
      try {
        const content = await fs.readFile(path.join(projectDir, file), "utf-8");
        notes.push(this.parseNoteMarkdown(content, file, projectId));
      } catch (err) {
        console.error(`Error reading ${file}:`, err);
      }
    }
    return notes;
  }

  async writeNote(projectId: string, relPath: string, content: string): Promise<void> {
    const filePath = path.join(this.baseDir, projectId, relPath);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, "utf-8");
  }

  async readClaims(projectId: string): Promise<Claim[]> {
    try {
      const data = await fs.readFile(path.join(this.baseDir, projectId, "claim-index.json"), "utf-8");
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  async writeClaims(projectId: string, claims: Claim[]): Promise<void> {
    await fs.writeFile(
      path.join(this.baseDir, projectId, "claim-index.json"),
      JSON.stringify(claims, null, 2),
      "utf-8"
    );
  }

  async readContradictions(projectId: string): Promise<Contradiction[]> {
    try {
      const data = await fs.readFile(path.join(this.baseDir, projectId, "contradictions.json"), "utf-8");
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  async writeContradictions(projectId: string, list: Contradiction[]): Promise<void> {
    await fs.writeFile(
      path.join(this.baseDir, projectId, "contradictions.json"),
      JSON.stringify(list, null, 2),
      "utf-8"
    );
  }

  async readCodeIndex(projectId: string): Promise<CodeIndex> {
    try {
      const data = await fs.readFile(path.join(this.baseDir, projectId, "code-index.json"), "utf-8");
      return JSON.parse(data);
    } catch {
      return {};
    }
  }

  async writeCodeIndex(projectId: string, index: CodeIndex): Promise<void> {
    await fs.writeFile(
      path.join(this.baseDir, projectId, "code-index.json"),
      JSON.stringify(index, null, 2),
      "utf-8"
    );
  }

  // Build high quality visual Project Node-Link Graph
  async buildProjectGraph(projectId: string): Promise<ProjectGraph> {
    const notes = await this.getAllNotes(projectId);
    const claims = await this.readClaims(projectId);
    const contradictions = await this.readContradictions(projectId);
    const codeIndex = await this.readCodeIndex(projectId);

    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    const nodeIds = new Set<string>();

    const addNode = (node: GraphNode) => {
      if (!nodeIds.has(node.id)) {
        nodes.push(node);
        nodeIds.add(node.id);
      }
    };

    // 1. Core Project Node
    addNode({
      id: "workspace_galaxy",
      label: "ContextUniverse",
      type: "project_core",
      status: "active",
      group: "root",
      confidence: 1.0,
      tags: ["#galaxy"]
    });

    addNode({
      id: "project_root",
      label: projectId.toUpperCase(),
      type: "project_core",
      status: "active",
      group: "project",
      confidence: 1.0,
      tags: ["#project"]
    });

    links.push({ source: "workspace_galaxy", target: "project_root", type: "link" });

    // 2. Zone Clusters representing sections of our Wiki
    const zones = [
      { id: "zone_governance", label: "Governance & Soul", types: ["soul", "critical_fact"] },
      { id: "zone_architecture", label: "Architecture", types: ["project_core", "research"] },
      { id: "zone_active_state", label: "Task Roadmap", types: ["current_state"] },
      { id: "zone_features", label: "Features wiki", types: ["feature"] },
      { id: "zone_decisions", label: "ADR register", types: ["decision"] },
      { id: "zone_critical_bugs", label: "Bugs wiki", types: ["bug"] },
      { id: "zone_code_map", label: "Engineering map", types: ["code"] }
    ];

    zones.forEach(z => {
      addNode({
        id: z.id,
        label: z.label,
        type: "summary",
        status: "active",
        group: "zone",
        confidence: 0.95,
        tags: ["#category"]
      });
      links.push({ source: "project_root", target: z.id, type: "link" });
    });

    // 3. Map notes to Zone Nodes and parse wikilinks [[wiki/file.md]]
    notes.forEach(note => {
      // Create node
      const nId = note.metadata.id;
      addNode({
        id: nId,
        label: note.metadata.title,
        type: note.metadata.type,
        status: note.metadata.status,
        group: "note",
        confidence: note.metadata.confidence_score,
        tags: note.metadata.tags || []
      });

      // Link to appropriate category zone
      let zoneId = "zone_features";
      if (note.metadata.type === "soul" || note.metadata.type === "critical_fact") {
        zoneId = "zone_governance";
      } else if (note.metadata.type === "project_core") {
        zoneId = "zone_architecture";
      } else if (note.metadata.type === "current_state") {
        zoneId = "zone_active_state";
      } else if (note.metadata.type === "decision") {
        zoneId = "zone_decisions";
      } else if (note.metadata.type === "bug") {
        zoneId = "zone_critical_bugs";
      } else if (note.metadata.type === "research") {
        zoneId = "zone_architecture";
      } else if (note.metadata.type === "summary") {
        zoneId = "zone_active_state";
      }
      
      links.push({ source: zoneId, target: nId, type: "link" });

      // Scan references recursively in markdown content: [[wiki/features/main.md]]
      const linkRegex = /\[\[(.*?)\]\]/g;
      let match;
      while ((match = linkRegex.exec(note.content)) !== null) {
        const dest = match[1].trim();
        // Destination can be a markdown note or code file
        if (dest.endsWith(".md") || dest.includes("/") || dest.endsWith(".tsx") || dest.endsWith(".css") || dest.endsWith(".ts")) {
          // If destination is a code file, we will add a dynamic code node later
          links.push({
            source: nId,
            target: dest,
            type: dest.endsWith(".md") ? "link" : "code_relation"
          });
        }
      }
    });

    // 4. Map Claims
    claims.forEach(claim => {
      addNode({
        id: claim.claim_id,
        label: claim.text.length > 30 ? claim.text.substring(0, 30) + "..." : claim.text,
        type: "claim",
        status: "active",
        group: "claim",
        confidence: claim.confidence,
        tags: ["#claim"]
      });

      claim.linked_notes.forEach(noteId => {
        links.push({
          source: noteId,
          target: claim.claim_id,
          type: "claim"
        });
      });
    });

    // 5. Map Contradictions
    contradictions.forEach(contra => {
      if (contra.status === "open") {
        addNode({
          id: contra.id,
          label: `CONTRADICTION: ${contra.severity.toUpperCase()}`,
          type: "contradiction",
          status: "flagged",
          group: "conflict",
          confidence: 0.5,
          tags: ["#contradiction"]
        });

        // Search for relevant claims to cluster link
        claims.forEach(c => {
          if (c.text.toLowerCase().includes(contra.old_claim.substring(0, 15).toLowerCase()) ||
              c.text.toLowerCase().includes(contra.new_claim.substring(0, 15).toLowerCase())) {
            links.push({
              source: contra.id,
              target: c.claim_id,
              type: "affects"
            });
          }
        });
      }
    });

    // 6. Map Code Files
    Object.entries(codeIndex).forEach(([filePath, details]) => {
      addNode({
        id: filePath,
        label: path.basename(filePath),
        type: "code",
        status: "active",
        group: "code",
        confidence: details.risk_level === "high" ? 0.7 : 0.95,
        tags: [details.type, details.framework]
      });

      links.push({ source: "zone_code_map", target: filePath, type: "link" });

      details.related_notes.forEach(noteId => {
        links.push({
          source: noteId,
          target: filePath,
          type: "code_relation"
        });
      });
    });

    // Prune links that point to non-existent nodes (to avoid canvas crash on dangling links)
    const activeLinks = links.filter(l => nodeIds.has(l.source) && nodeIds.has(l.target));

    return {
      nodes,
      links: activeLinks
    };
  }
}
