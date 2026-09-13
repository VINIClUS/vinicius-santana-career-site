# Systems Atlas — Lifecycle Simulations · V2

**12/09/2026 · Design proposto, para implementação pelo Codex CLI.**

Este pacote substitui a proposta de histórias curtas V1. Agora o portfólio deve simular ciclos completos, com falhas, bloqueios, recuperação e resultados visíveis — não apenas reproduzir animações de resultados previamente escolhidos.

## Comece aqui

1. Leia [TECH-SPEC-V2.md](TECH-SPEC-V2.md) e [CODEX-HANDOFF.md](CODEX-HANDOFF.md).
2. Abra [reference/index.html](reference/index.html) no navegador. Funciona offline. É um **visualizador de checkpoints de referência**, não o simulador final.
3. Para implementar um projeto, leia seu contrato em `domains/`, o JSON em `scenarios/` e a prancha SVG/PNG correspondente em `visuals/`.

## O que é fonte e o que é render

| Material | Autoridade | Uso no Codex |
|---|---|---|
| Spec e contratos de domínio | Requisitos e regras da demonstração | Ler antes de editar código |
| `scenarios/*.json` | Comandos + estados observáveis esperados | Transformar em testes do reducer; nunca usar como resultados hardcoded do simulador |
| `design/scene-map.json` | Identidade, posição e forma dos atores | Ligar componentes e anchors sem inferir por pixel |
| `design/tokens.json` | Paleta, escala e convenções visuais | Reusar na implementação |
| `visuals/*.svg` | Composição vetorial editável; IDs semânticos | Ler XML e comparar com as capturas |
| `visuals/*.png` | Render das fontes | Contexto visual e comparação lado a lado |
| `reference/index.html` | Referência navegável derivada dos JSONs | Inspecionar sequência; não copiar como engine |
| `design/*.mmd` | Diagramas de estados e sequência editáveis | Conferir causalidade e fronteiras |
| `SOURCES.md` | Baselines, fontes e limitações da auditoria | Resolver afirmações e divergências de status |

## Instalação no repositório

Copie **esta pasta inteira** para `docs/design/systems-atlas-lifecycles-v2/` no repositório do portfólio. Não sobrescreva o `AGENTS.md` existente. Use o prompt de `CODEX-PROMPT.txt`. Não copie os vídeos do Instagram para assets públicos.

**Fonte de verdade:** contrato de domínio → comandos/estados esperados → cena. Um PNG nunca autoriza inventar comportamento. IDs ligam tudo: por exemplo `INF-REC-01` → `infra-exhaustion-recovery` → `infra-exhaustion-recovery-11` → `infra.workload`.

## Regenerar referências

Python 3.10+ é suficiente para gerar SVG, HTML e validar estrutura/semântica. CairoSVG é opcional para PNG; jsonschema é opcional para validação integral do schema.

```sh
python tools/build_reference.py
python tools/validate_reference.py
# PNGs (opcional):
python tools/build_reference.py --png
```

Os PNGs prontos já estão incluídos. Nada exige serviços externos, chaves ou rede. Leia `checks/VALIDATION.md` para os testes efetivamente executados neste pacote. Os testes do portfólio e dos backends não foram executados por esta revisão.
