# Limnopulse — ciclo até o usuário e recuperação

**Base:** R4a/R4b/R4c em `SOURCES.md`. Estados aqui são projeções do demo; não renomear enums reais do backend como efeito colateral. A interface do destinatário é um mock proposto, não um aplicativo entregue.

## LP-LIFE-01 · Fluxo principal

1. Uma regra sintética de oxigênio dissolvido `< 5` é configurada para uma janela suficientemente coberta. Unidade, janela e duração ficam visíveis; valores são exemplos, não recomendação operacional para aquicultura.
2. Usuário tem membership ativa. Telegram exige binding verificado **e** preferência habilitada; confirmar binding não habilita sozinho.
3. Sensor ilustrativo publica. Broker/Telegraf enriquecem o contexto permitido; InfluxDB persiste a janela. Payload não concede tenant por si só.
4. Scheduler externo executa evaluator one-shot. Uma amostra isolada não basta: conferir cobertura, validade, frescor, janela e duração antes de abrir.
5. Abertura persiste incidente e NotificationOutbox na mesma fronteira transacional. A leitura temporal não vira uma linha de DynamoDB por animação.
6. Relay resolve elegibilidade, cria Delivery imutável e publica IDs duráveis em SQS por canal. Duplicata de transporte não é outra Delivery.
7. Worker reclama/faz fence de Attempt. Email e Telegram são independentes; no Telegram, Redis controla taxa.
8. Provedor falso retorna sucesso, falha ou incerteza. Só o sucesso confirmado tem `providerAccepted=true`.
9. Mock de dispositivo mostra mensagem para o destinatário. Isto é uma **visualização ilustrativa**, não um callback Telegram de leitura.
10. Usuário abre detalhe por API autorizada, consulta incidente e reconhece com expectedVersion. ACK não significa recuperado.
11. Nova janela válida/limpa leva o evaluator à recuperação. Sem cobertura ou sem novos dados, manter estado, não resolver.
12. Recuperação gera trabalho de notificação correlacionado e condicionado à abertura confirmada/elegibilidade. Mostrar a recuperação no dispositivo, encerrando o ciclo completo.

## Estado mínimo e separação de responsabilidades

`telemetry`: origem, identidade do ponto, janela, timestamps lógicos e qualidade.  
`rule`: ID/version, limiar, janela/duração/cooldown.  
`incident`: ID, version, `none|open|acknowledged|recovered|manually_resolved`, histórico.  
`outboxes`: identidades de abertura/recuperação e canais.  
`deliveries[channel,kind]`: identidade, `pending|queued|attempting|retry_wait|accepted|permanent_failure|unknown|suppressed`, attempts e dueTick.  
`recipient`: membership, binding, preference.  
`userView`: `idle|message_shown|incident_opened|acknowledged|recovery_shown`, apenas mock do demo.

A interface deve mostrar três coisas separadamente: estado ambiental, estado do incidente e estado da entrega. Se a água se recuperou mas o canal falhou, não converter tudo para verde como se a mensagem tivesse chegado.

## Comandos da demonstração

| Comando | Guarda e resultado |
|---|---|
| `CONFIGURE_RULE` | Dados válidos e papel autorizado; version monotônica |
| `VERIFY_BINDING`, `ENABLE_PREFERENCE` | Operações distintas; sem membership/binding, habilitação falha |
| `PUBLISH_READING` / `INGEST_WINDOW` | Fake broker/Telegraf preserva IDs/proveniência; device desconhecido não produz ponto tenantless |
| `EVALUATE` | Só processa janela com qualidade suficiente; replay de avaliação não abre outro incidente |
| `RELAY` | Cria/publica Delivery elegível, um canal por fila; idempotente |
| `ATTEMPT_DELIVERY(channel,kind)` | Claim, fence, preflight atuais; dueTick atingido |
| `PROVIDER_RESULT(channel,kind,result)` | accepted/429/5xx/permanent/unknown; correlaciona operationId |
| `SHOW_MESSAGE(channel,kind)` | Apenas mock: exige resultado aceito; não persiste “lido” no backend |
| `OPEN_INCIDENT` | Membership e tenant/pond corretos; não acessa InfluxDB diretamente |
| `ACKNOWLEDGE(expectedVersion)` | Papel permitido, versão atual; preserva condição ambiental e identidade do evento |
| `INGEST_CLEAN_WINDOW`, `EVALUATE_RECOVERY` | Cobertura/frescor/validade; primeira janela limpa qualificada segundo contrato atual |
| `ADVANCE_CLOCK` | Janela/retry/cooldown lógicos; playback não faz consultas reais |

## LP-ERR-01 · Falhas obrigatórias

| Situação | Resultado correto |
|---|---|
| Janela insuficiente/stale | Sem abertura/recuperação falsa; motivo `INSUFFICIENT_DATA` |
| Telegram não habilitado | Canal suppressed; email pode continuar |
| SQS duplicado | Mesma identidade, claim/fence; sem novo efeito se já aceito |
| 429 | retry_wait até pelo menos retry_after; não enviar antes |
| 5xx com falha definida | Retry com tentativa limitada e mesmo Delivery |
| Destino rejeitado definitivamente | Permanent failure + destino suprimido conforme contrato |
| Confirmação perdida/malformada | `unknown`; uma chamada registrada, **sem reenvio automático** |
| Redis indisponível | Fail-closed de taxa; esperar com lease guard, não considerar enviado |
| Membership revogada antes do worker | Preflight impede envio mesmo se já estava na fila |
| Versão obsoleta em acknowledge | Conflito, incidente não alterado |
| Recuperação sem abertura confirmada | Não criar/entregar mensagem de recuperação para canal inelegível |

Não adicionar hysteresis como se estivesse implementada: é extensão reservada no documento consultado. Não prometer exactly-once externo, confirmação de leitura humana ou delivery em tempo medido.

## Invariantes

**LP-I1:** sem janela elegível não abrir nem recuperar.  
**LP-I2:** abrir incidente e outbox é uma fronteira atômica; sem “incidente sumido, email enviado”.  
**LP-I3:** queued ≠ accepted ≠ user acknowledgment.  
**LP-I4:** um usuário reconhecer não limpa a condição ambiental.  
**LP-I5:** retry conserva Delivery ID; incrementa Attempt ID, não duplica o evento.  
**LP-I6:** unknown não volta a retry_wait por timer.  
**LP-I7:** usuário e canal devem continuar elegíveis no momento da ação.  
**LP-I8:** recuperação é evento posterior, com outbox própria e abertura correlacionada.

## Visual

Objetos: boia, ponto de leitura, janela de leituras, regra, evento `evt-demo-01`, envelope Delivery, dispositivo. Use vínculo de identidade para derivação em vez de fazer a mesma partícula “ser tudo”. Dois trajetos de canais pequenos; abrir apenas o canal ativo durante o foco, mantendo status do outro visível.

O telefone deve exibir mensagem curta, botão “View incident”, detalhe e ação “Acknowledge”. São HTML/SVG mockados com dados sintéticos, sem screenshot de cliente real. Depois do ACK, a cena mostra “Acknowledged · condition still active”; depois da janela limpa, “Recovered”.

Atores `limno.sensor`, `limno.ingestion`, `limno.timeseries`, `limno.evaluator`, `limno.domain`, `limno.delivery`, `limno.provider`, `limno.user`, `limno.api`. Fixture `limnopulse-end-to-end.json`.
