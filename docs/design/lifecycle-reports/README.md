# Systems Atlas V3 — implementação e integração

Os cinco ciclos estão integrados nas três páginas de projeto, com palco HTML/SVG 2.5D, seis capítulos por ciclo, comandos reais, apresentação cancelável e transcripts estáticos calculados pelo engine.

## Local e preservação

Worktree: `/home/vinicius/code/vinicius-santana-career-site-v3`, branch `feat/atlas-lifecycles-v3`, baseada em `2249a56`. A implementação inicial foi entregue localmente. O usuário autorizou posteriormente o pull e a abertura do PR; nenhum serviço real ou deploy faz parte desta entrega.

Outra sessão mudou o checkout compartilhado durante o trabalho. As alterações anteriores e V3 foram recuperadas do stash `12f45885d7091f64bf1e0c6a4c7381a4b71871cd` para este worktree isolado, sem conflitos. O checkout original e o stash permanecem intactos. O bloco de analytics preexistente foi restaurado de `07eaa98`, excluindo sua nova referência a favicon. A árvore contém alterações locais anteriores ao V3, que não devem ser atribuídas integralmente a esta entrega.

## M0 — briefing e contratos

Instalados 78 arquivos após conferir os destinos do ZIP. A comparação final confirma todos byte a byte idênticos ao pacote, incluindo `archive/`. O runner executa comandos e compara projeções; negativos reproduzem o prefixo inclusivo. Os testes integrados executam os 91 checkpoints e 27 negativos pelos adapters usados pelo player.

Erratas na normalização, sem editar originais: LP-N02 parte de `limnopulse-end-to-end-01`; quorum `-07` executa `FAIL_NODE(node-03)` seguido de `SET_STORAGE({ready:false})`. Placeholders sintéticos como `fence: "current"` são resolvidos antes do reducer. `expected` e `stateRef` não entram nos tours distribuídos, no estado ou nos transcripts.

## M1 — linguagem e assets

A fatia outbox → relay → Delivery persistida → SQS email → worker → SES usa transições do domínio. Serviços ocupam posições estáveis; um artefato explica cada transferência. Consultas separam ida e resposta, persistência deixa registros visíveis e espera conserva artefato e motivo. Orientação, foco, ação e estabilização partem dos tempos da coreografia.

São 42 SVGs locais: AWS Architecture Icons 07312026, Telegram oficial e Lucide 0.511.0. Telegraf usa `funnel`, InfluxDB `chart-line` e MQTT `radio`, com labels HTML. O [registro de produção](../systems-atlas-production-assets.json) documenta origem, versão/data, licença, hashes upstream/final e sanitização; [licenças](../asset-licenses/) ficam separadas do briefing. Testes conferem hashes e segurança estática.

## M2 — cinco ciclos

| Ciclo | Checkpoints | Resultado | Trecho em movimento |
| --- | ---: | --- | --- |
| Infrastructure — esgotamento | 16 | 02→01→03→zero→02; fencing, geração, pending, boot/ready e autostart por reconciliação lógica. Controller/storage externos declarados como hipótese. | [390×844](captures/infra-exhaustion-390/passage.webm) |
| Infrastructure — quorum | 15 | Maioria fixa 2/3; um votante bloqueia; quorum, storage e fencing independentes; queda de storage explícita. | [1440×1000](captures/infra-quorum-1440/passage.webm) |
| Infrastructure — scaling | 17 | Carga sustentada, desired, reserva idempotente, provisionamento, boot, health, roteamento e drain/stop/release. Três hosts físicos constantes. | [320×740](captures/infra-scaling-320/passage.webm) |
| Limnopulse | 24 | Configuração, ingestão, janela, incidente/outbox, canais independentes, usuário/ACK e recuperação durável. Sucesso parcial, retry_wait, rejeição permanente e unknown sem reenvio automático. | [1440×1000](captures/limnopulse-1440/passage.webm) |
| CnesData | 19 | Fontes separadas, raw/manifest irmãos, transformação, reconciliação, serving, candidata/CAS e leitura autorizada fixada em versão. AWS canônico e alternativa filesystem/SQLite. | [390×844](captures/cnesdata-390/passage.webm) |

