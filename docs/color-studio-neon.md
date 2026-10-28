# Conexão Neon exclusiva para validar o Color Studio

Estado desta sessão: `THEME_TEST_DATABASE_URL` ausente; nenhuma conexão alternativa, credencial de produção ou banco remoto foi utilizado. Os testes locais de PostgreSQL/driver continuam disponíveis com `npm test`.

## O que fornecer

1. Um **projeto Neon novo e vazio**, exclusivo de homologação/testes. Não use a conexão de produção nem uma branch que tenha copiado seus dados. Sugestão de identificação do projeto: `artize-studio-homologacao`.
2. Banco `artize_studio_homolog` e role `artize_studio_test`, criados no painel Neon desse projeto. Obtenha a senha pelo painel/gerenciador de segredos; não a escreva no repositório, frontend, logs, PR ou chat.
3. No SQL Editor desse banco exclusivo, como seu administrador, conceda somente as permissões necessárias ao teste:

```sql
GRANT CONNECT, CREATE ON DATABASE artize_studio_homolog TO artize_studio_test;
```

O teste cria e remove um schema próprio `artize_studio_test_<UUID>` e suas tabelas. Não precisa ler/escrever as tabelas da loja nem alterar o schema `public`. A role é proprietária dos objetos que cria e pode aplicar/retirar a coluna da migração dentro desse schema.

4. No painel **Connect** do Neon, selecione esse projeto, banco e role. Copie a conexão PostgreSQL com TLS (`sslmode=require` ou `verify-full`) para o segredo de ambiente **`THEME_TEST_DATABASE_URL`** do ambiente de desenvolvimento Codex. Use o fluxo de configuração de ambiente/segredos, sem enviar o valor pelo chat. Não altere `DATABASE_URL` e não configure o Render nesta etapa.
5. Como a rede deste ambiente é restrita, autorize HTTPS na porta 443 para o **hostname exato** desse endpoint `*.neon.tech`. O driver serverless oficial usa HTTPS `/sql`; não é necessário abrir PostgreSQL TCP para este teste. A política atual não inclui endpoints Neon. Depois de salvar a configuração, inicie/atualize o ambiente para que o segredo e a política estejam aplicados.

O módulo de teste usa exclusivamente `THEME_TEST_DATABASE_URL`, não carrega `.env`, não tenta `DATABASE_URL` e rejeita uma URL idêntica à conexão da aplicação. Também exige endpoint Neon e TLS. A exclusividade do projeto/banco deve ser confirmada pelo responsável; o código não consegue provar a finalidade de uma conexão apenas pelo seu nome.

## Executar

Com o segredo já injetado no ambiente:

```bash
npm ci
npm run test:neon
```

Para uma execução manual local em Bash, sem gravar a URL no histórico:

```bash
read -r -s -p 'URL Neon exclusiva de testes: ' THEME_TEST_DATABASE_URL
printf '\n'
export THEME_TEST_DATABASE_URL
npm run test:neon
unset THEME_TEST_DATABASE_URL
```

Não use `echo`, `printenv`, argumentos de linha de comando com a URL ou arquivos versionados para conferir a credencial. O resultado esperado é **um teste aprovado, sem skip**. Se faltar a variável, o teste é pulado explicitamente e nenhuma conexão é tentada. Erros de conexão/consulta são sanitizados para não revelar a URL.

## O que será validado

- O driver Neon oficial e o SQL de produção, com apenas o nome da tabela redirecionado para um schema descartável.
- Inicialização e migração aditiva idempotente, preservação do tema e compatibilidade com novos clientes.
- Publicação e leitura das 12 paletas, distribuídas pelos quatro temas.
- Rascunho que não altera a loja pública e rascunhos independentes por tema.
- Troca de temas que preserva suas personalizações.
- Restauração do rascunho e publicação explícita do padrão original.
- Migrações `up`, `down` e `up` sobre a tabela de teste, sem remover a escolha de tema existente.
- Remoção do schema descartável ao finalizar, inclusive em falhas. Se a rede cair e impedir a limpeza, a mensagem indica o schema exato a remover no banco de testes.

Esse ensaio não faz deploy, não altera o Render, não cria pedidos e não chama pagamentos. Ainda será necessária uma verificação operacional posterior na homologação real para confirmar permissões do usuário da aplicação, latência, persistência após reinício e configuração do serviço Render. Essa etapa depende de autorização separada para disponibilizar a versão.
