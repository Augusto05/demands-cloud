# Demands - Regras do Projeto

## 1. SINCRONIZAÇÃO OBRIGATÓRIA COM O BANCO DE DADOS (SUPABASE)
- **Zero Dependência Exclusiva de LocalStorage**: Qualquer dado criado, editado ou removido no sistema (escritórios, lançamentos diários, usuários, Kanban, notas, relatórios de bugs, blocklists, agendas) **DEVE ser sincronizado diretamente com o banco de dados Supabase**.
- **Multi-Dispositivo**: `localStorage` é utilizado apenas como cache local temporário. Todas as operações devem ler e salvar no Supabase para que alterações feitas em um computador fiquem visíveis imediatamente no celular e em qualquer outro dispositivo.

## 2. EXECUÇÃO OBRIGATÓRIA DE MIGRATIONS NO SUPABASE (`db push`)
- **Push Automático ao Alterar o Banco**: Sempre que houver criação ou alteração de tabelas, estruturas, migrations (`supabase/migrations/*.sql`) ou arquivos de schema SQL, **DEVE ser executado obrigatoriamente o comando `npx supabase db push --linked`** para aplicar e sincronizar as alterações instantaneamente com o banco remoto no Supabase.
