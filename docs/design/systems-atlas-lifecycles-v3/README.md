# Systems Atlas — implementação V3

**Comece por [TECH-SPEC-V3.md](TECH-SPEC-V3.md).** Esta é a revisão ativa: comportamento completo da V2 e apresentação por etapas com ícones de serviços reconhecíveis.

## Conteúdo do pacote

| Material | Função |
|---|---|
| `TECH-SPEC-V3.md` | Decisões e critérios normativos |
| `domains/`, `scenarios/`, `contracts/simulation-contract.ts` | Comportamento V2 preservado; 5 cenários, 91 checkpoints, 27 casos alternativos |
| `references/approved/` | Os 3 PNGs aprovados, copiados integralmente |
| `references/crops/` | 18 recortes legíveis dos mesmos storyboards |
| `references/index.html` | Galeria offline autocontida dos PNGs e correções; não é o player de produção |
| `design/REFERENCE-CORRECTIONS.md` | O que corrigir nas imagens sem perder a direção visual |
| `design/service-assets.json` | 42 seleções de ícones, fonte e política de aquisição; não inclui SVGs dos fornecedores |
| `design/actor-bindings.json` | 50 atores de apresentação, aliases e overrides por perfil |
| `design/stage-map.json` | 6 capítulos por cenário, cobrindo os checkpoints da V2 |
| `design/choreography.json` | 124 subbeats para explicar 91 checkpoints sem mudar seu domínio |
| `design/layouts.json`, `tokens.json`, `visual-spec.md` | Composição, foco, tipografia e movimento |
| `CODEX-HANDOFF.md`, `CODEX-PROMPT.txt`, `IMPLEMENTATION-PLAN.md` | Leitura, entrada e fatias de implementação |
| `checks/` e `tools/validate_package.py` | Validação deste pacote; não testes dos futuros reducers |
| `archive/` | Histórico explicitamente não normativo |

Este pacote é autocontido; não precisa extrair a V2 separadamente. Não inclui o viewer genérico nem os antigos SVGs como aparência-alvo. Os Mermaid e dados sintéticos preservados são referências semânticas.

## Instalação do briefing no repositório

Na raiz de `vinicius-santana-career-site`, coloque a pasta completa em:

```text
docs/design/systems-atlas-lifecycles-v3/
```

Não copie a pasta para `public/`: ela inclui briefing, histórico e imagens não destinadas ao runtime. Apenas os assets de produção adquiridos/validados vão para os diretórios públicos apropriados.

## Iniciar o Codex CLI

Conferir `codex --help` na versão instalada. A opção documentada `--image` aceita imagens e pode ser repetida. As imagens abaixo são PNGs reais incluídos no pacote, não links remotos nem SVGs supostamente renderizados.

```sh
SPEC=docs/design/systems-atlas-lifecycles-v3
codex \
  --image "$SPEC/references/approved/limnopulse-storyboard.png" \
  --image "$SPEC/references/approved/infrastructure-storyboard.png" \
  --image "$SPEC/references/approved/cnesdata-storyboard.png" \
  "$(cat "$SPEC/CODEX-PROMPT.txt")"
```

Para subtarefas, prefira anexar somente o storyboard/recorte do projeto atual. Não desative aprovações/sandbox. O handoff complementa as instruções do repositório; não substitui AGENTS.md.

Fonte de CLI: [referência oficial](https://developers.openai.com/codex/cli/reference/), consultada em 12/09/2026.

## Verificar o pacote

```sh
python docs/design/systems-atlas-lifecycles-v3/tools/validate_package.py
```

O comando confere hashes de comportamento herdado, referências locais, cobertura de etapas, atores, limites de foco e integridade dos PNGs. Não executa o site nem verifica se os ícones de fornecedor já foram adquiridos. `acquisitionStatus=not-vendored` é intencional neste briefing e não passa como icon pack concluído no produto.

Relatório do que foi efetivamente verificado: [checks/VALIDATION.md](checks/VALIDATION.md). A checagem da galeria está em `tools/check_gallery.py`; ela não executa as simulações do produto.
