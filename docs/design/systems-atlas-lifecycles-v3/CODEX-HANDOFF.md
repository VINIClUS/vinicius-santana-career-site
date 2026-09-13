# Handoff V3 — Codex CLI

## Resultado esperado

Implementar os cinco ciclos de comportamento da V2 usando a nova direção visual aprovada: ícones reconhecíveis, etapa atual inequívoca e transições que explicam uma operação por vez. Não entregar outro painel genérico, uma grade estática de storyboards ou um vídeo que deixa de responder a interações.

## Ordem de leitura

1. Instruções do repositório (`AGENTS.md`, `CLAUDE.md` pertinentes) e `README.md` deste pacote.
2. `TECH-SPEC-V3.md` e `design/REFERENCE-CORRECTIONS.md`.
3. A imagem de `references/approved/` do projeto atual; depois seus recortes, se necessário.
4. `design/visual-spec.md`, `service-assets.json`, `actor-bindings.json`.
5. Contrato específico em `domains/`, cenário e casos negativos correspondentes.
6. `design/stage-map.json`, `choreography.json`, `layouts.json`, `tokens.json`.
7. `IMPLEMENTATION-PLAN.md` e fontes necessárias para verificar status/claims.

A V3 é normativa para apresentação. Os arquivos de `archive/` são históricos e podem conter links/comandos do pacote antigo; não executá-los nem usá-los como instruções concorrentes. Não carregar todos os contratos de backend ou recortes em cada subagente.

## Começar na branch atual, não na baseline antiga

Executar `git status --short`, identificar branch/SHA e inspecionar as partes do player/controller/renderer já implementadas. `773022d` é baseline histórica da revisão anterior. Não dar checkout/reset para ela e não sobrescrever mudanças existentes.

Primeiro determinar se os domínios V2 já foram implementados. Se estiverem corretos, manter suas regras e migrar a apresentação. Se ainda faltarem, implementá-los com os testes dos cenários. Não assumir que a presença dos documentos significa que o código existe.

## Escopo e autoridade

A aprovação das imagens não aprova erros de topologia, logotipos gerados ou slogans. Ler as correções antes de imitar os PNGs. Comportamento e evidência vencem a imagem; a aparência antiga da V2 não volta por causa de uma correção técnica.

Não há autorização neste prompt para usar serviços reais, buscar credenciais, enviar mensagens, alterar CnesData/Limnopulse fora do portfólio, publicar o site ou criar/mesclar PR. O trabalho local segue as autorizações do ambiente e as instruções do repositório.

## Assets

O catálogo lista 42 seleções, **não arquivos SVG já instalados**. `acquisitionStatus=not-vendored` e hashes nulos são estados declarados deste briefing. Não criar arquivos vazios ou ícones aproximados para “fechar” o manifesto.

Adquirir o mínimo necessário de fontes primárias, registrar licença/permissão aplicável, data/versão e SHA-256; guardar localmente. Desativar conteúdo ativo e referências externas de SVGs; preservar proporções, nomes e cor de marca. A sanitização deve ser registrada quando alterar os bytes: hash upstream e hash vendored distinguem origem de arquivo final.

SES/SQS/S3/DynamoDB usam AWS Architecture Icons. Worker/outbox/relay/evaluator são funções/padrões: escolher pictogramas distintos, com labels. A InfluxData tem regras específicas de logo; download disponível não é autorização irrestrita. Se não houver uso permitido, comunicar o caso e propor pictograma funcional específico para revisão; não substituir toda a coleção por cubos.

Nunca executar fetch runtime para site de ícones. Não importar todos os ícones de uma biblioteca via barrel. O catálogo de documentação não precisa virar um framework em produção; um mapa tipado pequeno com os assets usados basta.

## Plano de apresentação

`stage-map.json` cobre todos os checkpoints, em seis capítulos por cenário. `choreography.json` contém 124 microbeats para 91 checkpoints: cortes explicativos, não novos eventos de domínio. Pode ajustar duração e enquadramento com evidência visual; não ajustar o resultado para caber na imagem.

