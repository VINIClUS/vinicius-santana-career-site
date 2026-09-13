# Systems Atlas — Lifecycle Simulations

**Tech Spec V2.0 · proposta revisada · 12 de setembro de 2026**

**Destino:** `VINIClUS/vinicius-santana-career-site`  
**Baseline do portfólio:** `773022dee346f9e614b4b227aaf1b38fa721ec1c`  
**Entrega deste pacote:** especificação, contratos, fixtures, fontes visuais e handoff. Não inclui alteração do repositório ou execução dos sistemas reais.

> **Decisão:** substituir demonstrações de eventos isolados por simulações determinísticas de ciclos de vida. A animação deve tornar o funcionamento visível; o modelo deve continuar correto quando o visitante muda a ordem das ações.

## 1. O que muda em relação à V1

A V1 priorizava três histórias curtas: um failover, escrita idempotente e publicação de notificações. Isso melhorava apresentação, mas não explicava os sistemas completos. Além disso, congelava os reducers existentes, impedindo justamente as operações agora solicitadas.

Esta V2 **substitui integralmente** os limites da V1 em escopo, roteiros, preservação obrigatória dos reducers, duração fixa e fatiamento. Permanecem válidos: Home → Atlas → projeto → evidência; site estático; Three.js permitido; HTML independente; dados sintéticos; carregamento progressivo; controle de movimento; testes localizados.

| Tema | V1 | V2 obrigatória |
|---|---|---|
| Infrastructure | node-02 falha uma vez | Falhas sucessivas, indisponibilidade total, retorno, bloqueios de segurança, provisioning e scaling |
| Limnopulse | Leitura → outbox → SQS | Configuração → leitura → avaliação → incidente → entrega → usuário → reconhecimento → recuperação |
| CnesData | Criar/repetir/rejeitar objeto | Solicitação → extração → raw → normalização → reconciliação → publicação → consumo autorizado |
| Modelo | Reencenar resultados atômicos | Novos estados e transições de domínio, com guardas e caminhos alternativos |
| Visual | Keyframe/animatic de evento | Cenário contínuo por capítulos, fontes vetoriais, objetos persistentes e resultados observáveis |
| Contexto do Codex | PDF e capturas | Markdown + JSON + IDs semânticos + SVG + PNG + referência HTML offline |

**Completo** significa cobrir o início, as fronteiras de persistência, os efeitos, as falhas principais e o desfecho no nível de abstração definido. Não significa reimplementar Proxmox, AWS, Firebird, Polars, InfluxDB ou serviços de notificação no navegador.

## 2. Baseline e correção de arquitetura

O controller atual do portfólio mantém os cenários CnesData/Infrastructure e seleção de componentes; Limnopulse ainda não tem comportamento equivalente. Logo, isto é uma evolução funcional, não só troca de assets. [R1a]

O CnesData exige cuidado adicional. README e arquitetura legados descrevem Postgres/MinIO/Gold; o desenho aprovado de data plane em `develop` define **Parquet versionado, SQLite/filesystem no local e DynamoDB/S3 na AWS**, removendo aqueles serviços do alvo. A história principal desta V2 usa **o desenho-alvo**, não uma combinação dos dois. [R2a, R3a]

O contrato Phase 3 de setembro limita a entrega daquela fase a raw. Isso não impede demonstrar transformação e publicação como **funcionamento proposto**, mas impede anunciá-las como integração já entregue. O status de cada etapa deve permanecer visível e atualizado independentemente da simulação. [R3b]

Limnopulse já documenta workers de email/Telegram, binding, Delivery, Attempt e incidentes. A história não precisa terminar em SQS; precisa preservar a diferença entre transporte, aceite pelo provedor e ação humana. [R4a–R4c]

Fontes, refs e limitações da inspeção estão em [SOURCES.md](SOURCES.md). Não houve nova medição de desempenho nem auditoria runtime do deployment.

## 3. Escolha de produto

### 3.1 Alternativas consideradas

**Animação linear mais longa:** barata de produzir, mas continua incapaz de responder a ações fora do roteiro. **Digital twin completo:** desproporcional, difícil de validar e potencialmente enganoso. **Modelo comportamental limitado, com tour guiado e exploração:** escolhido; explica o ciclo e responde a um conjunto pequeno de ações reais do domínio.

