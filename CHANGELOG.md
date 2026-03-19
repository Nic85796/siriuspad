# Changelog

Todas as mudanças notáveis neste projeto são documentadas aqui.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Não lançado]

## [1.0.3] - 2026-03-18

### Adicionado
- Checagem silenciosa de atualização em background com toast de instalação
- Configuração de updater assinada com `latest.json` automática no release workflow
- Ajuste específico de macOS com config dedicada para title bar overlay

### Corrigido
- CI do GitHub agora volta a disparar em `push` no `main` e continua publicando releases em tags `v*`
- Workflow ficou compatível com Windows ao usar `bash` na validação de versão
- Referência do `tauri-action` corrigida para uma versão existente
- Workflow de release voltou para `actions/checkout@v4` e `actions/setup-node@v4`
- `get_platform` agora tem fallback de compilação seguro
- Bordas de resize no Linux não ficam mais acima dos modais
- Enter no modal de confirmação agora respeita o botão focado
- Handler global de atalhos no `App.tsx` não sofre mais com stale closures
- Boilerplate de Go no runner não gera mais quebras de linha extras
- Aba inteira voltou a ser clicável, sem conflito com o botão de fechar
- Diff do histórico usa chave estável
- Remoção de nota ativa usa fallback mais simples e previsível
- Detecção inicial de idioma agora usa o idioma do sistema no primeiro boot
- TitleBar e estados vazios ficaram mais claros para primeira execução

## [1.0.2] - 2026-03-18

### Adicionado
- Suporte inicial a i18n com interface em Inglês, Português (Brasil) e Espanhol
- Tela cheia nativa, Focus Mode e Zen Mode
- Modais customizados para confirmação e entrada de texto
- Abas para múltiplas notas abertas
- Split view com preview de Markdown
- Histórico de versões por nota com restauração
- Find & Replace no editor com painel nativo do CodeMirror
- Temas `dark`, `dark-dimmed` e `midnight`
- Runner com timeout configurável e suporte a TypeScript e Lua
- Exportação de notas como `.md`, `.txt` e `.json`
- Importação por drag and drop de arquivos `.md` e `.txt`
- Job de release para macOS com target universal

### Alterado
- TitleBar agora mostra controles de janela em Linux, Windows e macOS
- StatusBar agora exibe linha, coluna, palavras, caracteres e versão do app
- Editor passou a reconfigurar extensões dinâmicas sem destruir o histórico de undo/redo
- `APP_VERSION` agora vem do `package.json` via Vite
- Workspace padrão interno mudou de `geral` para `general`, com migração do diretório legado

### Corrigido
- Fechamento da janela agora intercepta notas sujas antes de descartar alterações
- Linux ganhou bordas de resize customizadas para janelas sem decoração
- Snippets simples em Go agora recebem `package main` automaticamente quando necessário
- Assets padrão não usados do Vite foram removidos do projeto

## [1.0.1] - 2026-03-18

### Corrigido
- Crash de inicialização no Linux causado pela criação recursiva da nota de boas-vindas
- Workflow de release atualizado para versões mais novas das actions do GitHub

## [1.0.0] - 2026-03-18

### Adicionado
- Primeira versão pública do SiriusPad
- Editor markdown com CodeMirror 6 e tema escuro customizado
- Organização por espaços de trabalho, tags e notas fixadas
- Busca fuzzy em títulos e conteúdo
- Autosave com frontmatter YAML salvo em arquivos `.md`
- Snippet runner para Python, JavaScript, Bash, Shell, Ruby e Go
- Command palette com `Ctrl+K`
- Export para GitHub Gist
- Builds para Linux e Windows com release automática no GitHub Actions
