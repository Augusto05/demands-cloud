#!/usr/bin/env python3.14

import tkinter as tk
from tkinter import ttk, filedialog, messagebox
import csv
import re
import os
import json
from pathlib import Path

# ──────────────────────────────────────────────
# CONFIGURAÇÕES PERSISTENTES
# ──────────────────────────────────────────────

CONFIG_PATH = Path.home() / '.stark_conversor.json'

def carregar_config():
    try:
        if CONFIG_PATH.exists():
            return json.loads(CONFIG_PATH.read_text())
    except Exception:
        pass
    return {}

def salvar_config(dados):
    try:
        CONFIG_PATH.write_text(json.dumps(dados))
    except Exception:
        pass

# ──────────────────────────────────────────────
# LÓGICA DE TRANSFORMAÇÃO
# ──────────────────────────────────────────────

def detectar_encoding(path):
    for enc in ('utf-8-sig', 'utf-8', 'latin1', 'cp1252'):
        try:
            with open(path, encoding=enc) as f:
                f.read(4096)
            return enc
        except Exception:
            continue
    return 'utf-8'

def detectar_separador(path, enc):
    with open(path, encoding=enc, errors='replace') as f:
        amostra = f.read(2048)
    return ';' if amostra.count(';') > amostra.count(',') else ','

def detectar_tipo_base(headers):
    h = [x.upper().strip() for x in headers]
    if any('LEMIT' in x or 'EMPRESAS_ASSOCIADAS' in x or 'NOME/RAZAO' in x for x in h):
        return 'enriquecida'
    return 'padrao'

def encontrar_col(row, candidatos):
    for c in candidatos:
        v = row.get(c, '')
        if v and str(v).strip():
            return str(v).strip()
    return ''

def limpar_razao_social(s):
    if not isinstance(s, str):
        return ''
    return re.sub(r'[^a-zA-ZÀ-ÿ\s]', '', s).strip()

def limpar_telefone(t):
    return re.sub(r'\D', '', str(t))

def primeiro_nome(s):
    if not isinstance(s, str) or not s.strip():
        return ''
    return s.strip().split()[0]

def primeiro_nome_socio_lista(s):
    if not isinstance(s, str) or not s.strip():
        return ''
    primeiro = re.split(r',|;|\|', s)[0].strip()
    return primeiro.split()[0] if primeiro.split() else ''


# ──────────────────────────────────────────────
# DETECÇÃO INTELIGENTE DE COLUNAS
# ──────────────────────────────────────────────
# Em vez de depender de nomes fixos de coluna (que mudam de base pra base),
# detecta por: 1) palavras-chave no nome da coluna  2) padrão do conteúdo.

PALAVRAS_CNPJ        = ['cnpj']
PALAVRAS_TELEFONE    = ['telefone', 'tel', 'fone', 'celular', 'whatsapp', 'contato', 'numero']
PALAVRAS_RAZAO       = ['razao', 'razão', 'empresa', 'social', 'fantasia', 'associad']
PALAVRAS_SOCIO       = ['socio', 'sócio', 'nome', 'responsavel', 'responsável', 'titular', 'contato']
PALAVRAS_EXCLUIR_SOCIO_DE_RAZAO = ['socio', 'sócio']  # nome/razao_social não conta como "sócio puro"

def _norm(s):
    """Normaliza string: minúsculo, sem acento, sem espaço/underscore extra."""
    s = s.lower().strip()
    s = (s.replace('á','a').replace('ã','a').replace('â','a')
           .replace('é','e').replace('ê','e')
           .replace('í','i')
           .replace('ó','o').replace('õ','o').replace('ô','o')
           .replace('ú','u').replace('ç','c'))
    return s

def _col_contem_alguma(nome_col, palavras):
    n = _norm(nome_col)
    return any(p in n for p in palavras)

def _amostra_valores(linhas, col, n=30):
    vals = []
    for row in linhas[:n]:
        v = row.get(col, '')
        if v and str(v).strip():
            vals.append(str(v).strip())
    return vals