Não atribuir `expected` ao estado. O tour despacha comandos válidos; o engine produz os estados; o plano visual usa seus eventos/projeções. Os casos negativos devem executar comandos em engine real do demo, não comparar fixtures consigo mesmos.

`limno.ingestion`, `limno.delivery`, `limno.provider` e `cnes.publish` são aliases de compatibilidade. Expandir visualmente, em tomadas sucessivas, sem fundir os serviços nos antigos blocos. `componentRef=null` não significa que se pode inventar evidência.

Uma tomada tem no máximo três atores focais e uma transferência móvel. Uma transação pode agrupar incidente/outbox/store, sem dizer que houve commits independentes. Projetar labels, caption e quadro a partir do mesmo contexto de apresentação.

## Fatia inicial de validação

Validar a nova linguagem no trecho do Limnopulse que mais evidencia o problema: **outbox → relay → SQS email → email worker → SES**. A ordem serve à validação visual; não reordena o contrato. Se o engine ainda não existir, construir primeiro o subconjunto mínimo com testes, sem se passar por ciclo completo.

Comparar serviço estático, transição, espera e resultado. Só então aplicar o mesmo contrato visual a outros capítulos. A direção deve continuar atraente em movimento, não apenas em screenshot.

## Demais fatias

Infrastructure tem três cenários. Preservar 02→01→03→zero→02, guardas do perfil de votantes e scaling stateless independente. Não apresentar o primeiro worker restaurado como quorum. Não pintar Ceph “healthy” sem a premissa apropriada.

Limnopulse não termina no provedor nem na fila: chega ao usuário, ACK e recuperação. Os macros de recuperação se expandem nas mesmas ações por canal; conservar estados de sucesso parcial e `unknown` sem reenvio automático.

CnesData não termina em raw: mostrar transformação concreta e publicação. Fonte nacional tem adapter próprio; arquivos raw/manifest irmãos; CURRENT só muda depois de guarda/CAS; consumo autorizado fixa versão. Não trocar desenho-alvo por legado para usar logos conhecidos.

## Código e testes

Pontos prováveis de integração: shell `ProjectDetail.astro`, rota `[project].astro`, controller/client, `simulation/*`, `scene/*`, `resources.ts`, conteúdo e testes. Confirmar caminhos atuais. Arquivos novos devem ter responsabilidade pequena; não migrar todo o renderer ou refatorar áreas alheias.

Testes de apresentação propostos devem observar `data-current-stage`, `data-primary-actor` e `data-moving-artifact`; esses atributos são contratos de teste a adicionar, não APIs existentes. Limite de foco não pode ser “cumprido” apenas ocultando elementos no seletor enquanto continuam brilhantes na tela; revisar visualmente.

Comandos do produto, a conferir no package.json:

```sh
npm ci
npm test
npm run build
npm run smoke
npm run test:explorer
git diff --check
```

Comando deste briefing:

```sh
python docs/design/systems-atlas-lifecycles-v3/tools/validate_package.py
```

A validação do briefing não prova que o site implementa as regras. Registrar a lista real de testes, resultados e capturas; não promover imagens de referência a evidência de entrega.

## Agentes e worktrees

Depois de definir a apresentação compartilhada, os três projetos podem ser implementados separadamente. Um integrador controla shell/controller/registro comum; agentes não editam simultaneamente essas raízes. Cada um recebe sua imagem, domínio, cenário, casos negativos e correções relevantes. Usar o fluxo superpowers disponível e as regras locais, sem criar cerimonial desproporcional.

## Definição de pronto

Todos os cinco ciclos completos; serviços distintos; uma etapa legível por vez; movimento que mostra causa/resultado; interação fora do tour; mobile/reduced-motion/noJS/WebGLfail; status de evidência preservado; ícones com origem registrada; testes do produto e revisão visual executados.

Entregar relatório com diferenças das imagens justificadas pelo registro de correções, limitações reais e marcos concluídos. Não declarar V3 completa com apenas uma fatia.
