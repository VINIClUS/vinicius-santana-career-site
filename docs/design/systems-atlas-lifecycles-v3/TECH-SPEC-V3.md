# Systems Atlas — Guided Service Lifecycles

**Tech Spec V3.0 · 12 de setembro de 2026**  
**Repositório de implementação:** `VINIClUS/vinicius-santana-career-site`  
**Baseline técnica herdada da V2:** `773022dee346f9e614b4b227aaf1b38fa721ec1c` — referência histórica, não HEAD reconferido nesta revisão.  
**Estado:** direção visual aprovada pelo usuário; especificação consolidada para implementação com Codex CLI.  
**Entrega deste pacote:** documentação, contratos, cenários e referências. Não é implementação do site, auditoria dos backends, publicação ou abertura de PR.

> **Manter a profundidade da V2, mas apresentar uma operação compreensível por vez. Usar ícones de serviços reais e símbolos específicos de função, em vez de caixas genéricas com nomes diferentes.**

## 1. Decisão e precedência

A V2 acertou o comportamento, mas sua referência visual expunha muitos componentes, estados e comandos ao mesmo tempo. Esta revisão mantém os ciclos completos e substitui a apresentação por capítulos visuais guiados: onde estamos, quem age, qual objeto muda e qual foi o resultado.

A metáfora central passa de “inspecionar um diagrama” para “acompanhar uma operação”. A arquitetura inteira continua disponível, mas não precisa ser decifrada antes de assistir.

| Informação | Autoridade |
|---|---|
| Comportamento, guardas, estados e cenários | `domains/`, `scenarios/` e `contracts/simulation-contract.ts`, preservados da V2 |
| Apresentação, foco, assets, capítulos e integração | Esta V3 e `design/visual-spec.md` |
| Correções de simplificações/erros nas imagens | `design/REFERENCE-CORRECTIONS.md`; obrigatória antes de implementar |
| Aparência, material, profundidade e ênfase | PNGs em `references/approved/`, sujeitos às correções |
| Ícones efetivamente usados | `design/service-assets.json` + registro de origem/licença/hash após aquisição |
| Textos, fatos e status públicos do projeto | Conteúdo editorial verificado do repositório, não texto produzido dentro de uma imagem |
| Histórico | `archive/v2/`; não é um segundo conjunto de instruções ativas |

As imagens são **referências de direção visual**, não especificações de topologia, pacotes de logos ou capturas do site. Não rastrear seus desenhos para criar falsos ícones oficiais. Não copiar slogans, marcas inventadas ou afirmações de produção.

A V3 substitui os requisitos de aparência da V2, inclusive as antigas coordenadas de diagramas e o viewer de snapshots como alvo de interface. Não reduz nem substitui seus requisitos de domínio. Não restaurar as restrições da V1 que encerravam CnesData em raw e Limnopulse em SQS.

## 2. Escopo funcional preservado

| Cenário obrigatório | Ciclo que precisa permanecer completo |
|---|---|
| `infra-exhaustion-recovery` | `node-02 → node-01 → node-03 → zero workers → node-02 retorna → elegível → autostart → saudável`, com controller/storage externos por hipótese |
| `infra-quorum-recovery` | Maioria fixa de 2/3; bloqueio com um votante; retorno da maioria; storage e fencing como guardas independentes |
| `infra-provision-scale` | Carga persistente → desired → reserva → provisionamento → boot → health → roteamento → scale-in → drain → parada → liberação |
| `limnopulse-end-to-end` | Configuração → telemetria → avaliação → incidente/outbox → relay → canais → provedor → usuário → reconhecimento → recuperação → usuário |
| `cnesdata-end-to-end` | Solicitação → extração municipal/nacional → raw → normalização → reconciliação → serving → versão/pointer → consumo autorizado |

Os **91 checkpoints e 27 casos negativos/alternativos** da V2 continuam como oráculos de comportamento. O pacote conserva seus bytes; `checks/v2-behavior-lock.json` permite verificar isso. Checkpoints adicionais internos podem ser necessários, mas não podem eliminar um resultado ou alterar uma guarda para combinar com a arte.

