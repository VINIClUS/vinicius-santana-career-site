# Handoff para Codex CLI

## Ordem de leitura (evita saturar contexto)

1. `AGENTS.md` já existente no repositório e instruções mais próximas do código.
2. `docs/design/systems-atlas-lifecycles-v2/README.md` e `TECH-SPEC-V2.md`.
3. Apenas o contrato de `domains/` do marco atual.
4. Cenário JSON correspondente; `design/scene-map.json` e `design/visual-spec.md`.
5. SVG como fonte; PNG correspondente como referência visual; HTML para conferir todos os checkpoints.
6. `SOURCES.md` para status/limites; buscar backend apenas quando necessário para validar uma afirmação.

Não carregar todas as evidências, todos os JSONs e todas as imagens em cada subtarefa. Não substituir o AGENTS.md. Não inferir a aparência final a partir de nomes de arquivo.

## Antes de implementar

- Inspecionar branch/SHA atual; comparar com baseline `773022d`. Mudanças posteriores exigem ajuste dos pontos de integração, não rollback automático.
- Registrar o plano e os comandos de verificação realmente disponíveis em `package.json`.
- Não reintroduzir Work/Explore separados nem maquetes detalhadas na Home/Atlas.
- A V2 autoriza ampliar o domínio. Não manter a restrição V1 de usar apenas os reducers antigos.
- Não promover `planned/documented` a `implemented` por ter construído o demo.

## LC-01: modelo e slice de recuperação

Arquivos prováveis: `src/features/explorer/simulation/infrastructure.ts`, `controller.ts`, `Infrastructure.astro`, `InfrastructureSystemView.astro`, projeção/renderer de Infrastructure.

Primeiro criar testes do modelo: 3→2→1→0→1 no perfil externo; perda de quorum/retorno em três-votantes; fence; storage; desired stopped; callback antigo. Implementar domínio puro e renderer 2D legível. Depois integrar uma transição 3D real e testar pausa/reset/context loss.

Reutilizar recursos/anchors existentes. Um alias para FAIL_NODE/RESET legado é aceitável; duas engines simultâneas não são. Proteger compatibilidade de fragmentos e independência da seleção.

## LC-02: provisioning/scaling

Adicionar pool de capacidade, reservations, operação de provisionamento e serviço stateless com réplicas. Separar counts físicos/virtuais. Testar falta de capacidade, pedido idempotente, rollback de reserva, boot/health e draining. Não adicionar SDK Proxmox/AWS nem autoscaler real.

## LC-03: Limnopulse

Criar domínio puro, fixtures de janela/qualidade, incidente/outbox, canais, destinatário e recuperação. Roteiro até usuário não pode parar em SQS. A UI do telefone é mock sintético e não deve fingir feedback de leitura Telegram.

Os comandos agrupados `ATTEMPT_RECOVERY_CHANNELS` e `PROVIDER_RECOVERY_ACCEPTED` dos checkpoints são **macros de fixture**: na implementação, despachar as mesmas ações por canal já usadas na abertura. Não inventar uma API que entrega ambos os canais atomicamente. Preservar estado intermediário de sucesso parcial.

## LC-04: CnesData

Preservar testes raw antigos como subcenários. Modelar Job/Run/Version distintos, source municipal e nacional, plain Parquet e publicação atômica. Usar o alvo R3a/R3b, nunca montar pipeline com MinIO/Postgres/BigQuery legados.

`NORMALIZE_SOURCES` e `ACCEPT_NATIONAL_RAW` podem ser macros do tour sobre comandos elementares. O modo de exploração deve poder interromper entre objeto/manifest e entre fontes normalizadas. O fixture mínimo é uma projeção de aceite, não proibição de estados adicionais úteis.

Implementar transformação pequena sobre objetos sintéticos; não importar Polars/WASM ou manipular CPF real. Comparar dados antes/depois e preservar linhagem. Não aceitar apenas animação de caixas sem efeito no conteúdo demonstrado.

## LC-05: visual integrado e evidência

Corrigir hierarquia do shell; um player por rota; mobile dedicado; reduzido/noJS/WebGLfail. Reusar chunks/modelcache. Capturar screenshot e animação da **implementação** local, não reutilizar as pranchas deste pacote como prova de entrega.

Comparar com SVGs e `design/visual-spec.md`: identidade dos objetos, direção de fluxo, estado pending visível, usuário final, antes/depois dos dados, tamanho das legendas. Fontes de briefing não obrigam render 2D final; o objetivo é uma cena animada espacial, não outro conjunto de listas.

## Estratégia de testes

`scenarios/*.json` fornece comandos e projeções `expected`. Execute comandos num engine fresco e compare `selectPublicState(actual)` com os campos esperados; não faça `state = fixture.expected`. Expanda macros em ações elementares. `scenarios/negative-cases.json` lista outros ramos e condições.

Depois gere sequências de falha/retorno em ordens diferentes e verifique invariantes. Clock injetado; seed opcional fixa; sem relógio real ou chamadas externas. Manter testes de integração existentes e acrescentar apenas as rotas/contratos alterados.

Comandos usuais, a confirmar na branch atual:

```sh
npm ci
npm test
npm run build
npm run smoke
npm run test:explorer
git diff --check
```

Comandos deste pacote validam **referências**, não o produto:

```sh
python docs/design/systems-atlas-lifecycles-v2/tools/validate_reference.py
python docs/design/systems-atlas-lifecycles-v2/tools/build_reference.py
```

## Divisão de agentes

Depois de concordar sobre o shell/contrato comum, Infra, Limnopulse e CnesData podem ser trabalhados separadamente. Um agente integrador controla `ProjectDetail.astro`, controller e rotas compartilhadas. Não deixar agentes concorrentes editar a mesma raiz ou mudar IDs canônicos independentemente.

Não é necessário um framework de simulação genérico. Compartilhar somente clock, playback, componentes de controle e tipos realmente comuns. Variáveis de domínio continuam específicas.

## Relatório de conclusão

Informar marcos concluídos, testes realmente executados, capturas da implementação, diferenças justificadas das referências e limitações remanescentes. Não declarar “V2 completa” entregando apenas failover ou parando CnesData em raw. Não criar/mesclar PR ou publicar o site sem a autorização aplicável ao fluxo de trabalho.