A demonstração deve ser agradável sem exigir operação. O tour é uma sequência de comandos válidos sobre o mesmo engine usado pela exploração, não um vídeo separado. A cada projeto, apenas os controles pertinentes aparecem. Não criar editor de cenários, linguagem de scripting pública ou painel de administração.

### 3.2 Duas formas de usar a mesma cena

**Watch lifecycle:** percurso guiado completo, com capítulos e resultado final. Alvos editoriais iniciais: 45–75 s para recuperação, 45–75 s para scaling, 60–90 s para Limnopulse e CnesData. São metas de ritmo, ajustáveis; não tempos operacionais. Uma introdução curta pode parar antes, mas não substitui o ciclo completo.

**Try a scenario:** controles contextuais de falha/retorno, alteração de carga ou injeção de erro. Ao interagir, o tour pausa, seus comandos futuros são descartados e o engine continua do estado presente. Retomar o tour exige Replay explícito; não sobrescrever a ação do visitante para recuperar a sequência original.

Seleção de capítulo reconstrói o estado executando o prefixo de comandos desde o início. Em exploração alterada, usar “Restart guided tour” antes de saltar entre capítulos; não confundir um ramo manual com o roteiro de referência.

### 3.3 Layout e navegação

Preservar rotas canônicas, navegação do Atlas e preview da Home. Nenhum desses dois lugares carrega a simulação detalhada. Na página do projeto: título e resumo → cena principal com objetivo → contexto/contribuição → arquitetura e decisões → resultados/evidência/limitações.

O player mantém `#simulation`; arquitetura permanece em `#architecture`. Preservar `#overview`, `#engineering`, `#results`, `#evidence`, `#limitations`, `#architecture-title` e `#component-*`. Fragmentos técnicos não devem disparar autoplay nem desviar a rolagem para a cena.

Um único canvas e uma única superfície de controles por página. Não repetir maquete, diagrama e simulação da mesma explicação em três seções. Um diagrama técnico textual/SVG de apoio pode existir em disclosure, sem competir com o palco.

## 4. Contrato comum de simulação

### 4.1 Separar quatro responsabilidades

| Camada | Responsabilidade |
|---|---|
| Conteúdo/evidência | Fatos, status de implementação, limites e links; fonte editorial única |
| Domínio sintético | Estado, comandos, guardas, eventos e tempo lógico determinístico |
| Player | Intenção de reprodução, capítulo, progresso visual, pausa e cancelamento |
| Renderer | Geometria, movimento, labels e projeção 2D/3D do mesmo estado |

Cada domínio terá um reducer próprio. Reutilizar o controller de projeto e recursos gráficos existentes; não introduzir Redux/XState/engine de física nem abstração genérica de workflows. A união de comandos pode ser discriminada por domínio. O contrato sugerido está em `contracts/simulation-contract.ts`.

**A regra central muda:** estados intermediários relevantes agora são estados reais da simulação. `booting`, `blocked`, `pending`, `draining`, `publishing` e `unknown` não são apenas legendas inventadas por um tween.

### 4.2 Tempo lógico e tempo de exibição

Comandos e dependências simuladas usam `logicalTick`, inteiro não negativo. Ações agendadas armazenam tick de vencimento, identidade da operação e geração. Avançar o tempo processa eventos vencidos na ordem `(dueTick, sequence)`, com um limite defensivo por avanço. Saltos de tempo equivalem a avanços unitários; não depender de FPS, `Date.now()` ou timers de rede.

O player associa esses passos a durações visuais. Nenhuma duração exibida deve parecer latência medida. A aba oculta pausa tanto o tour quanto o avanço automático de tempo lógico. Workers, filas e provedores do demo são determinísticos e locais.

Efeitos assíncronos simulados carregam `operationId` e versão/fence. Callback obsoleto é ignorado: um healthcheck de um nó que já caiu não pode torná-lo saudável; um ack de outra revisão não pode reconhecer um incidente novo.

### 4.3 Transições e snapshots

Um comando produz `{state, events}`. Comandos inválidos não corrompem estado; retornam uma razão curta (`NO_CAPACITY`, `NO_QUORUM`, `STALE_FENCE`, etc.). Eventos têm IDs estáveis e `causedBy`; trace nunca duplica eventos por frame. Efeitos do usuário possuem identidade distinta de efeitos de scheduler/provedor.

