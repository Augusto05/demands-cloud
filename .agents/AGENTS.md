# Demands - Regras do Projeto

## 1. SINCRONIZAÇÃO OBRIGATÓRIA COM O BANCO DE DADOS (SUPABASE)
- **Zero Dependência Exclusiva de LocalStorage**: Qualquer dado criado, editado ou removido no sistema (escritórios, lançamentos diários, usuários, Kanban, notas, relatórios de bugs, blocklists, agendas) **DEVE ser sincronizado diretamente com o banco de dados Supabase**.
- **Multi-Dispositivo**: `localStorage` é utilizado apenas como cache local temporário. Todas as operações devem ler e salvar no Supabase para que alterações feitas em um computador fiquem visíveis imediatamente no celular e em qualquer outro dispositivo.