O modelo de domínio deve responder a ações fora do tour. `expected` não é estado a ser atribuído: implementar reducers e comparar suas projeções aos resultados esperados. Um player que só faz `setState(checkpoint.expected)` continua reprovado.

Completo não significa executar AWS, Proxmox, Firebird, Polars, MQTT, Telegram ou DATASUS no navegador. Todas as entradas, relógios, workers, filas e provedores do demo são sintéticos.

## 3. Lugar da experiência no portfólio

Preservar **Home → Atlas → Projeto → Evidência**. Não refazer a Home, não devolver maquetes detalhadas ao hub e não criar novas páginas concorrentes para o mesmo projeto.

Nas páginas `/explore/{project}/`: título e propósito → lifecycle principal → contexto/contribuição → arquitetura e decisões → resultados/evidências/limitações. `#simulation` continua identificando o player; preservar os demais fragmentos canônicos e `#component-*`.

Uma única superfície de visualização e operação por página. O modo técnico pode revelar mais atores na mesma cena ou mostrar texto em disclosure. Não duplicar a simulação numa segunda maquete, painel de caixas e canvas paralelo.

## 4. Referências aprovadas e seu uso

| ID | Referência | Extrair |
|---|---|---|
| VIS-LP | [Limnopulse](references/approved/limnopulse-storyboard.png) | Serviços reconhecíveis, caminhos ativos, destaque da etapa e desfecho no telefone |
| VIS-INF | [Infrastructure](references/approved/infrastructure-storyboard.png) | Nós nomeados, estado falho persistente, workload pendente, retorno e capacidade |
| VIS-CND | [CnesData](references/approved/cnesdata-storyboard.png) | Arquivos e serviços distintos, transformação, versão candidata e CURRENT |

Cada imagem contém seis quadros para comunicar um storyboard. **O produto não mostra os seis quadros simultaneamente.** A implementação apresenta um palco ampliado com um capítulo ativo e uma faixa de progresso. As miniaturas são navegação de capítulos, não seis pequenas simulações em execução.

Os 18 recortes de `references/crops/` mantêm detalhes legíveis para o assistente de codificação. São recortes dos mesmos PNGs, não referências novas nem fontes SVG. As folhas dos vídeos originais ficam em `references/video-style/` somente como briefing de foco e ritmo; não incorporar o material alheio ao site.

A implementação não precisa reconstruir personagens 3D. Um telefone/painel bem legível explica o usuário final; um personagem é opcional e não pode esconder o conteúdo. Textos de UI devem vir do código/HTML, não ficar gravados em textura.

## 5. Ícones: identidade do serviço e identidade da função

### 5.1 Política obrigatória

Usar a arte oficial reconhecível de produtos quando houver origem e uso permitido; usar pictogramas específicos de função quando não existe produto/marca a representar. Um ícone de Worker é uma função, não uma marca. Um Outbox é um padrão, não um serviço da AWS.

O catálogo detalha **42 seleções de assets**. Ele é uma especificação de aquisição: os binários SVG dos fornecedores não estão incluídos. Os PNGs de referência estão incluídos. A implementação deve adquirir apenas os ícones utilizados, salvar localmente e registrar origem, versão/data, hash e termos aplicáveis. Não criar hotlinks de runtime nem depender de CDN de ícones.