A câmera não é a autoridade. `expected` nos JSONs deste pacote contém **projeções observáveis para testes**, não estados a serem atribuídos pelo engine. O Codex deve implementar regras que produzam esses resultados e acrescentar testes com outras ordens de comandos.

Na animação de um evento, todas as projeções usam o mesmo frame `{previous, current, progress}`. Até a conclusão visual, o painel identifica a transição como “em andamento”; não exibe simultaneamente “running no destino” e um objeto ainda ativo na origem. Ao interromper a animação, assentar em `current` antes de aceitar outro comando.

### 4.4 Status em eixos independentes

`runtimeState` descreve o cenário; `evidenceStatus` descreve o projeto. `running` nunca promove `planned` a `implemented`. Labels permanentes: “Synthetic simulation” e, quando cabível, “Proposed lifecycle”. Na interface, desenho-alvo não deve parecer indisponível: pode ser explorado normalmente, com sua qualificação.

## 5. Infrastructure

Contrato detalhado: [domains/INFRASTRUCTURE.md](domains/INFRASTRUCTURE.md).

### 5.1 Esgotamento e retorno

Manter identidade lógica do workload e estado desejado `running`. Cada falha interrompe a instância, exige confirmação da perda do proprietário e busca um destino elegível. A instância reiniciada pode ter outra geração; não animar preservação de memória como se fosse live migration de host morto.

Sequência de aceite: `node-02 → node-01 → node-03 → nenhum destino → node-02 retorna → boot → ready → start → healthy`. Quando não há destino, **o workload fica pendente**, não some nem vira concluído. O usuário final fica visivelmente indisponível; a definição persistida continua existindo. Retorno não modifica `desired=stopped` quando o usuário tiver parado o serviço intencionalmente.

### 5.2 Duas premissas explícitas, sem enganar sobre quorum

O cenário completo até zero workers usa **controller e storage externos**, desenhados fora do domínio de falha. Sua sobrevivência é uma premissa da simulação conceitual, não uma afirmação sobre o cluster municipal. Assim, um worker pode voltar e receber o workload depois de ficar elegível.

O cenário “3 voting nodes” ensina o limite Proxmox: maioria 2/3; com 1/3, não realizar novo start seguro. Com zero e depois apenas um nó, continuar bloqueado. A volta do segundo restaura quorum; ainda verificar storage, fence e capacidade. Não reduzir votos esperados automaticamente e não oferecer bypass de segurança. [T1]

Storage não se torna saudável apenas porque um host ligou. Neste perfil, o estado de disponibilidade de dados é independente e pode permanecer bloqueado após quorum. Isso não pretende simular todos os detalhes de Ceph/Corosync.

### 5.3 Provisionamento e scaling

Ciclo: pedido → validação → reserva de capacidade → provisionamento/configuração → boot → healthcheck → elegibilidade → serviço. Repetir o mesmo pedido não cria cópias extras. Falha antes de registrar o recurso deve liberar reservas; recurso órfão é mostrado e removido por ação explícita quando já houve criação.

Separar três quantidades: **hosts físicos**, **workers/VMs provisionados** e **réplicas do serviço**. O demo começa com capacidade física finita. Criar uma VM não cria RAM física. A cena principal de scaling usa um serviço stateless distinto do workload singleton do failover.

Carga persistente pode aumentar `desiredReplicas` dentro de min/max/cooldown; o reconciliador provisiona apenas dentro do orçamento. Enquanto `readyReplicas < desiredReplicas`, mostrar déficit. Scale-in primeiro retira a réplica do roteamento, drena requisições, para e libera recursos. Sessões/estado do singleton não são multiplicados para explicar scaling.

## 6. Limnopulse

Contrato detalhado: [domains/LIMNOPULSE.md](domains/LIMNOPULSE.md).

A história começa pelo propósito: alguém precisa acompanhar a qualidade da água e reagir a um evento. Uma janela completa de leituras, não apenas um ponto anômalo, alimenta a avaliação.

Fluxo obrigatório: configuração de regra e destinatário elegível → leitura sintética → MQTT/Telegraf → InfluxDB → scheduler externo → evaluator → incidente e outbox duráveis → relay → Delivery → SQS por canal → worker/Attempt → provedor → mensagem demonstrativa no dispositivo → usuário acessa o incidente com autorização → acknowledge → novas leituras normais → recuperação → notificação de recuperação quando elegível.