def _parece_cnpj(valores):
    if not valores:
        return False
    acertos = sum(1 for v in valores if len(re.sub(r'\D', '', v)) == 14)
    return acertos >= len(valores) * 0.7

def _parece_telefone(valores):
    if not valores:
        return False
    acertos = sum(1 for v in valores if 10 <= len(re.sub(r'\D', '', v)) <= 11)
    return acertos >= len(valores) * 0.7

def _parece_texto_nome(valores):
    """Tem letras, não é majoritariamente numérico."""
    if not valores:
        return False
    acertos = sum(1 for v in valores if re.search(r'[a-zA-ZÀ-ÿ]{2,}', v))
    return acertos >= len(valores) * 0.7

def detectar_colunas(headers, linhas):
    """
    Retorna um dict {tipo: nome_da_coluna} detectando automaticamente:
    cnpj, telefone, razao_social, nome_socio
    """
    mapa = {'cnpj': None, 'telefone': None, 'razao_social': None, 'nome_socio': None}

    candidatos_cnpj      = []
    candidatos_telefone  = []
    candidatos_razao     = []
    candidatos_socio     = []

    for h in headers:
        if not h:
            continue
        if _col_contem_alguma(h, PALAVRAS_CNPJ):
            candidatos_cnpj.append(h)
        if _col_contem_alguma(h, PALAVRAS_TELEFONE):
            candidatos_telefone.append(h)
        if _col_contem_alguma(h, PALAVRAS_RAZAO):
            candidatos_razao.append(h)
        if _col_contem_alguma(h, PALAVRAS_SOCIO):
            candidatos_socio.append(h)

    # ── CNPJ: por nome, valida por conteúdo ──
    for c in candidatos_cnpj:
        if _parece_cnpj(_amostra_valores(linhas, c)):
            mapa['cnpj'] = c
            break
    if not mapa['cnpj']:
        # fallback: procura em TODAS as colunas por padrão de 14 dígitos
        for h in headers:
            if _parece_cnpj(_amostra_valores(linhas, h)):
                mapa['cnpj'] = h
                break

    # ── TELEFONE: por nome, valida por conteúdo ──
    for c in candidatos_telefone:
        if _parece_telefone(_amostra_valores(linhas, c)):
            mapa['telefone'] = c
            break
    if not mapa['telefone']:
        # fallback: qualquer coluna numérica de 10-11 dígitos que não seja o CNPJ
        for h in headers:
            if h == mapa['cnpj']:
                continue
            if _parece_telefone(_amostra_valores(linhas, h)):
                mapa['telefone'] = h
                break

    # ── RAZÃO SOCIAL: prioriza "razao" > "empresa"/"associad" > "fantasia" ──
    razao_validas = [c for c in candidatos_razao if _parece_texto_nome(_amostra_valores(linhas, c))]
    if razao_validas:
        prio_razao   = [c for c in razao_validas if _col_contem_alguma(c, ['razao'])]
        prio_empresa = [c for c in razao_validas if _col_contem_alguma(c, ['empresa', 'associad'])]
        prio_fantasia = [c for c in razao_validas if _col_contem_alguma(c, ['fantasia'])]
        mapa['razao_social'] = (prio_razao or prio_empresa or prio_fantasia or razao_validas)[0]

    # ── NOME DO SÓCIO: precisa ter "socio" no nome E conteúdo de texto (nome), não número ──
    socio_explicito = [c for c in candidatos_socio
                        if _col_contem_alguma(c, PALAVRAS_EXCLUIR_SOCIO_DE_RAZAO)
                        and _parece_texto_nome(_amostra_valores(linhas, c))]
    if socio_explicito:
        mapa['nome_socio'] = socio_explicito[0]
    else:
        # senão, qualquer coluna de "nome" que não seja a já escolhida como razão social,
        # e que de fato pareça texto (nome de pessoa), não número
        outras_nome = [c for c in candidatos_socio if c != mapa['razao_social']
                       and _parece_texto_nome(_amostra_valores(linhas, c))]
        if outras_nome:
            mapa['nome_socio'] = outras_nome[0]
        elif mapa['razao_social']:
            # fallback: usa a própria razão social como base do nome do sócio
            mapa['nome_socio'] = mapa['razao_social']

    return mapa