| Elemento | Representação exigida | Não aceitar |
|---|---|---|
| Amazon SES | Ícone de arquitetura AWS de Simple Email Service + nome | Envelope genérico apresentado como ícone oficial do SES |
| Amazon SQS | Ícone AWS de Simple Queue Service; instância nomeada por canal | Ícone de SNS, uma fila compartilhada inventada ou pequenos blocos sem identidade |
| S3 / DynamoDB | Ícone AWS correto, apenas no perfil compatível | S3 decorando filesystem local; banco genérico substituindo serviço identificável |
| MQTT broker | Identidade MQTT e nome do broker/protocolo; Mosquitto somente quando a implementação for explicitamente a referência | AWS IoT Core ou outra solução adicionada apenas pelo logo |
| Telegraf / InfluxDB | Assets de produto da InfluxData quando autorizados; nomes separados | Um único bloco “MQTT/Telegraf” ou logo de empresa fingindo ser produto |
| Worker | Pictograma CPU/processo com nome `Email worker`, `Telegram worker` ou papel local | Mesmo bloco/engrenagem para relay, evaluator e worker; Lambda/ECS sem base |
| Outbox | Bandeja de registros persistidos com saída; rótulo `Transactional outbox` | Cilindro que o torne indistinguível de DynamoDB ou uma seta automática para SQS |
| Relay | Função de publicação/workflow distinta | Worker de entrega fundido com o relay |
| Evaluator | Janela temporal e comparação de regra | Avaliação de uma única amostra ignorando duração/cobertura |
| Parquet / manifest / JSON | Documentos com tag de formato e linhagem | Todos representados pela mesma esfera de dados |
| Nó / VM / réplica | Servidor, instância com geração, réplica identificada | Criar hosts físicos ao escalar VMs ou clonar singleton como stateless |

Fontes primárias de assets estão em `SOURCES.md`. A página AWS permite seus assets de arquitetura em materiais explicativos; isso não torna logos de outros fornecedores livres para qualquer uso. O catálogo InfluxData possui downloads, mas a política de logos exige atenção específica. Caso uma marca não possa ser usada, documentar o caso e apresentar um pictograma **de função claramente rotulado**, sem fingir que é a marca, para revisão explícita. Essa exceção não autoriza substituir toda a coleção por genéricos.

### 5.2 Composição dos assets

Ícones oficiais mantêm suas proporções e cores. O estado de execução aparece no contorno da placa, marcador e texto externos. Não pintar o logo do SES de vermelho para indicar falha; um indicador `Failed` faz isso sem mudar a identidade do serviço.

Usar placas discretas com profundidade curta, luz contida e áreas negativas; não transformar todos os ícones em caixas volumosas idênticas. Volume é opcional quando aumenta clareza. Telegraf, SQS, SES, outbox e worker precisam ser reconhecidos pela combinação **símbolo + nome + papel**, mesmo em um quadro sem movimento.

`design/actor-bindings.json` separa 50 atores de apresentação e mantém aliases dos grupos da V2. Os antigos grupos `limno.ingestion`, `limno.delivery`, `limno.provider` e `cnes.publish` não voltam como componentes genéricos: expandem para atores distintos durante suas subetapas.

## 6. Interface orientada a etapas

No início da cena, responder em texto curto: “o que este sistema faz?”. Em seguida:

```text
LIMNOPULSE                         Synthetic simulation
03 / 06 — Hand off
The relay publishes durable work to the email queue.

         [Outbox]  →  [Relay]  →  [Amazon SQS · email]
                        saved work becomes queued work

Observe — Evaluate — [Hand off] — Deliver — Acknowledge — Recover
             Previous     Pause     Next     Replay
                         Technical details
```

Isto é um esquema de hierarquia, não uma composição 3D obrigatória. O estado atual aparece acima da cena; uma consequência curta aparece abaixo. Não espalhar oito painéis de texto em volta do palco.

Cada capítulo apresenta de uma a três entidades em primeiro plano. Outros atores podem permanecer como contexto discreto, mas apenas uma transferência/decisão se move por vez. O número de elementos visíveis não é o número de elementos do sistema.

O capítulo atual usa número, título verbal e `aria-current="step"`. Concluído, atual, futuro e bloqueado têm marcação distinta; nenhuma delas depende apenas de cor. O título da subetapa informa a ação presente, sem expor o nome de comando do reducer.

**A faixa tem seis capítulos por cenário, não 91 controles de mesmo peso.** Os subpassos ficam disponíveis no modo manual e no trace técnico. Entradas por fragmento de evidência/arquitetura não devem iniciar o tour nem reposicionar a página.