A API é o ramo autorizado de consulta/ação do usuário; não é um hop obrigatório entre MQTT e InfluxDB. Telegram exige binding **e** preferência ativa. Email e Telegram são canais independentes; falha de um não bloqueia o outro. Redis é limitador, não fonte da verdade do incidente. [R4a–R4c]

O mock de telefone demonstra o resultado para o destinatário sem fingir um frontend já entregue. “Provider accepted”, “Message shown in demo” e “Acknowledged by user” são estados distintos. `acknowledged` não resolve o problema; a recuperação depende de nova janela válida. Falta de dados não é recuperação. Abertura e recuperação possuem trabalhos de notificação distintos e correlacionados.

Variações obrigatórias: janela insuficiente; duplicata de mensagem; 429 com retry_after lógico; 5xx transitório; destino desabilitado; confirmação ambígua `unknown` sem reenvio automático; recuperação sem abertura confirmada; ação de usuário sem membership ou com versão obsoleta. Não simular exatamente-once externo. [R4b, R4c]

## 7. CnesData

Contrato detalhado: [domains/CNESDATA.md](domains/CNESDATA.md).

### 7.1 Mostrar o produto proposto, não só o contrato raw

A cena acompanha `job`, `snapshot`, `run` e `datasetVersion` como identidades relacionadas, mas diferentes. O visitante vê registros sintéticos virarem artefatos e, depois, um resultado consumível. Ingestão raw não significa publicação.

Duas fontes entram: municipal via Edge Agent e nacional via adapter central DATASUS PF. Ambas entregam raw com proveniência. Não fazer a fonte nacional atravessar o agente municipal. Nenhum dado pessoal real nos cartões: usar entidades fictícias opacas.

O Edge executa extração e transformações de fidelidade (encoding/tipos/source contract), gera Parquet simples com compressão interna e hash e mantém envelopes duráveis. Regras de negócio e reconciliação ficam centrais. A mesma organização lógica serve a local e AWS; mudar perfil troca somente a legenda de adapters e o escopo de tenant, não a semântica. [R3a, R3b]

### 7.2 Ciclo integral de aceite

Solicitar competência → claim autenticado e fenced → extrair fontes → validar competência/schema → escrever `data.parquet` → upload imutável → aceitar `manifest.json` → identificar inputs completos → NormalizeSource → ReconcileCompetencia → MaterializeServing → verificar artefatos → criar DatasetVersion → trocar CURRENT por compare-and-swap → autorizar acesso → mostrar resultado JSON fixado no mesmo run.

Planejar os três estágios centrais como fan-out/fan-in pequeno, visível em capítulos; não criar uma nuvem de tarefas indistinguíveis. A transformação deve mostrar exemplo de antes/depois: código/texto bruto → chave/tipo padronizado → comparação entre fontes → JSON da tela. A regra exemplificada é ilustrativa, não uma regra de faturamento SUS afirmada como validada.

### 7.3 Falha e consistência

Repetição de objeto idêntico não duplica; conflito preserva original. Worker obsoleto não publica. Falha de transformação não altera CURRENT. PUBLICANDO não significa DISPONÍVEL; servir só uma versão com todos os artefatos necessários. Troca concorrente do pointer falha com conflito sem misturar runs; reload resolve uma única versão.

DELTA com sequência/base/hash inválidos exige resync. Resync não agenda FULL automaticamente: mostrar marcador, esperar nova solicitação FULL explícita e só então recomeçar a captura. A fonte nacional ausente não troca silenciosamente para outro mês. [R3b]

`normalized`, `reconciliation` e `serving` permanecem marcados como alvo aprovado até verificação de implementação em ref apropriada. O visitante ainda pode assistir a seu ciclo completo. Não misturar Gold/Postgres legado ou BigQuery na maquete principal.

## 8. Direção visual e fontes editáveis

### 8.1 Um ambiente, capítulos que mudam o foco

Conservar a linguagem escura/ortográfica do portfólio, com volumes reconhecíveis. O palco ocupa cerca de 70–80% do player; uma legenda curta descreve a ação. Não começar por um painel cheio de knobs, logs ou uma árvore de todos os componentes.

