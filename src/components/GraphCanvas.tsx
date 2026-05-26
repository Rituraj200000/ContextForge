import React, { useRef, useEffect, useState, useMemo } from "react";
import { GraphNode, GraphLink } from "../types.js";
import { ZoomIn, ZoomOut, RefreshCw, Layers, Shield, Bug, CheckSquare, Code, Hammer, AlertTriangle } from "lucide-react";

interface GraphCanvasProps {
  nodes: GraphNode[];
  links: GraphLink[];
  onNodeClick: (node: GraphNode) => void;
  selectedNodeId?: string;
  searchQuery: string;
  filters: {
    governance: boolean;
    features: boolean;
    decisions: boolean;
    bugs: boolean;
    code: boolean;
    claims: boolean;
  };
}

interface PhysicsNode extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  targetX?: number;
  targetY?: number;
}

export const GraphCanvas: React.FC<GraphCanvasProps> = ({
  nodes,
  links,
  onNodeClick,
  selectedNodeId,
  searchQuery,
  filters
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Viewport transformation states
  const [zoom, setZoom] = useState<number>(0.8);
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState<PhysicsNode | null>(null);
  const [draggedNode, setDraggedNode] = useState<PhysicsNode | null>(null);

  // Maintain local mutable physics nodes with refs to persist values inside animation loop
  const physicsNodesRef = useRef<PhysicsNode[]>([]);
  const physicsLinksRef = useRef<GraphLink[]>([]);

  // Filter nodes & links based on user toggles
  const { filteredNodes, filteredLinks } = useMemo(() => {
    const fn = nodes.filter(node => {
      // Direct root and zones are always visible
      if (node.id === "project_root" || node.id === "workspace_galaxy" || node.group === "zone") {
        return true;
      }
      
      switch (node.type) {
        case "soul":
        case "critical_fact":
          return filters.governance;
        case "feature":
        case "project_core":
          return filters.features;
        case "decision":
          return filters.decisions;
        case "bug":
          return filters.bugs;
        case "code":
          return filters.code;
        case "claim":
          return filters.claims;
        default:
          return true;
      }
    });

    const activeNodeIds = new Set(fn.map(n => n.id));
    const fl = links.filter(link => activeNodeIds.has(link.source) && activeNodeIds.has(link.target));

    return { filteredNodes: fn, filteredLinks: fl };
  }, [nodes, links, filters]);

  // Sync prop changes with simulation nodes (retaining coordinates of previous states)
  useEffect(() => {
    const existingMap = new Map<string, PhysicsNode>(physicsNodesRef.current.map(n => [n.id, n]));
    
    // Width and height of container for distribution
    const width = containerRef.current?.clientWidth || 800;
    const height = containerRef.current?.clientHeight || 600;

    physicsNodesRef.current = filteredNodes.map(node => {
      const existing = existingMap.get(node.id);
      
      // Assign custom radius based on type
      let radius = 12;
      if (node.id === "workspace_galaxy") radius = 32;
      else if (node.id === "project_root") radius = 26;
      else if (node.group === "zone") radius = 20;
      else if (node.type === "soul" || node.type === "critical_fact") radius = 15;
      else if (node.type === "bug") radius = 14;
      else if (node.type === "contradiction") radius = 14;
      else if (node.type === "decision") radius = 13;
      else if (node.type === "claim") radius = 9;

      return {
        ...node,
        radius,
        // Carry forward position or assign random scatter around corresponding clusters
        x: existing ? existing.x : (Math.random() - 0.5) * width * 1.5,
        y: existing ? existing.y : (Math.random() - 0.5) * height * 1.5,
        vx: existing ? existing.vx : 0,
        vy: existing ? existing.vy : 0
      };
    });

    physicsLinksRef.current = filteredLinks;
  }, [filteredNodes, filteredLinks]);

  // Center pan initially
  useEffect(() => {
    if (containerRef.current) {
      setPanX(containerRef.current.clientWidth / 2);
      setPanY(containerRef.current.clientHeight / 2);
    }
  }, []);

  // Animate and center if search highlights a node
  useEffect(() => {
    if (searchQuery.trim().length > 1) {
      const match = physicsNodesRef.current.find(n => 
        n.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
        n.id.toLowerCase().includes(searchQuery.toLowerCase())
      );
      if (match && containerRef.current) {
        setPanX(containerRef.current.clientWidth / 2 - match.x * zoom);
        setPanY(containerRef.current.clientHeight / 2 - match.y * zoom);
      }
    }
  }, [searchQuery]);

  // Main Force Directed Graph Physics Simulator & Canvas Render Frame
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    const runPhysicsAndDraw = () => {
      const pNodes = physicsNodesRef.current;
      const pLinks = physicsLinksRef.current;

      const scale = window.devicePixelRatio || 1;
      const width = containerRef.current?.clientWidth || 800;
      const height = containerRef.current?.clientHeight || 600;

      if (canvas.width !== width * scale || canvas.height !== height * scale) {
        canvas.width = width * scale;
        canvas.height = height * scale;
        ctx.scale(scale, scale);
      }

      // 1. PHYSICS COMPUTATION (SPRING SYSTEM & FORCE COULOMB)
      const springLength = 100;
      const kAttract = 0.04;    // Hooke's attraction spring factor
      const kRepel = 1200;      // Coulomb's repulsion factor
      const damping = 0.85;     // Velocity decay friction

      // A. APPLY PAIRWISE COULOMB REPULSION (Push nodes apart)
      for (let i = 0; i < pNodes.length; i++) {
        const nodeA = pNodes[i];
        for (let j = i + 1; j < pNodes.length; j++) {
          const nodeB = pNodes[j];

          const dx = nodeB.x - nodeA.x;
          const dy = nodeB.y - nodeA.y;
          const distSq = dx * dx + dy * dy + 0.1;
          const dist = Math.sqrt(distSq);

          // Skip extremely distant nodes to speed up
          if (dist > 450) continue;

          // Repulsive force vector
          const force = kRepel / (distSq * dist);
          const fx = dx * force;
          const fy = dy * force;

          if (nodeA !== draggedNode) {
            nodeA.vx -= fx;
            nodeA.vy -= fy;
          }
          if (nodeB !== draggedNode) {
            nodeB.vx += fx;
            nodeB.vy += fy;
          }
        }
      }

      // B. APPLY LINK SPRING ATTRACTION (Pull linked nodes together)
      const nodeMap = new Map<string, PhysicsNode>(pNodes.map(n => [n.id, n]));
      pLinks.forEach(link => {
        const sourceNode = nodeMap.get(link.source);
        const targetNode = nodeMap.get(link.target);

        if (sourceNode && targetNode) {
          const dx = targetNode.x - sourceNode.x;
          const dy = targetNode.y - sourceNode.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;

          // Attraction spring force
          const delta = dist - springLength;
          const force = kAttract * delta;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          if (sourceNode !== draggedNode) {
            sourceNode.vx += fx;
            sourceNode.vy += fy;
          }
          if (targetNode !== draggedNode) {
            targetNode.vx -= fx;
            targetNode.vy -= fy;
          }
        }
      });

      // C. CENTER ATTRIBUTION (Gently keep graph drift locked in space)
      pNodes.forEach(node => {
        if (node === draggedNode) return;

        // Gravity core pull
        node.vx += (0 - node.x) * 0.003;
        node.vy += (0 - node.y) * 0.003;

        // Apply velocities & update positioning
        node.x += node.vx;
        node.y += node.vy;

        // Decay velocities
        node.vx *= damping;
        node.vy *= damping;
      });

      // 2. CANVAS RENDERING
      ctx.clearRect(0, 0, width, height);

      // Save viewport transformation state
      ctx.save();
      ctx.translate(panX, panY);
      ctx.scale(zoom, zoom);

      // A. Draw Grid Lines behind nodes (Starfield Cyberpunk Slate theme)
      ctx.strokeStyle = "rgba(148, 163, 184, 0.05)";
      ctx.lineWidth = 1;

      const gridSpacing = 80;
      const startX = Math.floor((-panX - 2000) / gridSpacing) * gridSpacing;
      const endX = Math.ceil((width - panX + 2000) / gridSpacing) * gridSpacing;
      const startY = Math.floor((-panY - 2000) / gridSpacing) * gridSpacing;
      const endY = Math.ceil((height - panY + 2000) / gridSpacing) * gridSpacing;

      for (let x = startX; x < endX; x += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
        ctx.stroke();
      }
      for (let y = startY; y < endY; y += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
        ctx.stroke();
      }

      // B. DRAW LINKS
      pLinks.forEach(link => {
        const source = nodeMap.get(link.source);
        const target = nodeMap.get(link.target);

        if (source && target) {
          ctx.beginPath();
          ctx.moveTo(source.x, source.y);
          ctx.lineTo(target.x, target.y);

          // Configure colors for link relations
          if (link.type === "claim") {
            ctx.strokeStyle = "rgba(74, 222, 128, 0.2)";
            ctx.setLineDash([5, 5]);
          } else if (link.type === "code_relation") {
            ctx.strokeStyle = "rgba(125, 211, 252, 0.35)";
            ctx.setLineDash([1, 2]);
          } else if (link.type === "affects" || link.type === "fixes") {
            ctx.strokeStyle = "rgba(244, 63, 94, 0.3)";
            ctx.setLineDash([]);
          } else {
            ctx.strokeStyle = "rgba(148, 163, 184, 0.18)";
            ctx.setLineDash([]);
          }

          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.setLineDash([]); // Reset
        }
      });

      // C. DRAW NODES WITH BEAUTIFUL GLOWS
      pNodes.forEach(node => {
        const isSelected = selectedNodeId === node.id;
        const isHovered = hoveredNode?.id === node.id;
        const isSearchHighlight = searchQuery.trim().length > 1 && 
          (node.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
           node.id.toLowerCase().includes(searchQuery.toLowerCase()));

        // Skip rendering small labels if zoomed out extremely far (Level-of-Detail standard)
        const showLabels = zoom > 0.42 || isSelected || isHovered || isSearchHighlight;

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);

        // Core fill coloration
        let nodeColor = "#475569";      // Slate Gray Slate Primary
        let glowColor = "rgba(148, 163, 184, 0.3)";
        let borderAccent = "rgba(255, 255, 255, 0.15)";

        if (node.id === "workspace_galaxy") {
          nodeColor = "#1e1b4b"; // Indigo Galactic core
          glowColor = "rgba(129, 140, 248, 0.6)";
          borderAccent = "#6366f1";
        } else if (node.id === "project_root") {
          nodeColor = "#1e293b";
          glowColor = "rgba(251, 191, 36, 0.5)";
          borderAccent = "#fbbf24";
        } else if (node.group === "zone") {
          nodeColor = "#0f172a";
          glowColor = "rgba(38, 38, 38, 0.3)";
          borderAccent = "#94a3b8";
        } else if (node.type === "soul") {
          nodeColor = "#db2777"; // Hot pink
          glowColor = "rgba(219, 39, 119, 0.6)";
          borderAccent = "#fbcfe8";
        } else if (node.type === "critical_fact") {
          nodeColor = "#ea580c"; // Burning Orange
          glowColor = "rgba(234, 88, 12, 0.5)";
          borderAccent = "#ffedd5";
        } else if (node.type === "decision") {
          nodeColor = "#7c3aed"; // Purple
          glowColor = "rgba(124, 58, 237, 0.5)";
          borderAccent = "#ddd6fe";
        } else if (node.type === "bug") {
          nodeColor = "#dc2626"; // Vibrant Red Alert
          glowColor = "rgba(220, 38, 38, 0.7)";
          borderAccent = "#fecaca";
        } else if (node.type === "contradiction") {
          nodeColor = "#b45309"; // Yellow Warning Amber Pulsing
          glowColor = `rgba(245, 158, 11, ${0.4 + Math.sin(Date.now() / 150) * 0.3})`;
          borderAccent = "#fef3c7";
        } else if (node.type === "claim") {
          nodeColor = "#16a34a"; // Green Facts
          glowColor = "rgba(22, 163, 74, 0.4)";
          borderAccent = "#dcfce7";
        } else if (node.type === "code") {
          nodeColor = "#0891b2"; // Sky Cyan Logic
          glowColor = "rgba(8, 145, 178, 0.4)";
          borderAccent = "#cffafe";
        } else if (node.type === "feature") {
          nodeColor = "#2563eb"; // Blue
          glowColor = "rgba(37, 99, 235, 0.35)";
          borderAccent = "#dbeafe";
        }

        // Apply glowing effect shadows (Caution: shadows can be expensive, keep size bounds tight)
        if (isHovered || isSelected || isSearchHighlight || node.id.startsWith("project_") || node.type === "contradiction") {
          ctx.shadowColor = glowColor;
          ctx.shadowBlur = isSelected || isSearchHighlight ? 25 : 12;
        } else {
          ctx.shadowColor = "transparent";
          ctx.shadowBlur = 0;
        }

        ctx.fillStyle = nodeColor;
        ctx.fill();

        // Node outline borders
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
        ctx.strokeStyle = isSelected || isSearchHighlight ? "#ffffff" : borderAccent;
        ctx.lineWidth = isSelected || isSearchHighlight ? 3.5 : 1.5;
        ctx.stroke();

        // D. Draw Node Text Labels
        if (showLabels) {
          ctx.fillStyle = isSelected ? "#ffffff" : isHovered ? "#f1f5f9" : "#e2e8f0";
          
          // Select weight
          const fontName = node.group === "code" || node.type === "claim" ? "monospace" : "sans-serif";
          const fontSize = node.id === "workspace_galaxy" || node.id === "project_root" ? "14px" : "11px";
          ctx.font = `${isSelected || isHovered ? "bold" : "normal"} ${fontSize} ${fontName}`;
          ctx.textAlign = "center";
          ctx.textBaseline = "top";

          // Shorten labels on nodes to save spatial footprint
          let labelText = node.label;
          if (labelText.length > 20 && node.group !== 'root' && node.group !== 'project') {
            labelText = labelText.substring(0, 18) + "...";
          }

          ctx.fillText(labelText, node.x, node.y + node.radius + 6);

          // Render small indicator meta values for deep zooms (confidence rates or status tags for claim chips)
          if (zoom > 1.2 && (node.type === "claim" || node.type === "contradiction")) {
            ctx.fillStyle = "rgba(148, 163, 184, 0.85)";
            ctx.font = "8.5px monospace";
            ctx.fillText(`conf: ${Math.round(node.confidence * 100)}%`, node.x, node.y + node.radius + 20);
          }
        }
      });

      ctx.restore();
      animId = requestAnimationFrame(runPhysicsAndDraw);
    };

    animId = requestAnimationFrame(runPhysicsAndDraw);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [panX, panY, zoom, selectedNodeId, hoveredNode, draggedNode, searchQuery, filteredNodes, filteredLinks]);

  // Event handlers for drag & drop navigation controls
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!containerRef.current || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const mockX = e.clientX - rect.left;
    const mockY = e.clientY - rect.top;

    // Convert mouse pixels back into zoomed/panned physics coordinate spaces
    const graphX = (mockX - panX) / zoom;
    const graphY = (mockY - panY) / zoom;

    // Detect if clicking on a node
    const clickNode = physicsNodesRef.current.find(node => {
      const dx = node.x - graphX;
      const dy = node.y - graphY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      return dist <= node.radius + 8; // Padding offset
    });

    if (clickNode) {
      setDraggedNode(clickNode);
      onNodeClick(clickNode);
    } else if (e.button === 0) {
      // Left click without node launches standard panning cycles
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const mockX = e.clientX - rect.left;
    const mockY = e.clientY - rect.top;

    const graphX = (mockX - panX) / zoom;
    const graphY = (mockY - panY) / zoom;

    if (draggedNode) {
      draggedNode.x = graphX;
      draggedNode.y = graphY;
      draggedNode.vx = 0;
      draggedNode.vy = 0;
    } else if (isDragging) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setPanX(prev => prev + dx);
      setPanY(prev => prev + dy);
      setDragStart({ x: e.clientX, y: e.clientY });
    } else {
      // Perform hover check for highlight effect
      const overNode = physicsNodesRef.current.find(node => {
        const dx = node.x - graphX;
        const dy = node.y - graphY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return dist <= node.radius + 6;
      });
      setHoveredNode(overNode || null);
    }
  };

  const handleMouseUp = () => {
    setDraggedNode(null);
    setIsDragging(false);
  };

  const resetGraph = () => {
    const width = containerRef.current?.clientWidth || 800;
    const height = containerRef.current?.clientHeight || 600;
    setZoom(0.85);
    setPanX(width / 2);
    setPanY(height / 2);

    // Scatter nodes slightly
    physicsNodesRef.current.forEach(node => {
      node.x = (Math.random() - 0.5) * width * 1.2;
      node.y = (Math.random() - 0.5) * height * 1.2;
      node.vx = 0;
      node.vy = 0;
    });
  };

  return (
    <div ref={containerRef} className="relative w-full h-full bg-[#030712] select-none overflow-hidden rounded-xl border border-slate-900 shadow-2xl shadow-indigo-950/20">
      
      {/* Outer floating metadata overlay */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-1 pointer-events-none md:gap-2">
        <h3 className="text-sm font-semibold tracking-wide text-indigo-400 font-sans uppercase">Spatial Cognitive Map</h3>
        <p className="text-xs text-slate-500 font-mono">
          Nodes: <span className="text-slate-300">{filteredNodes.length}</span> | Links: <span className="text-slate-300">{filteredLinks.length}</span>
        </p>
      </div>

      {/* Control tool strip panel */}
      <div className="absolute right-4 top-4 z-10 flex flex-col gap-2 pointer-events-auto bg-slate-950/80 backdrop-blur-md px-2 py-3 border border-slate-900 rounded-lg shadow-lg">
        <button 
          onClick={() => setZoom(prev => Math.min(prev + 0.15, 4))}
          className="p-1 px-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition" 
          title="Zoom In"
        >
          <ZoomIn size={16} />
        </button>
        <button 
          onClick={() => setZoom(prev => Math.max(prev - 0.15, 0.15))}
          className="p-1 px-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition" 
          title="Zoom Out"
        >
          <ZoomOut size={16} />
        </button>
        <button 
          onClick={resetGraph}
          className="p-1 px-1.5 hover:bg-slate-800 text-slate-400 hover:text-indigo-400 rounded transition"
          title="Recenter & Re-Scatter Universe"
        >
          <RefreshCw size={15} />
        </button>
        <div className="border-t border-slate-900 my-1"></div>
        <div className="flex flex-col gap-1 items-center px-1">
          <Layers size={13} className="text-indigo-500" />
          <span className="text-[8px] font-mono text-slate-600 mt-1">LOD</span>
        </div>
      </div>

      {/* Zoom level mini visual indicator */}
      <div className="absolute left-4 bottom-4 z-10 font-mono text-[9px] text-slate-600 bg-slate-950/40 px-2 py-1 rounded border border-slate-900/60 pointer-events-none">
        ZOOM: {Math.round(zoom * 100)}% {zoom <= 0.42 ? "(LOD Low)" : zoom < 1.2 ? "(LOD Medium)" : "(LOD High)"}
      </div>

      {/* Responsive Core Interactive HTML5 Canvas frame */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="w-full h-full cursor-grab active:cursor-grabbing block"
      />

    </div>
  );
};