O leitor pode assistir ao tour sem escolher parâmetros. `Try a scenario` expõe os controles de exploração em disclosure fechado; acioná-los cancela o restante do tour e conserva o estado do domínio. Não “corrigir” a ação manual saltando de volta ao roteiro. Replay reinicia explicitamente a história guiada.

## 7. Transições que ensinam

### 7.1 Ciclo visual de cada operação

Cada transição usa quatro momentos: **orientar → destacar → agir → estabilizar**. Orientar mantém origem e objeto visíveis; destacar identifica o ator responsável; agir mostra a transformação/transferência; estabilizar mantém o resultado tempo suficiente para leitura.

Valores iniciais de projeto: orientar 400–500 ms, foco 200–300 ms, ação 650–1.200 ms, resultado 900–1.600 ms. São durações editoriais ajustáveis, não latências dos sistemas. Operações com múltiplos serviços precisam de subbeats separados; não acelerar todo o pipeline para caber em dois segundos.

`design/choreography.json` liga os 91 checkpoints aos capítulos e a **124 subbeats de apresentação**. Cada subbeat tem atores, verbo e tipo de relação. Os subbeats explicam os estados existentes; não são 124 novas operações ou commits de domínio.

Não congelar o ritmo total para sacrificar compreensão. A meta é uma passagem de aproximadamente um a dois minutos nos ciclos mais extensos, revisada em movimento. A completude não exige todo o trace aberto; a brevidade não autoriza apagar etapas.

### 7.2 Gestos diferentes para coisas diferentes

| Operação | Ação visível | Resultado que permanece |
|---|---|---|
| Transferir | Um artefato percorre um caminho com origem/destino nomeados | Destino recebeu/aceitou o objeto correspondente |
| Persistir | Registro assenta num slot com identificação | Estado durável não desaparece junto com a seta |
| Avaliar | Janela e limiar se confrontam; decisão aparece depois | Resultado e razão da avaliação |
| Consultar | Pedido segue ao store; resposta retorna separadamente | Não confundir query com pipeline de escrita |
| Falhar | Instância ativa interrompe e rota deixa de servir | Falha e indisponibilidade continuam legíveis |
| Reiniciar | Definição persistida gera outra instância no nó elegível | Nova geração; não memória que voa de um host morto |
| Esperar / bloquear | Objeto estaciona com motivo | Nenhum sucesso ou retry prematuro |
| Provisionar | Reserva → configuração → boot → pronto | Capacidade e estado do recurso separados |
| Drenar | Novo tráfego para; trabalho em voo termina | Só depois ocorre stop/release |
| Transformar | Campos/linhas aparecem antes e depois | Linhagem da fonte e resultado concreto |
| Publicar | CURRENT troca de versão após a guarda | Versões antigas não mudam; a nova torna-se servível |
| Reconhecer | Clique do usuário percorre a API autorizada | ACK distinto de recuperação |

### 7.3 Tipos de ligação

Linhas de dados transportam artefatos; linhas de controle usam traço distinto; consultas têm request/response; fronteiras transacionais agrupam o commit; a representação no telefone usa ligação explicitamente ilustrativa. Não desenhar seta só para preencher espaço.

Não usar `Load Balancer → HA Manager → Ceph` como caminho de requisição. Não usar `Outbox → SQS` sem o relay responsável. Não usar `bucket → manifest` como se o bucket gerasse manifests. As correções completas constam no registro de referência.

### 7.4 Consistência com o engine

Reducers e relógio lógico continuam autoritativos. O renderer recebe `previous`, `current`, progresso e contexto de apresentação. O status que indica resultado concluído aparece junto ao resultado visual, não enquanto ainda mostra a origem como ativa.

Uma transição atômica pode ter várias tomadas explicativas, mas não pode fingir vários estados já confirmados no backend. Subdividir de verdade um comando exige estado/transições/testes reais. Nunca inventar resultados para satisfazer um quadro.

