import React, { useState, useEffect } from 'react';
import { 
  RotateCcw, 
  Upload, 
  FileCheck, 
  Download, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Filter, 
  Database,
  PhoneCall,
  MessageSquare,
  Sparkles,
  Layers,
  CheckSquare,
  Square,
  RefreshCw,
  Eye,
  Info
} from 'lucide-react';
import { GeneratedFile } from '../types';
import { 
  parseResultadoChamadas, 
  parseUltimaInteracao, 
  processReciclagemBase,
  getStoredReciclagemPreferences,
  saveStoredReciclagemPreferences,
  ParsedResultadoChamadas,
  ParsedUltimaInteracao,
  ReciclagemResult,
  CallRecord,
  InteractionRecord,
  DEFAULT_UNPRODUCTIVE_RESULTADOS,
  DEFAULT_UNPRODUCTIVE_INTERACOES,
  normalizeString
} from '../services/reciclagemService';
import { 
  addGeneratedFile, 
  getStoredGeneratedFiles, 
  deleteGeneratedFile, 
  downloadGeneratedFile,
  saveCSVFileWithPrompt
} from '../services/generatedFilesService';

export const ReciclagemView: React.FC = () => {
  // File states
  const [fileChamadas, setFileChamadas] = useState<{ name: string; parsed: ParsedResultadoChamadas } | null>(null);
  const [fileInteracao, setFileInteracao] = useState<{ name: string; parsed: ParsedUltimaInteracao } | null>(null);
  const [fileBase, setFileBase] = useState<{ name: string; text: string } | null>(null);

  // Status selectors (selected items to REMOVE)
  const [selectedResultados, setSelectedResultados] = useState<Set<string>>(new Set());
  const [selectedInteracoes, setSelectedInteracoes] = useState<Set<string>>(new Set());

  // Preferences state
  const [autoSavePrefs, setAutoSavePrefs] = useState<boolean>(true);

  // Processing & Results
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [result, setResult] = useState<ReciclagemResult | null>(null);
  const [showSamplesModal, setShowSamplesModal] = useState(false);

  // History
  const [historyFiles, setHistoryFiles] = useState<GeneratedFile[]>([]);

  // Load history & initial saved preferences on mount
  useEffect(() => {
    const files = getStoredGeneratedFiles().filter(f => f.module === 'reciclagem');
    setHistoryFiles(files);

    const savedPrefs = getStoredReciclagemPreferences();
    if (savedPrefs.selectedResultados) {
      setSelectedResultados(new Set(savedPrefs.selectedResultados));
    }
    if (savedPrefs.selectedInteracoes) {
      setSelectedInteracoes(new Set(savedPrefs.selectedInteracoes));
    }
  }, []);

  // Save preferences automatically when changed
  useEffect(() => {
    if (autoSavePrefs) {
      saveStoredReciclagemPreferences({
        selectedResultados: Array.from(selectedResultados),
        selectedInteracoes: Array.from(selectedInteracoes)
      });
    }
  }, [selectedResultados, selectedInteracoes, autoSavePrefs]);

  // Handle File 1 Upload: Resultado de Chamadas
  const handleUploadChamadas = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setStatusMessage(null);

    try {
      const text = await file.text();
      const parsed = parseResultadoChamadas(text);

      setFileChamadas({ name: file.name, parsed });

      // Automatically pre-check any matching saved/default statuses present in this file
      const savedPrefs = getStoredReciclagemPreferences();
      const savedSet = new Set((savedPrefs.selectedResultados || []).map(normalizeString));
      const currentSelected = new Set(selectedResultados);

      parsed.distinctResultados.forEach(res => {
        const normRes = normalizeString(res);
        const matchesDefault = DEFAULT_UNPRODUCTIVE_RESULTADOS.some(d => normalizeString(d) === normRes);
        if (matchesDefault || savedSet.has(normRes)) {
          currentSelected.add(res);
        }
      });
      setSelectedResultados(currentSelected);

      setStatusMessage({
        type: 'success',
        text: `Resultado de Chamadas carregado! ${parsed.totalRows.toLocaleString()} registros (${parsed.uniquePhonesCount.toLocaleString()} telefones únicos).`
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Erro ao processar o arquivo de Resultado de Chamadas.'
      });
    }
  };

  // Handle File 2 Upload: Última Interação
  const handleUploadInteracao = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setStatusMessage(null);

    try {
      const text = await file.text();
      const parsed = parseUltimaInteracao(text);

      setFileInteracao({ name: file.name, parsed });

      // Automatically pre-check any matching saved/default statuses present in this file
      const savedPrefs = getStoredReciclagemPreferences();
      const savedSet = new Set((savedPrefs.selectedInteracoes || []).map(normalizeString));
      const currentSelected = new Set(selectedInteracoes);

      parsed.distinctInteracoes.forEach(inter => {
        const normInter = normalizeString(inter);
        const matchesDefault = DEFAULT_UNPRODUCTIVE_INTERACOES.some(d => normalizeString(d) === normInter);
        if (matchesDefault || savedSet.has(normInter)) {
          currentSelected.add(inter);
        }
      });
      setSelectedInteracoes(currentSelected);

      setStatusMessage({
        type: 'success',
        text: `Última Interação carregada! ${parsed.totalRows.toLocaleString()} registros (${parsed.uniquePhonesCount.toLocaleString()} telefones únicos).`
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Erro ao processar o arquivo de Última Interação.'
      });
    }
  };

  // Handle File 3 Upload: Base de Leads
  const handleUploadBase = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setStatusMessage(null);

    try {
      const text = await file.text();
      setFileBase({ name: file.name, text });
      setStatusMessage({
        type: 'info',
        text: `Base de leads "${file.name}" pronta para reciclagem.`
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: 'Erro ao ler a Base de Leads.'
      });
    }
  };

  // Toggle selection helpers
  const toggleResultado = (res: string) => {
    const next = new Set(selectedResultados);
    if (next.has(res)) next.delete(res);
    else next.add(res);
    setSelectedResultados(next);
  };

  const selectAllResultados = () => {
    if (!fileChamadas) return;
    setSelectedResultados(new Set(fileChamadas.parsed.distinctResultados));
  };

  const clearResultados = () => {
    setSelectedResultados(new Set());
  };

  const toggleInteracao = (inter: string) => {
    const next = new Set(selectedInteracoes);
    if (next.has(inter)) next.delete(inter);
    else next.add(inter);
    setSelectedInteracoes(next);
  };

  const selectAllInteracoes = () => {
    if (!fileInteracao) return;
    setSelectedInteracoes(new Set(fileInteracao.parsed.distinctInteracoes));
  };

  const clearInteracoes = () => {
    setSelectedInteracoes(new Set());
  };

  // Execute Reciclagem Process
  const handleRunReciclagem = async () => {
    if (!fileBase) {
      setStatusMessage({ type: 'error', text: 'Insira o arquivo da Base de Leads para realizar a reciclagem.' });
      return;
    }

    if (!fileChamadas && !fileInteracao) {
      setStatusMessage({ type: 'error', text: 'Insira ao menos um dos relatórios (Resultado de Chamadas ou Última Interação).' });
      return;
    }

    setIsProcessing(true);
    setStatusMessage(null);

    try {
      const callMap = fileChamadas ? fileChamadas.parsed.latestCallMap : new Map<string, CallRecord>();
      const interMap = fileInteracao ? fileInteracao.parsed.latestInterMap : new Map<string, InteractionRecord>();

      const res = processReciclagemBase(
        fileBase.text,
        fileBase.name,
        callMap,
        interMap,
        selectedResultados,
        selectedInteracoes
      );

      setResult(res);

      // Save to GeneratedFiles history
      const savedFile = await addGeneratedFile({
        module: 'reciclagem',
        fileName: res.outputFileName,
        totalRows: res.totalRows,
        exportRows: res.keptRowsCount,
        removedRows: res.removedRowsCount,
        content: res.csvContent,
        fileType: 'csv'
      });

      setHistoryFiles([savedFile, ...historyFiles.filter(f => f.id !== savedFile.id)]);

      setStatusMessage({
        type: 'success',
        text: `Reciclagem concluída com sucesso! ${res.keptRowsCount.toLocaleString()} leads mantidos e ${res.removedRowsCount.toLocaleString()} improdutivos removidos.`
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Erro inesperado durante o processamento da reciclagem.'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Download Output File
  const handleDownload = (content?: string, fileName?: string) => {
    const csvData = content || result?.csvContent;
    const name = fileName || result?.outputFileName || 'Base_copia.csv';
    if (!csvData) return;
    downloadGeneratedFile(name, csvData, 'csv');
  };

  // Native Save As Prompt
  const handleSaveWithPrompt = async () => {
    if (!result) return;
    await saveCSVFileWithPrompt(result.outputFileName, result.csvContent, 'csv');
  };

  // Delete history item
  const handleDeleteHistory = (id: string) => {
    deleteGeneratedFile(id);
    setHistoryFiles(historyFiles.filter(f => f.id !== id));
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-dark-800 p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                Reciclagem de Base
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Cópia URA
                </span>
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Filtre e remova contatos improdutivos de bases 100% discadas, considerando o último registro de chamada e interação.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-medium text-slate-400 bg-dark-700/60 px-3 py-2 rounded-xl border border-slate-700/50 cursor-pointer hover:text-slate-200 transition-colors">
            <input 
              type="checkbox" 
              checked={autoSavePrefs} 
              onChange={e => setAutoSavePrefs(e.target.checked)}
              className="rounded bg-dark-900 border-slate-700 text-amber-500 focus:ring-amber-500/20" 
            />
            Salvar seleções automaticamente
          </label>
        </div>
      </div>

      {/* Global Status Message */}
      {statusMessage && (
        <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-sm animate-slideIn ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' 
            : statusMessage.type === 'error'
            ? 'bg-red-950/40 border-red-500/40 text-red-300'
            : 'bg-blue-950/40 border-blue-500/40 text-blue-300'
        }`}>
          <div className="flex items-center gap-2.5">
            {statusMessage.type === 'success' && <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />}
            {statusMessage.type === 'error' && <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400" />}
            {statusMessage.type === 'info' && <Info className="w-5 h-5 flex-shrink-0 text-blue-400" />}
            <span>{statusMessage.text}</span>
          </div>
          <button 
            onClick={() => setStatusMessage(null)}
            className="text-xs opacity-70 hover:opacity-100 transition-opacity"
          >
            Fechar
          </button>
        </div>
      )}

      {/* 3-Step Input Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* PASSO 1: Resultado de Chamadas */}
        <div className="bg-dark-800 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-4 shadow-lg">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold border border-amber-500/30">
                  1
                </span>
                <h3 className="font-semibold text-white text-base">Resultado de Chamadas</h3>
              </div>
              <PhoneCall className="w-4 h-4 text-slate-400" />
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Selecione o relatório contendo os resultados de todas as ligações discadas (`rep_...csv`).
            </p>

            {/* Upload Zone 1 */}
            <label className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all ${
              fileChamadas 
                ? 'border-emerald-500/50 bg-emerald-950/10 hover:bg-emerald-950/20' 
                : 'border-slate-700/80 bg-dark-700/40 hover:bg-dark-700 hover:border-slate-600'
            }`}>
              <input 
                type="file" 
                accept=".csv,.txt" 
                onChange={handleUploadChamadas} 
                className="hidden" 
              />
              {fileChamadas ? (
                <div className="text-center space-y-1">
                  <FileCheck className="w-8 h-8 text-emerald-400 mx-auto" />
                  <p className="text-xs font-semibold text-white truncate max-w-[220px]">
                    {fileChamadas.name}
                  </p>
                  <p className="text-[10px] text-emerald-400 font-medium">
                    {fileChamadas.parsed.totalRows.toLocaleString()} chamadas | {fileChamadas.parsed.uniquePhonesCount.toLocaleString()} fones
                  </p>
                </div>
              ) : (
                <div className="text-center space-y-1.5 py-1">
                  <Upload className="w-6 h-6 text-slate-400 mx-auto" />
                  <p className="text-xs text-slate-300 font-medium">Upload Resultado de Chamadas</p>
                  <p className="text-[10px] text-slate-500">Clique ou arraste o arquivo CSV</p>
                </div>
              )}
            </label>
          </div>

          {/* Status Selector Grid 1 */}
          {fileChamadas && (
            <div className="space-y-3 pt-3 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-amber-400" />
                  Remover Status ({selectedResultados.size}/{fileChamadas.parsed.distinctResultados.length}):
                </span>
                <div className="flex items-center gap-2 text-[10px]">
                  <button 
                    onClick={selectAllResultados} 
                    className="text-amber-400 hover:underline font-medium"
                  >
                    Marcar Todos
                  </button>
                  <span className="text-slate-600">|</span>
                  <button 
                    onClick={clearResultados} 
                    className="text-slate-400 hover:underline"
                  >
                    Limpar
                  </button>
                </div>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                {fileChamadas.parsed.distinctResultados.map(res => {
                  const isChecked = selectedResultados.has(res);
                  return (
                    <div 
                      key={res}
                      onClick={() => toggleResultado(res)}
                      className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-all flex items-center justify-between ${
                        isChecked 
                          ? 'bg-red-950/30 border-red-500/50 text-red-300 shadow-sm' 
                          : 'bg-dark-700/50 border-slate-700/50 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        {isChecked ? (
                          <CheckSquare className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                        ) : (
                          <Square className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                        )}
                        <span className="truncate">{res}</span>
                      </div>
                      {isChecked && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-red-500/20 text-red-300 font-bold uppercase tracking-wider">
                          Remover
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* PASSO 2: Última Interação */}
        <div className="bg-dark-800 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-4 shadow-lg">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold border border-amber-500/30">
                  2
                </span>
                <h3 className="font-semibold text-white text-base">Última Interação</h3>
              </div>
              <MessageSquare className="w-4 h-4 text-slate-400" />
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Selecione o relatório contendo o histórico de atendimento/interação (`rep_...csv`).
            </p>

            {/* Upload Zone 2 */}
            <label className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all ${
              fileInteracao 
                ? 'border-emerald-500/50 bg-emerald-950/10 hover:bg-emerald-950/20' 
                : 'border-slate-700/80 bg-dark-700/40 hover:bg-dark-700 hover:border-slate-600'
            }`}>
              <input 
                type="file" 
                accept=".csv,.txt" 
                onChange={handleUploadInteracao} 
                className="hidden" 
              />
              {fileInteracao ? (
                <div className="text-center space-y-1">
                  <FileCheck className="w-8 h-8 text-emerald-400 mx-auto" />
                  <p className="text-xs font-semibold text-white truncate max-w-[220px]">
                    {fileInteracao.name}
                  </p>
                  <p className="text-[10px] text-emerald-400 font-medium">
                    {fileInteracao.parsed.totalRows.toLocaleString()} interações | {fileInteracao.parsed.uniquePhonesCount.toLocaleString()} fones
                  </p>
                </div>
              ) : (
                <div className="text-center space-y-1.5 py-1">
                  <Upload className="w-6 h-6 text-slate-400 mx-auto" />
                  <p className="text-xs text-slate-300 font-medium">Upload Última Interação</p>
                  <p className="text-[10px] text-slate-500">Clique ou arraste o arquivo CSV</p>
                </div>
              )}
            </label>
          </div>

          {/* Status Selector Grid 2 */}
          {fileInteracao && (
            <div className="space-y-3 pt-3 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-amber-400" />
                  Remover Interações ({selectedInteracoes.size}/{fileInteracao.parsed.distinctInteracoes.length}):
                </span>
                <div className="flex items-center gap-2 text-[10px]">
                  <button 
                    onClick={selectAllInteracoes} 
                    className="text-amber-400 hover:underline font-medium"
                  >
                    Marcar Todos
                  </button>
                  <span className="text-slate-600">|</span>
                  <button 
                    onClick={clearInteracoes} 
                    className="text-slate-400 hover:underline"
                  >
                    Limpar
                  </button>
                </div>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                {fileInteracao.parsed.distinctInteracoes.map(inter => {
                  const isChecked = selectedInteracoes.has(inter);
                  return (
                    <div 
                      key={inter}
                      onClick={() => toggleInteracao(inter)}
                      className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-all flex items-center justify-between ${
                        isChecked 
                          ? 'bg-red-950/30 border-red-500/50 text-red-300 shadow-sm' 
                          : 'bg-dark-700/50 border-slate-700/50 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        {isChecked ? (
                          <CheckSquare className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                        ) : (
                          <Square className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                        )}
                        <span className="truncate">{inter}</span>
                      </div>
                      {isChecked && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-red-500/20 text-red-300 font-bold uppercase tracking-wider">
                          Remover
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* PASSO 3: Base de Leads */}
        <div className="bg-dark-800 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-4 shadow-lg">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold border border-amber-500/30">
                  3
                </span>
                <h3 className="font-semibold text-white text-base">Base de Leads (Original)</h3>
              </div>
              <Database className="w-4 h-4 text-slate-400" />
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Selecione o arquivo da base de leads que completou 100% no discador (`Base...csv`).
            </p>

            {/* Upload Zone 3 */}
            <label className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all ${
              fileBase 
                ? 'border-amber-500/50 bg-amber-950/10 hover:bg-amber-950/20' 
                : 'border-slate-700/80 bg-dark-700/40 hover:bg-dark-700 hover:border-slate-600'
            }`}>
              <input 
                type="file" 
                accept=".csv,.txt" 
                onChange={handleUploadBase} 
                className="hidden" 
              />
              {fileBase ? (
                <div className="text-center space-y-1">
                  <FileCheck className="w-8 h-8 text-amber-400 mx-auto" />
                  <p className="text-xs font-semibold text-white truncate max-w-[220px]">
                    {fileBase.name}
                  </p>
                  <p className="text-[10px] text-amber-400 font-medium">
                    Base pronta para reciclagem
                  </p>
                </div>
              ) : (
                <div className="text-center space-y-1.5 py-1">
                  <Upload className="w-6 h-6 text-slate-400 mx-auto" />
                  <p className="text-xs text-slate-300 font-medium">Upload Base de Leads</p>
                  <p className="text-[10px] text-slate-500">Clique ou arraste a base original</p>
                </div>
              )}
            </label>
          </div>

          {/* Action Execution Button */}
          <div className="pt-3 border-t border-slate-800">
            <button
              onClick={handleRunReciclagem}
              disabled={isProcessing || !fileBase || (!fileChamadas && !fileInteracao)}
              className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-dark-950 shadow-glow-yellow flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none active:scale-[0.99]"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-dark-950" />
                  <span>Processando Reciclagem...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-dark-950" />
                  <span>Gerar Cópia Reciclada</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>

      {/* Results Dashboard Panel */}
      {result && (
        <div className="bg-dark-800 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-6 animate-slideUp">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                Resultado da Reciclagem: {result.outputFileName}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Relatório consolidado de remoção de contatos improdutivos.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {result.sampleRemoved.length > 0 && (
                <button
                  onClick={() => setShowSamplesModal(!showSamplesModal)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-dark-700 text-slate-300 hover:bg-dark-600 border border-slate-700 transition-colors flex items-center gap-2"
                >
                  <Eye className="w-3.5 h-3.5 text-amber-400" />
                  Ver Exemplos Removidos
                </button>
              )}

              <button
                onClick={handleSaveWithPrompt}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-dark-700 text-slate-200 hover:bg-dark-600 border border-slate-700 transition-colors flex items-center gap-1.5"
              >
                Salvar Como...
              </button>

              <button
                onClick={() => handleDownload()}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-glow-emerald transition-all flex items-center gap-2"
              >
                <Download className="w-4 h-4 text-slate-950" />
                Baixar Cópia (.csv)
              </button>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-dark-700/40 p-4 rounded-xl border border-slate-700/50 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Total na Base</span>
              <p className="text-2xl font-black text-white">{result.totalRows.toLocaleString()}</p>
              <span className="text-[10px] text-slate-500">Leads originais fornecidos</span>
            </div>

            <div className="bg-emerald-950/30 p-4 rounded-xl border border-emerald-500/30 space-y-1">
              <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block">Mantidos (Cópia)</span>
              <p className="text-2xl font-black text-emerald-400">{result.keptRowsCount.toLocaleString()}</p>
              <span className="text-[10px] text-emerald-500/80 font-medium">
                {((result.keptRowsCount / (result.totalRows || 1)) * 100).toFixed(1)}% aprovados para discador
              </span>
            </div>

            <div className="bg-red-950/30 p-4 rounded-xl border border-red-500/30 space-y-1">
              <span className="text-[11px] font-semibold text-red-400 uppercase tracking-wider block">Total Removidos</span>
              <p className="text-2xl font-black text-red-400">{result.removedRowsCount.toLocaleString()}</p>
              <span className="text-[10px] text-red-500/80 font-medium">
                {((result.removedRowsCount / (result.totalRows || 1)) * 100).toFixed(1)}% improdutivos
              </span>
            </div>

            <div className="bg-dark-700/40 p-4 rounded-xl border border-slate-700/50 space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Origem da Remoção</span>
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between text-slate-300">
                  <span>Por Chamada:</span>
                  <span className="font-bold text-red-400">{result.removedByCallCount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Por Interação:</span>
                  <span className="font-bold text-red-400">{result.removedByInterCount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-400 text-[10px]">
                  <span>Por Ambas:</span>
                  <span className="font-bold text-amber-400">{result.removedByBothCount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sample Removed Drawer / Box */}
          {showSamplesModal && result.sampleRemoved.length > 0 && (
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Amostra de Leads Excluídos ({result.sampleRemoved.length} de {result.removedRowsCount.toLocaleString()})</span>
                <button onClick={() => setShowSamplesModal(false)} className="text-slate-500 hover:text-slate-300">Ocultar</button>
              </h3>
              <div className="max-h-60 overflow-y-auto border border-slate-800 rounded-xl overflow-hidden custom-scrollbar">
                <table className="w-full text-left text-xs">
                  <thead className="bg-dark-900 text-slate-400 uppercase text-[10px] tracking-wider sticky top-0">
                    <tr>
                      <th className="p-2.5">Telefone</th>
                      <th className="p-2.5">Motivo da Remoção</th>
                      <th className="p-2.5">Amostra da Linha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-dark-800/80">
                    {result.sampleRemoved.map((item, idx) => (
                      <tr key={idx} className="hover:bg-dark-700/50">
                        <td className="p-2.5 font-mono text-slate-200 font-semibold">{item.phone}</td>
                        <td className="p-2.5 text-red-400 font-medium">{item.reason}</td>
                        <td className="p-2.5 font-mono text-slate-400 text-[11px] truncate max-w-xs">{item.rowSnippet}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* History of Recycled Files */}
      {historyFiles.length > 0 && (
        <div className="bg-dark-800 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            Histórico de Cópias Recicladas
          </h2>

          <div className="overflow-x-auto border border-slate-800 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-dark-700/60 text-slate-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3">Nome do Arquivo</th>
                  <th className="p-3">Data/Hora</th>
                  <th className="p-3 text-right">Original</th>
                  <th className="p-3 text-right text-emerald-400">Mantidos (Cópia)</th>
                  <th className="p-3 text-right text-red-400">Removidos</th>
                  <th className="p-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-dark-800">
                {historyFiles.map(file => (
                  <tr key={file.id} className="hover:bg-dark-700/40 transition-colors">
                    <td className="p-3 font-semibold text-slate-200 flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span className="truncate max-w-xs">{file.fileName}</span>
                    </td>
                    <td className="p-3 text-slate-400">
                      {new Date(file.createdAt).toLocaleString('pt-BR')}
                    </td>
                    <td className="p-3 text-right font-mono text-slate-300">
                      {file.totalRows.toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-400">
                      {file.exportRows.toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-mono text-red-400">
                      {file.removedRows.toLocaleString()}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleDownload(file.content, file.fileName)}
                          className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                          title="Baixar cópia novamente"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteHistory(file.id)}
                          className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                          title="Excluir do histórico"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
