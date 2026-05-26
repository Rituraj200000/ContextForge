import React, { useState, useEffect, useMemo } from "react";
import { 
  Plus, 
  FolderPlus,
  Play, 
  Database, 
  Layers, 
  Cpu, 
  Terminal, 
  Search, 
  CheckCircle, 
  AlertTriangle, 
  BookOpen, 
  Save, 
  Compass, 
  ChevronRight, 
  HelpCircle,
  FileText,
  Clock,
  Send,
  ArrowRight,
  Code,
  ShieldAlert,
  Menu,
  X,
  TrendingUp,
  RotateCcw,
  Copy,
  Check
} from "lucide-react";
import { GraphCanvas } from "./components/GraphCanvas.jsx";
import { Project, MemoryNote, Claim, Contradiction, CodeIndex, GraphNode, GraphLink, ChatMessage, IngestionResult } from "./types.js";

// Multi-Tab navigation states
type MainTab = "graph" | "editor" | "ingest" | "claims" | "code_scanner" | "agent_context";

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  
  // Loaded Project Memory State
  const [notes, setNotes] = useState<MemoryNote[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [contradictions, setContradictions] = useState<Contradiction[]>([]);
  const [codeIndex, setCodeIndex] = useState<CodeIndex>({});
  
  // Node-link graph structures
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>([]);
  const [graphLinks, setGraphLinks] = useState<GraphLink[]>([]);
  
  const [activeTab, setActiveTab] = useState<MainTab>("graph");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  // Filter configurations
  const [filters, setFilters] = useState({
    governance: true,
    features: true,
    decisions: true,
    bugs: true,
    code: true,
    claims: true
  });

  // Editor states
  const [selectedNoteFile, setSelectedNoteFile] = useState<MemoryNote | null>(null);
  const [editorContent, setEditorContent] = useState<string>("");
  const [isSavingNote, setIsSavingNote] = useState<boolean>(false);

  // Ingestion states
  const [ingestInput, setIngestInput] = useState<string>("");
  const [ingestSourceType, setIngestSourceType] = useState<string>("user_input");
  const [isIngesting, setIsIngesting] = useState<boolean>(false);
  const [ingestResult, setIngestResult] = useState<IngestionResult | null>(null);

  // AI Chat query states
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState<string>("");
  const [isQuerying, setIsQuerying] = useState<boolean>(false);

  // Code scanner states
  const [isScanningCode, setIsScanningCode] = useState<boolean>(false);
  const [codeScanResult, setCodeScanResult] = useState<string>("");

  // Agent Context states
  const [codingTask, setCodingTask] = useState<string>("");
  const [isGeneratingContext, setIsGeneratingContext] = useState<boolean>(false);
  const [codingContextResult, setCodingContextResult] = useState<any | null>(null);
  const [isCopiedContext, setIsCopiedContext] = useState<boolean>(false);

  // AI Provider & Custom Key States
  const [apiProvider, setApiProvider] = useState<string>(() => localStorage.getItem("cf_api_provider") || "gemini");
  const [customApiKey, setCustomApiKey] = useState<string>(() => localStorage.getItem("cf_api_key") || "");
  const [customModel, setCustomModel] = useState<string>(() => localStorage.getItem("cf_custom_model") || "");
  const [customEndpoint, setCustomEndpoint] = useState<string>(() => localStorage.getItem("cf_custom_endpoint") || "");
  const [autoResolveContraloop, setAutoResolveContraloop] = useState<boolean>(() => {
    const item = localStorage.getItem("cf_auto_resolve");
    return item === null ? true : item === "true";
  });

  useEffect(() => {
    localStorage.setItem("cf_api_provider", apiProvider);
  }, [apiProvider]);

  useEffect(() => {
    localStorage.setItem("cf_api_key", customApiKey);
  }, [customApiKey]);

  useEffect(() => {
    localStorage.setItem("cf_custom_model", customModel);
  }, [customModel]);

  useEffect(() => {
    localStorage.setItem("cf_custom_endpoint", customEndpoint);
  }, [customEndpoint]);

  useEffect(() => {
    localStorage.setItem("cf_auto_resolve", String(autoResolveContraloop));
  }, [autoResolveContraloop]);

  // Modal controls
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [newProjId, setNewProjId] = useState<string>("");
  const [newProjName, setNewProjName] = useState<string>("");
  const [newProjDesc, setNewProjDesc] = useState<string>("");
  const [newProjLocalPath, setNewProjLocalPath] = useState<string>("");

  // Resolution controls
  const [resolvingContraId, setResolvingContraId] = useState<string | null>(null);
  const [resolutionText, setResolutionText] = useState<string>("");
  const [contraRemoveClaimId, setContraRemoveClaimId] = useState<string>("");

  // 1. Initial Load: Fetch Projects
  useEffect(() => {
    fetch("/api/projects")
      .then(res => res.json())
      .then((data: Project[]) => {
        setProjects(data);
        if (data.length > 0) {
          setActiveProject(data[0]);
        }
      })
      .catch(err => console.error("Failed to load projects:", err));
  }, []);

  // 2. Fetch memory documents whenever chosen project updates
  useEffect(() => {
    if (!activeProject) return;
    refreshProjectData();
    // Default chat trigger message
    setChatHistory([
      {
        id: "hi",
        sender: "assistant",
        text: `Welcome to ContextForge. I have fully indexed the project **"${activeProject.name}"**. How can I assist you with your project rules or codebase design today?`,
        timestamp: new Date().toLocaleTimeString()
      }
    ]);
  }, [activeProject]);

  const refreshProjectData = () => {
    if (!activeProject) return;
    
    // Fetch memory files
    fetch(`/api/projects/${activeProject.id}/memory`)
      .then(res => res.json())
      .then(data => {
        setNotes(data.notes || []);
        setClaims(data.claims || []);
        setContradictions(data.contradictions || []);
        setCodeIndex(data.codeIndex || {});

        // Preload first note for editor
        if (data.notes && data.notes.length > 0) {
          const soulFile = data.notes.find((n: any) => n.metadata.type === "soul") || data.notes[0];
          setSelectedNoteFile(soulFile);
          setEditorContent(soulFile.rawMarkdown);
        }
      });

    // Fetch Graph link mappings
    fetch(`/api/projects/${activeProject.id}/graph`)
      .then(res => res.json())
      .then(data => {
        setGraphNodes(data.nodes || []);
        setGraphLinks(data.links || []);
      });
  };

  // 3. Create a Custom New Project Memory
  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjId || !newProjName) return;

    fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: newProjId,
        name: newProjName,
        description: newProjDesc,
        localPath: newProjLocalPath
      })
    })
      .then(res => res.json())
      .then((newProject: Project) => {
        setProjects(prev => [...prev, newProject]);
        setActiveProject(newProject);
        setIsCreateModalOpen(false);
        setNewProjId("");
        setNewProjName("");
        setNewProjDesc("");
        setNewProjLocalPath("");
      })
      .catch(err => console.error("Error creating project:", err));
  };

  // 4. Save updated markdown in the editor
  const handleSaveNote = () => {
    if (!activeProject || !selectedNoteFile) return;
    setIsSavingNote(true);

    fetch(`/api/projects/${activeProject.id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        relPath: selectedNoteFile.metadata.id,
        content: editorContent
      })
    })
      .then(res => res.json())
      .then(() => {
        setIsSavingNote(false);
        refreshProjectData();
      })
      .catch(err => {
        console.error("Save note failed:", err);
        setIsSavingNote(false);
      });
  };

  // 5. AI Ingestion Self-Growing Loop trigger
  const handleIngestInput = () => {
    if (!activeProject || !ingestInput.trim()) return;
    setIsIngesting(true);
    setIngestResult(null);

    fetch(`/api/projects/${activeProject.id}/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: ingestInput,
        source_type: ingestSourceType,
        ai_provider: apiProvider,
        api_key: customApiKey,
        custom_model: customModel,
        api_endpoint: customEndpoint,
        auto_resolve: autoResolveContraloop
      })
    })
      .then(res => res.json())
      .then((data: IngestionResult) => {
        setIsIngesting(false);
        setIngestResult(data);
        setIngestInput("");
        refreshProjectData();
      })
      .catch(err => {
        console.error("Ingestion failed:", err);
        setIsIngesting(false);
      });
  };

  // 6. Submit conversational AI search question
  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !chatInput.trim()) return;

    const userMsg: ChatMessage = {
      id: Math.random().toString(),
      sender: "user",
      text: chatInput,
      timestamp: new Date().toLocaleTimeString()
    };

    setChatHistory(prev => [...prev, userMsg]);
    setIsQuerying(true);
    const activePrompt = chatInput;
    setChatInput("");

    fetch(`/api/projects/${activeProject.id}/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: activePrompt,
        chatHistory: chatHistory.slice(-5), // Send some history window
        ai_provider: apiProvider,
        api_key: customApiKey,
        custom_model: customModel,
        api_endpoint: customEndpoint
      })
    })
      .then(res => res.json())
      .then(data => {
        setIsQuerying(false);
        const assistantMsg: ChatMessage = {
          id: Math.random().toString(),
          sender: "assistant",
          text: data.answer,
          timestamp: new Date().toLocaleTimeString(),
          retrievedContext: data.retrievedContext
        };
        setChatHistory(prev => [...prev, assistantMsg]);
      })
      .catch(err => {
        console.error("Query answer failure:", err);
        setIsQuerying(false);
      });
  };

  // 7. Trigger Codebase scanning & Map compilation
  const handleScanCode = () => {
    if (!activeProject) return;
    setIsScanningCode(true);

    fetch(`/api/projects/${activeProject.id}/scan-code`, {
      method: "POST"
    })
      .then(res => res.json())
      .then(data => {
        setIsScanningCode(false);
        setCodeScanResult(`Successfully mapped out dependencies! Indexed ${data.totalMapped} modules from your live workspace folder hierarchy (/src, etc.).`);
        refreshProjectData();
      })
      .catch(err => {
        console.error("Code scan failed:", err);
        setIsScanningCode(false);
      });
  };

  // 8. Pack context bundle for coding agents
  const handleGenerateCodingContext = () => {
    if (!activeProject || !codingTask.trim()) return;
    setIsGeneratingContext(true);

    fetch(`/api/projects/${activeProject.id}/coding-context`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task: codingTask })
    })
      .then(res => res.json())
      .then(data => {
        setIsGeneratingContext(false);
        setCodingContextResult(data);
      })
      .catch(err => {
        console.error("Context build failed:", err);
        setIsGeneratingContext(false);
      });
  };

  // 9. Resolve Contradictions
  const handleResolveContradiction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !resolvingContraId) return;

    fetch(`/api/projects/${activeProject.id}/contradictions/${resolvingContraId}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resolutionText,
        removeClaimId: contraRemoveClaimId
      })
    })
      .then(res => res.json())
      .then(() => {
        setResolvingContraId(null);
        setResolutionText("");
        setContraRemoveClaimId("");
        refreshProjectData();
      });
  };

  const [isHealing, setIsHealing] = useState<boolean>(false);

  const handleAutoHeal = () => {
    if (!activeProject || isHealing) return;
    setIsHealing(true);

    fetch(`/api/projects/${activeProject.id}/contradictions/auto-heal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    })
      .then(res => res.json())
      .then(() => {
        setIsHealing(false);
        refreshProjectData();
      })
      .catch(err => {
        console.error("Auto-heal failed:", err);
        setIsHealing(false);
      });
  };

  // Copy helper
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopiedContext(true);
    setTimeout(() => setIsCopiedContext(false), 2000);
  };

  // Stats calculation
  const memoryHealthScore = useMemo(() => {
    if (notes.length === 0) return 0;
    // Calculate ratio based on documented features and claims ratio
    const activeClaims = claims.filter(c => c.status === "active").length;
    const notesCount = notes.length;
    const bugsResolved = notes.filter(n => n.metadata.type === "bug" && n.metadata.status === "resolved").length;
    
    const openContradictions = contradictions.filter(c => c.status === "open").length;
    const score = Math.round(((notesCount * 5 + activeClaims * 10) / (notesCount * 5 + activeClaims * 10 + openContradictions * 15)) * 100);
    return isNaN(score) ? 100 : Math.min(score, 100);
  }, [notes, claims, contradictions]);

  return (
    <div id="applet_root" className="min-h-screen bg-[#020617] text-slate-100 flex flex-col font-sans transition-colors duration-150 relative overflow-x-hidden antialiased">
      
      {/* 1. TOP HEADER & NAVIGATION HUD */}
      <header className="border-b border-slate-900 bg-slate-950/60 backdrop-blur-md sticky top-0 z-40 px-4 py-3 md:px-6 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600/10 border border-indigo-500/20 px-3 py-1 text-xs text-indigo-400 font-mono tracking-widest rounded-full uppercase pointer-events-none">
            Memory OS V1.0
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5 font-sans">
              <Compass className="text-indigo-500 animate-spin" size={20} style={{ animationDuration: "12s" }} /> ContextForge
            </h1>
            <p className="text-[10px] text-slate-500 font-mono">Self-growing memory layer for AI agents</p>
          </div>
        </div>

        {/* Project workspace selection dropdown */}
        <div className="flex items-center gap-2">
          <div className="flex flex-col items-end hidden md:flex">
            <span className="text-[9px] text-slate-600 font-mono">SELECTED WORKSPACE</span>
            <span className="text-[11px] text-indigo-400 font-semibold">{activeProject?.name || "No Project Loaded"}</span>
          </div>
          <select 
            value={activeProject?.id || ""} 
            onChange={(e) => {
              const proj = projects.find(p => p.id === e.target.value);
              if (proj) setActiveProject(proj);
            }}
            className="bg-slate-900 text-slate-200 border border-slate-800 text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-indigo-500 transition cursor-pointer"
          >
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="p-1 px-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium flex items-center gap-1 transition"
            title="Create Project memory workspace"
          >
            <Plus size={15} /> <span className="hidden sm:inline">New</span>
          </button>
        </div>
      </header>

      {/* 2. DASHBOARD BENTO STAT CHIP GRIDS */}
      <section className="px-4 pt-4 md:px-6 grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-850 p-3.5 rounded-xl flex items-center justify-between shadow-sm">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Memory Health</span>
            <span className="text-lg font-bold text-emerald-400 font-mono mt-1">{memoryHealthScore}%</span>
            <span className="text-[9px] text-slate-600 mt-1">Contradiction Index Ratio</span>
          </div>
          <div className="bg-emerald-500/10 p-2 rounded-lg text-emerald-400">
            <TrendingUp size={16} />
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-850 p-3.5 rounded-xl flex items-center justify-between shadow-sm">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Indexed Documents</span>
            <span className="text-lg font-bold text-white font-mono mt-1">{notes.length}</span>
            <span className="text-[9px] text-slate-600 mt-1">Markdown Memory Files</span>
          </div>
          <div className="bg-indigo-500/10 p-2 rounded-lg text-indigo-400">
            <BookOpen size={16} />
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-850 p-3.5 rounded-xl flex items-center justify-between shadow-sm">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Asserted Claims</span>
            <span className="text-lg font-bold text-sky-400 font-mono mt-1">{claims.filter(c => c.status === "active").length}</span>
            <span className="text-[9px] text-slate-600 mt-1">Verified Specifications</span>
          </div>
          <div className="bg-sky-500/10 p-2 rounded-lg text-sky-400">
            <CheckCircle size={16} />
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-850 p-3.5 rounded-xl flex items-center justify-between shadow-sm">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Contradictions</span>
            <span className={`text-lg font-bold font-mono mt-1 ${contradictions.filter(c => c.status === "open").length > 0 ? "text-rose-500 animate-pulse" : "text-slate-400"}`}>
              {contradictions.filter(c => c.status === "open").length}
            </span>
            <span className="text-[9px] text-slate-600 mt-1">Unresolved Warnings</span>
          </div>
          <div className={`p-2 rounded-lg ${contradictions.filter(c => c.status === "open").length > 0 ? "bg-rose-500/10 text-rose-400" : "bg-slate-800/40 text-slate-500"}`}>
            <AlertTriangle size={16} />
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-850 p-3.5 rounded-xl col-span-2 lg:col-span-1 flex items-center justify-between shadow-sm">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Dependency Graph</span>
            <span className="text-lg font-bold text-indigo-400 font-mono mt-1">{Object.keys(codeIndex).length} Modules</span>
            <span className="text-[9px] text-slate-600 mt-1">Scanned Source Files</span>
          </div>
          <div className="bg-indigo-500/10 p-2 rounded-lg text-indigo-400 animate-pulse">
            <Database size={16} />
          </div>
        </div>
      </section>

      {/* 3. CORE MULTI-VIEW TAB CONTROL DECK */}
      <section className="px-4 pt-4 md:px-6 flex border-b border-indigo-900/10 overflow-x-auto gap-1">
        <button
          onClick={() => setActiveTab("graph")}
          className={`px-3 py-2 text-xs font-semibold tracking-wider font-mono flex items-center gap-1.5 transition whitespace-nowrap border-b-2 uppercase ${activeTab === "graph" ? "border-indigo-500 text-white bg-indigo-500/5" : "border-transparent text-slate-400 hover:text-white"}`}
        >
          <Layers size={14} /> Knowledge Galaxy
        </button>
        <button
          onClick={() => {
            setActiveTab("ingest");
            setIngestResult(null);
          }}
          className={`px-3 py-2 text-xs font-semibold tracking-wider font-mono flex items-center gap-1.5 transition whitespace-nowrap border-b-2 uppercase ${activeTab === "ingest" ? "border-indigo-500 text-white bg-indigo-500/5" : "border-transparent text-slate-400 hover:text-white"}`}
        >
          <Cpu size={14} /> Cognitive Ingestor
        </button>
        <button
          onClick={() => setActiveTab("editor")}
          className={`px-3 py-2 text-xs font-semibold tracking-wider font-mono flex items-center gap-1.5 transition whitespace-nowrap border-b-2 uppercase ${activeTab === "editor" ? "border-indigo-500 text-white bg-indigo-500/5" : "border-transparent text-slate-400 hover:text-white"}`}
        >
          <FileText size={14} /> Memory Files ({notes.length})
        </button>
        <button
          onClick={() => setActiveTab("claims")}
          className={`px-3 py-2 text-xs font-semibold tracking-wider font-mono flex items-center gap-1.5 transition whitespace-nowrap border-b-2 uppercase relative ${activeTab === "claims" ? "border-indigo-500 text-white bg-indigo-500/5" : "border-transparent text-slate-400 hover:text-white"}`}
        >
          <CheckCircle size={13} /> ADR & Warnings
          {contradictions.filter(c => c.status === "open").length > 0 && (
            <span className="absolute top-1 right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("code_scanner")}
          className={`px-3 py-2 text-xs font-semibold tracking-wider font-mono flex items-center gap-1.5 transition whitespace-nowrap border-b-2 uppercase ${activeTab === "code_scanner" ? "border-indigo-500 text-white bg-indigo-500/5" : "border-transparent text-slate-400 hover:text-white"}`}
        >
          <Code size={14} /> Code Scanner
        </button>
        <button
          onClick={() => setActiveTab("agent_context")}
          className={`px-3 py-2 text-xs font-semibold tracking-wider font-mono flex items-center gap-1.5 transition whitespace-nowrap border-b-2 uppercase ${activeTab === "agent_context" ? "border-indigo-500 text-white bg-indigo-500/5" : "border-transparent text-slate-400 hover:text-white"}`}
        >
          <Terminal size={14} /> Agent Context Pack
        </button>
      </section>

      {/* 4. MAIN ACTION WORKSPACE STAGES BASED ON ACTIVE TAB */}
      <main className="flex-1 p-4 md:p-6 flex flex-col lg:flex-row gap-6">
        
        <div className="flex-1 flex flex-col gap-4">
          
          {/* TAB A: GRAPH GALAXY */}
          {activeTab === "graph" && (
            <div className="flex-1 flex flex-col gap-4 h-[550px] lg:h-auto">
              {/* Filter HUD & search metrics */}
              <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-slate-950/60 p-4 border border-slate-900 rounded-xl">
                <div className="relative flex-1 w-full">
                  <Search size={15} className="absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search node or tag..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-900 text-xs text-white border border-slate-850 pl-9 pr-4 py-2 rounded-lg focus:outline-none focus:border-indigo-500 font-mono"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="absolute right-3 top-2.5 text-slate-500 hover:text-white text-xs">Clear</button>
                  )}
                </div>

                {/* Filter switches layout */}
                <div className="flex flex-wrap gap-2 items-center text-xs">
                  <span className="text-slate-500 font-mono mr-1">Toggles:</span>
                  <label className="flex items-center gap-1 cursor-pointer bg-slate-900 px-2 py-1.5 border border-slate-850 hover:border-slate-800 rounded-md">
                    <input type="checkbox" checked={filters.governance} onChange={() => setFilters(f => ({ ...f, governance: !f.governance }))} className="rounded border-slate-800 accent-indigo-500" />
                    <span className="text-[10px] text-pink-400 font-medium">Soul & Stats</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer bg-slate-900 px-2 py-1.5 border border-slate-850 hover:border-slate-800 rounded-md">
                    <input type="checkbox" checked={filters.features} onChange={() => setFilters(f => ({ ...f, features: !f.features }))} className="rounded border-slate-800 accent-indigo-500" />
                    <span className="text-[10px] text-blue-400 font-medium">Features</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer bg-slate-900 px-2 py-1.5 border border-slate-850 hover:border-slate-800 rounded-md">
                    <input type="checkbox" checked={filters.decisions} onChange={() => setFilters(f => ({ ...f, decisions: !f.decisions }))} className="rounded border-slate-800 accent-indigo-500" />
                    <span className="text-[10px] text-purple-400 font-medium">Decisions ADR</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer bg-slate-900 px-2 py-1.5 border border-slate-850 hover:border-slate-800 rounded-md">
                    <input type="checkbox" checked={filters.bugs} onChange={() => setFilters(f => ({ ...f, bugs: !f.bugs }))} className="rounded border-slate-800 accent-indigo-500" />
                    <span className="text-[10px] text-rose-400 font-medium">Bugs</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer bg-slate-900 px-2 py-1.5 border border-slate-850 hover:border-slate-800 rounded-md">
                    <input type="checkbox" checked={filters.code} onChange={() => setFilters(f => ({ ...f, code: !f.code }))} className="rounded border-slate-800 accent-indigo-500" />
                    <span className="text-[10px] text-cyan-400 font-medium">Source files</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer bg-slate-900 px-2 py-1.5 border border-slate-850 hover:border-slate-800 rounded-md">
                    <input type="checkbox" checked={filters.claims} onChange={() => setFilters(f => ({ ...f, claims: !f.claims }))} className="rounded border-slate-800 accent-indigo-500" />
                    <span className="text-[10px] text-emerald-400 font-medium">Claims</span>
                  </label>
                </div>
              </div>

              {/* Infinite Graph Canvas Frame */}
              <div className="flex-1 min-h-[440px] relative">
                <GraphCanvas
                  nodes={graphNodes}
                  links={graphLinks}
                  onNodeClick={(node) => setSelectedNode(node)}
                  selectedNodeId={selectedNode?.id}
                  searchQuery={searchQuery}
                  filters={filters}
                />
              </div>
            </div>
          )}

          {/* TAB B: COGNITIVE INGESTION CHANGER */}
          {activeTab === "ingest" && (
            <div className="flex-grow flex flex-col gap-6 bg-slate-950/40 border border-slate-900 p-6 rounded-xl">
              <div className="flex flex-col gap-2">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Cpu className="text-indigo-400" size={18} /> Deep Cognitive Ingestion Hub
                </h2>
                <p className="text-xs text-slate-400">
                  Introduce raw features, bug alerts, workspace requirements or newly defined directives.
                  ContextForge will scan notes, detect contradictions against facts, assign priorities, auto-write references, and keep memory cohesive.
                </p>
              </div>

              {/* Requirement Feed box */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-slate-500 font-mono uppercase">Provide Input details:</label>
                  <textarea
                    rows={6}
                    placeholder="e.g. For our shopify PDP layout, we need to enforce that desktop image sizes are bound to max 600px width and stay separate from checkout, while mobile breakpoints remain strictly under 768px with touch thumbnail rollers."
                    value={ingestInput}
                    onChange={(e) => setIngestInput(e.target.value)}
                    className="w-full bg-slate-900 text-sm text-slate-100 placeholder-slate-600 border border-slate-850 p-3 rounded-xl focus:outline-none focus:border-indigo-500"
                  />
                </div>

                 <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-slate-600 font-mono">SPECIFY SOURCE TYPE</span>
                      <select
                        value={ingestSourceType}
                        onChange={(e) => setIngestSourceType(e.target.value)}
                        className="bg-slate-900 border border-slate-850 text-slate-300 text-xs p-1.5 px-3 rounded-lg focus:outline-none focus:border-indigo-500"
                      >
                        <option value="user_input">User Request / Instruction</option>
                        <option value="developer_notes">Developer Log notes</option>
                        <option value="codebase_metrics">Code review comments</option>
                        <option value="client_requirements">Client email details</option>
                        <option value="adr_history">Architecture board decision (ADR)</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-900/50 px-3 py-2 rounded-lg border border-slate-900/40">
                      <input
                        id="auto-heal-checkbox"
                        type="checkbox"
                        checked={autoResolveContraloop}
                        onChange={(e) => setAutoResolveContraloop(e.target.checked)}
                        className="rounded border-slate-800 text-indigo-500 focus:ring-indigo-500 cursor-pointer w-3.5 h-3.5 accent-indigo-500"
                      />
                      <label htmlFor="auto-heal-checkbox" className="text-[10.5px] text-indigo-300 font-mono flex items-center gap-1.5 cursor-pointer select-none">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Auto-Heal Contradictions (keeps Health at 100%)
                      </label>
                    </div>
                  </div>

                  <button
                    onClick={handleIngestInput}
                    disabled={isIngesting || !ingestInput.trim()}
                    className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-slate-200 hover:text-indigo-950 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 tracking-wide text-white transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isIngesting ? (
                      <>
                        <RotateCcw className="animate-spin" size={14} /> Cognitive reasoning in stream...
                      </>
                    ) : (
                      <>
                        <Cpu size={14} /> Commit Cognitive Ingestion
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Ingestion AI reasoning steps & outputs */}
              {isIngesting && (
                <div className="bg-slate-900/40 p-6 rounded-xl border border-slate-900/60 flex flex-col items-center justify-center py-10 gap-4 mt-4 animate-pulse">
                  <Cpu className="text-indigo-500 animate-bounce" size={32} />
                  <div className="flex flex-col items-center">
                    <p className="text-sm font-semibold text-white">Gemini Ingestion Engine Processing</p>
                    <p className="text-xs text-slate-500 font-mono mt-1 text-center max-w-sm">Comparing input claims against active markdown notes, checking contradictions, and aligning the knowledge graph...</p>
                  </div>
                </div>
              )}

              {ingestResult && (
                <div className="flex flex-col gap-4 mt-4 border-t border-slate-900 pt-6">
                  <div className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 p-3 rounded-xl">
                    <CheckCircle className="text-indigo-400" size={18} />
                    <p className="text-xs text-white"><strong>Ingestion Completed Successfully:</strong> {ingestResult.message}</p>
                  </div>

                  {/* Thinking trace logs */}
                  {ingestResult.thinkingLogs && ingestResult.thinkingLogs.length > 0 && (
                    <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-850">
                      <span className="text-[10px] text-indigo-400 font-mono uppercase tracking-wide">Cognitive Thinking Trace Logs</span>
                      <div className="flex flex-col gap-2.5 mt-3">
                        {ingestResult.thinkingLogs.map((log, i) => (
                          <div key={i} className="flex gap-3 border-l-2 border-slate-800 pl-3">
                            <span className="text-xs font-mono text-slate-500 bg-slate-950 px-1.5 py-0.5 rounded h-min">L{log.layer}</span>
                            <div className="flex flex-col">
                              <span className="text-xs font-semibold text-white">{log.title}</span>
                              <span className="text-[11px] text-slate-400 mt-0.5">{log.message}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Changes plans */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-900/30 p-4 border border-slate-900 rounded-xl">
                      <span className="text-[10px] text-slate-500 font-mono uppercase">Commited Memory Updates</span>
                      <div className="flex flex-col gap-2 mt-3">
                        {ingestResult.actions && ingestResult.actions.length > 0 ? (
                          ingestResult.actions.map((act, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-xs bg-slate-950 p-2.5 border border-slate-900 rounded-lg">
                              <span className="text-[9px] bg-slate-850 text-slate-400 font-mono p-1 rounded uppercase">{act.type.replace(/_/g, " ")}</span>
                              <div className="flex flex-col">
                                <span className="font-semibold text-indigo-300 font-mono">{act.target}</span>
                                <span className="text-[10px] text-slate-400 mt-1">{act.reason}</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-slate-600 italic">No notes created or modified.</p>
                        )}
                      </div>
                    </div>

                    <div className="bg-slate-900/30 p-4 border border-slate-900 rounded-xl">
                      <span className="text-[10px] text-slate-500 font-mono uppercase">Discovered Contradictions Check</span>
                      <div className="flex flex-col gap-2 mt-3">
                        {ingestResult.contradictions && ingestResult.contradictions.length > 0 ? (
                          ingestResult.contradictions.map((contra, idx) => (
                            <div key={idx} className="bg-rose-950/20 border border-rose-500/20 p-3 rounded-lg flex flex-col gap-2">
                              <div className="flex items-center gap-1.5 text-rose-400 font-bold text-xs uppercase tracking-wide">
                                <AlertTriangle size={13} /> {contra.severity.toUpperCase()} Contradiction Triggered
                              </div>
                              <p className="text-[11px] text-slate-300"><strong>Previous:</strong> {contra.old_claim}</p>
                              <p className="text-[11px] text-slate-300"><strong>Conflict:</strong> {contra.new_claim}</p>
                              <div className="bg-slate-950 p-2 border border-slate-900 rounded mt-1">
                                <p className="text-[10px] text-slate-400"><strong>Suggested resolution compromise:</strong> {contra.resolution}</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="flex items-center gap-2 text-emerald-400 text-xs p-3 bg-emerald-950/10 border border-emerald-900/20 rounded-lg">
                            <CheckCircle size={15} /> Zero contradictions found. Active project memory remains safe!
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB C: CHROME FILE EXPLORER WORKSPACE & EDITOR */}
          {activeTab === "editor" && (
            <div className="flex-grow flex flex-col md:flex-row gap-4 h-[550px]">
              
              {/* Explorer left panel */}
              <div className="w-full md:w-56 bg-slate-950/60 p-3.5 border border-slate-900 rounded-xl flex flex-col gap-3">
                <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Note Registry Index</span>
                <div className="flex-grow overflow-y-auto flex flex-col gap-1.5">
                  
                  {/* Categorized File list */}
                  {notes.map(note => (
                    <button
                      key={note.metadata.id}
                      onClick={() => {
                        setSelectedNoteFile(note);
                        setEditorContent(note.rawMarkdown);
                      }}
                      className={`text-left text-xs p-2 rounded-lg flex items-center justify-between transition cursor-pointer ${selectedNoteFile?.metadata.id === note.metadata.id ? "bg-indigo-600 text-white" : "bg-slate-900 text-slate-300 hover:bg-slate-850"}`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileText size={13} />
                        <span className="truncate">{note.metadata.title}</span>
                      </div>
                      <span className={`text-[8px] uppercase font-mono px-1 rounded ${selectedNoteFile?.metadata.id === note.metadata.id ? "bg-indigo-700 text-indigo-200" : "bg-slate-800 text-slate-500"}`}>
                        {note.metadata.type.substring(0, 4)}
                      </span>
                    </button>
                  ))}

                </div>
              </div>

              {/* Read Write Editor right panel */}
              <div className="flex-1 bg-slate-950/40 p-4 border border-slate-900 rounded-xl flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-indigo-400 font-mono font-semibold uppercase">{selectedNoteFile?.metadata.id || "Editor"}</span>
                    <span className="text-sm font-bold text-white mt-0.5">{selectedNoteFile?.metadata.title || "No document loaded"}</span>
                  </div>

                  <button
                    onClick={handleSaveNote}
                    disabled={isSavingNote || !selectedNoteFile}
                    className="p-1 px-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 transition cursor-pointer"
                  >
                    {isSavingNote ? (
                      <>
                        <RotateCcw className="animate-spin" size={12} /> Saving...
                      </>
                    ) : (
                      <>
                        <Save size={12} /> Save changes
                      </>
                    )}
                  </button>
                </div>

                <textarea
                  rows={20}
                  value={editorContent}
                  onChange={(e) => setEditorContent(e.target.value)}
                  disabled={!selectedNoteFile}
                  className="flex-grow w-full bg-slate-900 text-slate-100 placeholder-slate-700 font-mono border border-slate-850 p-4 rounded-xl text-xs focus:outline-none focus:border-indigo-500 leading-relaxed resize-none overflow-y-auto"
                />

                <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono px-1">
                  <span>Markdown Source of Truth | Parser Wiki Enabled</span>
                  <span>Recency: {selectedNoteFile?.metadata.recency_marker || "N/A"}</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB D: ADRS & CONTRADICTION HARNESS */}
          {activeTab === "claims" && (
            <div className="flex-grow flex flex-col gap-6">
              
              {/* Contradiction warning registers */}
              <div className="bg-slate-950/40 p-5 border border-slate-900 rounded-xl flex flex-col gap-3">
                <h3 className="text-sm font-bold tracking-wide text-rose-400 flex items-center gap-1.5 uppercase">
                  <ShieldAlert size={15} /> Active Contradiction Harness
                </h3>
                <p className="text-xs text-slate-400">
                  When different requirements or statements contradict each other in files, ContextForge raises alerts below. Resolve conflicts below horizontally to preserve context sanity.
                </p>

                {contradictions.filter(c => c.status === "open").length > 0 && (
                  <div className="bg-gradient-to-r from-indigo-950/40 to-slate-900 border border-indigo-500/30 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 mt-1">
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] font-bold text-indigo-400 font-mono uppercase tracking-wider flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-indigo-500 animate-ping"></span>
                        ⚡ Self-Healing System Active
                      </span>
                      <p className="text-[11px] text-slate-300">
                        Compromises have been generated by AI for all {contradictions.filter(c => c.status === "open").length} open contradictions. Let the OS self-heal and auto-align the memory graph now.
                      </p>
                    </div>
                    <button
                      onClick={handleAutoHeal}
                      disabled={isHealing}
                      className="whitespace-nowrap bg-indigo-600 hover:bg-slate-200 hover:text-indigo-950 text-white font-semibold text-xs px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 disabled:opacity-40"
                    >
                      {isHealing ? "Healing..." : "Instant Auto-Heal & Align"}
                    </button>
                  </div>
                )}

                <div className="flex flex-col gap-3 mt-2">
                  {contradictions.filter(c => c.status === "open").length > 0 ? (
                    contradictions.filter(c => c.status === "open").map(contra => (
                      <div key={contra.id} className="bg-rose-950/10 border border-rose-500/20 p-4 rounded-xl flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-rose-500 font-mono uppercase bg-rose-500/10 px-2 py-0.5 rounded">Severity {contra.severity}</span>
                          <span className="text-[10px] text-slate-500 font-mono">{new Date(contra.detectedAt).toLocaleString()}</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          <div>
                            <span className="text-[10px] text-slate-500 font-mono uppercase">Old Documented Fact:</span>
                            <p className="text-slate-300 bg-slate-950 p-2 border border-slate-900 rounded mt-1 font-sans">{contra.old_claim}</p>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 font-mono uppercase">Incoming Contradicting Rule:</span>
                            <p className="text-slate-300 bg-slate-950 p-2 border border-slate-900 rounded mt-1 font-sans">{contra.new_claim}</p>
                          </div>
                        </div>

                        {resolvingContraId === contra.id ? (
                          <form onSubmit={handleResolveContradiction} className="bg-slate-900/60 p-3.5 border border-slate-850 rounded-lg flex flex-col gap-3">
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[10.5px] text-indigo-400 font-semibold">Write Resolution Override Decision:</label>
                              <input
                                type="text"
                                value={resolutionText}
                                onChange={(e) => setResolutionText(e.target.value)}
                                placeholder="Compromise e.g., On mobile formats slider lists vertically underneath; desktops preserve side lists."
                                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-white"
                                required
                              />
                            </div>

                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] text-slate-500 font-mono">OPTIONAL: ARCHIVE OUTDATED CLAIM CHIP</label>
                              <select
                                value={contraRemoveClaimId}
                                onChange={(e) => setContraRemoveClaimId(e.target.value)}
                                className="bg-slate-950 text-slate-300 border border-slate-800 text-xs p-1 rounded"
                              >
                                <option value="">Do not archive any claims</option>
                                {claims.filter(c => c.status === "active").map(c => (
                                  <option key={c.claim_id} value={c.claim_id}>{c.text.substring(0, 40)}...</option>
                                ))}
                              </select>
                            </div>

                            <div className="flex gap-2 justify-end">
                              <button type="button" onClick={() => setResolvingContraId(null)} className="px-2.5 py-1 text-[11px] text-slate-400 hover:text-white transition">Cancel</button>
                              <button type="submit" className="px-3 py-1 bg-indigo-600 font-semibold hover:bg-indigo-500 text-white rounded text-[11px] transition">Confirm Resolution</button>
                            </div>
                          </form>
                        ) : (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => {
                                setResolvingContraId(contra.id);
                                setResolutionText(contra.resolution || "");
                              }}
                              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 rounded text-[11px] font-semibold text-white transition flex items-center gap-1 cursor-pointer"
                            >
                              Resolve Conflict
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="bg-emerald-950/15 border border-emerald-500/10 p-4 rounded-xl flex items-center gap-3 py-6 justify-center">
                      <CheckCircle className="text-emerald-400 animate-pulse" size={18} />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-white uppercase tracking-wider">Zero Conflicts active</span>
                        <span className="text-xs text-slate-500 mt-0.5">Project rules remain synchronized seamlessly under SOUL protocols.</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Factual design claims index registry */}
              <div className="bg-slate-950/40 p-5 border border-slate-900 rounded-xl flex flex-col gap-3">
                <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Factual specifications registry</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {claims.length > 0 ? (
                    claims.map(claim => (
                      <div key={claim.claim_id} className={`p-3 bg-slate-900 border rounded-xl flex items-start gap-2.5 justify-between relative overflow-hidden ${claim.status === "archived" ? "border-slate-950 opacity-40" : "border-slate-850"}`}>
                        <div className="flex flex-col gap-1 flex-grow">
                          <span className="text-[8.5px] font-mono text-slate-500 bg-slate-950 px-1 py-0.5 rounded w-max">{claim.claim_id}</span>
                          <span className={`text-[11.5px] font-medium leading-relaxed mt-1 ${claim.status === "archived" ? "line-through text-slate-500" : "text-slate-200"}`}>{claim.text}</span>
                          <div className="flex gap-1.5 mt-2 overflow-x-auto">
                            {claim.linked_notes.map((n, i) => (
                              <span key={i} className="text-[8.5px] font-mono text-indigo-400 bg-indigo-500/5 border border-indigo-500/10 px-1.5 rounded truncate max-w-[120px]" title={n}>
                                {n}
                              </span>
                            ))}
                          </div>
                        </div>

                        <span className={`text-[9.5px] font-bold font-mono px-1 rounded absolute right-2 top-2 uppercase select-none ${claim.status === 'active' ? 'text-emerald-400 bg-emerald-500/5' : 'text-slate-500 bg-slate-950'}`}>
                          {claim.status}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500 italic">No assertions currently parsed.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB E: CODE SCANNER DEP PANEL */}
          {activeTab === "code_scanner" && (
            <div className="flex-grow flex flex-col gap-6 bg-slate-950/40 border border-slate-900 p-6 rounded-xl">
              <div className="flex flex-col gap-1.5">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Code className="text-indigo-400 animate-pulse" size={18} /> Codebase Structure Dependency Scanner
                </h2>
                <p className="text-xs text-slate-400">
                  Scan the actual Workspace ContextForge project directories (reads `/src`, `/package.json`, etc.) dynamically using live server files.
                  Map dependencies, extract file modules, exports, and imports, and automatically overlay them onto the Knowledge Galaxy!
                </p>
              </div>

              <div className="bg-slate-900 p-5 rounded-xl border border-slate-850 flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-slate-300">Workspace Scanning Target URL:</span>
                  <span className="text-xs text-indigo-400 font-mono mt-0.5 font-bold">./src (Types, Components, Renderers, Server API)</span>
                </div>

                <button
                  onClick={handleScanCode}
                  disabled={isScanningCode}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  {isScanningCode ? (
                    <>
                      <RotateCcw className="animate-spin" size={13} /> Compiling codebase map references...
                    </>
                  ) : (
                    <>
                      <Play size={13} /> Commit Dependency Scan
                    </>
                  )}
                </button>
              </div>

              {codeScanResult && (
                <div className="bg-emerald-500/5 border border-emerald-500/15 p-3.5 rounded-xl text-xs text-emerald-400 font-medium">
                  {codeScanResult}
                </div>
              )}

              {/* Indexed Code Modules inventory list */}
              <div className="flex flex-col gap-3">
                <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Discovered source code entities ({Object.keys(codeIndex).length})</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(codeIndex).map(([fPath, detailsVal]) => {
                    const details = detailsVal as any;
                    return (
                      <div key={fPath} className="p-4 bg-slate-900 border border-slate-850 rounded-xl flex flex-col gap-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-200 mt-1 font-mono tracking-tight">{fPath}</span>
                          <span className={`text-[8.5px] font-bold font-mono p-1 rounded uppercase select-none ${details.risk_level === 'high' ? 'text-rose-400 bg-rose-500/10 border-rose-500/20 shadow' : 'text-slate-400 bg-slate-800'}`}>
                            Risk: {details.risk_level}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-[10px] font-mono text-slate-400 border-t border-slate-850 pt-2.5">
                          <div className="flex flex-col">
                            <span className="text-[8px] text-slate-600 uppercase">Framework:</span>
                            <span className="text-slate-300 mt-0.5">{details.framework}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[8px] text-slate-600 uppercase">Type:</span>
                            <span className="text-slate-300 mt-0.5">{details.type}</span>
                          </div>
                        </div>

                        {details.imports && details.imports.length > 0 && (
                          <div className="flex flex-col gap-1 text-[10px] font-mono text-slate-400">
                            <span className="text-[8.5px] text-slate-600 uppercase">Dependencies Index:</span>
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {details.imports.map((imp: string, inx: number) => (
                                <span key={inx} className="bg-slate-950 border border-slate-900 px-1 rounded text-slate-400 truncate max-w-[130px]" title={imp}>{imp}</span>
                              ))}
                            </div>
                          </div>
                        )}

                        {details.exports && details.exports.length > 0 && (
                          <div className="flex flex-col gap-1 text-[10px] font-mono text-slate-400">
                            <span className="text-[8.5px] text-slate-600 uppercase">Exports list:</span>
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {details.exports.map((exp: string, expx: number) => (
                                <span key={expx} className="bg-indigo-950/20 border border-indigo-900/15 text-indigo-400 px-1 rounded text-[9.5px]" title={exp}>{exp}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* TAB F: AGENT CONTEXT PACK BUILDER */}
          {activeTab === "agent_context" && (
            <div className="flex-grow flex flex-col gap-6 bg-slate-950/40 border border-slate-900 p-6 rounded-xl">
              <div className="flex flex-col gap-1.5">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Terminal className="text-indigo-400" size={18} /> Copilot / Coding Agent Context Packing Engine
                </h2>
                <p className="text-xs text-slate-400">
                  Are you about to prompt a secondary coding agent (like cursor, aider, build engine, or github copilot) to run a task on this repo?
                  Ask the engine below to retrieve SOUL guidelines, preceding decisions, and specific related files to compile a compact Context budget.
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-slate-500 font-mono uppercase">Provide programming task goal:</label>
                  <input
                    type="text"
                    placeholder="e.g. Integrate Touch events on swiping, and fix Safari height expansion on pdp-gallery component."
                    value={codingTask}
                    onChange={(e) => setCodingTask(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-850 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleGenerateCodingContext}
                    disabled={isGeneratingContext || !codingTask.trim()}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-slate-200 hover:text-indigo-900 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    {isGeneratingContext ? (
                      <>
                        <RotateCcw className="animate-spin" size={13} /> Generating envelope...
                      </>
                    ) : (
                      <>
                        <Terminal size={13} /> Pack Context Envelope
                      </>
                    )}
                  </button>
                </div>
              </div>

              {codingContextResult && (
                <div className="flex flex-col gap-4 mt-4 border-t border-slate-900 pt-6">
                  
                  {/* Results preview grids */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-900/40 p-3.5 rounded-xl border border-slate-850">
                      <span className="text-[10px] text-slate-500 font-mono uppercase">Detected related components:</span>
                      <div className="flex flex-col gap-1.5 mt-2.5">
                        {codingContextResult.detectedFiles && codingContextResult.detectedFiles.length > 0 ? (
                          codingContextResult.detectedFiles.map((f: string, id: number) => (
                            <div key={id} className="text-xs font-mono text-indigo-400 bg-indigo-500/5 px-2 py-1.5 border border-indigo-900/10 rounded">
                              {f}
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-slate-600 italic">No exact string matches discovered. General guidelines will prevail.</p>
                        )}
                      </div>
                    </div>

                    <div className="bg-slate-900/40 p-3.5 rounded-xl border border-slate-850">
                      <span className="text-[10px] text-slate-500 font-mono uppercase">Applicable Project-soul claims:</span>
                      <div className="flex flex-col gap-1.5 mt-2.5">
                        {codingContextResult.verifiedRules && codingContextResult.verifiedRules.length > 0 ? (
                          codingContextResult.verifiedRules.map((r: string, id: number) => (
                            <div key={id} className="text-xs text-slate-300">
                              {r}
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-slate-600 italic">No local claims parsed.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Copyable prompt block box */}
                  <div className="flex flex-col gap-2 mt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-indigo-400 font-mono font-semibold uppercase">Executable Prompt context:</span>
                      <button
                        onClick={() => copyToClipboard(codingContextResult.promptSnippet)}
                        className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded flex items-center gap-1.5 text-xs transition cursor-pointer"
                      >
                        {isCopiedContext ? (
                          <>
                            <Check className="text-emerald-400" size={13} /> Copied!
                          </>
                        ) : (
                          <>
                            <Copy size={13} /> Copy to Clipboard
                          </>
                        )}
                      </button>
                    </div>

                    <pre className="bg-slate-950 p-4 border border-indigo-950 text-[10.5px] font-mono text-slate-300 rounded-xl overflow-x-auto whitespace-pre-wrap leading-relaxed shadow-sm">
                      {codingContextResult.promptSnippet}
                    </pre>
                  </div>

                </div>
              )}

            </div>
          )}

        </div>

        {/* 5. SIDE PANEL PANEL (Chat memory console & Node inspector) */}
        <aside className="w-full lg:w-80 flex flex-col gap-6">

          {/* AI Providers Brain Center */}
          <div className="bg-slate-950/40 border border-slate-900 p-5 rounded-2xl shadow-xl flex flex-col gap-4">
            <div className="flex flex-col">
              <span className="text-[8.5px] text-indigo-400 font-mono tracking-wider uppercase font-bold flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse"></span> Connect Any LLM Model
              </span>
              <h3 className="text-xs font-bold text-white uppercase mt-1 flex items-center gap-1.5">
                <Cpu size={12} className="text-indigo-400" /> AI Provider Engines
              </h3>
            </div>

            <div className="flex flex-col gap-3 text-xs font-mono">
              <div className="flex flex-col gap-1.5">
                <label className="text-slate-400 text-[10px] uppercase">Active Provider:</label>
                <select
                  value={apiProvider}
                  onChange={(e) => {
                    const prov = e.target.value;
                    setApiProvider(prov);
                    if (prov === "gemini") {
                      setCustomModel("gemini-3.5-flash");
                      setCustomEndpoint("");
                    } else if (prov === "openai") {
                      setCustomModel("gpt-4o-mini");
                      setCustomEndpoint("https://api.openai.com/v1/chat/completions");
                    } else if (prov === "anthropic") {
                      setCustomModel("claude-3-5-sonnet-20241022");
                      setCustomEndpoint("https://api.anthropic.com/v1/messages");
                    } else if (prov === "openrouter") {
                      setCustomModel("google/gemini-2.5-flash");
                      setCustomEndpoint("https://openrouter.ai/api/v1/chat/completions");
                    } else if (prov === "local") {
                      setCustomModel("mistral");
                      setCustomEndpoint("http://localhost:11434/v1");
                    }
                  }}
                  className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white text-xs font-mono focus:outline-none focus:border-indigo-500 transition cursor-pointer"
                >
                  <option value="gemini">Google Gemini SDK</option>
                  <option value="openai">OpenAI API</option>
                  <option value="anthropic">Anthropic Claude</option>
                  <option value="openrouter">OpenRouter Gateway</option>
                  <option value="local">Local Endpoint (Ollama / Custom)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-slate-400 text-[10px] uppercase flex items-center justify-between">
                  <span>Custom API Key:</span>
                  <span className="text-[8px] text-slate-500 lowercase">(saves locally)</span>
                </label>
                <input
                  type="password"
                  placeholder={
                    apiProvider === "gemini" 
                      ? "Fallback: GEMINI_API_KEY .env" 
                      : apiProvider === "local" 
                        ? "Optional API key" 
                        : "Enter custom API Key..."
                  }
                  value={customApiKey}
                  onChange={(e) => setCustomApiKey(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white text-xs font-mono focus:outline-none focus:border-indigo-500 transition placeholder-slate-600"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-slate-400 text-[10px] uppercase">Model Descriptor:</label>
                <input
                  type="text"
                  placeholder="e.g. gpt-4o, claude-3-5-sonnet"
                  value={customModel}
                  onChange={(e) => setCustomModel(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white text-xs font-mono focus:outline-none focus:border-indigo-500 transition placeholder-slate-600"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-slate-400 text-[10px] uppercase">Endpoint URL Override:</label>
                <input
                  type="text"
                  placeholder="Leave empty for defaults"
                  value={customEndpoint}
                  onChange={(e) => setCustomEndpoint(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white text-[10.5px] font-mono focus:outline-none focus:border-indigo-500 transition placeholder-slate-600"
                />
              </div>
            </div>

            <span className="text-[9px] text-slate-500 leading-snug font-sans bg-slate-900/40 p-2.5 rounded-lg border border-slate-900/60 flex items-start gap-1.5">
              <span className="h-1.5 w-1.5 mt-1 rounded-full bg-indigo-400/80 shrink-0 select-none"></span>
              You can download this codebase to run offline with any locally-hosted LLM (like Ollama or LM Studio) or your own API keys!
            </span>
          </div>

          {/* S-1. Dynamic Node detail Inspector */}
          {selectedNode && (
            <div className="bg-gradient-to-br from-slate-950 to-slate-900 p-5 rounded-xl border border-indigo-900/20 shadow-xl flex flex-col gap-4 relative">
              <button 
                onClick={() => setSelectedNode(null)} 
                className="absolute right-3 top-3 text-slate-500 hover:text-white transition"
              >
                <X size={15} />
              </button>

              <div className="flex flex-col gap-1.5">
                <span className="text-[8.5px] font-mono bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded uppercase font-bold w-max">
                  {selectedNode.type.replace(/_/g, " ")}
                </span>
                <h4 className="text-sm font-bold text-white mt-1 leading-snug">{selectedNode.label}</h4>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">ID: {selectedNode.id}</p>
              </div>

              <div className="border-t border-slate-900 my-1"></div>

              {/* Status details indicators */}
              <div className="grid grid-cols-2 gap-3 text-[10.5px] font-mono text-slate-400">
                <div className="flex flex-col">
                  <span className="text-[8.5px] text-slate-600 uppercase">Status:</span>
                  <span className={`font-semibold mt-0.5 uppercase ${selectedNode.status === 'active' ? 'text-emerald-400' : 'text-amber-500'}`}>{selectedNode.status}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[8.5px] text-slate-600 uppercase">Confidence Score:</span>
                  <span className="text-white font-semibold mt-0.5">{Math.round((selectedNode.confidence || 0.95) * 100)}%</span>
                </div>
              </div>

              {selectedNode.tags && selectedNode.tags.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[8.5px] text-slate-600 uppercase font-mono">Associated Tags:</span>
                  <div className="flex flex-wrap gap-1">
                    {selectedNode.tags.map((tag, idx) => (
                      <span key={idx} className="text-[9px] font-mono text-indigo-400 bg-indigo-500/5 px-2 py-0.5 border border-indigo-500/10 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Prompt actions based on node clicked */}
              <div className="flex flex-col gap-2 mt-2">
                {selectedNode.group === "note" && (
                  <button
                    onClick={() => {
                      const matchedNote = notes.find(n => n.metadata.id === selectedNode.id);
                      if (matchedNote) {
                        setSelectedNoteFile(matchedNote);
                        setEditorContent(matchedNote.rawMarkdown);
                        setActiveTab("editor");
                      }
                    }}
                    className="w-full text-center py-2 bg-indigo-600/15 text-indigo-400 border border-indigo-500/10 hover:bg-indigo-600 hover:text-white rounded-lg text-xs font-semibold tracking-wide transition cursor-pointer"
                  >
                    Open Document inside Editor
                  </button>
                )}

                <button
                  onClick={() => {
                    setChatInput(`Explain the specifications, claims, and requirements mapped around this: "${selectedNode.label}"`);
                    const querySection = document.getElementById("ai-query-form-anchor");
                    querySection?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="w-full text-center py-2 bg-slate-900 text-slate-300 border border-slate-800 hover:text-white hover:border-slate-700 rounded-lg text-xs font-medium transition cursor-pointer"
                >
                  Query AI about this node context
                </button>
              </div>

            </div>
          )}

          {/* S-2. Conversational project-aware AI Chat assistant */}
          <div className="bg-slate-950/40 p-5 rounded-xl border border-slate-900 shadow-xl flex flex-col gap-4 h-[420px]">
            <div className="flex flex-col">
              <span className="text-[8.5px] text-slate-600 font-mono tracking-wider uppercase">ContextForge Chat Console</span>
              <h3 className="text-xs font-bold text-white uppercase mt-0.5 flex items-center gap-1">
                <Terminal size={12} className="text-indigo-500 animate-pulse" /> Workspace Brain Console
              </h3>
            </div>

            {/* Conversational stream stage */}
            <div className="flex-grow overflow-y-auto flex flex-col gap-3 font-mono text-[10.5px]">
              {chatHistory.map((item, id) => (
                <div key={item.id || id} className={`flex flex-col gap-1 p-2.5 rounded-lg border leading-relaxed ${item.sender === 'user' ? 'bg-slate-900 border-slate-800 text-slate-100 self-end ml-10' : 'bg-slate-950/40 border-indigo-950 text-slate-300 mr-10'}`}>
                  <span className={`text-[8px] uppercase tracking-wider font-bold ${item.sender === 'user' ? 'text-indigo-400' : 'text-slate-500'}`}>
                    {item.sender === 'user' ? 'User Developer' : 'Writer Agent'} • {item.timestamp}
                  </span>
                  
                  <div className="mt-1 font-sans break-words whitespace-pre-wrap">{item.text}</div>

                  {/* Retrieved context metadata footnotes */}
                  {item.retrievedContext && (
                    <div className="border-t border-slate-900 mt-2 pt-2 text-[8.5px] text-slate-500 flex flex-col gap-1.5 font-mono">
                      <span>Mapped Core References:</span>
                      <div className="flex flex-col gap-1">
                        {item.retrievedContext.notes.map((n, i) => (
                          <span key={i} className="text-indigo-400 truncate">[[{n.id}]] - {n.title}</span>
                        ))}
                      </div>
                      {item.retrievedContext.claims.length > 0 && (
                        <span>Linked Verified Claims: ({item.retrievedContext.claims.length})</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {isQuerying && (
                <div className="bg-slate-900/40 border border-slate-950 p-2.5 rounded flex items-center gap-2 self-start animate-pulse">
                  <RotateCcw className="animate-spin text-slate-500" size={12} />
                  <span className="text-[10px] text-slate-500 font-mono">AI Consulting memory indices...</span>
                </div>
              )}
            </div>

            {/* Submission chat console bar */}
            <form onSubmit={handleChatSubmit} id="ai-query-form-anchor" className="flex items-center gap-1 bg-slate-900 border border-slate-850 p-1.5 rounded-lg">
              <input
                type="text"
                placeholder="Ask e.g. What are mobile layout rules?"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-grow bg-transparent text-xs text-white px-2 focus:outline-none placeholder-slate-600"
              />
              <button 
                type="submit" 
                disabled={isQuerying || !chatInput.trim()}
                className="p-1 px-1.5 bg-indigo-600 hover:bg-indigo-500 hover:text-white text-slate-200 rounded transition cursor-pointer disabled:opacity-30"
              >
                <Send size={11} />
              </button>
            </form>
          </div>

          {/* S-3. Helpful Sandbox FAQ info banner */}
          <div className="bg-slate-950/20 px-4 py-3 border border-slate-900/60 rounded-xl text-[10.5px] text-slate-500 leading-relaxed font-sans">
            <span className="font-semibold text-slate-400 uppercase tracking-wider text-[9px] flex items-center gap-1"><HelpCircle size={11} /> Workspace rulebook</span>
            Every ingested requirement or manual markdown edit in are kept as separate files in your repository database.
            Use the <strong>Agent Context Pack</strong> tab to copy custom verified constraints for Cursor/Copilot agents dynamically!
          </div>

        </aside>
      </main>

      {/* 6. CREATE PROJECT POP-UP MODAL FRAME */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#020617]/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-950 border border-slate-900 p-6 rounded-2xl flex flex-col gap-4 shadow-2xl relative">
            <button 
              type="button" 
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute right-4 top-4 text-slate-500 hover:text-white transition cursor-pointer"
            >
              <X size={16} />
            </button>

            <div className="flex flex-col gap-1.5">
              <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                <FolderPlus size={18} className="text-indigo-500" /> Create Project Memory OS
              </h3>
              <p className="text-xs text-slate-500">Initialize a dedicated workspace folder, bootstrap standard governance files, and map rules.</p>
            </div>

            <form onSubmit={handleCreateProject} className="flex flex-col gap-4 text-xs">
              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-[9px] text-slate-500 uppercase">Project Slug / Directory identifier:</label>
                <input
                  type="text"
                  placeholder="e.g. saas-app-memory"
                  value={newProjId}
                  onChange={(e) => setNewProjId(e.target.value)}
                  className="bg-slate-900 border border-slate-850 p-2.5 rounded-lg text-white font-mono focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-[9px] text-slate-500 uppercase">Human-readable project Name:</label>
                <input
                  type="text"
                  placeholder="e.g. Enterprise CRM Redesign"
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                  className="bg-slate-900 border border-slate-850 p-2.5 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-[9px] text-slate-500 uppercase">Short Purpose / Description goal:</label>
                <input
                  type="text"
                  placeholder="e.g. Manage core styling tokens and mobile layouts rule registers."
                  value={newProjDesc}
                  onChange={(e) => setNewProjDesc(e.target.value)}
                  className="bg-slate-900 border border-slate-850 p-2.5 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-[9px] text-indigo-400 font-bold uppercase flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse"></span> Connect Local Codebase / Folder Path:
                </label>
                <input
                  type="text"
                  placeholder="e.g. . for this folder, or absolute path on your system"
                  value={newProjLocalPath}
                  onChange={(e) => setNewProjLocalPath(e.target.value)}
                  className="bg-slate-900 border border-slate-850 p-2.5 rounded-lg text-white font-mono focus:outline-none focus:border-indigo-500"
                />
                <span className="text-[9px] text-slate-600 font-mono">
                  Provide your local workspace root directory. We'll crawl your raw source code, index dependencies, and bootstrap and store custom project memories directly in that directory.
                </span>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 font-semibold text-white rounded-lg shadow transition cursor-pointer"
                >
                  Bootstrap Project
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Footer credits bar */}
      <footer className="border-t border-slate-950 bg-slate-950/40 py-4 text-center text-[10px] font-mono text-slate-600">
        ContextForge OS | Created & Engineered By Rituraj Bharti | Markdown Knowledge Engine Enabled
      </footer>

    </div>
  );
}
