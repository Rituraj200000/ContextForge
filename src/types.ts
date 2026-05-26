export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  localPath?: string;
}

export type MemoryNoteType = 
  | "soul"
  | "project_core"
  | "critical_fact"
  | "current_state"
  | "decision"
  | "bug"
  | "feature"
  | "research"
  | "claim"
  | "contradiction"
  | "summary"
  | "code";

export type MemoryNodeStatus = "active" | "draft" | "resolved" | "archived" | "flagged";

export interface MemoryNoteMetadata {
  id: string; // e.g. "wiki/features/pdp-gallery.md"
  title: string;
  type: MemoryNoteType;
  status: MemoryNodeStatus;
  project: string;
  recency_marker: string;
  confidence_score: number;
  tags: string[];
  source_type: string;
  verification_status: string;
}

export interface MemoryNote {
  metadata: MemoryNoteMetadata;
  content: string;
  rawMarkdown: string;
}

export interface Claim {
  claim_id: string;
  text: string;
  status: string;
  confidence: number;
  source_type: string;
  linked_notes: string[];
}

export interface Contradiction {
  id: string;
  old_claim: string;
  new_claim: string;
  severity: "high" | "medium" | "low";
  resolution: string;
  detectedAt: string;
  status: "open" | "resolved";
}

export interface CodeIndexItem {
  type: string; // e.g., "component", "style", "config"
  framework: string;
  exports: string[];
  imports: string[];
  risk_level: "low" | "medium" | "high";
  related_styles: string[];
  related_notes: string[];
}

export interface CodeIndex {
  [filePath: string]: CodeIndexItem;
}

export interface GraphNode {
  id: string;
  label: string;
  type: MemoryNoteType;
  status: MemoryNodeStatus;
  group: string;
  confidence: number;
  tags: string[];
  // Physics engine properties
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  density?: number;
}

export interface GraphLink {
  source: string;
  target: string;
  type: "link" | "backlink" | "requires" | "affects" | "fixes" | "code_relation" | "claim";
}

export interface ProjectGraph {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface ThinkingLog {
  title: string;
  message: string;
  layer: number;
}

export interface IngestionResult {
  message: string;
  thinkingLogs: ThinkingLog[];
  actions: {
    type: "create_note" | "update_note" | "merge_note" | "archive_note" | "create_claim" | "flag_contradiction" | "update_index";
    target: string;
    reason: string;
  }[];
  notesUpdated: {
    id: string;
    title: string;
    type: MemoryNoteType;
    status: MemoryNodeStatus;
    tags: string[];
    content: string;
  }[];
  claims: Claim[];
  contradictions: Contradiction[];
}

export interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
  retrievedContext?: {
    notes: { id: string; title: string; snippet: string }[];
    claims: string[];
    riskWarnings: string[];
  };
}
