import csv
import re
import sys
import unicodedata
from pathlib import Path
import tkinter as tk
from tkinter import filedialog, messagebox

OUTPUT_FOLDER = "saida"

# Arquivos fixos de bloqueio (sempre precisam estar na mesma pasta do programa)
ANTI_JOIN_FILES = [
    "Blocklist 1.csv",
    "Blocklist 2.csv",
    "Blocklist 3.csv",
    "Nao Perturbe 1.csv",
    "Nao Perturbe 2.csv",
    "Nao Perturbe 3.csv",
]

# Nomes de coluna aceitos como "telefone" nos arquivos de bloqueio
PHONE_COLUMN_CANDIDATES = [
    "TELEFONE",
    "DDDTELEFONE",
    "FONE",
    "CELULAR",
    "NUMERO",
    "NÚMERO",
    "TEL",
    "PHONE",
    "WHATSAPP",
    "CONTATO",
]


def app_dir() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parent


def normalize_phone(value) -> str:
    if value is None:
        return ""
    text = str(value).strip()
    return re.sub(r"\D", "", text)


def normalize_header(name: str) -> str:
    """Remove BOM, acentos comuns, espaços e deixa em maiúsculas para comparar nomes de coluna."""
    if name is None:
        return ""
    text = name.replace("\ufeff", "").strip().upper()
    accents = {
        "Á": "A", "À": "A", "Ã": "A", "Â": "A",
        "É": "E", "È": "E", "Ê": "E",
        "Í": "I", "Ì": "I",
        "Ó": "O", "Ò": "O", "Õ": "O", "Ô": "O",
        "Ú": "U", "Ù": "U",
        "Ç": "C",
    }
    for k, v in accents.items():
        text = text.replace(k, v)
    return text


def find_phone_column(fieldnames, preferred_names=None):
    """
    Procura entre as colunas do arquivo uma que pareça ser telefone.
    1) Tenta achar match exato com a lista de candidatos (ou preferred_names, se passado).
    2) Se não achar, procura qualquer coluna que CONTENHA uma das palavras-chave
       (ex: 'DDD_TELEFONE_CLIENTE', 'TELEFONE2', 'WHATSAPP_PRINCIPAL').
    Retorna o nome ORIGINAL da coluna (como está no arquivo) ou None se não achar.
    """
    candidates = preferred_names if preferred_names else PHONE_COLUMN_CANDIDATES
    normalized_map = {normalize_header(f): f for f in fieldnames}

    # 1) match exato
    for cand in candidates:
        cand_norm = normalize_header(cand)
        if cand_norm in normalized_map:
            return normalized_map[cand_norm]

    # 2) match parcial (a coluna contém a palavra-chave)
    keywords = ["TELEFONE", "FONE", "CELULAR", "WHATSAPP", "NUMERO", "TEL", "CONTATO"]
    for original in fieldnames:
        norm = normalize_header(original)
        for kw in keywords:
            if kw in norm:
                return original

    return None


def find_file_unicode_safe(folder: Path, target_name: str) -> Path:
    """
    Procura um arquivo na pasta comparando nomes de forma imune a diferenças
    de normalização Unicode (NFC vs NFD). O macOS costuma salvar nomes de
    arquivo com acento em NFD, o que faz uma comparação de string simples
    falhar mesmo quando o nome 'parece' idêntico visualmente.
    """
    direct = folder / target_name
    if direct.exists():
        return direct

    target_norm = unicodedata.normalize("NFC", target_name)
    for existing in folder.iterdir():
        if unicodedata.normalize("NFC", existing.name) == target_norm:
            return existing

    return direct  # devolve o caminho "esperado" para a mensagem de erro


def detect_delimiter(file_path: Path, encoding: str) -> str:
    with open(file_path, "r", encoding=encoding, newline="") as f:
        sample = f.read(8192)
        if not sample.strip():
            return ";"
        try:
            dialect = csv.Sniffer().sniff(sample, delimiters=";,|\t")
            return dialect.delimiter
        except csv.Error:
            lines = sample.splitlines()
            header = lines[0] if lines else ""
            if header.count(";") >= header.count(","):
                return ";"
            return ","


def read_csv_rows(file_path: Path, delimiter: str, encoding: str):
    with open(file_path, "r", encoding=encoding, newline="") as f:
        reader = csv.DictReader(f, delimiter=delimiter)
        if reader.fieldnames is None:
            raise ValueError(f"O arquivo '{file_path.name}' está vazio ou sem cabeçalho.")
        rows = list(reader)
        return reader.fieldnames, rows