Cada etapa destaca de 1 a 3 atores; os demais continuam reconhecíveis em segundo plano. Infra usa hosts, slots, workload e indicador do cliente. Limnopulse usa tanque/boia, leitura, incidente, envelope e dispositivo. CnesData usa fonte, registro, arquivo, manifest, run e versão publicada.

Um objeto que se transforma deve manter linhagem visual: `reading → event → delivery` e `rows → snapshot → run → version`. Não fingir que tudo é a mesma bolinha. Cópia, transformação, rejeição, espera e persistência têm gestos diferentes.

Falha: interromper rota e sinalizar motivo. Bloqueio: objeto fica no local de espera com reason. Persistência: posição estável e identidade. Repetição: tentativa sobreposta não duplica o original. Restart: nova instância sobe a partir da definição persistida. Scale-out: novas instâncias distintas surgem após recursos; scale-in drena e remove. Publicação: somente o pointer muda, não arquivos antigos.

### 8.2 Artefatos de referência

`design/scene-map.json` define IDs, geometrias, links e composições desktop/mobile. `design/tokens.json` define cores e medidas. `visuals/*.svg` são fontes com grupos identificados; os PNGs derivam dessas fontes. Os Mermaid (`.mmd`) tornam estados/fluxos legíveis como texto. O HTML offline mostra os checkpoints e seus dados.

Essas fontes definem **semântica, composição e hierarquia**, não obrigam o resultado final a ser um fluxograma plano. O Codex deve construir volumes/materiais compatíveis com o site e movimento contínuo entre checkpoints; não entregar o HTML de briefing como produção. Os renders foram feitos para leitura por máquina e revisão, não são provas de funcionamento de backend.

Contratos, JSONs e SVG usam IDs comuns. Um ID pode ser anchor visual sem corresponder a um componente implementado; `componentRef` permanece nulo quando só existe metáfora. Não inventar evidência para preencher esse campo.

## 9. Player, acessibilidade e lifecycle

Controles: Play/Pause, Previous/Next, Replay e capítulos. Ações de exploração ficam num drawer “Try a scenario”, fechado no tour. Não precisa slider temporal contínuo, orbit livre ou áudio. Câmera fixa por capítulo com transições discretas; permitir quadro equivalente sem movimento.

Autoplay: no máximo uma passagem, só com cena pronta, visível, documento ativo e sem preferência de movimento reduzido/Save-Data. Pausa registrada durante loading deve ser respeitada. Saída de viewport/aba pausa; retorno não retoma sozinho. Troca de cenário, reset e pagehide invalidam callbacks e work queues antigos.

Reduced-motion: avanço por quadros, sem autoplay ou deslocamento; mesma capacidade de explorar estados. Sem WebGL: HTML/SVG funcional, não só poster congelado. Sem JavaScript: figuras, captions, transcripts gerados em build, arquitetura e evidência; controles de execução desabilitados corretamente.

Alvos de toque 44px, foco visível, contraste suficiente e motivos textuais para cores/ícones. Announcements em checkpoints solicitados, nunca por frame. O canvas não fornece a única forma de selecionar objetos. Labels essenciais são HTML na implementação. Mobile recompõe atores, não reduz todo o desktop até ficar ilegível; 320px sem overflow.

## 10. Integração no código existente

| Ponto | Alteração localizada |
|---|---|
| `ProjectDetail.astro`, `[project].astro` | Um slot/superfície de lifecycle; anchors preservados |
| `controller.ts`, `client.ts` | Estado e comandos dos novos domínios; seleção independente; sem segunda fonte mutável de estado |
| `simulation/infrastructure.ts` | Evoluir ou delegar ao modelo novo; comandos antigos preservados por adapter onde necessário |
| `simulation/cnesdata.ts` | Preservar os três testes raw; adicionar ciclo maior sem confundir Job e Run |
| Novo `simulation/limnopulse.ts` | Incidente, Delivery/Attempt, usuário e dependências falsas determinísticas |
| `story/player.ts` (proposto) | Clock de apresentação, roteiro de comandos e cancelamento |
| `scene/*` | Projeções de domínio para poses/materiais, frames apenas enquanto necessário |
| `resources.ts`, asset generator | Reusar cache, abort e disposal; anchors estáveis |
| `case-studies.yaml`, `projects.ts` | Corrigir copy/status afetados; distinguir alvo CnesData do legado; sem nova fonte duplicada de fatos |
| Docs e testes existentes | Atualizar contratos superados e fragmentos, sem manter restrições conflitantes da V1 |