CnesData transforma os dados sintéticos do pacote e mostra três comparações: 40/20 divergente, 20/20 e 30/30 iguais, preservando proveniência. Escrita raw, replay e conflito continuam cobertos como regressões. Os status de evidência existentes são preservados; o alvo CnesData continua documentado/planejado.

## M3 — interação e revisão

Lifecycle em `#simulation`, seguido de conteúdo editorial e disclosure do System View. A pedido do usuário, todas as demonstrações antigas foram excluídas, incluindo a Synthetic demonstration de CnesData e a simulação avulsa de falhas dos nós de Infrastructure. Todos os cards de cada System View passaram a uma única coluna vertical, ao lado do diagrama no desktop e abaixo no mobile. Seleção de componentes não altera URL/scroll; fragmentos `#component-*` abrem os detalhes. Funciona sem WebGL. Sem JavaScript, figuras/transcripts do build permanecem disponíveis, com controles desabilitados.

Autoplay de uma passagem respeita visibilidade, prontidão, fragmento, reduced-motion e Save-Data. Pause congela; ocultar a aba ou sair da tela pausa sem retomada automática. Previous/capítulos reconstroem o prefixo e pausam. Next conclui a tomada pendente antes de outra operação. Ações manuais preservam domínio e cancelam o roteiro; Replay reinicia. Geração e identidade invalidam callbacks antigos em reset, troca e descarte.

Testes adicionais cobrem falhas em boot/start, storage indisponível, timeout com liberação, duplicatas, membership revogada, lease/fence inválidos, processamento e leitura consistente. Contratos visuais: um estágio atual, um a três atores primários, no máximo um artefato móvel e labels/resultados coerentes com o estado apresentado.

Revisão em 1440×1000, 390×844 e 320×740: [capturas dos cinco ciclos](captures/), teclado/foco, alvos de 44 px, nomes 16/14 px, reduced-motion e ausência de overflow. [Contraste](contrast.json): texto 15,12:1, secundário 9,01:1, labels 9,89:1, foco 11,07:1. Gravações inspecionadas para transferências, pausa, espera e resultado, além dos seletores automatizados.

Correções da revisão: quebra de labels longos no mobile; snapshot consistente da tabela CnesData; ida/retorno da autorização separados; canal/tipo/resultado corretos em ações manuais; destinatário sintético com View incident/ACK; callbacks antigos de provisionamento rejeitados; release de worker-02/03 em tomadas próprias, sem focar o worker sobrevivente.

## Verificação da entrega local anterior ao pull

- `rtk npm ci`: concluído no worktree isolado.
- `rtk npm test`: 197 aprovados, zero falhas; um teste de assets de build intencionalmente pulado nesta modalidade. Inclui typechecks, os 91 checkpoints e 27 negativos.
- `rtk npm run build`: concluído; permanece o aviso de tamanho do chunk 3D preexistente.
- `rtk npm run smoke`: aprovado, incluindo oito testes de assets com verificação do build habilitada.
- `rtk proxy env EXPLORER_BASE_URL=http://127.0.0.1:4323 npm run test:explorer`: **66/66 aprovados em 3,3 minutos** na rodada final, após a correção de release, incluindo cinco gravações. Uma rodada parcial anterior foi interrompida e não é contada como aprovação.
- Validador Python do pacote: PASS, 91 checkpoints e 27 negativos estruturais. Ele não executa o aplicativo; os testes de domínio executam os casos.
- Comparação ZIP/diretório: 78 arquivos originais idênticos.
- `rtk proxy node scripts/lifecycle/measure.mjs`: aprovado; [medição reproduzível](bytes.json).
- `rtk git diff --check`: aprovado.

