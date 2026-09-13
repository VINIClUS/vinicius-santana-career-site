# Infrastructure — contrato de comportamento V2

**Escopo:** modelo sintético de operações. Os nomes abaixo são contratos propostos do demo, não APIs reais do Proxmox. Fontes: R1a, T1 em `SOURCES.md`.

## INF-REC-01 · Esgotamento e retorno

Estado mínimo:

- `profile`: `external-control` ou `three-voters`;
- nós: ID, `offline|booting|ready|draining`, recursos, elegibilidade;
- `desiredState`: `running|stopped` (persiste durante falhas);
- workload: identidade lógica, geração de instância, `running|interrupted|pending|starting|stopped`, `nodeId|null`;
- `unsafeOwner|null`, conjunto de fencing confirmado;
- controller disponível, quorum, storage pronto, capacidade;
- `blockedReasons[]`: motivos independentes, não apenas uma mensagem genérica;
- operações em andamento com versão; tick lógico e eventos.

`canStart` exige `desired=running`, controller, quorum aplicável, storage, ausência de proprietário inseguro e nó ready com capacidade. Não aplicar sucesso porque a animação terminou. O host escolhido é determinístico: prioridade configurada, depois ID. Nunca realocar de um host healthy só porque outro retornou, salvo ação de rebalance explícita fora deste roteiro.

| Comando | Pré-condição e efeito |
|---|---|
| `FAIL_NODE(nodeId)` | Nó existente online/booting. Cancela boot/health pendentes; interrompe instância naquele nó; preserva desired e dados; pede fencing. Repetido é no-op |
| `CONFIRM_FENCE(nodeId)` | Simula prova externa de exclusão do antigo proprietário; libera guarda. Não inicia workload sozinho |
| `RECONCILE` | Recalcula motivos; aloca um único candidato e passa a starting se permitido |
| `WORKLOAD_HEALTHY(operationId)` | Só confirma a instância/generation atual num nó ainda ready e com guardas válidas |
| `RESTORE_NODE(nodeId)` | offline → booting; não ready direto |
| `NODE_READY(nodeId)` | boot/config/checagens do nó concluídos; disponibiliza capacidade; controller deve reconciliar automaticamente no próximo tick |
| `SET_STORAGE(ready)` | Altera a dependência simulada. A perda bloqueia novo start; workload existente deixa de ser anunciado saudável |
| `SET_DESIRED(stopped)` | Stop intencional; nenhum retorno de nó deve desfazer essa intenção |
| `ADVANCE_CLOCK(ticks)` | Executa efeitos simulados agendados e reconciliação elegível; determinístico |

Os JSONs explicitam RECONCILE e WORKLOAD_HEALTHY para inspecionar cada fronteira. Na UI, podem ser disparados pelo scheduler falso após os ticks configurados, sem exigir botões técnicos.

**Autostart:** não é “um botão de start que o usuário precisa apertar”. Após retorno → ready e guardas válidas, a rotina de reconciliação inicia o workload automaticamente. Em `desired=stopped`, não inicia. Durante loading, o intent é persistente e uma operação obsoleta nunca pode ressuscitar instância anterior.

### Perfil external-control

Três **workers** são o domínio de falha. Controller e armazenamento externo continuam acessíveis por hipótese, desenhados em outra faixa do palco. Quorum dos workers não se aplica; a disponibilidade do controller externo é explícita. Este é o perfil que permite `3 → 2 → 1 → 0 → 1` com reinstanciação em cada destino disponível.

Não rotular como “Proxmox HA de três nós” nem esconder o controlador externo num texto pequeno. A capacidade de retomar a partir de um worker depende dessa topologia conceitual.

### Perfil three-voters

Três votos fixos; `quorum = readyVoters >= 2`. Nó booting não conta como voto utilizável. Controle perde autorização de atuação sem quorum. Com 1/3, mesmo com storage pronto, novo start é bloqueado. Zero nós e retorno de um só não bastam. Fencing e armazenamento continuam guardas separadas.

