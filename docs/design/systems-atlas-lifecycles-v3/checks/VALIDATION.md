# Validação do pacote V3

**Data:** 12/09/2026. **Escopo:** documentação, dados de apresentação, tipos propostos e galeria de briefing. Este relatório não valida a implementação do portfólio nem os backends.

## Verificações executadas

| Verificação | Resultado observado |
|---|---|
| Integridade da base comportamental | 13 arquivos de domínio/cenário/schema/contrato preservados byte a byte, conforme `v2-behavior-lock.json` |
| Cenários e schema JSON | 5 cenários, 91 checkpoints e estrutura de 27 casos alternativos/negativos válidos |
| Mapa de apresentação | 30 capítulos, 91 referências de checkpoints e 124 microbeats; cobertura e ordem preservadas |
| Foco e referências semânticas | 50 atores registrados; até 3 atores primários por microbeat; IDs e layouts referenciados válidos |
| Catálogo de assets | 42 seleções com fonte e política de aquisição; nenhum SVG de fornecedor adquirido |
| Imagens | 3 pranchas aprovadas com hash/dimensões conferidos e 18 recortes PNG válidos |
| Tipos TypeScript propostos | `tsc --project checks/tsconfig.contracts.json` terminou com código 0, sem erros; TypeScript 5.8.3 |
| Galeria em Chromium 144.0.7559.96 | Seleção dos três projetos, Enter pelo teclado e ausência de overflow horizontal a 1440×1000, 390×844 e 320×740 |
| Galeria sem JavaScript | As três referências e imagens permanecem visíveis |
| Galeria com movimento reduzido | Seleção funcional e nenhuma animação ativa |
| Galeria: console/rede | Nenhum erro de JavaScript nem requisição externa durante o teste |
| Revisão das capturas | Conferidas as capturas da galeria desktop e 390px; as pranchas completas são overview, com recortes separados para leitura de detalhes |

Resultados estruturados: `package-validation.json` e `browser-validation.json`. Capturas `gallery-*.png` representam **esta galeria**, não o produto implementado.

## Limite da validação browser

O navegador deste ambiente bloqueia navegação `file://`. A galeria foi testada carregando seu HTML completo diretamente no documento do Chromium, mantendo os mesmos estilos, script e imagens embutidas. A abertura por URL de arquivo local não foi validada aqui. Os links relativos foram conferidos como caminhos existentes no filesystem; precisam da pasta completa. Essa limitação não foi ocultada no relatório JSON.

A galeria é uma apresentação estática de referências com seleção de projeto; não demonstra os movimentos, fallback WebGL ou reducers que o Codex deverá implementar.

## Comandos reproduzíveis

A partir da raiz deste pacote:

```sh
python tools/validate_package.py
tsc --project checks/tsconfig.contracts.json
python tools/check_gallery.py --chromium /caminho/para/chromium
```

O validador usa Pillow e utiliza `jsonschema` quando disponível; o relatório identifica se houve validação integral por schema. O teste browser requer Playwright para Python e um Chromium instalado. O caminho de Chromium usado neste ambiente foi `/usr/bin/chromium`.

## Não executado / não comprovado

Nenhum caso negativo foi executado contra uma aplicação nova; os 27 casos foram verificados como referências estruturadas. Não houve `npm test`, build, smoke ou Playwright no repositório do portfólio nesta revisão. Não há medição nova de FPS, bundle, consumo de GPU, experiência de recrutadores ou conformidade global WCAG.

Não houve nova inspeção de HEAD dos repositórios de backend. As baselines e contratos herdados estão identificados em `SOURCES.md`. As fontes públicas de assets e CLI foram consultadas, mas o validador local não testa disponibilidade das URLs nem concede licença de marca.

Os ícones SVG oficiais permanecem **não adquiridos**. A primeira fatia do plano exige obtê-los, registrar fonte/hash/termos e verificar seu uso antes de integração. Os ícones desenhados nos PNGs não devem ser tratados como SVGs oficiais.

Nenhum arquivo foi enviado para o GitHub; não foram criados commits, PRs ou deploys remotos.
