import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Upload, 
  FileCheck, 
  Download, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Filter, 
  Database,
  Plus,
  RotateCcw
} from 'lucide-react';
import { GeneratedFile, BlocklistInfo } from '../types';
import { 
  runAntiJoin, 
  parseCSVTextToRows, 
  findPhoneColumnInHeaders, 
  normalizePhone,
  getStoredBlocklistsMetadata,
  saveStoredBlocklistsMetadata,
  saveBlocklistContent,
  getBlocklistContent,
  deleteStoredBlocklistContent,
  DEFAULT_BLOCKLISTS
} from '../services/blocklistService';
import { 
  addGeneratedFile, 
  getStoredGeneratedFiles, 
  deleteGeneratedFile, 
  downloadCSVFile, 
  downloadGeneratedFileById 
} from '../services/generatedFilesService';

export const CruzadorBlocklistView: React.FC = () => {
  // Blocklists State
  const [blocklists, setBlocklists] = useState<BlocklistInfo[]>(getStoredBlocklistsMetadata());
  const [customBlockedSet, setCustomBlockedSet] = useState<Set<string>>(new Set());

  // Input Base State
  const [baseFile, setBaseFile] = useState<{ file: File, name: string, content: string } | null>(null);
  const [detectedPhoneCol, setDetectedPhoneCol] = useState<string | null>(null);

  // History & Status
  const [historyFiles, setHistoryFiles] = useState<GeneratedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string, type: 'success' | 'error' | 'info' } | null>(null);

  // Load stored history & blocklist contents on mount
  useEffect(() => {
    const files = getStoredGeneratedFiles().filter(f => f.module === 'cruzador');
    setHistoryFiles(files);

    // Initial load and rebuild of blocked phone set from active blocklists
    const initialMeta = getStoredBlocklistsMetadata();
    setBlocklists(initialMeta);
    rebuildBlockedSet(initialMeta);
  }, []);

  // Rebuild the in-memory Set of blocked phone numbers from all enabled blocklists
  const rebuildBlockedSet = async (currentBlocklists: BlocklistInfo[]) => {
    const newSet = new Set<string>();

    for (const bl of currentBlocklists) {
      if (!bl.enabled) continue;

      let csvText = bl.content;
      if (!csvText) {
        csvText = await getBlocklistContent(bl.id) || undefined;
      }

      if (csvText) {
        const { headers, rows } = parseCSVTextToRows(csvText);
        const phoneCol = findPhoneColumnInHeaders(headers);
        if (phoneCol) {
          rows.forEach(r => {
            const p = normalizePhone(r[phoneCol]);
            if (p) newSet.add(p);
          });
        }
      }
    }

    setCustomBlockedSet(newSet);
  };

  // Upload Custom Blocklist CSV(s)
  const handleCustomBlocklistUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);

    const updatedList = [...blocklists];

    for (const file of files) {
      try {
        const text = await file.text();
        const { headers, rows } = parseCSVTextToRows(text);
        const phoneCol = findPhoneColumnInHeaders(headers);

        if (phoneCol) {
          const newId = `bl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          
          // Save large CSV text to IndexedDB
          await saveBlocklistContent(newId, text);

          const newInfo: BlocklistInfo = {
            id: newId,
            name: file.name,
            phoneCount: rows.length,
            enabled: true,
            content: text,
            createdAt: new Date().toISOString()
          };

          updatedList.push(newInfo);
        } else {
          alert(`Coluna de telefone não encontrada no arquivo de blocklist: ${file.name}`);
        }
      } catch (err) {
        console.error(`Erro ao ler o arquivo ${file.name}:`, err);
      }
    }

    setBlocklists(updatedList);
    saveStoredBlocklistsMetadata(updatedList);
    await rebuildBlockedSet(updatedList);

    setStatusMessage({
      text: `✓ Blocklist(s) adicionada(s) e salva(s) com sucesso!`,
      type: 'success'
    });

    // Reset file input
    e.target.value = '';
  };

  // Delete a Blocklist (Default or Custom)
  const handleDeleteBlocklist = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir a blocklist "${name}"?`)) return;

    const updatedList = blocklists.filter(b => b.id !== id);
    setBlocklists(updatedList);
    saveStoredBlocklistsMetadata(updatedList);
    await deleteStoredBlocklistContent(id);

    await rebuildBlockedSet(updatedList);

    setStatusMessage({
      text: `✓ Blocklist "${name}" excluída com sucesso.`,
      type: 'info'
    });
  };

  // Restore Default Blocklists
  const handleRestoreDefaultBlocklists = async () => {
    if (!confirm('Restaurar as blocklists padrão do sistema? Suas blocklists personalizadas atuais serão mantidas.')) return;

    const existingNames = new Set(blocklists.map(b => b.name));
    const toAdd = DEFAULT_BLOCKLISTS.filter(d => !existingNames.has(d.name));

    const updatedList = [...blocklists, ...toAdd];
    setBlocklists(updatedList);
    saveStoredBlocklistsMetadata(updatedList);
    await rebuildBlockedSet(updatedList);

    setStatusMessage({
      text: '✓ Blocklists padrão restauradas.',
      type: 'success'
    });
  };

  // Select Base Leads File
  const handleBaseFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setBaseFile({ file, name: file.name, content: text });

      const { headers } = parseCSVTextToRows(text);
      const col = findPhoneColumnInHeaders(headers);
      setDetectedPhoneCol(col);
    };
    reader.readAsText(file, 'utf-8');
  };

  // Toggle Blocklist Enable / Disable
  const toggleBlocklist = async (id: string) => {
    const updatedList = blocklists.map(b => b.id === id ? { ...b, enabled: !b.enabled } : b);
    setBlocklists(updatedList);
    saveStoredBlocklistsMetadata(updatedList);
    await rebuildBlockedSet(updatedList);
  };

  // Run Anti-Join
  const handleRunAntiJoin = async () => {
    if (!baseFile) {
      setStatusMessage({ text: 'Por favor, selecione a base CSV para realizar o cruzamento.', type: 'error' });
      return;
    }

    setIsProcessing(true);
    setStatusMessage({ text: 'Executando cruzamento contra as listas de bloqueio ativas...', type: 'info' });

    try {
      // Check if custom uploaded blocklists exist in the current active list
      const hasCustomUploads = blocklists.some(b => b.enabled && !b.id.startsWith('b') && !b.id.startsWith('np'));

      // If no custom uploaded blocklists are present, attempt local dev server python backend endpoint first
      if (!hasCustomUploads) {
        try {
          const response = await fetch('/api/cross-join', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileName: baseFile.name,
              csvContent: baseFile.content
            })
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              const savedFile = await addGeneratedFile({
                module: 'cruzador',
                fileName: data.outputFileName,
                totalRows: data.totalRows,
                exportRows: data.keptRows,
                removedRows: data.removedRows,
                content: data.csvContent
              });

              downloadCSVFile(data.outputFileName, data.csvContent);

              setHistoryFiles(prev => [savedFile, ...prev]);
              setStatusMessage({
                text: `✓ Cruzamento finalizado! ${data.keptRows.toLocaleString('pt-BR')} linhas mantidas (${data.removedRows.toLocaleString('pt-BR')} removidas na blocklist). Arquivo baixado automaticamente!`,
                type: 'success'
              });
              setIsProcessing(false);
              return;
            }
          }
        } catch (backendErr) {
          console.warn('Backend python endpoint unavailable, using client-side JS engine:', backendErr);
        }
      }

      // Fast, reliable client-side JS anti-join against customBlockedSet
      const { headers, rows } = parseCSVTextToRows(baseFile.content);
      const result = runAntiJoin(rows, headers, baseFile.name, customBlockedSet);

      const savedFile = await addGeneratedFile({
        module: 'cruzador',
        fileName: result.outputFileName,
        totalRows: result.totalRows,
        exportRows: result.keptRows,
        removedRows: result.removedRows,
        content: result.csvContent
      });

      downloadCSVFile(result.outputFileName, result.csvContent);

      setHistoryFiles(prev => [savedFile, ...prev]);
      setStatusMessage({
        text: `✓ Cruzamento finalizado! ${result.keptRows.toLocaleString('pt-BR')} linhas mantidas (${result.removedRows.toLocaleString('pt-BR')} removidas na blocklist). Arquivo baixado automaticamente!`,
        type: 'success'
      });
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ text: `Erro no cruzamento: ${err.message || 'Falha no anti-join'}`, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteHistoryFile = (id: string) => {
    deleteGeneratedFile(id);
    setHistoryFiles(prev => prev.filter(f => f.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-dark-800 border border-slate-800 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">Cruzador de Blocklist (Anti-Join)</h2>
              <p className="text-xs text-slate-400">Filtragem de telefones bloqueados com salvamento automático e gerenciamento das listas.</p>
            </div>
          </div>

          <button
            onClick={handleRestoreDefaultBlocklists}
            className="px-3 py-1.5 rounded-xl bg-[#161616] hover:bg-[#1F1F1F] border border-[#222222] text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5"
            title="Restaurar as 6 blocklists padrão do sistema"
          >
            <RotateCcw className="w-3.5 h-3.5 text-brand-yellow" />
            <span>Restaurar Padrões</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Anti-Join Controls */}
        <div className="lg:col-span-7 p-6 rounded-2xl bg-dark-800 border border-slate-800 shadow-xl space-y-6">
          
          {/* Active Blocklists Management */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-brand-yellow" />
                <span>ARQUIVOS DE BLOQUEIO ATIVOS ({blocklists.filter(b => b.enabled).length}/{blocklists.length})</span>
              </label>

              <label className="px-3 py-1.5 rounded-xl bg-brand-yellow/10 hover:bg-brand-yellow/20 border border-brand-yellow/30 text-xs font-extrabold text-brand-yellow cursor-pointer transition-all flex items-center gap-1.5 shadow-sm">
                <Plus className="w-4 h-4" />
                <span>Adicionar Blocklist CSV</span>
                <input type="file" accept=".csv" multiple onChange={handleCustomBlocklistUpload} className="hidden" />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
              {blocklists.length === 0 ? (
                <div className="col-span-2 p-6 text-center border border-dashed border-slate-800 rounded-xl">
                  <span className="text-xs text-slate-500 font-medium block">Nenhuma blocklist cadastrada. Clique em "Adicionar Blocklist CSV" acima.</span>
                </div>
              ) : (
                blocklists.map(bl => (
                  <div 
                    key={bl.id} 
                    onClick={() => toggleBlocklist(bl.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 group ${
                      bl.enabled 
                        ? 'bg-[#1C1C1C] border-[#222222] text-white shadow-sm' 
                        : 'bg-[#0A0A0A] border-[#1F1F1F] text-slate-500 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <input 
                        type="checkbox" 
                        checked={bl.enabled} 
                        onChange={() => {}} 
                        className="cursor-pointer rounded accent-emerald-400 w-4 h-4" 
                      />
                      <div className="truncate">
                        <span className="text-xs font-extrabold truncate block" title={bl.name}>{bl.name}</span>
                        {bl.phoneCount > 0 && (
                          <span className="text-[10px] text-slate-400 font-medium block">
                            {bl.phoneCount.toLocaleString('pt-BR')} registros
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteBlocklist(bl.id, bl.name);
                      }}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all opacity-80 group-hover:opacity-100"
                      title="Excluir Blocklist"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Base File Upload Zone */}
          <div className="pt-3 border-t border-[#222222] space-y-3">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">SELECIONAR BASE DE LEADS PARA CRUZAMENTO</label>
            
            <div className="p-6 rounded-2xl bg-[#0A0A0A] border-2 border-dashed border-[#222222] hover:border-emerald-400 transition-colors text-center space-y-3 relative cursor-pointer">
              <input
                type="file"
                accept=".csv"
                onChange={handleBaseFileSelect}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <Upload className="w-8 h-8 text-emerald-400 mx-auto" />
              <div>
                <span className="text-xs font-bold text-white block">
                  {baseFile ? baseFile.name : 'Clique ou arraste a base CSV a ser cruzada aqui'}
                </span>
                <span className="text-[11px] text-slate-400">Detecção automática da coluna de telefone (ex: TELEFONE, DDDTELEFONE, CELULAR)</span>
              </div>
            </div>

            {detectedPhoneCol && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 font-semibold flex items-center justify-between">
                <span>Coluna de Telefone Detectada: <strong className="text-white">{detectedPhoneCol}</strong></span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
            )}
          </div>

          {/* Execution Button */}
          <div className="space-y-3">
            <button
              onClick={handleRunAntiJoin}
              disabled={isProcessing || !baseFile}
              className={`w-full py-3.5 rounded-xl font-extrabold text-sm shadow-lg transition-all flex items-center justify-center gap-2 ${
                baseFile ? 'bg-emerald-500 hover:bg-emerald-400 text-dark-900 shadow-emerald-500/20 cursor-pointer' : 'bg-[#161616] text-slate-500 cursor-not-allowed'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isProcessing ? 'Cruzando...' : 'Executar Cruzamento (Anti-Join)'}</span>
            </button>

            {statusMessage && (
              <div className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                statusMessage.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' :
                statusMessage.type === 'error' ? 'bg-rose-500/10 border-rose-500/20 text-rose-300' :
                'bg-cyan-500/10 border-cyan-500/20 text-cyan-300'
              }`}>
                {statusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                <span>{statusMessage.text}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Output History ("saida" folder) */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-[#101010] border border-[#222222] shadow-xl space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-cyan-400" />
                <span>Arquivos Cruzados (Pasta "saida")</span>
              </h3>
              <span className="text-xs text-slate-400 font-medium">{historyFiles.length} arquivos</span>
            </div>

            {historyFiles.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-[#222222] rounded-xl space-y-2">
                <Database className="w-8 h-8 text-slate-600 mx-auto" />
                <span className="text-xs text-slate-400 font-medium block">Nenhum arquivo cruzado gerado ainda.</span>
                <span className="text-[11px] text-slate-500 block">Os arquivos cruzados (`{'{nome}'}_cruzada.csv`) ficarão armazenados aqui.</span>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                {historyFiles.map(file => (
                  <div key={file.id} className="p-3.5 rounded-xl bg-[#161616] border border-[#222222] hover:border-[#333333] transition-all space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white truncate max-w-[200px]" title={file.fileName}>
                        {file.fileName}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(file.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Linhas Mantidas: <strong className="text-emerald-400">{file.exportRows.toLocaleString('pt-BR')}</strong></span>
                      <span>Bloqueadas: <strong className="text-rose-400">{file.removedRows.toLocaleString('pt-BR')}</strong></span>
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-slate-800/60">
                      <button
                        onClick={() => downloadGeneratedFileById(file)}
                        className="flex-1 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Baixar CSV Cruzada</span>
                      </button>

                      <button
                        onClick={() => handleDeleteHistoryFile(file.id)}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