Não manter duas engines ativas para o mesmo projeto. Pode existir adapter de compatibilidade para testes/comandos legados, mas não duas interfaces competindo. Não migrar todo o renderer para outro framework e não refatorar áreas não afetadas.

## 11. Performance e integridade

O custo novo fica nas páginas dos projetos. Home/Atlas não requisitam cenários detalhados, modelos ou dependências novas. Um canvas ativo, DPR inicial máximo 1,5, loading progressivo e deadline gráfico de segurança existente. A simulação HTML pode iniciar sem esperar WebGL.

Metas iniciais para comparar com a baseline: JS de domínio/player novo até 80 KiB gzip por rota, sem contar o runtime gráfico já existente; até 500 KiB de modelos novos por projeto, com capítulos sob demanda se necessário. São orçamentos propostos, não medidos. Registrar também o custo **total** de runtime, decode e GPU — “incremental” não esconde o total. Não obrigar uma biblioteca extra só para comprimir modelos pequenos.

Após estabilizar em pausa/resultado, zero render contínuo; continuar permitindo resize/foco. No active tour buscar movimento fluido no aparelho-alvo, sem depender disso para correção. Dados/payloads limitados: 3 hosts/até 4 workers/3 réplicas no fixture; uma janela curta de leituras; poucas linhas sintéticas por fonte.

Nenhuma chamada a cluster, cloud, banco, bot, email ou DATASUS. Não pedir credenciais ao usuário. Testes de “provider success” são respostas falsas explícitas, não requisições externas.

## 12. Critérios de aceite e implementação

Entregas verticais sugeridas:

| Marco | Obrigatório antes do seguinte |
|---|---|
| LC-01: Infra recovery | Modelos externo e quorum; 3→0→retorno; 2D funcional; um trecho 3D com interrupção/reset |
| LC-02: Infra provisioning/scaling | Capacidade/reserva/health/drain; desired ≠ ready; sem multiplicar hardware |
| LC-03: Limnopulse completo | Chegar ao usuário, acknowledge e recuperação; canais independentes; retry/unknown |
| LC-04: CnesData completo | Extração/raw/processamento/serving; falha antes da publicação preserva CURRENT |
| LC-05: acabamento integrado | Composição móvel, acessibilidade, recursos, status/editorial e evidências visuais |

Os marcos podem ter PRs próprios, mas **não declarar a V2 completa após LC-01**. Projetos são paralelizáveis depois do contrato comum; evitar dois agentes modificando o mesmo shell/controller simultaneamente.

Testes localizados devem cobrir fixtures deste pacote e ações fora dos roteiros. Infra: estado desejado e guardas de segurança. Limnopulse: entrega versus reconhecimento e recuperação. CnesData: imutabilidade e publicação atômica. Player: pausa/reset/troca de cenário/callback tardio/reduced-motion. Integração: uma rota por projeto, teclado/mobile/fallback/fragmentos e zero chamadas reais.

Reutilizar scripts atuais, conferindo `package.json` na implementação:

```sh
npm ci
npm test
npm run build
npm run smoke
npm run test:explorer
git diff --check
```

Não aceitar testes que só comparam o fixture a ele mesmo. O engine deve receber comandos e gerar projeções; fixtures são o oráculo externo. Não aceitar “simulação completa” feita por `setState(checkpoint.expected)`.

Revisão visual exige início, transição, bloqueio/falha, resultado e retomada; não só hero bonito. Um leitor deve explicar o que ficou persistido, o que ficou indisponível, por que houve bloqueio e o que permite concluir o ciclo. Verificação do pacote em `checks/VALIDATION.md` não substitui esses testes do produto.

## 13. Aprovação e rollback

O pacote é uma proposta de revisão pronta para leitura e implementação após aprovação do fluxo de trabalho escolhido. Nenhuma issue/PR foi criada. A configuração de apresentação por projeto pode desativar o renderer novo sem perder o conteúdo HTML. Reverter um marco não deve apagar narrativa, evidência ou links canônicos.

**Resultado esperado:** menos esforço para entrar na explicação, mas mais fidelidade ao sistema completo. A simplificação acontece na forma de apresentar, não eliminando os estados que explicam seu funcionamento.