Ações que recuperam quorum não afirmam que todos os dados de um Ceph real estão disponíveis. O fixture mantém storage indisponível após o retorno do segundo nó até `SET_STORAGE(true)`. Sem alteração automática de votos, sem `pvecm expected` nem instruções de bypass.

## INF-SCALE-01 · Provisionamento e capacidade

Um serviço stateless usa réplicas próprias. Não copiar o singleton acima. O fixture fixa três hosts e quatro slots virtuais de worker no pool; cada worker consome um slot; cada réplica usa um worker no exemplo. Esses limites são unidades sintéticas, não especificação da infra municipal.

Worker: `absent → reserved → provisioning → booting → ready → draining → stopped → absent`. Replica: `pending → starting → ready → draining → stopped`. Quantidades independentes: `physicalHosts`, `usedSlots`, `reservedSlots`, `desiredReplicas`, `readyReplicas`.

| Comando | Efeito do demo |
|---|---|
| `SET_LOAD(value)` | 0..1, carga sintética, não telemetria real |
| `ADVANCE_CLOCK(ticks)` | Atualiza duração de carga observada; não inventa sucesso de provisionamento |
| `EVALUATE_SCALE_POLICY` | Fixture: >=0,8 por 2 ticks pede 3 réplicas; <=0,3 por 2 ticks e cooldown mínimo de 4 ticks permite voltar a 1; min1/max3 |
| `RESERVE_WORKERS(ids, requestId)` | Reserva atômica dentro de slots; mesma chave/payload é idempotente; payload diferente conflita |
| `PROVISION_WORKERS(ids)` | Reserva vira recurso provisionando, sem capacidade servível |
| `WORKERS_BOOTED(ids)` / `WORKERS_READY(ids)` | Configuração e health concluídos por efeitos falsos distintos |
| `START_REPLICAS(ids, workerIds)` | Só em workers ready; primeiro starting, depois `REPLICAS_HEALTHY` registra no serviço |
| `DRAIN_REPLICAS(ids)` | Remove do roteamento novo e preserva requisições em voo |
| `DRAIN_COMPLETE(ids)` | Requisições chegam a zero; agora pode parar |
| `STOP_REPLICAS(ids)` / `RELEASE_WORKERS(ids)` | Remove processos e libera os slots depois da drenagem |

Provisionamento é sempre controlado por capacidade, não uma animação de servidores aparecendo. Escassez deve mostrar `desired=3, ready=1, pending=2`, com explicação. Scale-in não apaga o pool físico. Nenhum recurso real é criado.

## Invariantes e testes mínimos

**INF-I1:** singleton tem no máximo uma instância ativa; starting ainda não é healthy.  
**INF-I2:** todo workload running usa nó ready e guardas satisfeitas.  
**INF-I3:** zero workers implica nodeId null; desired pode permanecer running.  
**INF-I4:** retorno de um votante em três-votantes não autoriza start.  
**INF-I5:** fence pendente nunca permite instância concorrente.  
**INF-I6:** 0 ≤ used+reserved ≤ totalSlots; physicalHosts não varia ao criar worker.  
**INF-I7:** readyReplicas conta réplicas aptas ao roteamento, não objetos desenhados.  
**INF-I8:** drenar antes de liberar; callback antigo depois de FAIL/RESET é inerte.

Testar sequências alternativas: falhar um nó não proprietário; retornar outro nó antes de fence; falha durante boot/start; stop intencional antes de retorno; storage cai durante preparação; falta de quota; request duplicado; timeout de provisionamento com reserva liberada; scale-in com inFlight>0 bloqueado; reset no meio da transição.

## Visual e rastreabilidade

Atores `infra.node-01/02/03`, `infra.workload`, `infra.controller`, `infra.storage`, `infra.client`. Workload pendente fica no dock da definição persistida, com ícone de espera; não desaparece. Reinício usa nova geração visual (g1→g2), não desloca memória viva. O cliente alterna available/unavailable conforme saúde do serviço.

Fixtures: `infra-exhaustion-recovery.json`, `infra-quorum-recovery.json`, `infra-provision-scale.json`. Esses checkpoints são o mínimo; o reducer deve funcionar fora da sequência ensaiada.