Domínio/player, somando todos os engines e helper: **19.238 bytes gzip**, abaixo de 81.920. HTML gzip por rota em [bytes.json](bytes.json); os dados de tour já estão incluídos. Home/Atlas não referenciam os novos recursos. Testes de rede conferem ícones locais e testes de pausa conferem ausência de movimento residual.

As gravações são trechos representativos, não vídeos integrais. Os 91 passos completos são verificados executavelmente. A entrega demonstra sistemas sintéticos locais, sem comprovar implantação dos alvos documentados.

## Integração com a main e correções de revisão

Pull de `origin/main` (`abe1a14`) incorporado ao trabalho V3. Os conflitos foram resolvidos preservando o shell canônico, os System Views, o Atlas, a navegação e o SEO atuais. Alterações locais anteriores e auxiliares permanecem no stash `94be46d`, além do stash de recuperação original.

A estrutura final usa o Lifecycle antes do conteúdo editorial; remove todas as demonstrações antigas e seus controles/transcripts de UI, incluindo a Synthetic demonstration de CnesData e a simulação avulsa de falhas dos nós de Infrastructure. As primitivas raw e de failover continuam cobertas por regressões de domínio. Todos os cards de cada System View são renderizados em uma coluna vertical, com seleção e links diretos preservados. Testes de regressão reproduziram as imprecisões antes das mudanças; a última remoção também teve um teste falhando pela presença do heading antigo de Infrastructure antes da correção.

Também foi restaurado o uso do `analyticsSnippet` já existente no layout da main: as rotas de compatibilidade voltam a respeitar `analyticsPageView={false}`, evitando pageviews duplicados. O smoke agora valida a entrada pública `sitemap.xml` adicionada pela main e sua referência ao sitemap gerado. O briefing importado permanece inalterado; `.gitattributes` preserva seus espaços e quebras Markdown originais.

Validação após integração: `npm ci`, `npm test` (226 aprovados e um skip intencional), build, smoke (15/15 assets), geração do overview, `gallery:verify`, validador do pacote, comparação dos 78 originais e `git diff --check` aprovados. Após a última remoção foram repetidos os testes unitários, build, smoke, validador, comparação do ZIP e medição de bytes, todos aprovados.

Resultados de navegador efetivamente observados:

- Antes da última remoção de Infrastructure: suíte completa com **162/162 aprovados em 8,3 minutos**.
- Árvore final: `EXPLORER_BASE_URL=http://127.0.0.1:4323 npm run test:explorer -- --max-failures=3` registrou **129 testes aprovados**, incluindo os cinco vídeos e todos os testes de Lifecycle, antes do processo terminar por SIGTERM (exit 143). A causa do sinal não foi identificada; não houve falha de teste registrada e o preview continuou respondendo. Essa execução interrompida não é contada como uma suíte completa aprovada.
- Os **30 casos restantes passaram em 1,3 minuto**, executando `observatory.spec.ts`, `release-integration.spec.ts`, `system-view-regressions.spec.ts` e `visual-alignment.spec.ts` com o mesmo build. Os 159 casos atuais têm resultado individual aprovado nas duas execuções.
- A checagem final `lifecycle-replacement.spec.ts` foi repetida e passou em **6/6 testes**, cobrindo ausência das demonstrações antigas e a coluna vertical nas três páginas. As [nove capturas do System View](captures/system-view-vertical/) usam 1440×1000, 390×844 e 320×740; o recorte do componente omite apenas a navegação fixa durante a captura, sem alterar o layout do aplicativo.

As cinco gravações e suas 38 capturas de operação foram atualizadas a partir da árvore final. Domínio/player permanece em **19.238 bytes gzip**; HTML gzip: Infrastructure 17.154, Limnopulse 15.738 e CnesData 14.969 bytes. Nenhum recurso novo de Lifecycle é requisitado pela Home ou pelo Atlas.
