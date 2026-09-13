# Correções normativas das referências aprovadas

**V3.0 · obrigatório para Codex antes de usar as imagens.**

A aprovação é da **direção visual**. As imagens geradas simplificam ou confundem algumas relações. Preservar foco, legibilidade, serviço identificável e profundidade discreta; corrigir os pontos abaixo. Não usar PNGs como documentação técnica, fonte de logos, código de UI ou evidência do que foi implementado.

## Gerais

| ID | Na referência | Implementação obrigatória |
|---|---|---|
| G-01 | Seis painéis em uma grade | Um palco com seis capítulos navegáveis, apenas um atual. A grade é storyboard de briefing |
| G-02 | Símbolos parecidos com marcas oficiais | Adquirir SVGs de fonte verificável. Não vetorizar imitações do gerador |
| G-03 | Glows coloridos em quase tudo | Uma ação focal; geometria inativa discreta, texto necessário continua legível |
| G-04 | Slogans de produção e uptime | Usar apenas copy verificada; manter Synthetic simulation/Proposed lifecycle |
| G-05 | Texto incorporado, erros tipográficos e rótulos ambíguos | Recriar labels em HTML e pelo contrato do projeto |
| G-06 | Personagem/logotipo decorativo | Opcional; jamais requisito que substitui a narrativa ou cria afiliação |

## Limnopulse — `references/approved/limnopulse-storyboard.png`

| ID / painel | Risco | Correção |
|---|---|---|
| LP-01 / 1–2 | InfluxDB omitido; leitura parece ir diretamente para evaluator | Separar MQTT, Telegraf e InfluxDB. Explicar persistência da janela antes da consulta |
| LP-02 / 2 | Uma leitura cruzar o limiar basta para abrir | Usar janela válida/coberta/fresca e duração; scheduler externo inicia evaluator one-shot |
| LP-03 / 3 | Outbox parece um banco genérico que envia diretamente à SQS | Distinguir incidente, outbox/padrão e DynamoDB/store; relay cria Delivery e publica |
| LP-04 / 3–4 | Logo SQS aproximado; uma fila/worker para tudo | Ícone AWS SQS correto e filas/workers separados por canal |
| LP-05 / 4 | Worker único bifurca chamadas para SES e Telegram | Email worker→SES e Telegram worker→Bot API; relay escolhe publicação por canal |
| LP-06 / 5 | Recebimento visual equivale a confirmação de leitura | Separar provider accepted, tela ilustrativa e ACK explícito pela API autorizada |
| LP-07 / 6 | Recovery pula outbox/relay/filas/workers | Recovery repete o mesmo caminho durável, com kind e correlação próprios |
| LP-08 / geral | Métricas inventadas diferentes dos fixtures; “Real-time monitoring” | Valores dos fixtures; nenhuma promessa de produção, fleet ou tempo real medido |
| LP-09 / 1–3 | Telegraf com marca geométrica de empresa ou outro produto | Usar asset de Telegraf com condições de uso verificadas, ou fallback funcional aprovado |

## Infrastructure — `references/approved/infrastructure-storyboard.png`

| ID / painel | Risco | Correção |
|---|---|---|
| INF-01 / 2–3 | Primeiro reinício parece ir a node-03; depois falha node-01 sem hospedá-lo | Manter a sequência de aceite V2: 02→01→03; destacar o proprietário correto |
| INF-02 / 1–6 | LB→HA Manager→Ceph parece caminho de requisições | Cliente/roteamento→instância para tráfego; controller→nó para controle; storage como dependência |
| INF-03 / 4–5 | Ceph/controller permanecem healthy após toda a própria infraestrutura cair | Cenário externo declara domínio de falha separado; cenário três-votantes mantém quorum e storage como guardas. Não impor Ceph |
| INF-04 / 5 | Retorno mostra serviço saudável antes das checagens; rótulos corrompidos | Boot→ready→starting→healthy; IDs node-01/02/03 corretos |
| INF-05 / 6 | Falha/recovery vira scaling do mesmo singleton | Separar cenário stateless de provisionamento; não clonar a VM stateful |
| INF-06 / 6 | Servidor extra cria capacidade física e escala está pronta enquanto provisiona | Slots finitos, virtual≠físico, desired≠ready; só anunciar apto após healthcheck |
| INF-07 / geral | “Always on” e movimentos parecem zero downtime/live migration | Mostrar interrupção, pending e restart com nova geração; não prometer RTO/SLA |
| INF-08 / 6 | Só scale-out aparece | Manter scale-in com drain, stop e release do contrato V2 |

## CnesData — `references/approved/cnesdata-storyboard.png`

| ID / painel | Risco | Correção |
|---|---|---|
| CND-01 / cabeçalho/rodapé | Logo “cnes”, “Space / For a safer tomorrow”, “A CNES initiative” | Não copiar. Usar CnesData e identidade do repositório, sem afiliação espacial/governamental |
| CND-02 / 1 | “CNES Local / Firebird / DBF” mistura tipos de fontes | Fonte CNES local principal é Firebird; PF nacional DBC/DBF percorre adapter central correto |
| CND-03 / 2 | Duas origens viram uma saída indistinta | Manter source/snapshot/manifest com proveniência própria; nacional não atravessa Edge municipal |
| CND-04 / 3 | Bucket parece criar manifesto depois do upload | data.parquet e manifest.json são objetos irmãos; validação/aceite não é transformação feita pelo bucket |
| CND-05 / 3–4 | “S3 compatible” genérico no alvo | AWS usa Amazon S3; local usa filesystem. Não inventar MinIO compatível no desenho-alvo |
| CND-06 / 4–5 | Banco/cor mudando substitui a transformação dos dados | Mostrar campos reais do fixture antes/depois e reconciliação entre fontes |
| CND-07 / 6 | CURRENT simplesmente “switch to latest”; consumidores paralelos vagos | Verificar artefatos, criar versão imutável e CAS; servir uma única versão autorizada, sem raw no navegador |
| CND-08 / geral | Todas as etapas parecem entregues | Manter status do alvo aprovado e simulação sintética; visual não promove planned a implemented |

## Como aplicar no desenvolvimento

Leitura: contrato de domínio → esta tabela → imagem → stage-map/choreography. Um desvio da imagem para atender uma correção é obrigatório, não uma falha de fidelidade visual. Registrar outros desvios relevantes na evidência do PR local. Não usar esta tabela como autorização para voltar à aparência genérica da V2.