Ao interromper, assentar na projeção válida atual, cancelar cues da geração anterior e só então aceitar o próximo comando. Pausar a reprodução não executa comandos extras. Reset, alteração de cenário e retorno por bfcache não reativam callbacks antigos. Falha do WebGL troca para o mesmo estado em 2D.

## 8. Direção por projeto

### 8.1 Infrastructure — recuperar não é escalar

Conservar os nós em posições estáveis durante o cenário; o foco se move, não o inventário inteiro. A sequência correta de proprietário é **02 → 01 → 03 → nenhum → 02**. Não reproduzir a passagem 02 → 03 da imagem e depois anunciar uma nova transferência quando 01 falhar sem hospedar a instância.

No perfil externo, controller e storage ficam numa faixa claramente rotulada **Separate failure domain — assumed available**. No perfil de votantes, mostrar 2/3 como guarda e não um HA manager externo mágico. Não acrescentar marca Ceph para prometer sobrevivência de dados quando todos os hosts que os contêm caíram.

O estado pending fica no dock da definição persistida; cliente indisponível e definição salva são coisas diferentes. O nó que volta percorre boot → ready; o workload percorre starting → healthy antes de o cliente voltar a receber serviço.

Provisionamento/scaling é outro cenário com botão explícito. Não concatenar o último quadro da imagem como se um único nó restaurado transformasse o singleton em três réplicas. Mostrar slots físicos reservados, workers virtuais e réplicas como contagens diferentes. O capítulo final inclui drain/stop/release, mesmo que a imagem só ilustre scale-out.

### 8.2 Limnopulse — serviços separados e caminhos por canal

Rota de ingestão: **sensor → MQTT broker → Telegraf → InfluxDB**. Introduzir cada serviço quando participa; não substituir Telegraf e broker pelo mesmo pictograma. O evaluator é disparado por scheduler externo e consulta a janela persistida; não é um consumidor contínuo do MQTT nem avalia só o último ponto.

No commit: incidente e outbox são registros associados; DynamoDB é a implementação de persistência. Na publicação: relay → Delivery → SQS, respeitando as fronteiras descritas no contrato. Mostrar uma fila e um worker por canal; SES só no ramo email, Bot API só no ramo Telegram. Os dois ramos existem no contexto, mas são explicados em sequência, sem dois pulsos competindo.

O retry Telegram mantém o trabalho durável em espera; não paralisa o ramo email. `unknown` não recebe check verde nem reenvio automático. Redis aparece apenas quando o rate limiter atua, não como banco de incidentes.

No desfecho, ampliar a mensagem, depois a ação do usuário. Distinguir “Provider accepted”, “Message shown in demo” e “Acknowledged”. Não inventar recibo de leitura. A recuperação usa nova janela válida e repete o caminho durável de notificação; não desenhar evaluator enviando diretamente para SES/Telegram.

Valores visuais vêm dos fixtures, não das imagens. O exemplo é sintético e não é uma recomendação de limite de qualidade da água.

### 8.3 CnesData — ver os dados mudarem

O alvo permanece local-first/Parquet aprovado na V2. No perfil AWS, usar S3 para objetos e DynamoDB para controle; no local, filesystem e SQLite. Não reintroduzir Postgres/MinIO/BigQuery por seus ícones conhecidos. Não adicionar AWS Glue/Lambda apenas por conveniência visual.

A fonte nacional percorre seu adapter central; não entra pelo Edge municipal. `CNES_LOCAL` é fonte Firebird no roteiro principal; DBC/DBF e os arquivos oficiais aparecem onde o contrato da fonte nacional os exige. Os formatos não são bancos/serviços adicionais.

`data.parquet` e `manifest.json` são objetos irmãos. Mostrar verificação/registro e proveniência, não uma transformação espontânea de bucket em manifest. Local e nacional não viram uma única fonte sem identidade.

Durante NormalizeSource, mostrar até três registros ou um campo focal de antes/depois. Reconciliação compara origens; serving cria JSON para a tela. `design/sample-data.json` é a referência de conteúdo sintético. Um cilindro que muda de cor não explica transformação.

