import React from 'react';
import { 
  ArrowRight, 
  ShieldCheck, 
  BarChart3, 
  Workflow, 
  LayoutList, 
  Wand2, 
  CheckCircle2,
  Lock,
  Database
} from 'lucide-react';
import { AppLogo } from '../components/AppLogo';

interface LandingPageProps {
  onNavigateToLogin: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigateToLogin }) => {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-slate-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200 antialiased relative overflow-x-hidden animate-fadeIn">
      {/* Dynamic Animated Ambient Background Lights */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[850px] h-[550px] bg-amber-500/10 rounded-full blur-[160px] pointer-events-none animate-float-slow" />
      <div className="absolute top-[750px] right-0 w-[550px] h-[550px] bg-amber-600/5 rounded-full blur-[150px] pointer-events-none animate-float-slow delay-300" />

      {/* Header Navigation */}
      <header className="sticky top-0 z-50 bg-[#0A0A0A]/90 backdrop-blur-xl border-b border-[#1F1F1F] px-6 py-4 transition-all duration-300">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <AppLogo size="md" />

          <div className="flex items-center gap-4">
            <button
              onClick={onNavigateToLogin}
              className="px-5 py-2.5 rounded-xl bg-[#FACC15] hover:bg-amber-400 text-slate-950 font-black text-xs transition-all duration-300 flex items-center gap-2 shadow-lg shadow-amber-950/40 cursor-pointer hover:scale-105 active:scale-95 group"
            >
              <span>Acessar Plataforma</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-6 relative z-10">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          
          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-tight animate-slide-up">
            Gestão Unificada de <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 bg-clip-text text-transparent">
              Escritórios, Conversões e Disparos
            </span>
          </h1>

          {/* Description */}
          <p className="text-slate-400 text-base sm:text-lg max-w-3xl mx-auto font-medium leading-relaxed animate-slide-up delay-200">
            Controle absoluto sobre metas de boletos, acompanhamento horário de contas abertas, 
            priorização no Kanban de operações, cruzamento de blocklists e automações com segurança na nuvem.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 animate-slide-up delay-300">
            <button
              onClick={onNavigateToLogin}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-[#FACC15] hover:bg-amber-400 text-slate-950 font-black text-sm transition-all duration-300 flex items-center justify-center gap-3 shadow-xl shadow-amber-950/50 cursor-pointer hover:scale-105 active:scale-95 group animate-pulse-glow"
            >
              <span>Entrar no Sistema</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
            </button>

            <a
              href="#recursos"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-[#141414] hover:bg-[#1A1A1A] border border-[#262626] hover:border-amber-500/40 text-slate-300 hover:text-white font-extrabold text-sm transition-all duration-300 flex items-center justify-center gap-2 hover:scale-105"
            >
              <span>Conhecer Módulos</span>
            </a>
          </div>

          {/* Feature Badges */}
          <div className="pt-8 border-t border-[#1F1F1F] grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto text-xs text-slate-400 font-semibold animate-slide-up delay-400">
            <div className="flex items-center justify-center gap-2 hover:text-amber-400 transition-colors">
              <CheckCircle2 className="w-4 h-4 text-amber-400" />
              <span>Multi-Escritórios</span>
            </div>
            <div className="flex items-center justify-center gap-2 hover:text-amber-400 transition-colors">
              <CheckCircle2 className="w-4 h-4 text-amber-400" />
              <span>Sincronização em Tempo Real</span>
            </div>
            <div className="flex items-center justify-center gap-2 hover:text-amber-400 transition-colors">
              <CheckCircle2 className="w-4 h-4 text-amber-400" />
              <span>Banco de Dados Supabase (RLS)</span>
            </div>
            <div className="flex items-center justify-center gap-2 hover:text-amber-400 transition-colors">
              <CheckCircle2 className="w-4 h-4 text-amber-400" />
              <span>Automações de Blocklist</span>
            </div>
          </div>
        </div>
      </section>

      {/* Modules & Features Grid */}
      <section id="recursos" className="py-16 px-6 bg-[#0D0D0D] border-t border-[#1F1F1F]">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-xs font-black text-amber-400 tracking-widest uppercase">
              MÓDULOS DE OPERAÇÃO
            </h2>
            <p className="text-2xl sm:text-3xl font-extrabold text-white">
              Tudo o que sua equipe precisa em uma única plataforma
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="p-6 rounded-2xl bg-[#141414] border border-[#222222] space-y-4 hover:border-amber-500/50 hover:-translate-y-2 hover:shadow-[0_12px_30px_-8px_rgba(250,204,21,0.2)] transition-all duration-300 group cursor-pointer">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-110 group-hover:bg-amber-500/20 transition-all duration-300">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-amber-300 transition-colors">Dashboard & Curva Horária</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                Monitore o ritmo diário de emissão de boletos, contas abertas e projeção de fechamento hora a hora para cada escritório.
              </p>
            </div>

            {/* Card 2 */}
            <div className="p-6 rounded-2xl bg-[#141414] border border-[#222222] space-y-4 hover:border-amber-500/50 hover:-translate-y-2 hover:shadow-[0_12px_30px_-8px_rgba(250,204,21,0.2)] transition-all duration-300 group cursor-pointer">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-110 group-hover:bg-amber-500/20 transition-all duration-300">
                <LayoutList className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-amber-300 transition-colors">Kanban de Operações</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                Gestão visual por cartões, tags de prioridade, prazos e controle de atribuições por escritório.
              </p>
            </div>

            {/* Card 3 */}
            <div className="p-6 rounded-2xl bg-[#141414] border border-[#222222] space-y-4 hover:border-amber-500/50 hover:-translate-y-2 hover:shadow-[0_12px_30px_-8px_rgba(250,204,21,0.2)] transition-all duration-300 group cursor-pointer">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-110 group-hover:bg-amber-500/20 transition-all duration-300">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-amber-300 transition-colors">Cruzador de Blocklists</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                Filtragem automática anti-join de opt-out e Não Perturbe antes do envio das listas de disparos.
              </p>
            </div>

            {/* Card 4 */}
            <div className="p-6 rounded-2xl bg-[#141414] border border-[#222222] space-y-4 hover:border-amber-500/50 hover:-translate-y-2 hover:shadow-[0_12px_30px_-8px_rgba(250,204,21,0.2)] transition-all duration-300 group cursor-pointer">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-110 group-hover:bg-amber-500/20 transition-all duration-300">
                <Workflow className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-amber-300 transition-colors">Fluxos de Análise</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                Mapeamento visual estilo diagramador para acompanhar gargalos e conversores da URA.
              </p>
            </div>

            {/* Card 5 */}
            <div className="p-6 rounded-2xl bg-[#141414] border border-[#222222] space-y-4 hover:border-amber-500/50 hover:-translate-y-2 hover:shadow-[0_12px_30px_-8px_rgba(250,204,21,0.2)] transition-all duration-300 group cursor-pointer">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-110 group-hover:bg-amber-500/20 transition-all duration-300">
                <Wand2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-amber-300 transition-colors">Conversor de Leads</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                Tratamento em lote de planilhas de mailing com formatação de telefones e extração rápida.
              </p>
            </div>

            {/* Card 6 */}
            <div className="p-6 rounded-2xl bg-[#141414] border border-[#222222] space-y-4 hover:border-amber-500/50 hover:-translate-y-2 hover:shadow-[0_12px_30px_-8px_rgba(250,204,21,0.2)] transition-all duration-300 group cursor-pointer">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-110 group-hover:bg-amber-500/20 transition-all duration-300">
                <Database className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-amber-300 transition-colors">Segurança & Supabase Cloud</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                Criptografia no banco de dados com autenticação estrita de usuários por nível de acesso.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Footer Banner */}
      <section className="py-16 px-6 bg-[#0A0A0A] border-t border-[#1F1F1F] text-center">
        <div className="max-w-4xl mx-auto space-y-6 bg-gradient-to-b from-[#141414] to-[#0F0F0F] p-10 rounded-3xl border border-[#222222] hover:border-amber-500/30 shadow-2xl transition-all duration-500">
          <AppLogo size="lg" className="justify-center" />
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            Pronto para gerenciar seus escritórios com máxima eficiência?
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 font-medium max-w-xl mx-auto">
            Faça login com suas credenciais corporativas para acessar o painel e acompanhar as métricas em tempo real.
          </p>
          <button
            onClick={onNavigateToLogin}
            className="px-8 py-3.5 rounded-xl bg-[#FACC15] hover:bg-amber-400 text-slate-950 font-black text-xs transition-all duration-300 inline-flex items-center gap-2 shadow-lg shadow-amber-950/50 cursor-pointer hover:scale-105 active:scale-95 group animate-pulse-glow"
          >
            <span>Fazer Login no Demands</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 px-6 border-t border-[#1A1A1A] text-center text-xs text-slate-500 font-medium">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>© {new Date().getFullYear()} Demands - Todos os direitos reservados.</span>
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>Autenticação Segura TLS 1.3 via Supabase Auth</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
