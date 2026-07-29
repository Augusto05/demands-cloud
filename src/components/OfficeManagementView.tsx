import React, { useState } from 'react';
import { Building2, Plus, Save, Trash2, Check, Target, UserPlus, Shield, KeyRound, Mail, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Office } from '../types';
import { supabase } from '../services/supabaseClient';

interface OfficeManagementViewProps {
  offices: Office[];
  onSaveOffices: (offices: Office[]) => void;
}

export const OfficeManagementView: React.FC<OfficeManagementViewProps> = ({
  offices,
  onSaveOffices
}) => {
  const [officeList, setOfficeList] = useState<Office[]>([...offices]);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // New Office Form
  const [newOfficeName, setNewOfficeName] = useState('');
  const [newDailyMeta, setNewDailyMeta] = useState<number>(200);
  const [newColor, setNewColor] = useState('#3B82F6');

  // New Admin User Provisioning Form
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [userCreating, setUserCreating] = useState(false);
  const [userSuccessMsg, setUserSuccessMsg] = useState<string | null>(null);
  const [userErrorMsg, setUserErrorMsg] = useState<string | null>(null);

  // Keep internal officeList synced if offices prop changes externally
  React.useEffect(() => {
    setOfficeList([...offices]);
  }, [offices]);

  const handleMetaChange = (id: string, meta: number) => {
    const updated = officeList.map(o => o.id === id ? { ...o, dailyMeta: Math.max(1, meta) } : o);
    setOfficeList(updated);
  };

  const handleSave = () => {
    onSaveOffices(officeList);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleAddOffice = () => {
    if (!newOfficeName.trim()) return;
    const id = newOfficeName.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();
    const newOff: Office = {
      id,
      name: newOfficeName.trim(),
      dailyMeta: newDailyMeta,
      color: newColor
    };
    const updated = [...officeList, newOff];
    setOfficeList(updated);
    onSaveOffices(updated);
    setNewOfficeName('');
    setNewDailyMeta(200);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleDeleteOffice = (id: string) => {
    if (confirm('Deseja realmente remover este escritório?')) {
      const updated = officeList.filter(o => o.id !== id);
      setOfficeList(updated);
      onSaveOffices(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-dark-800 border border-slate-800 shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tight">Gerenciamento de Escritórios e Metas</h2>
            <p className="text-xs text-slate-400">Configure os escritórios ativos e defina suas metas diárias individuais.</p>
          </div>
        </div>

        <button
          onClick={handleSave}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg ${
            savedSuccess ? 'bg-emerald-400 text-dark-900' : 'bg-brand-yellow hover:bg-yellow-400 text-dark-900'
          }`}
        >
          {savedSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          <span>{savedSuccess ? 'Metas Salvas!' : 'Salvar Alterações'}</span>
        </button>
      </div>

      {/* Office Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {officeList.map((off) => (
          <div key={off.id} className="p-5 rounded-2xl bg-dark-800 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-4 h-4 rounded-full" style={{ backgroundColor: off.color }} />
                <h3 className="font-extrabold text-base text-white">{off.name}</h3>
              </div>
              <button
                onClick={() => handleDeleteOffice(off.id)}
                className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                title="Remover escritório"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-brand-yellow" />
                <span>Meta Diária de Boletos:</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={off.dailyMeta}
                  onChange={(e) => handleMetaChange(off.id, parseInt(e.target.value) || 0)}
                  className="w-36 px-3 py-2 rounded-xl bg-[#0A0A0A] border border-[#222222] text-white font-extrabold text-lg focus:outline-none focus:border-brand-yellow"
                />
                <span className="text-xs text-slate-400">boletos / dia</span>
              </div>
            </div>

            <div className="pt-2 border-t border-[#222222] text-[11px] text-slate-400 flex items-center justify-between">
              <span>Meta por Hora (9h-17h): <strong className="text-white">{(off.dailyMeta / 9).toFixed(1)} boletos/h</strong></span>
            </div>
          </div>
        ))}
      </div>

      {/* Add New Office Panel */}
      <div className="p-6 rounded-2xl bg-dark-800 border border-slate-800 shadow-xl space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Plus className="w-5 h-5 text-brand-yellow" />
          <span>Cadastrar Novo Escritório</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">Nome do Escritório</label>
            <input
              type="text"
              placeholder="Ex: Escritório Alfa"
              value={newOfficeName}
              onChange={(e) => setNewOfficeName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#0A0A0A] border border-[#222222] text-white text-xs font-bold focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">Meta Diária (Boletos)</label>
            <input
              type="number"
              value={newDailyMeta}
              onChange={(e) => setNewDailyMeta(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-xl bg-[#0A0A0A] border border-[#222222] text-white text-xs font-bold focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">Cor do Destaque</label>
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="w-full h-9 p-1 rounded-xl bg-[#0A0A0A] border border-[#222222] cursor-pointer"
            />
          </div>
        </div>

        <button
          onClick={handleAddOffice}
          className="px-4 py-2 rounded-xl bg-brand-yellow text-dark-900 text-xs font-bold hover:bg-yellow-400 transition-all flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Adicionar Escritório</span>
        </button>
      </div>

      {/* Admin User Provisioning Panel */}
      <div className="p-6 rounded-2xl bg-dark-800 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-brand-yellow" />
            <span>Gestão de Usuários (Painel do Administrador)</span>
          </h3>
          <span className="text-[11px] font-bold text-slate-400 bg-[#141414] px-2.5 py-1 rounded-lg border border-[#222222]">
            Provisionamento de Acessos
          </span>
        </div>

        <p className="text-xs text-slate-400">
          Crie novos usuários do sistema definindo seus e-mails e senhas de acesso. Os usuários cadastrados poderão logar na tela inicial.
        </p>

        {userErrorMsg && (
          <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{userErrorMsg}</span>
          </div>
        )}

        {userSuccessMsg && (
          <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{userSuccessMsg}</span>
          </div>
        )}

        <form onSubmit={async (e) => {
          e.preventDefault();
          if (!newUserEmail.trim() || !newUserPassword.trim()) {
            setUserErrorMsg('Preencha o e-mail e a senha do novo usuário.');
            return;
          }
          if (newUserPassword.length < 6) {
            setUserErrorMsg('A senha do usuário deve ter no mínimo 6 caracteres.');
            return;
          }

          setUserCreating(true);
          setUserErrorMsg(null);
          setUserSuccessMsg(null);

          try {
            if (!supabase) throw new Error('Supabase não configurado');

            const { data, error } = await supabase.auth.signUp({
              email: newUserEmail.trim(),
              password: newUserPassword.trim()
            });

            if (error) throw error;

            setUserSuccessMsg(`Usuário ${newUserEmail.trim()} cadastrado com sucesso! As credenciais de acesso já estão ativas.`);
            setNewUserEmail('');
            setNewUserPassword('');
          } catch (err: any) {
            console.error(err);
            let msg = err.message || 'Erro ao criar usuário.';
            if (msg.includes('User already registered')) {
              msg = 'Este e-mail de usuário já está cadastrado no sistema.';
            }
            setUserErrorMsg(msg);
          } finally {
            setUserCreating(false);
          }
        }} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1 flex items-center gap-1">
              <Mail className="w-3.5 h-3.5 text-brand-yellow" />
              <span>E-mail do Novo Usuário</span>
            </label>
            <input
              type="email"
              required
              placeholder="usuario@empresa.com"
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[#0A0A0A] border border-[#222222] text-white text-xs font-bold focus:outline-none focus:border-brand-yellow"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1 flex items-center gap-1">
              <KeyRound className="w-3.5 h-3.5 text-brand-yellow" />
              <span>Senha Inicial de Acesso</span>
            </label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="••••••••"
              value={newUserPassword}
              onChange={(e) => setNewUserPassword(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[#0A0A0A] border border-[#222222] text-white text-xs font-bold focus:outline-none focus:border-brand-yellow"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={userCreating}
              className="w-full px-4 py-2.5 rounded-xl bg-brand-yellow hover:bg-yellow-400 text-slate-950 text-xs font-extrabold transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {userCreating ? (
                <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Cadastrar Usuário</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