def load_antijoin_file(file_path: Path) -> set:
    last_error = None
    for enc in ("utf-8-sig", "latin1"):
        try:
            delimiter = detect_delimiter(file_path, enc)
            fieldnames, rows = read_csv_rows(file_path, delimiter, enc)

            phone_column = find_phone_column(fieldnames)
            if phone_column is None:
                raise ValueError(
                    f"Não foi encontrada nenhuma coluna de telefone no arquivo '{file_path.name}'. "
                    f"Colunas encontradas: {fieldnames}"
                )

            phones = {
                normalize_phone(row.get(phone_column, ""))
                for row in rows
                if normalize_phone(row.get(phone_column, ""))
            }
            return phones
        except Exception as e:
            last_error = e
    raise last_error


def load_all_blocked_phones(program_folder: Path):
    blocked_phones = set()
    file_stats = []

    for file_name in ANTI_JOIN_FILES:
        file_path = find_file_unicode_safe(program_folder, file_name)

        if not file_path.exists():
            raise FileNotFoundError(
                f"Arquivo obrigatório não encontrado na pasta do programa:\n{file_path}"
            )

        phones = load_antijoin_file(file_path)
        blocked_phones.update(phones)
        file_stats.append((file_name, len(phones)))

    return blocked_phones, file_stats


def process_file(base_file_path: Path):
    program_folder = app_dir()
    blocked_phones, file_stats = load_all_blocked_phones(program_folder)

    last_error = None
    for enc in ("utf-8-sig", "latin1"):
        try:
            delimiter = detect_delimiter(base_file_path, enc)
            fieldnames, rows = read_csv_rows(base_file_path, delimiter, enc)

            base_phone_column = find_phone_column(fieldnames)
            if base_phone_column is None:
                raise ValueError(
                    "Não foi encontrada nenhuma coluna de telefone na base selecionada.\n"
                    f"Colunas encontradas: {fieldnames}"
                )

            filtered_rows = []
            for row in rows:
                phone = normalize_phone(row.get(base_phone_column, ""))
                if phone not in blocked_phones:
                    filtered_rows.append(row)

            output_dir = program_folder / OUTPUT_FOLDER
            output_dir.mkdir(parents=True, exist_ok=True)

            output_name = f"{base_file_path.stem}_cruzada.csv"
            output_path = output_dir / output_name

            with open(output_path, "w", encoding="utf-8-sig", newline="") as f:
                writer = csv.DictWriter(f, fieldnames=fieldnames, delimiter=";")
                writer.writeheader()
                writer.writerows(filtered_rows)

            return (
                output_path,
                len(rows),
                len(filtered_rows),
                len(rows) - len(filtered_rows),
                file_stats,
                base_phone_column,
            )

        except Exception as e:
            last_error = e
    raise last_error


def choose_file_and_process():
    file_path = filedialog.askopenfilename(
        title="Selecione a base para cruzamento",
        filetypes=[("Arquivos CSV", "*.csv"), ("Todos os arquivos", "*.*")]
    )

    if not file_path:
        return

    try:
        output_path, total, kept, removed, file_stats, phone_col = process_file(Path(file_path))

        files_text = "\n".join([f"- {name}: {qty} telefones" for name, qty in file_stats])

        messagebox.showinfo(
            "Concluído",
            f"Cruzamento finalizado!\n\n"
            f"Coluna de telefone detectada na base: {phone_col}\n\n"
            f"Arquivos usados no anti join:\n{files_text}\n\n"
            f"Total linhas base: {total}\n"
            f"Removidas no cruzamento: {removed}\n"
            f"Linhas finais: {kept}\n\n"
            f"Arquivo salvo em:\n{output_path}"
        )
    except Exception as e:
        messagebox.showerror("Erro", str(e))


def main():
    root = tk.Tk()
    root.title("Cruzador Blocklist")
    root.geometry("560x300")
    root.resizable(False, False)

    # macOS: bring window to front
    root.lift()
    root.attributes("-topmost", True)
    root.after(200, lambda: root.attributes("-topmost", False))
    root.focus_force()

    files_label = "\n".join([f"- {name}" for name in ANTI_JOIN_FILES])

    label = tk.Label(
        root,
        text=(
            "Clique abaixo e selecione a base.\n"
            "O programa vai fazer anti join com estes arquivos,\n"
            "todos na mesma pasta do programa:\n\n"
            f"{files_label}\n\n"
            "A coluna de telefone (na base e nos arquivos de bloqueio)\n"
            "é detectada automaticamente."
        ),
        justify="center",
        padx=20,
        pady=20
    )
    label.pack()

    button = tk.Button(
        root,
        text="Selecionar base e cruzar",
        command=choose_file_and_process,
        width=28,
        height=2
    )
    button.pack(pady=10)

    root.mainloop()


if __name__ == "__main__":
    if len(sys.argv) > 1:
        base_path = Path(sys.argv[1]).resolve()
        output_path, total, kept, removed, file_stats, phone_col = process_file(base_path)
        print(f"DONE:{total}:{kept}:{removed}:{phone_col}:{output_path}")
    else:
        main()
