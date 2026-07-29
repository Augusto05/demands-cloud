import React, { useState, useEffect } from 'react';
import { 
  Wand2, 
  Upload, 
  FileSpreadsheet, 
  Download, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Settings, 
  Layers,
  FileText
} from 'lucide-react';
import { ConversorConfig, GeneratedFile } from '../types';
import { processLeadRows, parseCSVTextToRows, detectColumns, DetectedColumnsMap } from '../services/leadConverterService';
import { 
  addGeneratedFile, 
  getStoredGeneratedFiles, 
  deleteGeneratedFile, 
  saveCSVFileWithPrompt, 
  downloadGeneratedFileById 
} from '../services/generatedFilesService';
import { SaveFileModal } from './SaveFileModal';

export const ConversorLeadsView: React.FC = () => {
  // Config state (persisted)
  const [config, setConfig] = useState<ConversorConfig>(() => {
    const saved = localStorage.getItem('demands_conversor_config');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return {
      email: 'contato@leadsale.com.br',
      fluxo: 'FLUXO_INICIAL',
      fluxo2: 'FLUXO_QUALIFICACAO',
      contratante: 'LEADSALE',
      layout: 'padrao'
    };
  });

  const [inputMode, setInputMode] = useState<'unico' | 'multiplo' | 'consolidado'>('unico');
  const [selectedFiles, setSelectedFiles] = useState<{ file: File, name: string, content: string }[]>([]);
  const [detectedMap, setDetectedMap] = useState<DetectedColumnsMap | null>(null);

  // Results & History
  const [historyFiles, setHistoryFiles] = useState<GeneratedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string, type: 'success' | 'error' | 'info' } | null>(null);

  // Save Modal state for Safari / Manual Trigger
  const [saveModal, setSaveModal] = useState<{ isOpen: boolean, fileName: string, content: string, fileType: 'xlsx' | 'csv' }>({
    isOpen: false,
    fileName: '',
    content: '',
    fileType: 'csv'
  });

  // Load History
  useEffect(() => {
    const files = getStoredGeneratedFiles().filter(f => f.module === 'conversor');
    setHistoryFiles(files);
  }, []);

  // Save config on change
  const handleConfigChange = (field: keyof ConversorConfig, val: string) => {
    const updated = { ...config, [field]: val };
    setConfig(updated);
    localStorage.setItem('demands_conversor_config', JSON.stringify(updated));
  };

  const triggerSaveAsModal = (fileName: string, content: string, fileType: 'xlsx' | 'csv' = 'csv') => {
    if ('showSaveFilePicker' in window) {
      saveCSVFileWithPrompt(fileName, content, fileType);
    } else {
      setSaveModal({
        isOpen: true,
        fileName,
        content,
        fileType
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const fileList = Array.from(e.target.files);

    const loadedFiles: { file: File, name: string, content: string }[] = [];
    let count = 0;

    fileList.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        loadedFiles.push({ file, name: file.name, content: text });
        count++;

        if (count === fileList.length) {
          setSelectedFiles(loadedFiles);
          // Detect columns on first file
          if (loadedFiles.length > 0) {
            const { headers, rows } = parseCSVTextToRows(loadedFiles[0].content);
            setDetectedMap(detectColumns(headers, rows));
          }
        }
      };
      reader.readAsText(file, 'utf-8');
    });
  };

  const handleConvert = () => {
    if (selectedFiles.length === 0) {
      setStatusMessage({ text: 'Por favor, selecione ao menos um arquivo CSV para converter.', type: 'error' });
      return;
    }

    if (!config.email || !config.fluxo || !config.contratante) {
      setStatusMessage({ text: 'Preencha os campos fixos obrigatórios (Email, Fluxo, Contratante).', type: 'error' });
      return;
    }

    if (config.layout === 'alieste' && !config.fluxo2) {
      setStatusMessage({ text: 'Preencha o Fluxo 2 para o layout Alieste.', type: 'error' });
      return;
    }

    setIsProcessing(true);
    setStatusMessage({ text: 'Processando conversão de leads...', type: 'info' });

    setTimeout(async () => {
      try {
        if (inputMode === 'consolidado' || (inputMode === 'multiplo' && selectedFiles.length > 1)) {
          let allRows: Record<string, any>[] = [];
          let mainHeaders: string[] = [];

          selectedFiles.forEach((sf, idx) => {
            const { headers, rows } = parseCSVTextToRows(sf.content);
            if (idx === 0) mainHeaders = headers;
            allRows = allRows.concat(rows);
          });

          const result = processLeadRows(allRows, mainHeaders, config);
          const outName = inputMode === 'consolidado' 
            ? `consolidado_${config.layout}_convertido.csv`
            : `${selectedFiles[0].name.replace(/\.[^/.]+$/, '')}_multi_convertido.csv`;

          const savedFile = await addGeneratedFile({
            module: 'conversor',
            fileName: outName,
            totalRows: result.totalRows,
            exportRows: result.exportRows,
            removedRows: result.removedRows,
            content: result.csvContent,
            fileType: 'csv'
          });

          triggerSaveAsModal(outName, result.csvContent, 'csv');

          setHistoryFiles(prev => [savedFile, ...prev]);
          setStatusMessage({ 
            text: `✓ Conversão concluída! ${result.exportRows.toLocaleString('pt-BR')} registros exportados de ${result.totalRows.toLocaleString('pt-BR')} linhas.`, 
            type: 'success' 
          });
        } else {
          // Process individual files
          const newSavedFiles: GeneratedFile[] = [];

          for (const sf of selectedFiles) {
            const { headers, rows } = parseCSVTextToRows(sf.content);
            const result = processLeadRows(rows, headers, config);
            const outName = `${sf.name.replace(/\.[^/.]+$/, '')}_${config.layout}_convertido.csv`;

            const savedFile = await addGeneratedFile({
              module: 'conversor',
              fileName: outName,
              totalRows: result.totalRows,
              exportRows: result.exportRows,
              removedRows: result.removedRows,
              content: result.csvContent,
              fileType: 'csv'
            });

            triggerSaveAsModal(outName, result.csvContent, 'csv');
            newSavedFiles.push(savedFile);
          }

          setHistoryFiles(prev => [...newSavedFiles, ...prev]);
          setStatusMessage({ 
            text: `✓ ${selectedFiles.length} arquivo(s) convertido(s) com sucesso e salvos no histórico de saída.`, 
            type: 'success' 
          });
        }
      } catch (err: any) {
        console.error(err);
        setStatusMessage({ text: `Erro na conversão: ${err.message || 'Falha ao converter'}`, type: 'error' });
      } finally {
        setIsProcessing(false);
      }
    }, 300);
  };

  const handleDeleteHistoryFile = (id: string) => {
    deleteGeneratedFile(id);
    setHistoryFiles(prev => prev.filter(f => f.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-dark-800 border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-yellow/20 text-brand-yellow flex items-center justify-center">
            <Wand2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tight">Conversor de Leads</h2>
            <p className="text-xs text-slate-400">Conversão de listas brutas nos layouts Padrão e Alieste com mapeamento inteligente de colunas.</p>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Form & Settings */}
        <div className="lg:col-span-7 p-6 rounded-2xl bg-dark-800 border border-slate-800 shadow-xl space-y-6">
          
          {/* Layout Selector & Input Mode */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">LAYOUT DE SAÍDA</label>
              <div className="flex items-center gap-2 bg-[#141414] p-1.5 rounded-xl border border-[#222222]">
                <button
                  onClick={() => handleConfigChange('layout', 'padrao')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                    config.layout === 'padrao'
                      ? 'bg-brand-yellow text-dark-900 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Padrão (8 cols)
                </button>
                <button
                  onClick={() => handleConfigChange('layout', 'alieste')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                    config.layout === 'alieste'
                      ? 'bg-brand-yellow text-dark-900 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Alieste (10 cols)
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">MODO DE PROCESSAMENTO</label>
              <div className="flex items-center gap-1 bg-dark-900/80 p-1.5 rounded-xl border border-slate-800 text-xs">
                <button
                  onClick={() => setInputMode('unico')}
                  className={`flex-1 py-2 rounded-lg font-bold transition-all ${
                    inputMode === 'unico' ? 'bg-dark-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Único
                </button>
                <button
                  onClick={() => setInputMode('multiplo')}
                  className={`flex-1 py-2 rounded-lg font-bold transition-all ${
                    inputMode === 'multiplo' ? 'bg-dark-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Múltiplo
                </button>
                <button
                  onClick={() => setInputMode('consolidado')}
                  className={`flex-1 py-2 rounded-lg font-bold transition-all ${
                    inputMode === 'consolidado' ? 'bg-dark-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Unificar
                </button>
              </div>
            </div>
          </div>

          {/* Form Fields for Fixed Values */}
          <div className="space-y-4 pt-2 border-t border-slate-800">
            <div className="flex items-center gap-2 mb-1">
              <Settings className="w-4 h-4 text-brand-yellow" />
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">CAMPOS FIXOS DA CAMPANHA</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Email *</label>
                <input
                  type="email"
                  value={config.email}
                  onChange={(e) => handleConfigChange('email', e.target.value)}
                  placeholder="ex: contato@leadsale.com.br"
                  className="w-full px-3.5 py-2 rounded-xl bg-dark-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-yellow font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Contratante *</label>
                <input
                  type="text"
                  value={config.contratante}
                  onChange={(e) => handleConfigChange('contratante', e.target.value)}
                  placeholder="ex: LEADSALE"
                  className="w-full px-3.5 py-2 rounded-xl bg-dark-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-yellow font-semibold uppercase"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Fluxo (Principal) *</label>
                <input
                  type="text"
                  value={config.fluxo}
                  onChange={(e) => handleConfigChange('fluxo', e.target.value)}
                  placeholder="ex: FLUXO_INICIAL"
                  className="w-full px-3.5 py-2 rounded-xl bg-dark-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-yellow font-semibold uppercase"
                />
              </div>

              {config.layout === 'alieste' && (
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Fluxo 2 (Layout Alieste) *</label>
                  <input
                    type="text"
                    value={config.fluxo2}
                    onChange={(e) => handleConfigChange('fluxo2', e.target.value)}
                    placeholder="ex: FLUXO_QUALIFICACAO"
                    className="w-full px-3.5 py-2 rounded-xl bg-dark-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-yellow font-semibold uppercase"
                  />
                </div>
              )}
            </div>
          </div>

          {/* File Upload Zone */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">SELECIONAR ARQUIVO(S) CSV</label>
            
            <div className="p-6 rounded-2xl bg-dark-900/60 border-2 border-dashed border-slate-700 hover:border-brand-yellow transition-colors text-center space-y-3 relative cursor-pointer">
              <input
                type="file"
                accept=".csv"
                multiple={inputMode !== 'unico'}
                onChange={handleFileSelect}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <Upload className="w-8 h-8 text-brand-yellow mx-auto" />
              <div>
                <span className="text-xs font-bold text-white block">
                  {selectedFiles.length > 0
                    ? `${selectedFiles.length} arquivo(s) selecionado(s): ${selectedFiles.map(f => f.name).join(', ')}`
                    : 'Clique ou arraste seus arquivos CSV aqui'}
                </span>
                <span className="text-[11px] text-slate-400">Detecção automática de Nome, Telefone, Documento, Cidade, Estado, etc.</span>
              </div>
            </div>

            {/* Detected Column Badges */}
            {detectedMap && (
              <div className="p-3.5 rounded-xl bg-dark-900 border border-slate-800 space-y-2">
                <span className="text-[11px] font-bold text-slate-400 block uppercase">COLUNAS DETECTADAS AUTOMATICAMENTE</span>
                <div className="flex flex-wrap gap-1.5 text-[10px]">
                  <span className="px-2 py-0.5 rounded bg-brand-yellow/10 text-brand-yellow border border-brand-yellow/20 font-bold">
                    Razão Social: {detectedMap.razao_social || 'Não detectado'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold">
                    Telefone: {detectedMap.telefone || 'Não detectado'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                    CNPJ: {detectedMap.cnpj || 'Não detectado'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Action Button */}
          <div className="space-y-3">
            <button
              onClick={handleConvert}
              disabled={isProcessing || selectedFiles.length === 0}
              className={`w-full py-3.5 rounded-xl font-extrabold text-sm shadow-lg transition-all flex items-center justify-center gap-2 ${
                selectedFiles.length > 0
                  ? 'bg-brand-yellow hover:bg-yellow-400 text-dark-900 shadow-brand-yellow/20 cursor-pointer'
                  : 'bg-dark-700 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Wand2 className="w-4 h-4" />
              <span>{isProcessing ? 'Convertendo...' : 'Converter Leads Agora'}</span>
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

        {/* Right Column: Output Files History */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-dark-800/90 border border-slate-800 glass-card space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                <span>Pasta de Saída (Histórico)</span>
              </h3>
              <span className="text-xs text-slate-400 font-medium">{historyFiles.length} arquivos gerados</span>
            </div>

            {historyFiles.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-[#222222] rounded-xl space-y-2">
                <FileText className="w-8 h-8 text-slate-600 mx-auto" />
                <span className="text-xs text-slate-400 font-medium block">Nenhum arquivo convertido ainda.</span>
                <span className="text-[11px] text-slate-500 block">Os arquivos convertidos aparecerão aqui para download 1-Click.</span>
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
                      <span>Linhas Exportadas: <strong className="text-emerald-400">{file.exportRows.toLocaleString('pt-BR')}</strong></span>
                      <span>Removidas: <strong className="text-rose-400">{file.removedRows.toLocaleString('pt-BR')}</strong></span>
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-slate-800/60">
                      <button
                        onClick={() => triggerSaveAsModal(file.fileName, file.content, 'csv')}
                        className="flex-1 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Salvar / Baixar CSV</span>
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

      {/* Save File Modal */}
      <SaveFileModal
        isOpen={saveModal.isOpen}
        suggestedFileName={saveModal.fileName}
        fileType={saveModal.fileType}
        onSave={(finalFileName) => {
          saveCSVFileWithPrompt(finalFileName, saveModal.content, saveModal.fileType);
        }}
        onClose={() => setSaveModal({ ...saveModal, isOpen: false })}
      />
    </div>
  );
};
