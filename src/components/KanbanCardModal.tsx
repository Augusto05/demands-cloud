import React, { useState, useEffect } from 'react';
import { X, Calendar, Tag as TagIcon, Layout, Palette, Trash2, Check, AlignLeft } from 'lucide-react';
import { KanbanCard, KanbanColumn, KanbanTag } from '../types';

interface KanbanCardModalProps {
  card: KanbanCard | null; // null if creating new card
  initialColumnId?: string;
  columns: KanbanColumn[];
  tags: KanbanTag[];
  onSave: (savedCard: KanbanCard) => void;
  onDelete?: (cardId: string) => void;
  onClose: () => void;
}

export const KanbanCardModal: React.FC<KanbanCardModalProps> = ({
  card,
  initialColumnId,
  columns,
  tags,
  onSave,
  onDelete,
  onClose
}) => {
  const [title, setTitle] = useState(card?.title || '');
  const [subtitle, setSubtitle] = useState(card?.subtitle || '');
  const [description, setDescription] = useState(card?.description || '');
  const [columnId, setColumnId] = useState(card?.columnId || initialColumnId || columns[0]?.id || 'col-afazer');
  const [dueDate, setDueDate] = useState(card?.dueDate || '');
  const [selectedTags, setSelectedTags] = useState<string[]>(card?.tags || []);
  const [cardColor, setCardColor] = useState(card?.color || '');

  const colorOptions = [
    { label: 'Padrão (Escuro)', value: '' },
    { label: 'Cinza Claro', value: 'slate' },
    { label: 'Vermelho / Coral', value: 'rose' },
    { label: 'Amarelo', value: 'amber' },
    { label: 'Verde', value: 'emerald' },
    { label: 'Azul', value: 'cyan' },
    { label: 'Roxo', value: 'purple' }
  ];

  const handleToggleTag = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      setSelectedTags(selectedTags.filter(t => t !== tagName));
    } else {
      setSelectedTags([...selectedTags, tagName]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const saved: KanbanCard = {
      id: card ? card.id : `card-${Date.now()}`,
      columnId,
      title: title.trim(),
      subtitle: subtitle.trim() || undefined,
      description: description.trim() || undefined,
      tags: selectedTags,
      dueDate: dueDate || undefined,
      color: cardColor || undefined,
      createdAt: card ? card.createdAt : new Date().toISOString()
    };

    onSave(saved);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-fadeIn">
      <div className="w-full max-w-xl bg-[#101010] border border-[#222222] rounded-2xl shadow-2xl overflow-hidden animate-scaleUp">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#222222] flex items-center justify-between">
          <h3 className="text-base font-extrabold text-white flex items-center gap-2">
            <Layout className="w-5 h-5 text-brand-yellow" />
            <span>{card ? 'Editar Demanda' : 'Nova Demanda'}</span>
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#161616] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {/* Title */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">Título da Demanda *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Atualizar Blocklists..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0A0A] border border-[#222222] text-sm font-bold text-white focus:outline-none focus:border-brand-yellow"
            />
          </div>

          {/* Subtitle / Short summary */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">Subtítulo / Resumo em Destaque</label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Ex: ANÁLISE COM JOÃO SOBRE O COMPORTAMENTO..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0A0A] border border-[#222222] text-xs font-semibold text-slate-300 focus:outline-none focus:border-brand-yellow uppercase"
            />
          </div>

          {/* Column / Etapa Selector & Due Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">Etapa / Coluna</label>
              <select
                value={columnId}
                onChange={(e) => setColumnId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0A0A] border border-[#222222] text-xs font-bold text-white focus:outline-none focus:border-brand-yellow"
              >
                {columns.map(col => (
                  <option key={col.id} value={col.id}>
                    {col.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1 mb-1.5">
                <Calendar className="w-3.5 h-3.5 text-brand-yellow" />
                <span>Data de Entrega</span>
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0A0A] border border-[#222222] text-xs font-bold text-white focus:outline-none focus:border-brand-yellow"
              />
            </div>
          </div>

          {/* Tags Selection */}
          <div>
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1 mb-2">
              <TagIcon className="w-3.5 h-3.5 text-cyan-400" />
              <span>Flags / Tags</span>
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {tags.map(tg => {
                const isSelected = selectedTags.includes(tg.name);
                return (
                  <button
                    type="button"
                    key={tg.id}
                    onClick={() => handleToggleTag(tg.name)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                      isSelected 
                        ? 'bg-amber-400 text-dark-900 shadow-md border border-amber-400' 
                        : 'bg-[#0A0A0A] text-slate-400 border border-[#222222] hover:border-slate-500'
                    }`}
                  >
                    <span>{tg.name}</span>
                    {isSelected && <Check className="w-3 h-3 text-dark-900" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Accent */}
          <div>
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1 mb-2">
              <Palette className="w-3.5 h-3.5 text-purple-400" />
              <span>Cor do Card</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {colorOptions.map(opt => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => setCardColor(opt.value)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold text-left border transition-all ${
                    cardColor === opt.value
                      ? 'border-brand-yellow bg-[#161616] text-white font-bold'
                      : 'border-[#222222] bg-[#0A0A0A] text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Detailed Description Textarea */}
          <div>
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1 mb-1.5">
              <AlignLeft className="w-3.5 h-3.5 text-emerald-400" />
              <span>Descrição Completa e Anotações</span>
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Escreva detalhes técnicos, orientações ou anotações da demanda..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0A0A] border border-[#222222] text-xs font-medium text-slate-200 focus:outline-none focus:border-brand-yellow resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-[#222222] flex items-center justify-between">
            {card && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Tem certeza que deseja excluir esta demanda?')) {
                    onDelete(card.id);
                  }
                }}
                className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Excluir</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-[#161616] hover:bg-[#1F1F1F] border border-[#222222] text-xs font-bold text-slate-300 transition-colors"
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-brand-yellow hover:bg-yellow-400 text-dark-900 text-xs font-extrabold shadow-lg transition-all"
              >
                Salvar Demanda
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
