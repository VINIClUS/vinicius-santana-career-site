# Fontes V3 e proveniência

**Esta revisão:** 12/09/2026. Documentação visual/CLI consultada agora; contratos e SHAs de backend abaixo são a pesquisa herdada da V2, não uma nova inspeção de HEAD ou runtime.

## Fontes adicionais verificadas para a V3

| ID | Fonte primária | Uso nesta revisão |
|---|---|---|
| V3-AWS | [AWS Architecture Icons](https://aws.amazon.com/architecture/icons/) | Selecionar SES, SQS, S3 e DynamoDB oficiais; uso em materiais de arquitetura; não inventar ícone ou endorsement |
| V3-INFLUX | [Downloads de produtos InfluxData](https://influxdata.github.io/branding/logo/brands/) | Telegraf e InfluxDB separados; não usar mascote/enterprise/company mark no lugar errado |
| V3-INFLUX-TERMS | [Condições de marcas e logos](https://www.influxdata.com/legal/guidelines-for-using-influxdata-trademarks/) | Download não equivale a licença irrestrita; verificar condição de uso de logo antes de publicar |
| V3-MQTT | [MQTT.org](https://mqtt.org/) | Distinguir protocolo e broker; não adicionar uma cloud apenas para obter um ícone |
| V3-MOSQUITTO | [Eclipse Mosquitto](https://mosquitto.org/) | Broker específico somente quando identificado como tal na evidência |
| V3-TELEGRAM | [Logos e capturas Telegram](https://telegram.org/tour/screenshots) | Arte fornecida para diagramas/ilustrações, sem representar Telegram oficialmente |
| V3-LUCIDE | [Lucide](https://lucide.dev/) e [licença](https://lucide.dev/license) | Pictogramas de funções não associadas a marca; preservar termos aplicáveis na aquisição |
| V3-CPU | [CPU](https://lucide.dev/icons/cpu) e [Inbox](https://lucide.dev/icons/inbox) | Exemplos de bases semânticas distintas para worker/outbox; a associação arquitetural é decisão deste design |
| V3-CLI | [Referência Codex CLI](https://developers.openai.com/codex/cli/reference/) | --image/-i aceita arquivos e é repetível; confirmar flags na versão instalada |

As URLs de fonte são pontos de aquisição/revisão, não hotlinks de runtime. O catálogo não declara o download dos SVGs. Nenhuma licença foi inferida a partir do simples fato de uma imagem estar na web.

## Referências visuais fornecidas no chat

Os três PNGs de `references/approved/` foram gerados e aprovados no contexto desta conversa. `references/manifest.json` registra nomes originais, dimensões, SHA-256 e caixas de recorte. A aprovação é de direção visual, não de logos, texto ou arquitetura. Os frames dos três vídeos enviados são material de briefing; não há permissão adicional presumida para publicá-los no site.

## Pesquisa de comportamento herdada — não reexecutada nesta revisão

### Registro original da V2

Consulta: **12/09/2026**. Inspeção de código/contratos selecionados e texto publicado; sem auditoria de produção, sem execução dos backends e sem benchmark do site.

## Baselines

| ID | Fonte | Baseline e alcance |
|---|---|---|
| R1 | Portfólio | `main` em `773022dee346f9e614b4b227aaf1b38fa721ec1c`; SA-07 após a baseline `c686a47` usada na V1 |
| R2 | CnesData legado | `main` em `c9dee715d57ddaec453fde8b17989a8addb57e7f`; README descreve Postgres/MinIO/Gold e integração incompleta |
| R3 | CnesData alvo | `develop` em `9874763ec2d498528d32042042fac8e8a61400fc`; desenho aprovado Parquet/local-first e contrato raw Phase 3 |
| R4 | Limnopulse | `main` em `bd6e579a20017f769c6f041bdfde35cb67b30c93`; README e contratos operacionais de evaluator, email e Telegram |

Os documentos de arquitetura/README do CnesData ainda contêm o desenho legado. **Não combinar os dois desenhos no mesmo fluxo.** A história V2 explica explicitamente o *alvo aprovado*, usando status por etapa. O contrato raw ratificado em setembro prevalece sobre o desenho geral de agosto nos detalhes de ingestão raw. Ter um contrato no repositório não prova implantação ou integração completa.

## Fontes primárias consultadas

- **R1a — seleção e engines existentes:** [controller.ts](https://github.com/VINIClUS/vinicius-santana-career-site/blob/773022dee346f9e614b4b227aaf1b38fa721ec1c/src/features/explorer/controller.ts). O controller só mantém simulações para CnesData e Infrastructure; Limnopulse ainda ignora esses comandos.
- **R1b — contratos do portfólio:** [docs/explorer.md](https://github.com/VINIClUS/vinicius-santana-career-site/blob/773022dee346f9e614b4b227aaf1b38fa721ec1c/docs/explorer.md). A V1 e a implementação anterior limitavam Infrastructure a um failover e CnesData a escrita/replay/conflito.
- **R1c — páginas publicadas:** [Infrastructure](https://dev.vinisantana.com/explore/infrastructure/), [CnesData](https://dev.vinisantana.com/explore/cnesdata/), [Limnopulse](https://dev.vinisantana.com/explore/limnopulse/). Conferência textual, não validação do renderer em produção.
- **R2a — README legado:** [CnesData main](https://github.com/VINIClUS/CnesData/blob/c9dee715d57ddaec453fde8b17989a8addb57e7f/README.md).
- **R3a — desenho normativo do alvo:** [Data Plane Parquet e Orquestração V2](https://github.com/VINIClUS/CnesData/blob/9874763ec2d498528d32042042fac8e8a61400fc/docs/superpowers/specs/2026-08-16-parquet-data-plane-orchestration-design.md). Local: SQLite/filesystem/worker pool. AWS: DynamoDB/S3/Step Functions/ECS. Raw → normalized → reconciliation → serving; publicação versionada e pointer condicional. Polars no processamento central. Sem PostgreSQL/MinIO/Keycloak/BigQuery no alvo.
- **R3b — contrato raw ratificado:** [Phase 3 Raw Ingestion](https://github.com/VINIClUS/CnesData/blob/9874763ec2d498528d32042042fac8e8a61400fc/docs/superpowers/specs/2026-09-06-cnesdata-phase3-raw-ingestion-contract.md). Fonte nacional PF mensal DBC, mTLS, lease/fence, Parquet sem gzip externo, imutabilidade, DELTA/resync. A Phase 3 não inclui normalização, reconciliação, publicação ou agendamento automático do FULL substituto.
- **R4a — leitura, regras, incidentes e canais:** [Limnopulse README](https://github.com/VINIClUS/limnopulse/blob/bd6e579a20017f769c6f041bdfde35cb67b30c93/README.md).
- **R4b — tempo e recuperação do evaluator:** [Phase 3B](https://github.com/VINIClUS/limnopulse/blob/bd6e579a20017f769c6f041bdfde35cb67b30c93/docs/alert-evaluator-phase-3b.md). One-shot com scheduler externo; recuperação em janela limpa, válida, fresca e suficientemente coberta. Não inventar hysteresis/recovery_duration implementados.
- **R4c — entrega e incerteza Telegram:** [Phase 3C-B](https://github.com/VINIClUS/limnopulse/blob/bd6e579a20017f769c6f041bdfde35cb67b30c93/docs/notifications-phase-3c-b.md). Binding e preferência separados; Delivery/Attempt no DynamoDB; Redis limitador; 429/5xx/rejeição permanente/unknown; sucesso do Bot API não comprova leitura humana.
- **T1 — segurança HA:** [Proxmox HA Manager, fonte oficial](https://github.com/proxmox/pve-docs/blob/master/ha-manager.adoc), consulta em 12/09/2026. Quorum, fencing e elegibilidade condicionam recovery. Não é um inventário da infraestrutura do usuário.
- **T2 — Codex CLI:** [documentação oficial](https://developers.openai.com/codex/cli/features/), que redireciona para ChatGPT Learn. Usar arquivos locais e contexto visual. Flags dependem da versão instalada; confirmar `codex --help` antes de automatizar anexos.
- **T3 — instruções de projeto do Codex:** [AGENTS.md](https://developers.openai.com/codex/guides/agents-md/). O handoff deste pacote complementa, não substitui instruções existentes.

## Matriz editorial de evidência

| Cena | Natureza da demonstração | Qualificação obrigatória |
|---|---|---|
| Infra: esgotamento e retorno | Novo modelo conceitual proposto | Controller e storage externos sobrevivem por hipótese; não chamar de cluster Proxmox real de três nós |
| Infra: quorum de três votantes | Modelo inspirado em requisitos reais | Não reproduz Corosync/Ceph; storage é pré-condição independente |
| Infra: provisioning/scaling | Novo comportamento ilustrativo | Não afirmar autoscaler implantado nem criação instantânea de hardware |
| Limnopulse: ingestão/avaliação/outbox/canais | Contratos descritos no repositório | Simulação de software; sem sensores, emails ou bot reais |
| Limnopulse: tela e ação do usuário | UI demonstrativa proposta | Mensagem renderizada e clique simulado não são recibo de leitura do provedor |
| CnesData: ingestão raw | Contrato ratificado; implementação não auditada ponta a ponta | Identificar fonte, snapshot e identidade; não dizer que o demo executa extração real |
| CnesData: transformação/reconciliação/publicação | Alvo aprovado | Etapas alvo continuam executáveis no demo, marcadas como planejadas/documentadas, sem alegar release de backend |

A simulação inteira é sintética mesmo quando uma etapa tem implementação de referência. No Codex, só promover status a `implemented` após localizar código e testes relevantes em ref identificada. Não reduzir o escopo visual por falta de implantação: manter o fluxo-alvo com a qualificação correta.
