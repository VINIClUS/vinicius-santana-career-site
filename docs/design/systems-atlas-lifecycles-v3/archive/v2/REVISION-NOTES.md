# Revisão V1 → V2

## Mudança central

A V1 tornava uma transição agradável de assistir; a V2 precisa explicar o sistema em operação. Por isso, a restrição de não ampliar reducers foi removida. A camada visual continua separada, mas o domínio agora representa estados intermediários, pré-condições e retomada.

## Resposta aos quatro exemplos solicitados

| Solicitação | Onde foi especificada | Referência principal |
|---|---|---|
| Falhar todos os nós e retomar quando um volta | INF-REC-01, perfil external-control com hipóteses explícitas | 01-infra-recovery + JSON homônimo |
| Comportamento tecnicamente coerente em cluster HA | INF-REC-01, perfil three-voters | 02-infra-quorum |
| Provisionamento/scaling | INF-SCALE-01 | 03-infra-scaling |
| Limnopulse até usuário final | LP-LIFE-01, incluindo ACK e recuperação | 04-limnopulse-lifecycle e 09-limnopulse-user-detail |
| CnesData até transformação/ingestão/uso | CND-LIFE-01 e CND-PUB-01 | 05-cnesdata-lifecycle e 10-cnesdata-transformation-detail |
| Fontes aproveitáveis pelo Codex | Handoff + fontes JSON/SVG/Mermaid + contratos e testes de aceite | README, CODEX-HANDOFF, design/, scenarios/, contracts/ |

## O que não deve reaparecer por interpretação da V1

Não limitar Infrastructure a FAIL_NODE(node-02) atômico. Não terminar Limnopulse em SQS. Não terminar CnesData em PUT raw. Não manter proibição genérica de Three.js. Não confundir ausência de implementação atual com proibição de mostrar a proposta: o fluxo pode ser demonstrado como alvo documentado/planejado.

Não fazer a expansão virar uma aplicação administrativa: tour continua simples, controles avançados contextuais, detalhes técnicos secundários. Complexidade fica no modelo que garante coerência, não em vinte botões obrigatórios na primeira tela.

## Grau de fidelidade dos materiais

SVGs de ciclo são pranchas de causalidade e composição. Os close-ups mostram o conteúdo final e antes/depois de dados. O HTML é referência de checkpoints, não um protótipo dos reducers. A implementação deve produzir movimento contínuo, volume e estados coerentes em ações fora do roteiro.
