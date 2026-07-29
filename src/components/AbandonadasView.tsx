import React, { useState, useEffect } from 'react';
import { 
  PhoneOff, 
  Upload, 
  FileSpreadsheet, 
  Download, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Building2,
  FileCheck,
  PhoneCall
} from 'lucide-react';
import { Office, GeneratedFile } from '../types';
import { processAbandonadasData, ProcessAbandonadasResult } from '../services/abandonadasService';
import { 
  addGeneratedFile, 
  getStoredGeneratedFiles, 
  deleteGeneratedFile, 
  saveCSVFileWithPrompt, 
  downloadGeneratedFileById 
} from '../services/generatedFilesService';
import { SaveFileModal } from './SaveFileModal';

interface AbandonadasViewProps {
  offices: Office[];
}

export const AbandonadasView: React.FC<AbandonadasViewProps> = ({ offices }) => {
  const [selectedOfficeId, setSelectedOfficeId] = useState<string>(offices[0]?.id || '1');
  
  // Uploaded files content
  const [cdrFile, setCdrFile] = useState<{ file: File, content: string } | null>(null);
  const [uraFile, setUraFile] = useState<{ file: File, content: string } | null>(null);

  // Result state
  const [result, setResult] = useState<ProcessAbandonadasResult | null>(null);
  const [historyFiles, setHistoryFiles] = useState<GeneratedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string, type: 'success' | 'error' | 'info' } | null>(null);

  // Save Modal state for Safari / Manual Trigger
  const [saveModal, setSaveModal] = useState<{ isOpen: boolean, fileName: string, content: string, fileType: 'xlsx' | 'csv' }>({
    isOpen: false,
    fileName: '',
    content: '',
    fileType: 'xlsx'
  });

  // Load History
  useEffect(() => {
    const files = getStoredGeneratedFiles().filter(f => f.module === 'abandonadas');
    setHistoryFiles(files);
  }, []);

  const handleCdrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      setCdrFile({ file, content: event.target?.result as string });
    };
    reader.readAsText(file, 'latin1');
  };

  const handleUraUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      setUraFile({ file, content: event.target?.result as string });
    };
    reader.readAsText(file, 'latin1');
  };

  const handleProcess = async () => {
    if (!cdrFile || !uraFile) {
      setStatusMessage({ text: 'Envie ambos os arquivos (Relatório CDR do Discador e Resultado da URA).', type: 'error' });
      return;
    }

    setIsProcessing(true);
    setStatusMessage({ text: 'Extraindo chamadas abandonadas e gerando planilha Excel XLSX...', type: 'info' });

    setTimeout(async () => {
      try {
        const targetOffice = offices.find(o => o.id === selectedOfficeId)?.name || 'Aliança Sul';
        const res = processAbandonadasData(cdrFile.content, uraFile.content, targetOffice);
        setResult(res);

        const savedFile = await addGeneratedFile({
          module: 'abandonadas',
          fileName: res.defaultFileName,
          totalRows: res.totalCDR,
          exportRows: res.matchedCount,
          removedRows: res.unmatchedCount,
          content: res.xlsxBase64,
          fileType: 'xlsx'
        });

        setHistoryFiles(prev => [savedFile, ...prev]);

        // Prompt Save As dialog / download XLSX
        if ('showSaveFilePicker' in window) {
          await saveCSVFileWithPrompt(res.defaultFileName, res.xlsxBase64, 'xlsx');
        } else {
          // Open custom modal for Safari / non-native file picker browsers
          setSaveModal({
            isOpen: true,
            fileName: res.defaultFileName,
            content: res.xlsxBase64,
            fileType: 'xlsx'
          });
        }

        setStatusMessage({
          text: `✓ ${res.totalCDR} chamadas abandonadas extraídas em XLSX! ${res.matchedCount} cruzadas com sucesso na URA.`,
          type: 'success'
        });
      } catch (err: any) {
        console.error(err);
        setStatusMessage({ text: `Erro ao processar abandonadas: ${err.message || 'Falha no cruzamento'}`, type: 'error' });
      } finally {
        setIsProcessing(false);
      }
    }, 300);
  };

  const handleDeleteHistoryFile = (id: string) => {
    deleteGeneratedFile(id);
    setHistoryFiles(prev => prev.filter(f => f.id !== id));
  };

  const triggerSaveAsModal = (fileName: string, content: string, fileType: 'xlsx' | 'csv' = 'xlsx') => {
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

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-dark-800 border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <PhoneOff className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tight">Geração de Abandonadas (Exportação XLSX)</h2>
            <p className="text-xs text-slate-400">Cruzamento de chamadas que entraram na fila com a base da URA para enriquecimento e exportação nativa em planilha Excel (.xlsx).</p>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Input Files & Settings */}
        <div className="lg:col-span-7 p-6 rounded-2xl bg-dark-800 border border-slate-800 shadow-xl space-y-6">
          
          {/* Target Office Selector */}
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-brand-yellow" />
              <span>ESCRITÓRIO DESTINO</span>
            </label>
            <div className="flex items-center gap-2 bg-[#141414] p-1.5 rounded-xl border border-[#222222]">
              {offices.map(off => (
                <button
                  key={off.id}
                  onClick={() => setSelectedOfficeId(off.id)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                    selectedOfficeId === off.id
                      ? 'bg-[#1F1F1F] text-white shadow-sm border border-[#222222]'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  style={selectedOfficeId === off.id ? { color: off.color } : {}}
                >
                  {off.name}
                </button>
              ))}
            </div>
          </div>

          {/* Step 1: Upload CDR Discador File */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[10px] font-black">1</span>
              <span>Relatório CDR do Discador (CDR...csv)</span>
            </label>
            <div className="p-4 rounded-xl bg-[#0A0A0A] border border-dashed border-[#222222] hover:border-amber-400 transition-colors text-center relative cursor-pointer">
              <input type="file" accept=".csv" onChange={handleCdrUpload} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
              <div className="flex items-center justify-center gap-3">
                <Upload className="w-5 h-5 text-amber-400" />
                <span className="text-xs font-bold text-white">
                  {cdrFile ? cdrFile.file.name : 'Selecionar arquivo CDR do Discador'}
                </span>
              </div>
            </div>
          </div>

          {/* Step 2: Upload URA Call Results File */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px] font-black">2</span>
              <span>Resultado de Chamadas URA (rep...csv)</span>
            </label>
            <div className="p-4 rounded-xl bg-[#0A0A0A] border border-dashed border-[#222222] hover:border-cyan-400 transition-colors text-center relative cursor-pointer">
              <input type="file" accept=".csv" onChange={handleUraUpload} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
              <div className="flex items-center justify-center gap-3">
                <Upload className="w-5 h-5 text-cyan-400" />
                <span className="text-xs font-bold text-white">
                  {uraFile ? uraFile.file.name : 'Selecionar relatório de Resultado da URA'}
                </span>
              </div>
            </div>
          </div>

          {/* Execute Button & Status */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <button
              onClick={handleProcess}
              disabled={isProcessing || !cdrFile || !uraFile}
              className={`w-full py-3.5 rounded-xl font-extrabold text-sm shadow-lg transition-all flex items-center justify-center gap-2 ${
                cdrFile && uraFile 
                  ? 'bg-amber-400 hover:bg-yellow-400 text-dark-900 shadow-amber-500/20 cursor-pointer' 
                  : 'bg-dark-700 text-slate-500 cursor-not-allowed'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{isProcessing ? 'Processando e Cruzando...' : 'Gerar e Salvar Planilha Excel (.xlsx)'}</span>
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

          {/* Results Summary Strip */}
          {result && (
            <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-800">
              <div className="p-3 rounded-xl bg-dark-900 text-center border border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">ABANDONADAS CDR</span>
                <span className="text-lg font-black text-white">{result.totalCDR.toLocaleString('pt-BR')}</span>
              </div>

              <div className="p-3 rounded-xl bg-dark-900 text-center border border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">MATCH COM URA</span>
                <span className="text-lg font-black text-emerald-400">{result.matchedCount.toLocaleString('pt-BR')}</span>
              </div>

              <div className="p-3 rounded-xl bg-dark-900 text-center border border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">NÃO ENCONTRADAS</span>
                <span className="text-lg font-black text-rose-400">{result.unmatchedCount.toLocaleString('pt-BR')}</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Output History Panel */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-dark-800/90 border border-slate-800 glass-card space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-amber-400" />
                <span>Histórico de Abandonadas (.xlsx)</span>
              </h3>
              <span className="text-xs text-slate-400 font-medium">{historyFiles.length} arquivos</span>
            </div>

            {historyFiles.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl space-y-2">
                <PhoneCall className="w-8 h-8 text-slate-600 mx-auto" />
                <span className="text-xs text-slate-400 font-medium block">Nenhum arquivo de abandonadas gerado ainda.</span>
                <span className="text-[11px] text-slate-500 block">Os arquivos gerados (`Abandonadas_...xlsx`) ficarão salvos aqui para download.</span>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                {historyFiles.map(file => (
                  <div key={file.id} className="p-3.5 rounded-xl bg-dark-700/50 border border-slate-800 hover:border-slate-700 transition-all space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white truncate max-w-[200px]" title={file.fileName}>
                        {file.fileName}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(file.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Total: <strong className="text-white">{file.totalRows.toLocaleString('pt-BR')}</strong></span>
                      <span>Com CNPJ/Razão: <strong className="text-emerald-400">{file.exportRows.toLocaleString('pt-BR')}</strong></span>
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-slate-800/60">
                      <button
                        onClick={() => triggerSaveAsModal(file.fileName, file.content, 'xlsx')}
                        className="flex-1 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Salvar / Baixar XLSX</span>
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

      {/* Preview Table of Generated Abandonadas */}
      {result && result.rows.length > 0 && (
        <div className="p-6 rounded-2xl bg-dark-800/90 border border-slate-800 glass-card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-emerald-400" />
              <span>Pré-visualização dos Dados Cruzados ({result.rows.length} linhas)</span>
            </h3>
            <button
              onClick={() => triggerSaveAsModal(result.defaultFileName, result.xlsxBase64, 'xlsx')}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-dark-900 font-extrabold text-xs shadow-lg transition-all flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Salvar Arquivo Excel (.xlsx)</span>
            </button>
          </div>

          <div className="overflow-x-auto max-h-[400px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-dark-900/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                  <th className="py-3 px-4">Telefone</th>
                  <th className="py-3 px-4">Razão Social (Contato)</th>
                  <th className="py-3 px-4">CNPJ (14 dígitos)</th>
                  <th className="py-3 px-4 text-center">Status Match</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {result.rows.map((r, idx) => (
                  <tr key={idx} className="hover:bg-dark-700/30 transition-colors">
                    <td className="py-2.5 px-4 font-bold text-white">{r.telefone}</td>
                    <td className="py-2.5 px-4 text-slate-200">{r.razaoSocial}</td>
                    <td className="py-2.5 px-4 font-mono text-cyan-300">{r.cnpj}</td>
                    <td className="py-2.5 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        r.foundInURA ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {r.foundInURA ? 'OK' : 'Sem URA'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