Preservar v0 ativa durante a preparação de v1. Verificar artefatos → criar versão → CAS em CURRENT → autorizar e fixar a leitura. Não mostrar dashboard/API consultando raw diretamente nem publicar antes do commit. Etapas-alvo permanecem qualificadas como propostas/documentadas, sem restringir a execução do demo.

Não copiar o logo “cnes” associado a “Space / For a safer tomorrow” ou a afirmação “A CNES initiative” da imagem: não são identidade do projeto nem evidência de vínculo institucional. Usar o nome CnesData e a identidade já aprovada no repositório.

## 9. Contrato de apresentação e integração

Arquitetura mantida:

```text
Conteúdo verificado → textos, evidência e componentes
Domínio sintético   → estados, guardas e eventos
Tour                → comandos válidos + relógio lógico
Plano visual        → capítulo + subbeat + atores + consequência
Renderer            → ícones/poses/caminhos; nunca regras de domínio
```

`contracts/presentation-contract.ts` define o shape mínimo do plano visual. `design/stage-map.json` agrupa os checkpoints sem alterar sua ordem. `design/choreography.json` aponta os resultados por referência. `design/actor-bindings.json` dá identidade aos atores. `design/layouts.json` define slots do capítulo em desktop/mobile. Estes são documentos de implementação, não uma nova DSL de simulação pública.

No modo manual, eventos válidos fora do tour usam a mesma gramática de movimento; não depender exclusivamente do ID de checkpoint para conseguir animar. Um reset limpa o contexto visual; uma rejeição de comando explica o bloqueio sem fazer a animação fingir sucesso.

| Ponto provável no repositório | Alteração localizada |
|---|---|
| `ProjectDetail.astro`, `src/pages/explore/[project].astro` | Um palco com heading de etapa e controles; preservar anchors |
| `src/features/explorer/controller.ts`, `client.ts` | Manter domínio/seleção; ligar intenção de playback, estado e adapter de apresentação |
| `simulation/infrastructure.ts`, `simulation/cnesdata.ts`, `simulation/limnopulse.ts` | Implementar os contratos V2 que ainda faltarem; não reescrever domínio existente correto só para trocar arte |
| `story/player.ts` e `story/presentation.ts` (propostos) | Reprodução cancelável; resolver capítulo/subbeat; não hardcode de estados esperados |
| `scene/*` e `resources.ts` | Ícones/atores identificados, uma rota ativa, draw sob demanda, lifecycle seguro |
| `public/assets/services/` e registro de assets (propostos) | Somente ícones adquiridos com provenance; prefixos de ID SVG seguros |
| Conteúdo e docs | Corrigir descrições afetadas e distinguir topologia-alvo, comportamento do demo e evidência |

Conferir a branch atual antes de editar; os caminhos propostos não comprovam a existência dos arquivos. Reusar Astro/TypeScript/Three.js/R3F disponíveis; não migrar de stack. SVG/HTML é válido como renderer principal onde melhorar legibilidade, com a mesma qualidade narrativa. Não instalar biblioteca de animação, physics engine ou pacote inteiro de ícones sem necessidade demonstrada.

## 10. Acessibilidade, mobile e performance

Desktop: palco dominante, ícones 64–96 CSS px, nomes legíveis, controles próximos. Mobile: um capítulo por vez, ícones 48–64 px e nomes de pelo menos 14 px. Trios que não couberem viram pares sequenciais, não uma redução do diagrama inteiro. A faixa mantém `03/06` e nomes próximos; não requer hover, orbit, pinch ou pan para entender.

Pausa tem alvo de 44px, nome acessível e foco visível. Reduzir opacidade de geometria de contexto não reduz a legibilidade do texto necessário. Estado, seta e ícone sempre têm equivalente textual. Não anunciar frames em aria-live. A preferência de movimento reduzido usa quadros estáticos equivalentes e controles manuais.

Autoplay no máximo uma passagem elegível, somente com cena pronta, visível e documento ativo; sem autoplay em reduced-motion ou Save-Data. Autoplay é permitido, não necessário para compreender. Pausa durante loading prevalece. Fora de tela/aba oculta pausa; retorno não retoma sozinho. Oferecer view estática/2D preservando estado e foco.