def processar_arquivo(caminho, layout, email, fluxo, fluxo2, contratante):
    enc = detectar_encoding(caminho)
    sep = detectar_separador(caminho, enc)

    linhas = []
    with open(caminho, encoding=enc, errors='replace', newline='') as f:
        reader = csv.DictReader(f, delimiter=sep)
        headers = reader.fieldnames or []
        for row in reader:
            linhas.append(dict(row))

    total = len(linhas)
    mapa_colunas = detectar_colunas(headers, linhas)

    col_cnpj   = mapa_colunas['cnpj']
    col_tel    = mapa_colunas['telefone']
    col_razao  = mapa_colunas['razao_social']
    col_socio  = mapa_colunas['nome_socio']

    tels_vistos = set()
    saida = []

    for row in linhas:
        tel_raw = row.get(col_tel, '') if col_tel else ''
        tel = limpar_telefone(tel_raw)
        if len(tel) != 11:
            continue
        if tel in tels_vistos:
            continue
        tels_vistos.add(tel)

        cnpj_raw = row.get(col_cnpj, '') if col_cnpj else ''
        cnpj = re.sub(r'\D', '', str(cnpj_raw)).zfill(14)

        razao_raw = row.get(col_razao, '') if col_razao else ''
        socio_raw = row.get(col_socio, '') if col_socio else ''

        razao = limpar_razao_social(razao_raw) if razao_raw else ''
        if not razao:
            # fallback: usa o nome do sócio como razão social
            razao = limpar_razao_social(primeiro_nome_socio_lista(socio_raw) and socio_raw or socio_raw)

        socio = primeiro_nome_socio_lista(socio_raw) if socio_raw else primeiro_nome(razao_raw)

        if layout == 'padrao':
            saida.append({
                'Razão Social': razao,
                'CNPJ': cnpj,
                'Email': email,
                'Fluxo': fluxo,
                'Contratante': contratante,
                'DDD Telefone': tel,
            })
        else:
            saida.append({
                'Razão Social': razao,
                'Nome do Sócio': socio,
                'CNPJ': cnpj,
                'Email': email,
                'Fluxo 1': fluxo,
                'Fluxo 2': fluxo2,
                'Contratante': contratante,
                'DDD Telefone': tel,
            })

    tipo_base_label = 'detectada automaticamente'
    return total, saida, tipo_base_label

