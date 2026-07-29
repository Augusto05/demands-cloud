import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  MarkerType,
  BackgroundVariant
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import {
  Workflow,
  Plus,
  Eye,
  Edit3,
  Copy,
  Trash2,
  Maximize2,
  Minimize2,
  ChevronDown,
  Layers,
  Check,
  X
} from 'lucide-react';
import { FlowCanvasStore, FlowBoard, FlowTableNodeData } from '../types';
import { getStoredFlowCanvasStore, saveStoredFlowCanvasStore } from '../services/flowCanvasService';
import { CustomTableNode } from './flow/CustomTableNode';

const nodeTypes = {
  customTable: CustomTableNode
};

export const FlowCanvasView: React.FC = () => {
  const [store, setStore] = useState<FlowCanvasStore>(getStoredFlowCanvasStore);
  const [isReadOnly, setIsReadOnly] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Board management dropdown & modal states
  const [isBoardMenuOpen, setIsBoardMenuOpen] = useState<boolean>(false);
  const [editingBoardName, setEditingBoardName] = useState<string>('');
  const [isRenamingBoard, setIsRenamingBoard] = useState<boolean>(false);

  const activeBoard = useMemo(() => {
    return store.boards.find(b => b.id === store.activeBoardId) || store.boards[0];
  }, [store]);

  // React Flow State Hooks
  const [nodes, setNodes, onNodesChange] = useNodesState(activeBoard?.nodes || []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(activeBoard?.edges || []);

  // Fullscreen Toggle Handler & Browser Fullscreen API Sync
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      setIsFullscreen(true);
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } else {
      setIsFullscreen(false);
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [isFullscreen]);

  // Sync React Flow nodes & edges state when active board changes
  useEffect(() => {
    if (activeBoard) {
      setNodes(activeBoard.nodes || []);
      setEdges(activeBoard.edges || []);
      setEditingBoardName(activeBoard.name);
    }
  }, [store.activeBoardId]);

  // Persist React Flow changes to store & Local/Mac Storage
  const updateActiveBoardState = useCallback((newNodes: Node[], newEdges: Edge[]) => {
    if (!activeBoard) return;
    const updatedBoards = store.boards.map(b => {
      if (b.id === activeBoard.id) {
        return {
          ...b,
          nodes: newNodes,
          edges: newEdges,
          updatedAt: new Date().toISOString()
        };
      }
      return b;
    });

    const newStore: FlowCanvasStore = {
      ...store,
      boards: updatedBoards
    };
    setStore(newStore);
    saveStoredFlowCanvasStore(newStore);
  }, [activeBoard, store]);

  // Handle Edges Connection (Connecting setas entre tabelas)
  const onConnect = useCallback((params: Connection) => {
    if (isReadOnly) return;
    const newEdge: Edge = {
      ...params,
      id: `edge-${Date.now()}`,
      animated: true,
      style: { stroke: '#F59E0B', strokeWidth: 2.5 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#F59E0B' }
    };
    setEdges(prevEdges => {
      const updated = addEdge(newEdge, prevEdges);
      updateActiveBoardState(nodes, updated);
      return updated;
    });
  }, [isReadOnly, nodes, setEdges, updateActiveBoardState]);

  // Edge Deletion Handler
  const handleDeleteEdge = useCallback((edgeId: string) => {
    if (isReadOnly) return;
    setEdges(prevEdges => {
      const updated = prevEdges.filter(e => e.id !== edgeId);
      updateActiveBoardState(nodes, updated);
      return updated;
    });
  }, [isReadOnly, nodes, setEdges, updateActiveBoardState]);

  const onEdgeClick = useCallback((evt: React.MouseEvent, edge: Edge) => {
    if (isReadOnly) return;
    evt.stopPropagation();
    if (confirm('Deseja excluir esta linha de conexão com seta?')) {
      handleDeleteEdge(edge.id);
    }
  }, [isReadOnly, handleDeleteEdge]);

  // Sync node position changes and node data updates
  const handleNodesChangeWrapped = useCallback((changes: any) => {
    if (isReadOnly) return;
    onNodesChange(changes);
  }, [isReadOnly, onNodesChange]);

  const handleEdgesChangeWrapped = useCallback((changes: any) => {
    if (isReadOnly) return;
    onEdgesChange(changes);
  }, [isReadOnly, onEdgesChange]);

  // Node Data Updater Callback
  const handleUpdateNodeData = useCallback((nodeId: string, updatedData: Partial<FlowTableNodeData>) => {
    if (isReadOnly) return;
    setNodes(prevNodes => {
      const updated = prevNodes.map(n => {
        if (n.id === nodeId) {
          return {
            ...n,
            data: {
              ...n.data,
              ...updatedData
            }
          };
        }
        return n;
      });
      updateActiveBoardState(updated, edges);
      return updated;
    });
  }, [isReadOnly, edges, setNodes, updateActiveBoardState]);

  const handleDeleteNode = useCallback((nodeId: string) => {
    if (isReadOnly) return;
    setNodes(prevNodes => {
      const updatedNodes = prevNodes.filter(n => n.id !== nodeId);
      const updatedEdges = edges.filter(e => e.source !== nodeId && e.target !== nodeId);
      setEdges(updatedEdges);
      updateActiveBoardState(updatedNodes, updatedEdges);
      return updatedNodes;
    });
  }, [isReadOnly, edges, setNodes, setEdges, updateActiveBoardState]);

  // Duplicate Table Node
  const handleDuplicateNode = useCallback((nodeId: string) => {
    if (isReadOnly) return;
    const targetNode = nodes.find(n => n.id === nodeId);
    if (!targetNode) return;

    const newId = `node-${Date.now()}`;
    const duplicatedNode: Node = {
      ...targetNode,
      id: newId,
      position: {
        x: targetNode.position.x + 40,
        y: targetNode.position.y + 40
      },
      data: {
        ...JSON.parse(JSON.stringify(targetNode.data)),
        label: `${targetNode.data.label || 'Tabela'} (Cópia)`
      }
    };

    const updatedNodes = [...nodes, duplicatedNode];
    setNodes(updatedNodes);
    updateActiveBoardState(updatedNodes, edges);
  }, [isReadOnly, nodes, edges, setNodes, updateActiveBoardState]);

  // Add New Table Node to Canvas
  const handleAddTableNode = useCallback(() => {
    if (isReadOnly) return;
    const newNodeId = `node-${Date.now()}`;
    const newNode: Node = {
      id: newNodeId,
      type: 'customTable',
      position: { x: 250 + Math.random() * 80, y: 150 + Math.random() * 80 },
      data: {
        label: `Tabela Nova #${nodes.length + 1}`,
        iconName: 'Table',
        color: '#F59E0B',
        columns: [
          { id: 'col-1', name: 'Métrica' },
          { id: 'col-2', name: 'Valor' },
          { id: 'col-3', name: 'Delta %' }
        ],
        rows: [
          { id: `r-${Date.now()}-1`, values: { 'col-1': 'Métrica Exemplo', 'col-2': '100', 'col-3': '+5.0%' } }
        ]
      }
    };
    const updatedNodes = [...nodes, newNode];
    setNodes(updatedNodes);
    updateActiveBoardState(updatedNodes, edges);
  }, [isReadOnly, nodes, edges, setNodes, updateActiveBoardState]);

  // Inject isReadOnly & Update/Delete/Duplicate handlers into custom nodes
  const nodesWithProps = useMemo(() => {
    return nodes.map(n => ({
      ...n,
      data: {
        ...n.data,
        isReadOnly,
        onUpdateNodeData: handleUpdateNodeData,
        onDeleteNode: handleDeleteNode,
        onDuplicateNode: handleDuplicateNode
      }
    }));
  }, [nodes, isReadOnly, handleUpdateNodeData, handleDeleteNode, handleDuplicateNode]);

  // Inject Presentation vs Edit Mode edge properties (Solid non-animated lines in Read-Only Mode)
  const edgesWithProps = useMemo(() => {
    return edges.map(edge => ({
      ...edge,
      animated: isReadOnly ? false : (edge.animated !== undefined ? edge.animated : true),
      style: {
        ...edge.style,
        strokeDasharray: isReadOnly ? undefined : (edge.style?.strokeDasharray || undefined)
      }
    }));
  }, [edges, isReadOnly]);

  // Board CRUD Functions
  const handleSelectBoard = (boardId: string) => {
    const newStore = { ...store, activeBoardId: boardId };
    setStore(newStore);
    saveStoredFlowCanvasStore(newStore);
    setIsBoardMenuOpen(false);
  };

  const handleCreateBoard = () => {
    const newBoard: FlowBoard = {
      id: `board-${Date.now()}`,
      name: `Quadro de Análise #${store.boards.length + 1}`,
      description: 'Novo quadro de análise MER/DER',
      nodes: [],
      edges: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const newStore = {
      boards: [...store.boards, newBoard],
      activeBoardId: newBoard.id
    };
    setStore(newStore);
    saveStoredFlowCanvasStore(newStore);
    setIsBoardMenuOpen(false);
  };

  const handleDuplicateBoard = () => {
    if (!activeBoard) return;
    const duplicatedBoard: FlowBoard = {
      ...activeBoard,
      id: `board-${Date.now()}`,
      name: `${activeBoard.name} (Cópia)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const newStore = {
      boards: [...store.boards, duplicatedBoard],
      activeBoardId: duplicatedBoard.id
    };
    setStore(newStore);
    saveStoredFlowCanvasStore(newStore);
  };

  const handleDeleteBoard = () => {
    if (!activeBoard) return;
    if (confirm(`Deseja realmente excluir o quadro "${activeBoard.name}"?`)) {
      const filtered = store.boards.filter(b => b.id !== activeBoard.id);
      const newStore = {
        boards: filtered,
        activeBoardId: filtered.length > 0 ? filtered[0].id : ''
      };
      setStore(newStore);
      saveStoredFlowCanvasStore(newStore);
    }
  };

  const handleRenameBoardSave = () => {
    if (!editingBoardName.trim() || !activeBoard) return;
    const updatedBoards = store.boards.map(b => b.id === activeBoard.id ? { ...b, name: editingBoardName.trim() } : b);
    const newStore = { ...store, boards: updatedBoards };
    setStore(newStore);
    saveStoredFlowCanvasStore(newStore);
    setIsRenamingBoard(false);
  };

  if (store.boards.length === 0) {
    return (
      <div className="p-8 rounded-3xl bg-[#101010] border border-[#222222] text-center space-y-6 max-w-xl mx-auto my-12 shadow-2xl animate-fadeIn">
        <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto shadow-lg shadow-cyan-950/30">
          <Workflow className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-white tracking-wide">Fluxos de Análise Limpos</h2>
          <p className="text-xs text-slate-400 font-medium max-w-md mx-auto leading-relaxed">
            Seu ambiente de diagramação de fluxos está 100% limpo. Crie seu primeiro quadro de análise operacional para mapear conversões.
          </p>
        </div>
        <button
          onClick={handleCreateBoard}
          className="px-6 py-3.5 rounded-xl bg-brand-yellow hover:bg-yellow-400 text-slate-950 font-extrabold text-xs transition-all inline-flex items-center justify-center gap-2 shadow-lg shadow-amber-950/40 cursor-pointer active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Criar Primeiro Quadro de Análise</span>
        </button>
      </div>
    );
  }

  const canvasContent = (
    <div className={`flex flex-col bg-[#050505] text-white transition-all overflow-hidden ${
      isFullscreen 
        ? 'fixed inset-0 z-[99999] w-screen h-screen m-0 p-0 rounded-none border-0' 
        : 'h-[calc(100vh-5rem)] rounded-2xl border border-[#222222] shadow-2xl'
    }`}>
      {/* Canvas Top Bar Controls & Board Navigator */}
      <header className="h-16 px-4 bg-[#101010] border-b border-[#222222] flex items-center justify-between flex-shrink-0 z-30 shadow-md gap-3">
        {/* Left: Module Title & Board Selector Navigator */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#1C1C1C] border border-brand-yellow/30 flex items-center justify-center text-brand-yellow flex-shrink-0 shadow-sm">
            <Workflow className="w-5 h-5 text-brand-yellow" />
          </div>

          {/* Active Board Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsBoardMenuOpen(!isBoardMenuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#181818] hover:bg-[#222222] border border-[#2B2B2B] text-xs font-black text-white transition-all shadow-sm max-w-[280px]"
            >
              <Layers className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              <span className="truncate">{activeBoard?.name || 'Selecione o Quadro'}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isBoardMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Board Selector Dropdown Menu */}
            {isBoardMenuOpen && (
              <>
                <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsBoardMenuOpen(false)} />
                <div className="absolute left-0 top-full mt-2 w-72 bg-[#121212] border border-[#2A2A2A] rounded-2xl shadow-2xl z-50 p-2 space-y-1 animate-fadeIn">
                  <div className="px-3 py-1 text-[10px] font-mono font-bold uppercase text-slate-400 border-b border-[#222222]">
                    Quadros de Análise ({store.boards.length})
                  </div>

                  <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-0.5">
                    {store.boards.map(board => (
                      <button
                        key={board.id}
                        onClick={() => handleSelectBoard(board.id)}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                          board.id === activeBoard.id
                            ? 'bg-brand-yellow/15 text-brand-yellow border border-brand-yellow/30 font-bold'
                            : 'text-slate-300 hover:bg-[#1C1C1C] hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Layers className={`w-3.5 h-3.5 flex-shrink-0 ${board.id === activeBoard.id ? 'text-brand-yellow' : 'text-slate-500'}`} />
                          <span className="truncate">{board.name}</span>
                        </div>
                        {board.id === activeBoard.id && <Check className="w-3.5 h-3.5 text-brand-yellow flex-shrink-0" />}
                      </button>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-[#222222] flex items-center justify-between">
                    <button
                      onClick={handleCreateBoard}
                      className="w-full py-1.5 px-3 rounded-xl bg-brand-yellow text-dark-900 text-xs font-extrabold flex items-center justify-center gap-1.5 hover:bg-amber-400 transition-colors shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Novo Quadro</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Board Actions (Rename Inline Input or Edit Button) */}
          {isRenamingBoard ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={editingBoardName}
                onChange={(e) => setEditingBoardName(e.target.value)}
                className="px-2.5 py-1 rounded-lg bg-[#161616] border border-brand-yellow text-xs font-bold text-white focus:outline-none w-48"
                autoFocus
              />
              <button
                onClick={handleRenameBoardSave}
                className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-1">
              <button
                onClick={() => setIsRenamingBoard(true)}
                className="p-1.5 rounded-lg bg-[#181818] hover:bg-[#222222] border border-[#2B2B2B] text-slate-400 hover:text-white transition-colors"
                title="Renomear Quadro"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleDuplicateBoard}
                className="p-1.5 rounded-lg bg-[#181818] hover:bg-[#222222] border border-[#2B2B2B] text-slate-400 hover:text-white transition-colors"
                title="Duplicar Quadro"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleDeleteBoard}
                className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors"
                title="Excluir Quadro"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Right: View Mode Toggle & Add Table Button */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {/* Read-Only vs Edit Mode Toggle Button */}
          <div className="flex items-center bg-[#161616] p-1 rounded-xl border border-[#2A2A2A]">
            <button
              onClick={() => setIsReadOnly(false)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                !isReadOnly
                  ? 'bg-brand-yellow text-dark-900 shadow-sm font-extrabold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Edição</span>
            </button>
            <button
              onClick={() => setIsReadOnly(true)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                isReadOnly
                  ? 'bg-cyan-500 text-white shadow-sm font-extrabold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Visualização</span>
            </button>
          </div>

          {/* Add Table Button (Edit Mode Only) */}
          {!isReadOnly && (
            <button
              onClick={handleAddTableNode}
              className="px-3.5 py-1.5 rounded-xl bg-[#1C1C1C] hover:bg-[#262626] border border-[#333333] text-white text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Plus className="w-4 h-4 text-brand-yellow" />
              <span className="hidden sm:inline">Tabela</span>
            </button>
          )}

          {/* Fullscreen Presentation Mode Button */}
          <button
            onClick={toggleFullscreen}
            className={`p-2 rounded-xl border transition-all ${
              isFullscreen
                ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                : 'bg-[#181818] hover:bg-[#222222] text-slate-300 border-[#2B2B2B]'
            }`}
            title={isFullscreen ? 'Sair da Tela Cheia' : 'Apresentação em Tela Cheia'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Canvas Viewport */}
      <div className="flex-1 w-full h-full relative bg-[#070708]">
        {/* Active Mode Status Badge Indicator */}
        <div className="absolute top-4 left-4 z-20 pointer-events-none">
          <span className={`px-3 py-1 rounded-xl text-[11px] font-black uppercase tracking-wider border shadow-md flex items-center gap-1.5 ${
            isReadOnly
              ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
              : 'bg-brand-yellow/10 text-brand-yellow border-brand-yellow/30'
          }`}>
            <span className={`w-2 h-2 rounded-full animate-pulse ${isReadOnly ? 'bg-cyan-400' : 'bg-brand-yellow'}`} />
            <span>{isReadOnly ? 'MODO VISUALIZAÇÃO (READ-ONLY)' : 'MODO EDIÇÃO (INTERATIVO)'}</span>
          </span>
        </div>

        <ReactFlow
          nodes={nodesWithProps}
          edges={edgesWithProps}
          onNodesChange={handleNodesChangeWrapped}
          onEdgesChange={handleEdgesChangeWrapped}
          onConnect={onConnect}
          onEdgeClick={onEdgeClick}
          nodeTypes={nodeTypes}
          nodesDraggable={!isReadOnly}
          nodesConnectable={!isReadOnly}
          elementsSelectable={!isReadOnly}
          deleteKeyCode={!isReadOnly ? ['Backspace', 'Delete'] : null}
          panOnScroll
          zoomOnPinch
          zoomOnScroll
          fitView
          className="bg-[#050505]"
        >
          {/* Background Grid */}
          {!isReadOnly ? (
            <Background color="#222222" gap={20} size={1} variant={BackgroundVariant.Dots} />
          ) : (
            <Background color="#141414" gap={30} size={0.5} variant={BackgroundVariant.Dots} />
          )}

          {/* Clean Dark Styled Zoom & Pan Controls */}
          <Controls 
            className="!bg-[#121212] !border !border-[#262626] !rounded-xl !shadow-2xl overflow-hidden [&_button]:!bg-[#121212] [&_button]:!border-b [&_button]:!border-[#222222] [&_button]:!fill-[#E2E8F0] [&_button]:!stroke-[#E2E8F0] [&_button:hover]:!bg-[#1C1C1C]" 
          />
        </ReactFlow>
      </div>
    </div>
  );

  if (isFullscreen) {
    return createPortal(canvasContent, document.body);
  }

  return canvasContent;
};
