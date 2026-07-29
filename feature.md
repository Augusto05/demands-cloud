
Gere um plano de implementação de um módulo de visualização em fluxo estilo MER/DER (Node-based Graph Canvas) na aplicação. Além das tabelas customizadas em fluxo, agora preciso de um MODO DE VISUALIZAÇÃO (Apresentação) e do GERENCIAMENTO DE MÚLTIPLOS QUADROS (Boards).
A ideia é ser uma espécie de fluxograma misturado com um DER/MER
---

### 🎯 ESPECIFICAÇÕES ATUALIZADAS DA FUNCIONALIDADE

1. GERENCIAMENTO DE MÚLTIPLOS QUADROS (BOARDS / WORKSPACES):
- Permita ao usuário criar, alternar, renomear e excluir múltiplos "Quadros de Análise".
- Cada quadro possui seu próprio estado independente de nós (`nodes`) e conexões (`edges`).
- Crie uma barra superior ou menu lateral (Board Navigator) para alternar rapidamente entre as análises criadas.
- Persista a lista de quadros e seus dados.

2. MODO DE EDICÃO VS. MODO DE VISUALIZAÇÃO (READ-ONLY):
- Adicione um botão Toggle no topo da tela: "Modo Edição ✏️" vs "Modo Visualização 👁️".
- Quando em MODO DE VISUALIZAÇÃO:
  - Ocultar botões de controle de edição dos nós (botões de adicionar/remover linhas, ícones de editar, menus laterais de opções).
  - Ocultar os pontos de conexão/conectores (Handles) das setas dos nós.
  - Ocultar o grid de fundo e os controles visuais pesados (ou mantê-los discretos).
  - Desativar a edição in-line de textos.
  - Tornar os nós fixos ou interativos apenas para navegação (pan e zoom continuam ativos para apresentação fluida).

3. COMPONENTE CUSTOMIZADO DE NÓ ("CustomTableNode"):
- Estrutura de MINI TABELA empilhável (Linhas e Colunas: Métrica, Valor, Delta %).
- Formatação visual automática para variação percentual.
- Cabeçalho personalizável com ícone (Lucide-react) e cor de fundo.
- Respeitar estritamente o estado global de "Modo de Visualização" para esconder/exibir os controles de edição do nó.
- Deve ser possível posicionar em qualquer lugar do quadro cada nó, e dinamicamente as conexões devem seguir esses nós.
- O ponto de conexão deve ser uma espécie de seta.

4. BIBLIOTECA BASE:
- Utilize `@xyflow/react` (React Flow) para o canvas.

O código precisa seguir toda estética e padronização da aplicação.