def salvar_csv(saida, path):
    campos = list(saida[0].keys())
    colunas_forcar_texto = {'CNPJ', 'DDD Telefone'}

    saida_formatada = []
    for row in saida:
        nova = dict(row)
        for col in colunas_forcar_texto:
            if col in nova and nova[col]:
                nova[col] = f'="{nova[col]}"'
        saida_formatada.append(nova)

    with open(path, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.DictWriter(f, fieldnames=campos)
        writer.writeheader()
        writer.writerows(saida_formatada)

# ──────────────────────────────────────────────
# CORES
# ──────────────────────────────────────────────

BG      = '#f8fafc'
SURFACE = '#ffffff'
BORDER  = '#d8dee9'
ACCENT  = '#2563eb'
ACCENT2 = '#7c3aed'
TEXT    = '#111827'
MUTED   = '#6b7280'
SUCCESS = '#16a34a'
DANGER  = '#dc2626'
INFO    = '#3b82f6'

# ──────────────────────────────────────────────
# JANELA PRINCIPAL
# ──────────────────────────────────────────────

class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title('Conversor de Leads · Stark')
        self.geometry('560x820')
        self.minsize(520, 740)
        self.resizable(True, True)
        self.configure(bg=BG)

        self.style = ttk.Style(self)
        try:
            self.style.theme_use('clam')
        except Exception:
            pass
        self.style.configure('App.TFrame', background=BG)
        self.style.configure('App.TLabel', background=BG, foreground=TEXT, font=('Menlo', 10, 'bold'))
        self.style.configure('Section.TLabel', background=BG, foreground=MUTED, font=('Menlo', 9))
        self.style.configure('Field.TLabel', background=BG, foreground=TEXT, font=('Menlo', 10, 'normal'))
        self.style.configure('Field.TEntry', fieldbackground=SURFACE, background=SURFACE, foreground=TEXT, bordercolor=BORDER, lightcolor=BORDER, darkcolor=BORDER, padding=8)
        self.style.configure('App.TRadiobutton', background=BG, foreground=TEXT, font=('Menlo', 10), focuscolor=BG)
        self.style.configure('Accent.TButton', background=ACCENT, foreground=BG, relief='flat', padding=10)
        self.style.map('Accent.TButton', background=[('active', '#1d4ed8')], foreground=[('active', BG)])

        self.layout_var  = tk.StringVar(value='padrao')
        self.modo_var    = tk.StringVar(value='unico')   # unico | pasta | consolidado
        self.arquivo_unico  = tk.StringVar()
        self.pasta_selecionada = tk.StringVar()

        self.config_dados = carregar_config()
        self._build()
        self._restaurar_campos()

    # ── BUILD ──────────────────────────────────

    def _build(self):
        P = dict(padx=28)

        # Header
        tk.Label(self, text='CONVERSOR DE LEADS', bg=BG, fg=ACCENT,
                 font=('Menlo', 10, 'bold')).pack(anchor='w', pady=(24,2), **P)
        tk.Label(self, text='Stark  ·  Base Padrão / Enriquecida  →  Layout Padrão / Alieste',
                 bg=BG, fg=MUTED, font=('Menlo', 9)).pack(anchor='w', **P)

        self._sep(P)

        # Layout de saída
        tk.Label(self, text='LAYOUT DE SAÍDA', bg=BG, fg=MUTED,
                 font=('Menlo', 9)).pack(anchor='w', **P)
        frm = tk.Frame(self, bg=BG)
        frm.pack(fill='x', pady=(8,0), **P)
        self._radio(frm, 'Padrão', 'padrao', self.layout_var).pack(side='left', padx=(0,24))
        self._radio(frm, 'Alieste  (+Sócio, +Fluxo 2)', 'alieste', self.layout_var).pack(side='left')

        self._sep(P)

        # Campos fixos
        tk.Label(self, text='CAMPOS FIXOS', bg=BG, fg=MUTED,
                 font=('Menlo', 9)).pack(anchor='w', **P)

        self.ent_email       = self._campo('Email', P, pady_top=10)
        self.ent_fluxo       = self._campo('Fluxo', P)
        self._frm_fluxo2, self.ent_fluxo2 = self._campo_frame('Fluxo 2  · Alieste', P)
        self.ent_contratante = self._campo('Contratante', P)

        self.layout_var.trace_add('write', self._toggle_fluxo2)
        self._toggle_fluxo2()

        self._sep(P)

        # Modo de entrada
        tk.Label(self, text='MODO DE ENTRADA', bg=BG, fg=MUTED,
                 font=('Menlo', 9)).pack(anchor='w', **P)

        frm_modo = tk.Frame(self, bg=BG)
        frm_modo.pack(fill='x', pady=(8,0), **P)
        self._radio(frm_modo, 'Arquivo único', 'unico', self.modo_var).pack(side='left', padx=(0,18))
        self._radio(frm_modo, 'Pasta (um CSV por arquivo)', 'pasta', self.modo_var).pack(side='left', padx=(0,18))
        self._radio(frm_modo, 'Pasta (consolidado)', 'consolidado', self.modo_var).pack(side='left')

        self.modo_var.trace_add('write', self._toggle_modo)

        # Frame arquivo único
        self._frm_unico = tk.Frame(self, bg=BG)
        self._frm_unico.pack(fill='x', pady=(10,0), **P)
        self.lbl_arquivo = tk.Label(self._frm_unico, text='Nenhum arquivo selecionado',
                                     bg=SURFACE, fg=MUTED, font=('Menlo', 10),
                                     anchor='w', padx=10, width=30)
        self.lbl_arquivo.pack(side='left', ipady=8)
        tk.Button(self._frm_unico, text='Abrir', bg=BORDER, fg=ACCENT,
                  font=('Menlo', 10, 'bold'), bd=0, padx=12, cursor='hand2',
                  activebackground='#3a3a45', activeforeground=ACCENT,
                  command=self._escolher_arquivo).pack(side='left', padx=(8,0), ipady=8)

        # Frame pasta
        self._frm_pasta = tk.Frame(self, bg=BG)
        self.lbl_pasta = tk.Label(self._frm_pasta, text='Nenhuma pasta selecionada',
                                   bg=SURFACE, fg=MUTED, font=('Menlo', 10),
                                   anchor='w', padx=10, width=30)
        self.lbl_pasta.pack(side='left', ipady=8)
        tk.Button(self._frm_pasta, text='Pasta', bg=BORDER, fg=ACCENT,
                  font=('Menlo', 10, 'bold'), bd=0, padx=12, cursor='hand2',
                  activebackground='#3a3a45', activeforeground=ACCENT,
                  command=self._escolher_pasta).pack(side='left', padx=(8,0), ipady=8)

        # Badge tipo base (arquivo único)
        self.lbl_tipo = tk.Label(self, text='', bg=BG, fg=ACCENT2, font=('Menlo', 9))
        self.lbl_tipo.pack(anchor='w', pady=(5,0), **P)

        self._toggle_modo()
        self._sep(P)

        # Botão converter
        self.btn = tk.Button(self, text='Converter e Salvar', bg=ACCENT,
                             fg=BG, font=('Menlo', 12, 'bold'), bd=0,
                             padx=20, cursor='hand2', activebackground='#d4ff3d',
                             activeforeground=BG, command=self._converter)
        self.btn.pack(fill='x', ipady=13, **P)

        # Status
        self.lbl_status = tk.Label(self, text='', bg=BG, fg=MUTED,
                                   font=('Menlo', 10), wraplength=500)
        self.lbl_status.pack(pady=(14,0), **P)

        # Stats
        frm_stats = tk.Frame(self, bg=BG)
        frm_stats.pack(pady=(12,0), **P)
        self.lbl_total    = self._stat(frm_stats, 'Total')
        self.lbl_filtrado = self._stat(frm_stats, 'Exportados')
        self.lbl_removido = self._stat(frm_stats, 'Removidos')
        self.lbl_arquivos = self._stat(frm_stats, 'Arquivos')

    # ── HELPERS UI ─────────────────────────────

    def _sep(self, P):
        ttk.Separator(self).pack(fill='x', pady=14, **P)

    def _radio(self, parent, texto, valor, var):
        return ttk.Radiobutton(parent, text=texto, variable=var, value=valor,
                               style='App.TRadiobutton')

    def _campo_frame(self, rotulo, P, pady_top=8):
        frm = ttk.Frame(self, style='App.TFrame')
        frm.pack(fill='x', pady=(pady_top,0), **P)
        ttk.Label(frm, text=rotulo, style='Field.TLabel', width=18, anchor='w').pack(side='left')
        ent = ttk.Entry(frm, style='Field.TEntry')
        ent.pack(side='left', fill='x', expand=True, padx=(4,0), pady=4)
        return frm, ent

    def _campo(self, rotulo, P, pady_top=8):
        _, ent = self._campo_frame(rotulo, P, pady_top)
        return ent

    def _stat(self, parent, label):
        frm = tk.Frame(parent, bg=SURFACE, padx=14, pady=10)
        frm.pack(side='left', padx=5)
        num = tk.Label(frm, text='—', bg=SURFACE, fg=ACCENT, font=('Menlo', 16, 'bold'))
        num.pack()
        tk.Label(frm, text=label, bg=SURFACE, fg=MUTED, font=('Menlo', 8)).pack()
        return num

    def _toggle_fluxo2(self, *_):
        if self.layout_var.get() == 'alieste':
            self._frm_fluxo2.pack(fill='x', pady=(8,0), padx=28,
                                   after=self.ent_fluxo.master)
        else:
            self._frm_fluxo2.pack_forget()

    def _toggle_modo(self, *_):
        modo = self.modo_var.get()
        if modo == 'unico':
            self._frm_pasta.pack_forget()
            self._frm_unico.pack(fill='x', pady=(10,0), padx=28)
        else:
            self._frm_unico.pack_forget()
            self._frm_pasta.pack(fill='x', pady=(10,0), padx=28)
        self.lbl_tipo.config(text='')

    # ── SELEÇÃO DE ARQUIVOS ────────────────────

    def _escolher_arquivo(self):
        path = filedialog.askopenfilename(
            title='Selecionar base CSV',
            filetypes=[('CSV', '*.csv'), ('Todos', '*.*')]
        )
        if not path:
            return
        self.arquivo_unico.set(path)
        self.lbl_arquivo.config(text=Path(path).name, fg=ACCENT)
        try:
            enc = detectar_encoding(path)
            sep = detectar_separador(path, enc)
            linhas = []
            with open(path, encoding=enc, errors='replace', newline='') as f:
                reader = csv.DictReader(f, delimiter=sep)
                headers = reader.fieldnames or []
                for i, row in enumerate(reader):
                    if i >= 30:
                        break
                    linhas.append(dict(row))
            mapa = detectar_colunas(headers, linhas)
            partes = []
            partes.append('CNPJ:' + (mapa['cnpj'] or '✗'))
            partes.append('Tel:' + (mapa['telefone'] or '✗'))
            partes.append('Razão:' + (mapa['razao_social'] or '✗'))
            partes.append('Sócio:' + (mapa['nome_socio'] or '✗'))
            label = '● ' + '   '.join(partes)
            faltando = (not mapa['cnpj']) or (not mapa['telefone'])
            cor = DANGER if faltando else SUCCESS
            self.lbl_tipo.config(text=label, fg=cor)
        except Exception:
            self.lbl_tipo.config(text='')
        self.lbl_status.config(text='')

    def _escolher_pasta(self):
        path = filedialog.askdirectory(title='Selecionar pasta com CSVs')
        if not path:
            return
        self.pasta_selecionada.set(path)
        csvs = list(Path(path).glob('*.csv'))
        self.lbl_pasta.config(
            text=f'{Path(path).name}  ({len(csvs)} CSV{"s" if len(csvs)!=1 else ""})',
            fg=ACCENT
        )
        self.lbl_status.config(text='')

    # ── VALIDAÇÃO ──────────────────────────────

    def _validar_campos(self):
        email       = self.ent_email.get().strip()
        fluxo       = self.ent_fluxo.get().strip()
        fluxo2      = self.ent_fluxo2.get().strip()
        contratante = self.ent_contratante.get().strip()
        layout      = self.layout_var.get()

        if not email or not fluxo or not contratante:
            messagebox.showwarning('Atenção', 'Preencha Email, Fluxo e Contratante.')
            return None
        if layout == 'alieste' and not fluxo2:
            messagebox.showwarning('Atenção', 'Preencha o Fluxo 2 para o layout Alieste.')
            return None

        return email, fluxo, fluxo2, contratante, layout

    # ── CONVERTER ──────────────────────────────

    def _converter(self):
        campos = self._validar_campos()
        if not campos:
            return
        email, fluxo, fluxo2, contratante, layout = campos

        # Salvar config
        salvar_config({'email': email, 'fluxo': fluxo, 'fluxo2': fluxo2, 'contratante': contratante})

        modo = self.modo_var.get()

        if modo == 'unico':
            self._converter_unico(email, fluxo, fluxo2, contratante, layout)
        else:
            self._converter_pasta(email, fluxo, fluxo2, contratante, layout, modo)

    def _converter_unico(self, email, fluxo, fluxo2, contratante, layout):
        path = self.arquivo_unico.get()
        if not path:
            messagebox.showwarning('Atenção', 'Selecione um arquivo CSV.')
            return

        saida_path = filedialog.asksaveasfilename(
            title='Salvar CSV convertido',
            defaultextension='.csv',
            filetypes=[('CSV', '*.csv')],
            initialfile=Path(path).stem + f'_{layout}_convertido.csv'
        )
        if not saida_path:
            return

        self.lbl_status.config(text='⏳ Processando...', fg=INFO)
        self.update()

        try:
            total, saida, tipo_base = processar_arquivo(path, layout, email, fluxo, fluxo2, contratante)
            if not saida:
                self.lbl_status.config(text='Nenhum registro passou pelos filtros.', fg=DANGER)
                return
            salvar_csv(saida, saida_path)
            self._atualizar_stats(total, len(saida), 1)
            self.lbl_status.config(
                text=f'✓ Concluído! Colunas detectadas automaticamente → layout {layout}.',
                fg=SUCCESS
            )
        except Exception as e:
            self.lbl_status.config(text=f'Erro: {e}', fg=DANGER)

    def _converter_pasta(self, email, fluxo, fluxo2, contratante, layout, modo):
        pasta = self.pasta_selecionada.get()
        if not pasta:
            messagebox.showwarning('Atenção', 'Selecione uma pasta.')
            return

        csvs = list(Path(pasta).glob('*.csv'))
        if not csvs:
            messagebox.showwarning('Atenção', 'Nenhum CSV encontrado na pasta.')
            return

        if modo == 'consolidado':
            saida_path = filedialog.asksaveasfilename(
                title='Salvar CSV consolidado',
                defaultextension='.csv',
                filetypes=[('CSV', '*.csv')],
                initialfile=f'consolidado_{layout}.csv'
            )
            if not saida_path:
                return
        else:
            saida_dir = filedialog.askdirectory(title='Selecionar pasta de destino')
            if not saida_dir:
                return

        self.lbl_status.config(text=f'⏳ Processando {len(csvs)} arquivos...', fg=INFO)
        self.update()

        total_geral   = 0
        saida_geral   = []
        erros         = []
        arqs_ok       = 0

        for csv_path in csvs:
            try:
                total, saida, _ = processar_arquivo(
                    str(csv_path), layout, email, fluxo, fluxo2, contratante
                )
                total_geral += total

                if not saida:
                    continue

                arqs_ok += 1

                if modo == 'consolidado':
                    saida_geral.extend(saida)
                else:
                    dest = Path(saida_dir) / (csv_path.stem + f'_{layout}_convertido.csv')
                    salvar_csv(saida, str(dest))
                    saida_geral.extend(saida)  # só pra contar

            except Exception as e:
                erros.append(f'{csv_path.name}: {e}')

        if modo == 'consolidado' and saida_geral:
            salvar_csv(saida_geral, saida_path)

        self._atualizar_stats(total_geral, len(saida_geral), arqs_ok)

        msg = f'✓ {arqs_ok}/{len(csvs)} arquivos processados  ·  {len(saida_geral):,} registros exportados.'.replace(',', '.')
        if erros:
            msg += f'\n⚠ {len(erros)} erro(s): ' + ' | '.join(erros[:3])
        self.lbl_status.config(text=msg, fg=SUCCESS if not erros else ACCENT)

    # ── UTILS ──────────────────────────────────

    def _atualizar_stats(self, total, exportados, arquivos):
        removidos = total - exportados
        self.lbl_total.config(text=f'{total:,}'.replace(',', '.'))
        self.lbl_filtrado.config(text=f'{exportados:,}'.replace(',', '.'))
        self.lbl_removido.config(text=f'{removidos:,}'.replace(',', '.'))
        self.lbl_arquivos.config(text=str(arquivos))

    def _restaurar_campos(self):
        c = self.config_dados
        if c.get('email'):       self.ent_email.insert(0, c['email'])
        if c.get('fluxo'):       self.ent_fluxo.insert(0, c['fluxo'])
        if c.get('fluxo2'):      self.ent_fluxo2.insert(0, c['fluxo2'])
        if c.get('contratante'): self.ent_contratante.insert(0, c['contratante'])


if __name__ == '__main__':
    app = App()
    app.mainloop()
