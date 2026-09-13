# Systems Atlas V3 — entrega local

Os cinco ciclos estão integrados nas três páginas de projeto, com palco HTML/SVG 2.5D, seis capítulos por ciclo, comandos reais, apresentação cancelável e transcripts estáticos calculados pelo engine.

## Local e preservação

Worktree: `/home/vinicius/code/vinicius-santana-career-site-v3`, branch `feat/atlas-lifecycles-v3`, baseada em `2249a56`. Sem publicação, PR ou serviços reais.

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

Lifecycle em `#simulation`, seguido de conteúdo editorial e disclosures técnicos. Seleção de componentes não altera URL/scroll; fragmentos `#component-*` abrem os detalhes. Funciona sem WebGL. Sem JavaScript, figuras/transcripts do build permanecem disponíveis, com controles desabilitados.

Autoplay de uma passagem respeita visibilidade, prontidão, fragmento, reduced-motion e Save-Data. Pause congela; ocultar a aba ou sair da tela pausa sem retomada automática. Previous/capítulos reconstroem o prefixo e pausam. Next conclui a tomada pendente antes de outra operação. Ações manuais preservam domínio e cancelam o roteiro; Replay reinicia. Geração e identidade invalidam callbacks antigos em reset, troca e descarte.

Testes adicionais cobrem falhas em boot/start, storage indisponível, timeout com liberação, duplicatas, membership revogada, lease/fence inválidos, processamento e leitura consistente. Contratos visuais: um estágio atual, um a três atores primários, no máximo um artefato móvel e labels/resultados coerentes com o estado apresentado.

Revisão em 1440×1000, 390×844 e 320×740: [capturas dos cinco ciclos](captures/), teclado/foco, alvos de 44 px, nomes 16/14 px, reduced-motion e ausência de overflow. [Contraste](contrast.json): texto 15,12:1, secundário 9,01:1, labels 9,89:1, foco 11,07:1. Gravações inspecionadas para transferências, pausa, espera e resultado, além dos seletores automatizados.

Correções da revisão: quebra de labels longos no mobile; snapshot consistente da tabela CnesData; ida/retorno da autorização separados; canal/tipo/resultado corretos em ações manuais; destinatário sintético com View incident/ACK; callbacks antigos de provisionamento rejeitados; release de worker-02/03 em tomadas próprias, sem focar o worker sobrevivente.

## Verificação

- `rtk npm ci`: concluído no worktree isolado.
- `rtk npm test`: 197 aprovados, zero falhas; um teste de assets de build intencionalmente pulado nesta modalidade. Inclui typechecks, os 91 checkpoints e 27 negativos.
- `rtk npm run build`: concluído; permanece o aviso de tamanho do chunk 3D preexistente.
- `rtk npm run smoke`: aprovado, incluindo oito testes de assets com verificação do build habilitada.
- `rtk proxy env EXPLORER_BASE_URL=http://127.0.0.1:4323 npm run test:explorer`: **66/66 aprovados em 3,3 minutos** na rodada final, após a correção de release, incluindo cinco gravações. Uma rodada parcial anterior foi interrompida e não é contada como aprovação.
- Validador Python do pacote: PASS, 91 checkpoints e 27 negativos estruturais. Ele não executa o aplicativo; os testes de domínio executam os casos.
- Comparação ZIP/diretório: 78 arquivos originais idênticos.
- `rtk proxy node scripts/lifecycle/measure.mjs`: aprovado; [medição reproduzível](bytes.json).
- `rtk git diff --check`: aprovado.

Domínio/player, somando todos os engines e helper: **19.238 bytes gzip**, abaixo de 81.920. HTML gzip: Infrastructure 15.906 bytes, Limnopulse 12.906, CnesData 13.364; os dados de tour já estão incluídos. Home/Atlas não referenciam os novos recursos. Testes de rede conferem ícones locais e testes de pausa conferem ausência de movimento residual.

As gravações são trechos representativos, não vídeos integrais. Os 91 passos completos são verificados executavelmente. A entrega demonstra sistemas sintéticos locais, sem comprovar implantação dos alvos documentados.
