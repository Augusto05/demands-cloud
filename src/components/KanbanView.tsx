import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Search,
  Tag as TagIcon,
  Calendar,
  History,
  Settings,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  X,
  Trash2,
  Users,
  ArrowRight,
  ArrowLeft,
  GripVertical
} from 'lucide-react';
import { KanbanStore, KanbanCard, KanbanColumn, KanbanTag } from '../types';
import { getStoredKanban, saveStoredKanban, formatDueDateBadge } from '../services/kanbanService';
import { KanbanCardModal } from './KanbanCardModal';
import { getStorageItem } from '../services/syncService';

export const KanbanView: React.FC = () => {
  const [store, setStore] = useState<KanbanStore>(getStoredKanban);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
  const [onlyOverdueFilter, setOnlyOverdueFilter] = useState(false);

  // Drag and Drop State
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);

  // Modals
  const [editingCard, setEditingCard] = useState<{ card: KanbanCard | null, colId?: string } | null>(null);
  const [showTagManager, setShowTagManager] = useState(false);
  const [showColumnManager, setShowColumnManager] = useState(false);

  // New Tag form state
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#38BDF8');

  // New Column form state
  const [newColTitle, setNewColTitle] = useState('');
  const [newColColor, setNewColColor] = useState('#FACC15');

  // Save to storage on change
  useEffect(() => {
    saveStoredKanban(store);
  }, [store]);

  // Sync background polling for cross-device updates
  useEffect(() => {
    const interval = setInterval(async () => {
      const remote = await getStorageItem<KanbanStore>('kanban', 'demands_kanban_store_v2', store);
      if (remote && remote.cards && JSON.stringify(remote.cards) !== JSON.stringify(store.cards)) {
        setStore(remote);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [store]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -350 : 350;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, cardId: string) => {
    e.dataTransfer.setData('text/plain', cardId);
    setDraggedCardId(cardId);
  };

  const handleDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    if (dragOverColId !== colId) {
      setDragOverColId(colId);
    }
  };

  const handleDragLeave = (e: React.DragEvent, colId: string) => {
    if (dragOverColId === colId) {
      setDragOverColId(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetColId: string) => {
    e.preventDefault();
    setDragOverColId(null);
    const cardId = e.dataTransfer.getData('text/plain') || draggedCardId;
    if (!cardId) return;

    const updatedCards = store.cards.map(c => c.id === cardId ? { ...c, columnId: targetColId } : c);
    setStore({ ...store, cards: updatedCards });
    setDraggedCardId(null);
  };

  // CRUD Cards
  const handleSaveCard = (savedCard: KanbanCard) => {
    const exists = store.cards.some(c => c.id === savedCard.id);
    let updatedCards: KanbanCard[];
    if (exists) {
      updatedCards = store.cards.map(c => c.id === savedCard.id ? savedCard : c);
    } else {
      updatedCards = [...store.cards, savedCard];
    }
    setStore({ ...store, cards: updatedCards });
    setEditingCard(null);
  };

  const handleDeleteCard = (cardId: string) => {
    const updatedCards = store.cards.filter(c => c.id !== cardId);
    setStore({ ...store, cards: updatedCards });
    setEditingCard(null);
  };

  const handleMoveCard = (cardId: string, direction: 'next' | 'prev') => {
    const sortedCols = [...store.columns].sort((a, b) => a.order - b.order);
    const targetCard = store.cards.find(c => c.id === cardId);
    if (!targetCard) return;

    const currentIdx = sortedCols.findIndex(c => c.id === targetCard.columnId);
    if (currentIdx === -1) return;

    const newIdx = direction === 'next' ? currentIdx + 1 : currentIdx - 1;
    if (newIdx < 0 || newIdx >= sortedCols.length) return;

    const newColId = sortedCols[newIdx].id;
    const updatedCards = store.cards.map(c => c.id === cardId ? { ...c, columnId: newColId } : c);
    setStore({ ...store, cards: updatedCards });
  };

  // CRUD Tags
  const handleAddTag = () => {
    if (!newTagName.trim()) return;
    const newTag: KanbanTag = {
      id: `tag-${Date.now()}`,
      name: newTagName.trim(),
      color: newTagColor
    };
    setStore({ ...store, tags: [...store.tags, newTag] });
    setNewTagName('');
  };

  const handleDeleteTag = (tagId: string) => {
    setStore({ ...store, tags: store.tags.filter(t => t.id !== tagId) });
  };

  // CRUD Columns
  const handleAddColumn = () => {
    if (!newColTitle.trim()) return;
    const newCol: KanbanColumn = {
      id: `col-${Date.now()}`,
      title: newColTitle.trim(),
      color: newColColor,
      order: store.columns.length
    };
    setStore({ ...store, columns: [...store.columns, newCol] });
    setNewColTitle('');
  };

  const handleDeleteColumn = (colId: string) => {
    if (confirm('Excluir esta coluna e mover os cards dela?')) {
      const updatedCols = store.columns.filter(c => c.id !== colId);
      setStore({ ...store, columns: updatedCols });
    }
  };

  // Filter Cards
  const getFilteredCardsForColumn = (colId: string) => {
    return store.cards.filter(card => {
      if (card.columnId !== colId) return false;

      // Text search
      if (searchTerm.trim().length > 0) {
        const term = searchTerm.toLowerCase();
        const titleMatch = card.title.toLowerCase().includes(term);
        const subMatch = (card.subtitle || '').toLowerCase().includes(term);
        const descMatch = (card.description || '').toLowerCase().includes(term);
        if (!titleMatch && !subMatch && !descMatch) return false;
      }

      // Tag filter
      if (selectedTagFilter) {
        if (!card.tags.includes(selectedTagFilter)) return false;
      }

      // Overdue filter
      if (onlyOverdueFilter) {
        if (!card.dueDate) return false;
        const dueInfo = formatDueDateBadge(card.dueDate);
        if (!dueInfo.isOverdue && !dueInfo.isToday) return false;
      }

      return true;
    });
  };

  // Helper for Card Color Classes
  const getCardColorClasses = (color?: string) => {
    switch (color) {
      case 'slate':
        return 'bg-[#242424] hover:bg-[#2C2C2C] border-[#383838] hover:border-[#484848] text-slate-100 shadow-md';
      case 'rose':
        return 'bg-rose-500/10 border-rose-500/30 hover:border-rose-400 text-rose-100';
      case 'amber':
        return 'bg-amber-500/10 border-amber-500/30 hover:border-amber-400 text-amber-100';
      case 'emerald':
        return 'bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-400 text-emerald-100';
      case 'cyan':
        return 'bg-cyan-500/10 border-cyan-500/30 hover:border-cyan-400 text-cyan-100';
      case 'purple':
        return 'bg-purple-500/10 border-purple-500/30 hover:border-purple-400 text-purple-100';
      default:
        return 'bg-[#141414] hover:bg-[#1C1C1C] border-[#222222] hover:border-[#333333] text-white shadow-md';
    }
  };

  const sortedColumns = [...store.columns].sort((a, b) => a.order - b.order);
  const [isMobileHeaderExpanded, setIsMobileHeaderExpanded] = useState(false);

  const userDisplayName = localStorage.getItem('demands_current_name') || localStorage.getItem('demands_current_username') || 'Usuário';

  return (
    <div className="space-y-6 w-full max-w-full overflow-hidden">
      {/* Header Bar */}
      <div className="p-4 sm:p-6 rounded-2xl bg-[#101010] border border-[#222222] shadow-xl space-y-4">
        {/* Mobile Compact Bar (lg:hidden) */}
        <div 
          onClick={() => setIsMobileHeaderExpanded(!isMobileHeaderExpanded)}
          className="lg:hidden flex items-center justify-between cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <span className="text-brand-yellow font-extrabold text-sm">{userDisplayName} | Demandas Leadsale</span>
            <span className="text-[10px] font-bold text-slate-400 bg-[#161616] px-2 py-0.5 rounded-md border border-[#222222]">
              {store.cards.length} tarefas
            </span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMobileHeaderExpanded(!isMobileHeaderExpanded);
            }}
            className={`px-2.5 py-1 rounded-xl border text-xs font-bold transition-all flex items-center gap-1 ${
              isMobileHeaderExpanded 
                ? 'bg-brand-yellow text-dark-900 border-brand-yellow font-extrabold' 
                : 'bg-[#161616] text-slate-300 border-[#222222]'
            }`}
          >
            <span>{isMobileHeaderExpanded ? 'Fechar' : 'Opções'}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isMobileHeaderExpanded ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Full Header Controls (Always visible on Desktop, Collapsible on Mobile) */}
        <div className={`space-y-4 ${isMobileHeaderExpanded ? 'block animate-fadeIn' : 'hidden lg:block'}`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Title */}
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                <span>{userDisplayName}</span>
                <span className="text-slate-600 font-light">|</span>
                <span className="text-brand-yellow font-extrabold">Demandas Leadsale</span>
              </h1>
            </div>

          {/* Top Actions & Horizontal Scroll Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-dark-900/80 p-1 rounded-xl border border-slate-800 mr-2">
              <button
                onClick={() => handleScroll('left')}
                className="p-1.5 rounded-lg bg-dark-700 hover:bg-dark-600 text-slate-300 hover:text-white transition-colors"
                title="Rolar etapas para esquerda"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleScroll('right')}
                className="p-1.5 rounded-lg bg-dark-700 hover:bg-dark-600 text-slate-300 hover:text-white transition-colors"
                title="Rolar etapas para direita"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => alert('Histórico de alterações em tempo real.')}
              className="px-3.5 py-2 rounded-xl bg-dark-700 hover:bg-dark-600 border border-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <History className="w-3.5 h-3.5" />
              <span>Histórico</span>
            </button>

            <button
              onClick={() => setShowTagManager(true)}
              className="px-3.5 py-2 rounded-xl bg-dark-700 hover:bg-dark-600 border border-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <TagIcon className="w-3.5 h-3.5 text-cyan-400" />
              <span>Flags</span>
            </button>

            <button
              onClick={() => alert('Gerenciamento de permissões ativado.')}
              className="px-3.5 py-2 rounded-xl bg-dark-700 hover:bg-dark-600 border border-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span>Permissões</span>
            </button>

            <button
              onClick={() => setShowColumnManager(true)}
              className="px-3.5 py-2 rounded-xl bg-dark-700 hover:bg-dark-600 border border-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <Settings className="w-3.5 h-3.5 text-purple-400" />
              <span>Configurações</span>
            </button>
          </div>
        </div>

        {/* Search & Quick Filters Bar */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por título, subtítulo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-dark-900 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-brand-yellow font-medium"
            />
          </div>

          {/* Tag Selector Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 custom-scrollbar max-w-full">
            <button
              onClick={() => setSelectedTagFilter(null)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${selectedTagFilter === null
                  ? 'bg-dark-600 text-white border border-slate-600 shadow-sm'
                  : 'bg-dark-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
            >
              Todas as Flags
            </button>

            {store.tags.map(tg => (
              <button
                key={tg.id}
                onClick={() => setSelectedTagFilter(selectedTagFilter === tg.name ? null : tg.name)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${selectedTagFilter === tg.name
                    ? 'bg-amber-400 text-dark-900 shadow-md font-extrabold'
                    : 'bg-dark-900 text-slate-300 border border-slate-800 hover:border-slate-700'
                  }`}
              >
                <TagIcon className="w-3 h-3 text-cyan-400" />
                <span>{tg.name}</span>
              </button>
            ))}
          </div>

          {/* Overdue Filter Pill */}
          <button
            onClick={() => setOnlyOverdueFilter(!onlyOverdueFilter)}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 whitespace-nowrap ${onlyOverdueFilter
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-glow-rose'
                : 'bg-dark-700 text-slate-400 border border-slate-700 hover:text-slate-200'
              }`}
          >
            <Calendar className="w-3.5 h-3.5 text-rose-400" />
            <span>Vencidos / Hoje</span>
          </button>
        </div>
      </div>
    </div>

      {/* Kanban Columns Grid Container */}
      <div
        ref={scrollContainerRef}
        className="flex items-start gap-4 overflow-x-auto pb-6 pt-2 custom-scrollbar min-h-[650px] w-full snap-x snap-mandatory"
      >
        {sortedColumns.map(col => {
          const colCards = getFilteredCardsForColumn(col.id);
          const isOver = dragOverColId === col.id;

          return (
            <div
              key={col.id}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={(e) => handleDragLeave(e, col.id)}
              onDrop={(e) => handleDrop(e, col.id)}
              className={`w-[85vw] sm:w-80 flex-shrink-0 snap-center bg-[#101010] border rounded-2xl p-4 space-y-3 flex flex-col max-h-[780px] transition-all duration-200 ${isOver
                  ? 'border-brand-yellow ring-2 ring-brand-yellow/30 bg-[#161616] scale-[1.01]'
                  : 'border-[#222222]'
                }`}
              style={{ borderTop: `4px solid ${col.color}` }}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: col.color }} />
                  <h3 className="font-extrabold text-sm text-white">{col.title}</h3>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="w-6 h-6 rounded-full bg-dark-700 text-slate-300 font-extrabold text-xs flex items-center justify-center border border-slate-700">
                    {colCards.length}
                  </span>
                  <button
                    onClick={() => setEditingCard({ card: null, colId: col.id })}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-dark-700 transition-colors"
                    title="Adicionar demanda"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Cards Container */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar min-h-[150px]">
                {colCards.length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-slate-800/80 rounded-xl bg-dark-900/20">
                    <span className="text-[11px] text-slate-500 font-medium block">Arraste um card para cá</span>
                  </div>
                ) : (
                  colCards.map(card => {
                    const dueInfo = card.dueDate ? formatDueDateBadge(card.dueDate) : null;
                    const cardColorClass = getCardColorClasses(card.color);

                    return (
                      <div
                        key={card.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, card.id)}
                        onClick={() => setEditingCard({ card })}
                        className={`group relative p-4 rounded-xl border transition-all cursor-grab active:cursor-grabbing shadow-md hover:shadow-lg space-y-2.5 ${cardColorClass}`}
                      >
                        {/* Tags Header (renders only if card has tags) */}
                        {card.tags.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 mb-1">
                            {card.tags.map((tName, tIdx) => {
                              const tagObj = store.tags.find(t => t.name === tName);
                              return (
                                <span
                                  key={tIdx}
                                  className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide"
                                  style={{
                                    backgroundColor: tagObj ? `${tagObj.color}35` : '#334155',
                                    color: tagObj ? tagObj.color : '#F8FAFC',
                                    border: `1px solid ${tagObj ? tagObj.color : '#475569'}60`
                                  }}
                                >
                                  {tName}
                                </span>
                              );
                            })}
                          </div>
                        )}

                        {/* Title */}
                        <h4 className="font-extrabold text-sm text-white group-hover:text-brand-yellow transition-colors leading-snug">
                          {card.title}
                        </h4>

                        {/* Subtitle preview */}
                        {card.subtitle && (
                          <p className="text-[10px] font-bold text-slate-300/80 uppercase tracking-tight line-clamp-2">
                            {card.subtitle}
                          </p>
                        )}

                        {/* Due Date Badge */}
                        {dueInfo && (
                          <div className="pt-1 flex items-center gap-1.5">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-extrabold ${dueInfo.isOverdue
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                : dueInfo.isToday
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              }`}>
                              <Calendar className="w-3 h-3" />
                              <span>{dueInfo.text}</span>
                            </span>
                          </div>
                        )}

                        {/* Quick Action Overlay (Move Card) */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2 flex items-center gap-1 bg-[#101010] p-1 rounded-lg border border-[#222222] shadow-lg">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleMoveCard(card.id, 'prev'); }}
                            className="p-1 hover:bg-dark-700 text-slate-300 hover:text-white rounded"
                            title="Mover para esquerda"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleMoveCard(card.id, 'next'); }}
                            className="p-1 hover:bg-dark-700 text-slate-300 hover:text-white rounded"
                            title="Mover para direita"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Add Card Button */}
              <button
                onClick={() => setEditingCard({ card: null, colId: col.id })}
                className="w-full py-2.5 rounded-xl bg-dark-900/60 hover:bg-dark-700 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5 mt-auto"
              >
                <Plus className="w-3.5 h-3.5 text-brand-yellow" />
                <span>Adicionar card</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Edit / Create Card Modal */}
      {editingCard && (
        <KanbanCardModal
          card={editingCard.card}
          initialColumnId={editingCard.colId}
          columns={store.columns}
          tags={store.tags}
          onSave={handleSaveCard}
          onDelete={handleDeleteCard}
          onClose={() => setEditingCard(null)}
        />
      )}

      {/* Tag Manager Modal */}
      {showTagManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="w-full max-w-md bg-dark-800 border border-slate-700 rounded-2xl p-6 space-y-4 shadow-2xl glass-card">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <TagIcon className="w-4 h-4 text-cyan-400" />
                <span>Gerenciar Flags / Tags</span>
              </h3>
              <button onClick={() => setShowTagManager(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Add new tag */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Nome da flag..."
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-dark-900 border border-slate-700 text-xs text-white font-semibold focus:outline-none"
              />
              <input
                type="color"
                value={newTagColor}
                onChange={(e) => setNewTagColor(e.target.value)}
                className="w-10 h-9 p-1 rounded-xl bg-dark-900 border border-slate-700 cursor-pointer"
              />
              <button
                onClick={handleAddTag}
                className="px-3 py-2 rounded-xl bg-brand-yellow text-dark-900 text-xs font-bold"
              >
                Adicionar
              </button>
            </div>

            {/* Existing tags list */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {store.tags.map(tg => (
                <div key={tg.id} className="p-2.5 rounded-xl bg-dark-700/50 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: tg.color }} />
                    <span className="text-xs font-bold text-white">{tg.name}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteTag(tg.id)}
                    className="p-1 text-rose-400 hover:bg-rose-500/20 rounded-lg"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Column Manager Modal */}
      {showColumnManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="w-full max-w-md bg-dark-800 border border-slate-700 rounded-2xl p-6 space-y-4 shadow-2xl glass-card">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <Settings className="w-4 h-4 text-purple-400" />
                <span>Gerenciar Etapas (Colunas)</span>
              </h3>
              <button onClick={() => setShowColumnManager(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Add new column */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Nome da etapa..."
                value={newColTitle}
                onChange={(e) => setNewColTitle(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-dark-900 border border-slate-700 text-xs text-white font-semibold focus:outline-none"
              />
              <input
                type="color"
                value={newColColor}
                onChange={(e) => setNewColColor(e.target.value)}
                className="w-10 h-9 p-1 rounded-xl bg-dark-900 border border-slate-700 cursor-pointer"
              />
              <button
                onClick={handleAddColumn}
                className="px-3 py-2 rounded-xl bg-brand-yellow text-dark-900 text-xs font-bold"
              >
                Criar
              </button>
            </div>

            {/* Existing columns list */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {sortedColumns.map(col => (
                <div key={col.id} className="p-2.5 rounded-xl bg-dark-700/50 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: col.color }} />
                    <span className="text-xs font-bold text-white">{col.title}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteColumn(col.id)}
                    className="p-1 text-rose-400 hover:bg-rose-500/20 rounded-lg"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
