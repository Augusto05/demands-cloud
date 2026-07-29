#!/bin/bash
# Vai para a pasta onde este script está
cd "$(dirname "$0")"

# Verifica se Python 3 está instalado
if ! command -v python3 &> /dev/null; then
    osascript -e 'display alert "Python 3 não encontrado" message "Instale o Python 3 em python.org antes de usar este programa."'
    exit 1
fi

# Roda o programa
python3 cruzador_blocklist.py
