COMO USAR NO MAC — CRUZADOR BLOCKLIST
======================================

PRÉ-REQUISITO
-------------
Ter o Python 3 instalado. Para verificar, abra o Terminal e digite:
  python3 --version

Se não tiver, baixe em: https://www.python.org/downloads/


COMO RODAR (depois de configurado uma vez)
--------------------------------------------
Dê duplo clique em "abrir_cruzador.sh"

Se ainda não configurou para abrir com Terminal:
  1. Clique com botão direito em "abrir_cruzador.sh"
  2. "Obter informações" (Cmd + I)
  3. Em "Abrir com" → "Outro..." → Aplicativos → Utilitários → Terminal
  4. Clique em "Adicionar", depois em "Alterar tudo"
  5. Depois disso, duplo clique sempre funciona


ESTRUTURA DA PASTA
-------------------
Mantenha todos esses arquivos juntos, na mesma pasta:

  cruzador_blocklist.py
  abrir_cruzador.sh
  Blocklist 1.csv
  Blocklist 2.csv
  Não Perturbe BASE_1 - 14.01.26.csv
  Não Perturbe BASE_2 - 14.01.26.csv
  Não Perturbe BASE_3 - 14.01.26.csv


ROTINA DIÁRIA
--------------
1. Substitua os 5 arquivos de bloqueio pelos novos do dia (mesmos nomes)
2. Duplo clique em "abrir_cruzador.sh"
3. Clique em "Selecionar base e cruzar"
4. Escolha o CSV da base principal
5. Resultado salvo em:  pasta_do_programa/saida/nome_original_cruzada.csv


SOBRE A COLUNA DE TELEFONE (NOVIDADE)
---------------------------------------
Agora NÃO é mais obrigatório que a base principal tenha a coluna
"DDDTELEFONE". O programa detecta automaticamente qualquer coluna que
pareça ser telefone, por exemplo:

  TELEFONE, DDDTELEFONE, FONE, CELULAR, NUMERO, TEL, WHATSAPP, CONTATO

E também variações como "TELEFONE_CLIENTE", "CELULAR2", "DDD_TELEFONE" etc.
(o programa procura essas palavras dentro do nome da coluna).

Se ele realmente não encontrar nenhuma coluna parecida, vai mostrar uma
mensagem de erro listando todas as colunas do arquivo, para você conferir.

Os arquivos de bloqueio (Blocklist 1, Blocklist 2, Não Perturbe) continuam
usando a mesma lógica de detecção — então também não precisam mais ter
coluna chamada exatamente "TELEFONE".


SOBRE NOMES DE ARQUIVO COM ACENTO (CORREÇÃO IMPORTANTE)
----------------------------------------------------------
O macOS às vezes salva nomes de arquivo com acento de um jeito diferente
internamente (mesmo aparecendo igual na tela), o que podia causar o erro
de "arquivo não encontrado" mesmo com o arquivo certinho na pasta.
Esse problema foi corrigido nesta versão — o programa agora reconhece o
arquivo independente de como o Mac armazenou o nome internamente.


OBSERVAÇÕES GERAIS
--------------------
- O programa detecta ; ou , automaticamente nos arquivos
- O arquivo final é salvo com separador ;
- Telefones são normalizados (ignora máscara, espaços, traços, parênteses)
- Funciona com encoding UTF-8 e Latin1


SOBRE O EXECUTÁVEL
--------------------
No Mac não existe .exe como no Windows. O equivalente é o "abrir_cruzador.sh".

Se quiser um app clicável (.app) de fato, instale o PyInstaller:
  pip3 install pyinstaller
  pyinstaller --onefile --windowed cruzador_blocklist.py
O .app ficará na pasta "dist/".
