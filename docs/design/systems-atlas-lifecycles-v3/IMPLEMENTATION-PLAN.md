# Guided Service Lifecycles V3 — plano de implementação

> **Para agentes:** usar o fluxo superpowers disponível (`subagent-driven-development` ou `executing-plans`) e as instruções locais. Não implementar a aplicação durante a simples leitura deste pacote; este plano é o handoff para execução no repositório.

**Objetivo:** manter os ciclos V2 e tornar as etapas visualmente legíveis com assets de serviços.  
**Arquitetura:** domínio determinístico por projeto, plano de apresentação pequeno e renderer que consome o mesmo estado; sem uma nova engine genérica.  
**Stack:** Astro/TypeScript e o Three.js/R3F já adotado, com SVG/HTML funcional quando apropriado.  
**Spec:** [TECH-SPEC-V3.md](TECH-SPEC-V3.md).

## Restrições globais

Preservar os cinco ciclos e os contratos em domains/. Não há APIs reais ou credenciais. Máximo de três atores focais e uma transferência móvel por tomada. Um player/canvas por página. Home/Atlas não carregam os novos detalhes. Não usar grades de storyboard como runtime, estados expected como entradas, logos gerados como oficiais ou PNGs de briefing como evidência de testes. Fonte de arte e estado de domínio são eixos diferentes. Nada de push/PR/deploy sem autorização específica.

## Contratos compartilhados propostos

Antes de usar um nome, conferir a implementação existente e adaptar sem duplicação. Os testes abaixo são exemplos executáveis **após a criação dos módulos propostos**, não uma declaração de que os arquivos já existem.

`getPresentationPlan(scenarioId, checkpointId): CheckpointPresentation` é lookup de dados para o tour. Tipos em `contracts/presentation-contract.ts`. Ações fora do roteiro usam `ProjectPresentationAdapter<S>.planEvent(event, previous, current)`; não chamar o lookup com ID inventado.

Para testes browser, adicionar ao markup real: `data-current-stage` somente no capítulo ativo, `data-primary-actor` nos atores em foco e `data-moving-artifact` apenas enquanto há transferência. Esses marcadores não substituem a revisão visual.

## Tarefa 0 — conferir código e proteger comportamento

