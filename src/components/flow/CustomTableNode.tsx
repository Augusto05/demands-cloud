import React, { memo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import * as LucideIcons from 'lucide-react';
import { Plus, Trash2, ArrowUpRight, ArrowDownRight, Minus, X, Copy } from 'lucide-react';
import { FlowTableNodeData, FlowMetricRow, FlowColumn } from '../../types';

interface CustomTableNodeProps {
  id: string;
  data: FlowTableNodeData & {
    isReadOnly?: boolean;
    onUpdateNodeData?: (id: string, updatedData: Partial<FlowTableNodeData>) => void;
    onDeleteNode?: (id: string) => void;
    onDuplicateNode?: (id: string) => void;
  };
  selected?: boolean;
}

const PRESET_COLORS = [
  { name: 'Âmbar', hex: '#F59E0B' },
  { name: 'Esmeralda', hex: '#10B981' },
  { name: 'Ciano', hex: '#06B6D4' },
  { name: 'Rosa', hex: '#EF4444' },
  { name: 'Roxo', hex: '#8B5CF6' },
  { name: 'Azul', hex: '#3B82F6' },
];

const AVAILABLE_ICONS = [
  'Table', 'PhoneCall', 'FileText', 'UserCheck', 'Building2', 
  'ShieldAlert', 'Database', 'Workflow', 'TrendingUp', 'BarChart3', 
  'Layers', 'DollarSign', 'CreditCard', 'Cpu', 'PieChart', 
  'Globe', 'Activity', 'CheckSquare', 'Zap', 'Sparkles'
];

const DEFAULT_COLUMNS: FlowColumn[] = [
  { id: 'col-1', name: 'Métrica' },
  { id: 'col-2', name: 'Valor' },
  { id: 'col-3', name: 'Delta %' }
];

export const CustomTableNode = memo(({ id, data, selected }: CustomTableNodeProps) => {
  const isReadOnly = data.isReadOnly || false;
  const headerColor = data.color || '#F59E0B';
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);

  const columns: FlowColumn[] = data.columns && data.columns.length > 0 ? data.columns : DEFAULT_COLUMNS;
  const rows: FlowMetricRow[] = data.rows || [];

  // Dynamic Lucide Icon Component Helper
  const getLucideIcon = (name?: string) => {
    if (!name) return LucideIcons.Table;
    const IconComponent = (LucideIcons as any)[name];
    if (IconComponent) {
      return IconComponent;
    }
    return LucideIcons.Table;
  };

  const IconComp = getLucideIcon(data.iconName);

  // Helper to extract cell value from row (with backward compatibility fallbacks)
  const getCellValue = (row: FlowMetricRow, colId: string, colIdx: number): string => {
    if (row.values && row.values[colId] !== undefined) {
      return String(row.values[colId]);
    }
    // Backward compatibility for old metric/value/deltaPct structure
    if (colIdx === 0 && row.metric) return row.metric;
    if (colIdx === 1 && row.value) return String(row.value);
    if (colIdx === 2 && row.deltaPct !== undefined) {
      const d = row.deltaPct;
      return d > 0 ? `+${d}%` : `${d}%`;
    }
    return '';
  };

  // Row & Column Management Functions
  const handleAddRow = () => {
    if (isReadOnly || !data.onUpdateNodeData) return;
    const initialValues: Record<string, string> = {};
    columns.forEach((col, idx) => {
      if (idx === 0) initialValues[col.id] = 'Nova Métrica';
      else if (idx === 1) initialValues[col.id] = '0';
      else initialValues[col.id] = '0%';
    });

    const newRow: FlowMetricRow = {
      id: `row-${Date.now()}`,
      values: initialValues
    };
    data.onUpdateNodeData(id, { rows: [...rows, newRow] });
  };

  const handleUpdateCell = (rowId: string, colId: string, newValue: string) => {
    if (isReadOnly || !data.onUpdateNodeData) return;
    const updatedRows = rows.map(r => {
      if (r.id === rowId) {
        return {
          ...r,
          values: {
            ...(r.values || {}),
            [colId]: newValue
          }
        };
      }
      return r;
    });
    data.onUpdateNodeData(id, { rows: updatedRows });
  };

  const handleDeleteRow = (rowId: string) => {
    if (isReadOnly || !data.onUpdateNodeData) return;
    data.onUpdateNodeData(id, { rows: rows.filter(r => r.id !== rowId) });
  };

  // Column Header Editing & Adding/Removing
  const handleAddColumn = () => {
    if (isReadOnly || !data.onUpdateNodeData) return;
    const newColId = `col-${Date.now()}`;
    const newCol: FlowColumn = { id: newColId, name: `Coluna ${columns.length + 1}` };
    const updatedColumns = [...columns, newCol];
    data.onUpdateNodeData(id, { columns: updatedColumns });
  };

  const handleUpdateColumnName = (colId: string, newName: string) => {
    if (isReadOnly || !data.onUpdateNodeData) return;
    const updatedColumns = columns.map(c => c.id === colId ? { ...c, name: newName } : c);
    data.onUpdateNodeData(id, { columns: updatedColumns });
  };

  const handleDeleteColumn = (colId: string) => {
    if (isReadOnly || !data.onUpdateNodeData) return;
    if (columns.length <= 1) {
      alert('A tabela deve conter pelo menos 1 coluna.');
      return;
    }
    const updatedColumns = columns.filter(c => c.id !== colId);
    data.onUpdateNodeData(id, { columns: updatedColumns });
  };

  const handleLabelChange = (newLabel: string) => {
    if (isReadOnly || !data.onUpdateNodeData) return;
    data.onUpdateNodeData(id, { label: newLabel });
  };

  const handleColorChange = (newColor: string) => {
    if (isReadOnly || !data.onUpdateNodeData) return;
    data.onUpdateNodeData(id, { color: newColor });
  };

  const handleIconSelect = (iconName: string) => {
    if (isReadOnly || !data.onUpdateNodeData) return;
    data.onUpdateNodeData(id, { iconName });
    setIsIconPickerOpen(false);
  };

  // Format cell value for delta percentages (e.g. "+12.5%", "-5.4%") in Presentation mode
  const renderCellBadge = (valStr: string) => {
    const trimmed = valStr.trim();
    const isPct = trimmed.endsWith('%') || trimmed.startsWith('+') || trimmed.startsWith('-');
    if (!isPct) {
      return <span className="font-mono font-black text-white text-xs sm:text-[13px] block truncate">{valStr}</span>;
    }

    const isPositive = trimmed.startsWith('+');
    const isNegative = trimmed.startsWith('-');

    return (
      <span 
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs sm:text-[12px] font-mono font-bold transition-all ${
          isPositive 
            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
            : isNegative 
              ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30' 
              : 'bg-[#161616] text-slate-300 border border-[#282828]'
        }`}
      >
        {isPositive && <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />}
        {isNegative && <ArrowDownRight className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />}
        {!isPositive && !isNegative && <Minus className="w-3 h-3 text-slate-400 flex-shrink-0" />}
        <span className="font-black tracking-tight">{valStr}</span>
      </span>
    );
  };

  return (
    <div 
      className={`min-w-[300px] max-w-[440px] rounded-2xl bg-[#101010] border transition-all duration-300 shadow-2xl overflow-hidden select-none ${
        selected ? 'border-brand-yellow ring-2 ring-brand-yellow/30 shadow-brand-yellow/10' : 'border-[#222222]'
      }`}
    >
      {/* Target & Source Connection Handles (MOUNTED AT ALL TIMES for React Flow Edge calculations, visually styled for Edit vs Presentation Mode) */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className={`!w-3 !h-3 !bg-brand-yellow !border-2 !border-[#101010] transition-opacity ${
          isReadOnly ? '!opacity-0 !pointer-events-none' : 'hover:!scale-125'
        }`}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className={`!w-3 !h-3 !bg-brand-yellow !border-2 !border-[#101010] transition-opacity ${
          isReadOnly ? '!opacity-0 !pointer-events-none' : 'hover:!scale-125'
        }`}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className={`!w-3 !h-3 !bg-brand-yellow !border-2 !border-[#101010] transition-opacity ${
          isReadOnly ? '!opacity-0 !pointer-events-none' : 'hover:!scale-125'
        }`}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className={`!w-3 !h-3 !bg-brand-yellow !border-2 !border-[#101010] transition-opacity ${
          isReadOnly ? '!opacity-0 !pointer-events-none' : 'hover:!scale-125'
        }`}
      />

      {/* Node Header */}
      <div 
        className="px-3.5 py-2.5 flex items-center justify-between border-b border-[#222222] transition-colors relative"
        style={{ backgroundColor: `${headerColor}15` }}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {/* Customizable Icon Button */}
          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => !isReadOnly && setIsIconPickerOpen(!isIconPickerOpen)}
            className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm transition-all ${
              !isReadOnly ? 'hover:scale-110 cursor-pointer ring-1 ring-white/20' : ''
            }`}
            style={{ backgroundColor: `${headerColor}25`, color: headerColor, border: `1px solid ${headerColor}40` }}
            title={!isReadOnly ? 'Clique para trocar o ícone' : ''}
          >
            <IconComp className="w-4 h-4" />
          </button>

          {/* Icon Selector Popover */}
          {isIconPickerOpen && !isReadOnly && (
            <div className="absolute left-3 top-11 z-50 bg-[#161616] border border-[#2B2B2B] rounded-2xl p-2.5 shadow-2xl grid grid-cols-5 gap-1.5 w-60 animate-fadeIn">
              <div className="col-span-5 px-1 py-0.5 text-[10px] font-mono font-bold uppercase text-slate-400 border-b border-[#222222] mb-1">
                Escolher Ícone da Tabela
              </div>
              {AVAILABLE_ICONS.map(icName => {
                const ItemIcon = getLucideIcon(icName);
                return (
                  <button
                    key={icName}
                    onClick={() => handleIconSelect(icName)}
                    className={`p-2 rounded-xl flex items-center justify-center hover:bg-[#252525] transition-colors ${
                      data.iconName === icName ? 'bg-brand-yellow/20 text-brand-yellow border border-brand-yellow/40' : 'text-slate-300'
                    }`}
                    title={icName}
                  >
                    <ItemIcon className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          )}

          {!isReadOnly ? (
            <input
              type="text"
              value={data.label}
              onChange={(e) => handleLabelChange(e.target.value)}
              className="bg-transparent text-xs font-black text-white focus:outline-none focus:border-b focus:border-brand-yellow truncate w-full"
            />
          ) : (
            <span className="text-xs font-black text-white truncate tracking-tight">
              {data.label}
            </span>
          )}
        </div>

        {/* Edit Tools (Color Palette & Delete Node) */}
        {!isReadOnly && data.onDeleteNode && (
          <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
            {/* Theme Color Presets */}
            <div className="flex items-center gap-1">
              {PRESET_COLORS.map(c => (
                <button
                  key={c.hex}
                  onClick={() => handleColorChange(c.hex)}
                  className={`w-3 h-3 rounded-full border transition-transform ${
                    headerColor === c.hex ? 'scale-125 border-white ring-1 ring-white/50' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                />
              ))}
            </div>

            {data.onDuplicateNode && (
              <button
                onClick={() => data.onDuplicateNode && data.onDuplicateNode(id)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors ml-1"
                title="Duplicar Tabela"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={() => data.onDeleteNode && data.onDeleteNode(id)}
              className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors ml-1"
              title="Excluir Tabela"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Dynamic Customizable Columns & Rows Table with Perfectly Aligned Flex Structure */}
      <div className="p-2.5 space-y-2 bg-[#0A0A0A]">
        {/* Dynamic Table Column Headers */}
        <div className="flex items-center gap-2 px-2 py-1 text-[9px] font-mono font-extrabold uppercase text-slate-400 border-b border-[#1E1E22]">
          {columns.map((col, cIdx) => (
            <div 
              key={col.id} 
              className={`flex-1 flex items-center gap-1 min-w-0 group/col ${
                cIdx === 0 ? 'justify-start text-left' : 'justify-end text-right'
              }`}
            >
              {!isReadOnly ? (
                <input
                  type="text"
                  value={col.name}
                  onChange={(e) => handleUpdateColumnName(col.id, e.target.value)}
                  className={`w-full bg-transparent text-[9px] font-mono font-black uppercase text-slate-300 focus:outline-none focus:text-white truncate ${
                    cIdx === 0 ? 'text-left' : 'text-right'
                  }`}
                />
              ) : (
                <span className={`truncate block font-black text-slate-400 ${cIdx === 0 ? 'text-left' : 'text-right'}`} title={col.name}>
                  {col.name}
                </span>
              )}

              {!isReadOnly && columns.length > 1 && (
                <button
                  onClick={() => handleDeleteColumn(col.id)}
                  className="p-0.5 rounded text-slate-500 hover:text-rose-400 opacity-0 group-hover/col:opacity-100 transition-opacity flex-shrink-0"
                  title="Remover Coluna"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          ))}

          {/* Reserved Action Button Slot in Header for Adding Columns */}
          {!isReadOnly && (
            <div className="w-5 flex-shrink-0 flex items-center justify-end">
              <button
                onClick={handleAddColumn}
                className="p-1 rounded bg-[#161616] hover:bg-[#222222] border border-[#2B2B2B] text-slate-400 hover:text-brand-yellow transition-colors"
                title="+ Adicionar Nova Coluna"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Dynamic Rows List */}
        <div className="space-y-1.5 max-h-[260px] overflow-y-auto custom-scrollbar">
          {rows.map((row) => (
            <div 
              key={row.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-[#141414] hover:bg-[#1A1A1A] border border-[#1E1E22] transition-colors group/row text-xs"
            >
              {columns.map((col, cIdx) => {
                const cellVal = getCellValue(row, col.id, cIdx);
                return (
                  <div key={col.id} className={`flex-1 min-w-0 ${cIdx === 0 ? 'text-left' : 'text-right'}`}>
                    {!isReadOnly ? (
                      <input
                        type="text"
                        value={cellVal}
                        onChange={(e) => handleUpdateCell(row.id, col.id, e.target.value)}
                        className={`w-full bg-transparent font-semibold focus:outline-none truncate ${
                          cIdx === 0 ? 'text-left text-[#E2E8F0] focus:text-white' : 'text-right font-mono text-white'
                        }`}
                      />
                    ) : (
                      <div className={cIdx === 0 ? 'text-left' : 'text-right'}>
                        {cIdx === 0 ? (
                          <span className="font-semibold text-slate-300 truncate block" title={cellVal}>
                            {cellVal}
                          </span>
                        ) : (
                          renderCellBadge(cellVal)
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Reserved Action Slot in Row for Deleting Row */}
              {!isReadOnly && (
                <div className="w-5 flex-shrink-0 flex items-center justify-end">
                  <button
                    onClick={() => handleDeleteRow(row.id)}
                    className="p-0.5 rounded text-slate-500 hover:text-rose-400 opacity-0 group-hover/row:opacity-100 transition-opacity"
                    title="Remover Linha"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add Row Button (Edit Mode) */}
        {!isReadOnly && (
          <button
            onClick={handleAddRow}
            className="w-full py-1 px-2 rounded-lg border border-dashed border-[#262626] hover:border-brand-yellow/40 hover:bg-brand-yellow/5 text-slate-400 hover:text-brand-yellow text-[10px] font-bold transition-all flex items-center justify-center gap-1 mt-1"
          >
            <Plus className="w-3 h-3" />
            <span>Adicionar Métrica</span>
          </button>
        )}
      </div>
    </div>
  );
});

CustomTableNode.displayName = 'CustomTableNode';