Sem WebGL: a apresentação HTML/SVG continua com etapas e exploração. Sem JavaScript: figuras/transcript gerados, evidências e links funcionais; não mostrar controles aparentemente habilitados. Arquitetura não pode existir somente numa textura.

Sem novas requisições de detalhe na Home/Atlas. Carregar somente assets do projeto/capítulo necessário; nenhum fetch runtime para sites de ícones. DPR inicial máximo 1,5; sem render contínuo em pausa/resultado. Preservar prazo de segurança/lifecycle gráfico existente.

Orçamento inicial: domínio/player novo até 80 KiB gzip por rota; modelos novos até 500 KiB por projeto. Ícones SVG entram no orçamento de assets e no relatório total; não esconder runtime gráfico, custo de parsing ou GPU num número incremental. Valores são metas não medidas. PNGs de briefing não devem ser entregues como assets do runtime.

## 11. Testes e revisão obrigatória

**Comportamento:** 91 checkpoints/27 variações, estados fora do roteiro, efeitos obsoletos e guardas V2. **Apresentação:** um capítulo atual, máximo de três atores focais por subbeat, no máximo uma transferência ativa, nomes/ícones corretos, ausência de resíduos após pause/replay/reset.

Validar especificamente: MQTT e Telegraf separados; InfluxDB antes da avaliação; outbox/relay/fila/worker/provedor distintos; filas por canal; recovery sem atalho; sequência Infra 02→01→03; pending e autostart; escala separada do singleton; raw/manifest irmãos; resultado antes/depois; CURRENT somente depois do commit.

O teste de integração deve forçar perda de WebGL, largura 320/390, teclado, reduced-motion, mudança de cenário durante ação, callback tardio e rejeição de comando. Capturar início, transição, espera/falha e resultado **da implementação**, não reutilizar referências como screenshot de teste.

A revisão visual deve incluir um trecho reproduzido em movimento com leitura da legenda. Reprovar quando:

- o usuário precisa abrir logs para saber a etapa atual;
- o “novo design” é o mesmo mapa de caixas com logos pequenos no canto;
- todos os serviços continuam brilhando/movendo ao mesmo tempo;
- a grade de seis quadros é entregue como a interface final;
- a animação encobre ou inventa estados para ficar bonita;
- SQS/SES/Telegraf são ícones improvisados apresentados como oficiais;
- a aprovação visual apaga guardas, ciclos finais ou status de evidência.

Em uma checagem qualitativa, mostrar um capítulo sem explicação prévia e perguntar: “quem agiu?”, “o que mudou?” e “o que acontece depois?”. Ajustar foco e ritmo se o observador não souber responder. Não declarar conversão de recrutadores ou conformidade global WCAG sem avaliação própria.

## 12. Entrega e definição de pronto

Ordem sugerida: apresentação mínima no trecho outbox→relay→SQS→worker→SES de Limnopulse; integração dos cinco ciclos V2; revisão visual e funcional por projeto; mobile/fallback; evidência de entrega. Começar nesse trecho é uma validação da linguagem, não autorização para parar o Limnopulse na fila.

`IMPLEMENTATION-PLAN.md` contém fatias com testes e limites. `CODEX-HANDOFF.md` define leitura e autoridade. `CODEX-PROMPT.txt` traz a instrução inicial. Não substituir `AGENTS.md` do repositório nem desativar sandbox/review para implementar.

A V3 só está pronta no produto quando **todos os cinco ciclos** estão completos, visualmente compreensíveis e tecnicamente coerentes, com fontes dos assets registradas. O pacote de referências não é evidência de que isso já ocorreu.

Este documento não cria issues, PRs, commits ou deploy. A autorização para esses atos depende do fluxo escolhido pelo usuário. Uma revisão de comportamento contraditória com fontes recentes deve ser relatada e tratada explicitamente; não reduzir guardas ou ampliar claims silenciosamente.