**Ler/modificar apenas conforme necessário:** package.json, shell/controller/client e simulation/* atuais.  
**Consome:** domains/, scenarios/, schemas/. **Produz:** mapa de lacunas e baseline de testes registrada.

- [ ] Executar `git status --short`, `git branch --show-current` e `git rev-parse HEAD`; registrar mudanças locais sem revertê-las.
- [ ] Inspecionar os scripts atuais de teste e os estados existentes. Distinguir V2 já entregue de documento ainda não implementado.
- [ ] Executar a validação do pacote e os testes locais disponíveis; registrar resultados, não presumir sucesso.
- [ ] Planejar somente alterações necessárias. O slice visual inicial não pode ser declarado como ciclo completo.

## Tarefa 1 — catálogo de ícones e atores de serviço

**Criar, se necessário:** `public/assets/services/`, `src/features/explorer/story/service-assets.ts`, `tests/service-assets.test.mjs`.  
**Consome:** service-assets.json e actor-bindings.json. **Produz:** assets locais de origem conhecida e mapa visual por actorId.

- [ ] Começar por SES, SQS, outbox, relay e email worker. Adquirir os dois ícones AWS corretos e os pictogramas distintos usados nesse slice, com licença/data/hash.
- [ ] Escrever teste que rejeite arquivo ausente, origem vazia e hashes não correspondentes no mapa de assets de produção.

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { serviceAssets } from '../src/features/explorer/story/service-assets.ts';
test('production icons are local and traced to source', () => {
  for (const asset of Object.values(serviceAssets)) {
    assert.ok(asset.sourceUrl.startsWith('https://'));
    const bytes = readFileSync(new URL(`../public${asset.src}`, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), asset.sha256);
    assert.ok(asset.licenseRecord.length > 0);
  }
  assert.notEqual(serviceAssets['aws-ses'].src, serviceAssets['aws-sqs'].src);
});
```

- [ ] Rodar o teste vermelho antes do mapa/arquivos finais. `serviceAssets` deve expor `{src, sourceUrl, sha256, licenseRecord}`; valores pertencem aos arquivos reais adquiridos, não a exemplos copiados.
- [ ] Criar o mapa mínimo e inserir os SVGs verificados. Sanitizar conteúdo ativo sem alterar identidade de marca; registrar hashes distintos se os bytes forem alterados.
- [ ] Rodar o teste e abrir os ícones no tema dark em tamanho mobile; registrar exceções de uso de marca para revisão. Não instalar a coleção inteira.

## Tarefa 2 — capítulos e plano de apresentação

**Criar/adaptar:** `story/presentation.ts`, `tests/story-presentation.test.mjs`.  
**Consome:** stage-map/choreography/actor-bindings e os tipos propostos. **Produz:** lookup puro e adapters visuais, sem side effects.

- [ ] Testar a separação de serviços em uma operação de relay:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { getPresentationPlan } from '../src/features/explorer/story/presentation.ts';
test('relay presentation does not collapse into one generic delivery tile', () => {
  const p = getPresentationPlan('limnopulse-end-to-end','limnopulse-end-to-end-07');
  assert.equal(p.chapterId,'limnopulse-end-to-end:stage-3');
  const ids = new Set(p.microbeats.flatMap(b => b.primaryActors));
  for (const id of ['limno.outbox','limno.relay','limno.sqs-email','limno.sqs-telegram']) {
    assert.ok(ids.has(id), id);
  }
  assert.ok(p.microbeats.every(b => b.primaryActors.length <= 3));
});
```

- [ ] Rodar vermelho; implementar o lookup sobre dados tipados locais ou uma tradução pequena do JSON. Rejeitar scenario/checkpoint desconhecido com erro de programação claro, não state fictício.
- [ ] Acrescentar teste de cobertura/ordem para os 91 checkpoints. Reusar a estrutura de stage-map sem copiar expected para estado.
- [ ] Implementar adapters por evento para falha/rejeição/retorno fora do tour. Eles consomem `DomainEvent` e snapshots reais, retornando `VisualBeat[]`.
- [ ] Rodar testes e typecheck. Importar este módulo não deve trazer Three.js, SVGs em lote ou código de outras rotas desnecessariamente.

## Tarefa 3 — uma etapa ampliada e transição real

**Modificar:** shell/slot de projeto, view Limnopulse e renderer/launcher pertinente.  
**Criar/adaptar:** player e teste Playwright localizado.  
**Consome:** catálogo + plano + engine existente ou subconjunto testado do domínio. **Produz:** slice outbox→relay→SQS email→worker→SES em movimento.

- [ ] Criar teste browser com um estado de demonstração estável e verificar as invariantes de interface:

```js
await expect(page.locator('[data-current-stage]')).toHaveCount(1);
const count = await page.locator('[data-primary-actor]').count();
expect(count).toBeGreaterThan(0);
expect(count).toBeLessThanOrEqual(3);
expect(await page.locator('[data-moving-artifact]').count()).toBeLessThanOrEqual(1);
await expect(page.getByRole('button', { name: /pause/i })).toBeVisible();
```

- [ ] Implementar heading de capítulo/subpasso, placa de serviço, artifact focal e outcome. Ordem: orientar→foco→ação→resultado; não grid 3×2.
- [ ] Ligar pause/previous/next/replay ao mesmo relógio de apresentação. A próxima ação guiada espera o término explicativo; o tween não decide sucesso de domínio.
- [ ] Testar pausa durante ação, reset e WebGL loss. Assentar em estado válido, cancelar cues antigos, não duplicar transações.
- [ ] Gravar trecho local em movimento e conferir SES/SQS corretos, outbox persistente e relay separado. Corrigir a linguagem visual antes de replicá-la.

## Tarefa 4 — Infrastructure em três cenários

**Modificar:** simulation/infra se houver lacunas, projeção/renderer/controles e testes já existentes.  
**Consome:** INFRASTRUCTURE.md e os três cenários. **Produz:** recovery externo, quorum e scaling com a nova gramática.

- [ ] Testar o prefixo que termina em zero workers com `nodeId=null`, `desired=running` e workload pending; testar retorno com desired stopped e nenhum autostart.
- [ ] Testar perfil três-votantes: um votante não inicia; quorum recuperado ainda não substitui storage/fence. Executar os casos negativos INF-N*.
- [ ] Manter 02→01→03→nenhum→02 e geração de instância. Camada de tráfego não passa pelo HA controller.
- [ ] Testar scaling físico/virtual e drain antes de release. Usar o cenário separado, não clonar singleton.
- [ ] Capturar falha, pending, boot, start e healthy com labels estáveis; verificar que a marca Ceph não cria premissa indevida. Rodar testes locais e revisar cena em 390px.

## Tarefa 5 — Limnopulse completo

**Modificar:** domínio/renderer Limnopulse e seus testes.  
**Consome:** LIMNOPULSE.md, 24 checkpoints, casos LP-N* e correções LP-01–09. **Produz:** ciclo até usuário e recuperação, com ramos independentes.

- [ ] Testar janela insuficiente, binding sem preferência, duplicata de fila e 429 antes de retryDueTick. Nenhum desses casos recebe success para satisfazer a animação.
- [ ] Expor MQTT→Telegraf→InfluxDB; scheduler→evaluator; commit incidente/outbox; relay→Delivery→fila por canal. O fixture de relay continua atômico quando seu contrato for atômico.
- [ ] Implementar os caminhos independentes de worker/provedor, incluindo espera e unknown. A apresentação pode alternar ramos sem alterar resultados.
- [ ] Testar sucesso do provedor ≠ ACK; ACK ≠ recovery; sem nova janela não recuperar. O telefone é UI demonstrativa com acesso/ação autorizados.
- [ ] Reusar o caminho durável de notificação na recuperação, sem ligação direta evaluator→provedor. Capturar abertura, rate limit, mensagem, ACK e recovery; executar testes antes da revisão.

## Tarefa 6 — CnesData completo

**Modificar:** domínio/renderer CnesData, copy/status pertinentes e testes.  
**Consome:** CNESDATA.md, sample-data.json, 19 checkpoints, CND-N* e correções CND-01–08. **Produz:** extração→transformação→publicação→usuário.

- [ ] Testar replay preservando raw e conflito sem overwrite. Nacional indisponível não troca competência; resync não agenda FULL por conta própria.
- [ ] Separar Edge e adapter nacional. Usar S3/DynamoDB só no perfil AWS e filesystem/SQLite no local. Raw e manifest são irmãos.
- [ ] Executar a pequena transformação real sobre os objetos sintéticos do sample-data; comparar campos antes/depois e divergência entre fontes. Não importar um engine analítico completo.
- [ ] Testar falha antes de publish preservando CURRENT; worker obsoleto não publica; conflito CAS não mistura versões. Criar candidateVersion não deve tornar a nova versão visível antes de PUBLISH_CURRENT.
- [ ] Mostrar v0 e v1 com a mudança somente do pointer; ler uma versão autorizada. Capturar transformação e publicação. Remover da copy/logo qualquer afiliação gerada nos PNGs.

## Tarefa 7 — integração, mobile, fallback e evidências

**Modificar:** CSS/HTML do player, launchers, resources e testes localizados.  
**Consome:** todos os cinco ciclos, layouts/tokens e critérios da Spec. **Produz:** entrega integrada, não só keyframes.

- [ ] Testar 1440×1000, 390×844 e 320×740: sem overflow; etapa atual e controls visíveis; nomes não encolhidos abaixo dos limites; no máximo três atores focais.
- [ ] Testar teclado/reduced-motion/noJS/WebGLfail. Condições de loading/visibility não desrespeitam pausa manual e não iniciam loops invisíveis.
- [ ] Medir o custo total/incremental das rotas; confirmar zero novos detalhes na Home/Atlas e zero icon hotlinks. Não reportar números sem medir.
- [ ] Executar `npm test`, `npm run build`, `npm run smoke`, `npm run test:explorer` conforme scripts confirmados, e `git diff --check`.
- [ ] Revisar gravações reais. Documentar diferenças corretivas dos PNGs, assets/fonte/licença, testes e limitações. Não publicar ou abrir/mesclar PR sem autorização específica.

## Paralelismo e checkpoints de revisão

Tarefas 0–3 estabilizam a linguagem comum. Infra, Limnopulse e CnesData podem seguir em worktrees separadas; um integrador mantém shell/controller/registro compartilhado. Cada fatia precisa de revisão comportamental e visual, com commits locais conforme o fluxo autorizado. Não declarar a V3 completa até a tarefa 7 e os cinco ciclos passarem.
