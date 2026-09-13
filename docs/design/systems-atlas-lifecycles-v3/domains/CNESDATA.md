# CnesData — captura, transformação e publicação

**Natureza:** ciclo-alvo aprovado; não alegar integração ponta a ponta já entregue. Fontes R3a/R3b em `SOURCES.md`. R3b prevalece nos detalhes raw. README/Gold legado não é a autoridade desta cena.

## CND-LIFE-01 · Entidades e resultado

`Job` pede trabalho ao Edge, `RawManifest` identifica uma captura, `Run` coordena processamento central, `RunUnit` é unidade de trabalho, `DatasetVersion` é resultado imutável e `DatasetPointer` publica a versão ativa. O demo deve mostrar essas identidades sem exigir conhecer os termos antecipadamente.

Resultado: uma consulta autorizada resolve CURRENT uma vez e recebe JSON materializado da versão correspondente. O usuário não lê raw, S3 ou Athena diretamente na interação normal. Local usa SQLite/filesystem; AWS usa DynamoDB/S3, com executor diferente e sem mudar as invariantes.

## Fluxo com duas origens

**Municipal:** solicitação de fonte/competência → job com claim/fence/mTLS → Edge lê fonte sintética Firebird/DBF → encoding/tipos do source contract → Parquet/hash → upload → manifest.

**Nacional:** adapter central lê PF mensal DBC DATASUS → verifica estabilidade/bytes/competência/schema → filtra município → Parquet/hash → mesmo contrato raw. No demo, todos os arquivos são fixtures locais; não há conexão FTP. Fonte ausente não autoriza substituir competência.

As duas trajetórias convergem no armazenamento raw e no catálogo de manifests. Elas não precisam concluir simultaneamente; o Run fica WAITING_INPUTS até reunir os inputs exigidos. O target pode aceitar degradação com política explícita, mas o fixture principal exige ambos; nunca degradar silenciosamente.

## Fronteiras e estados

| Fronteira | Estado observável | Não confundir com |
|---|---|---|
| Claim do Job | LEASED, owner e fence atuais | Só descobrir um ID via índice |
| Parquet no Edge | Captura pronta localmente | Dados recebidos centralmente |
| Upload aceito | Bytes imutáveis disponíveis | Manifest aceito ou dataset publicado |
| Manifest aceito | Proveniência/cadeia canônica registradas | CURRENT atualizado |
| NormalizeSource | normalized por fonte e run | Reconciliação no agente |
| ReconcileCompetencia | Resultado entre fontes com linhagem | Apenas converter formato |
| MaterializeServing | JSON orientado à tela por run | Consultar raw no browser |
| Preparar publicação | Artefatos válidos/readable + DatasetVersion | Versão já ativa |
| CAS de CURRENT | Nova versão ativa | Sobrescrever versão antiga |
| Leitura autorizada | JSON daquela versão | Nova consulta analítica a cada tela |

Run usa `PLANNED → WAITING_INPUTS → PROCESSING → PUBLISHING → PUBLISHED` no caminho principal. Falha em qualquer etapa anterior à publicação mantém CURRENT anterior; artefatos intermediários não passam a ser consumíveis. `FAILED` e `CANCELED` são terminais da tentativa; retry usa política explícita e identidade coerente.

## Contrato raw a preservar

Dados e sidecar irmãos em `raw/<tenant>/<source>/<competencia>/<snapshot_id>/data.parquet` e `manifest.json`. Parquet simples com compressão interna Zstd, sem `.parquet.gz`. Captura é FULL ou DELTA, com schema/version e hash.

Primeira escrita cria; repetição byte a byte idêntica é sucesso; mesma chave/bytes diferentes é conflito e preserva original. A UI pode mostrar retorno **simulado do contrato HTTP** quando o contrato R3b o especifica; não afirmar que o engine legado fazia chamadas HTTP.

Identidade do Edge vem do mTLS validado, não de um texto tenant no pacote. Mostrar “verified agent identity” como resultado do gateway falso. Claim e mutações verificam owner, lease, fence e agente não revogado. Tentativa com fence antigo é rejeitada mesmo se a animação de upload já começou.

DELTA rejeitado por política produz marcador de resync e resultado final do job, sem publicar pointer. Ordem de razões de R3b: AGENT_RESYNC_REQUIRED, BASE_UNKNOWN, SEQUENCE_GAP, HASH_CHAIN_MISMATCH, SCHEMA_INCOMPATIBLE, BASE_TOO_OLD, CHAIN_TOO_LONG. Não precisa sete botões: um fixture de gap exemplifica; testes parametrizados cobrem as razões aplicáveis.

**FULL posterior precisa de solicitação explícita.** O server não cria automaticamente o substituto na Phase 3. Head/fingerprints confirmados são preservados; somente pending fingerprints daquele source key são descartados. Um replay terminal autenticado e idêntico não duplica eventos.

## Transformação deve ser visível

Usar três linhas fictícias por fonte com IDs `est-demo-A`, `prof-demo-A` etc., sem CPF/CNS. O exemplo mostra:

- raw: código com representação de origem e carga horária sintética;
- normalized: tipo/chave padronizados, origem e competência preservadas;
- reconciliation: comparação local/nacional e divergência ilustrativa;
- serving: quantidade pequena de registros, estado de divergência e run_id.

Não apresentar a divergência ilustrativa como glosa de faturamento, fraude ou regra clínica. O frontend do portfólio não processa arquivos reais nem precisa importar Polars/WASM. O reducer aplica uma transformação pequena sobre objetos sintéticos que exemplifica o contrato, com linhagem verificável e resultado esperado.

## CND-PUB-01 · Publicação atômica

Prepare todos os artefatos necessários. Verifique hashes, schema e leitura. Crie versão imutável. Use compare-and-swap de CURRENT com expectedVersion; o worker precisa de fence válido. Só então o serving pode mostrar a nova versão.

Falha de CAS deixa a versão candidata não ativa e exige nova resolução, não overwrite forçado. Leitura captura pointer uma vez por request e usa o mesmo run para todas as peças da tela. Durante uma publicação concorrente, pode servir a versão antiga completa; nunca mistura estatísticas novas com dados antigos.

Rollback demonstrativo, quando solicitado, troca CURRENT condicionalmente para uma versão anterior conhecida e validada; não apaga raw nem sobrescreve datasets. O fixture principal não precisa executar rollback, mas testes de consistência devem preservar histórico.

## Invariantes

**CND-I1:** bytes de chave raw nunca mudam após aceite.  
**CND-I2:** replay mantém contagem/identidade e não inicia publicação duplicada.  
**CND-I3:** identidade/capacidade de autorização não vem de header arbitrário ou payload.  
**CND-I4:** não normalizar sem inputs/manifestos válidos para aquela fonte.  
**CND-I5:** não reconciliar no Edge.  
**CND-I6:** serving e reconciliation da versão usam o mesmo run.  
**CND-I7:** CURRENT só muda após completude, verificação e CAS/fence válidos.  
**CND-I8:** falha de processamento ou resync mantém CURRENT anterior.  
**CND-I9:** tenant B nunca recebe dados do tenant A, nem IDs de objetos privados.  
**CND-I10:** source_not_published mantém competência solicitada.

## Visual e perfis

Faixas: **Sources & Edge → Raw boundary → Central processing → Published product**. O control plane é faixa de coordenação abaixo, não uma etapa que “contém” os arquivos. Perfil local troca labels por SQLite/filesystem; AWS por DynamoDB/S3. Não adicionar DynamoDB como armazenamento de Parquet nem SQLite como fila de pixels.

Atores `cnes.local`, `cnes.national`, `cnes.edge`, `cnes.raw`, `cnes.normalize`, `cnes.reconcile`, `cnes.serving`, `cnes.publish`, `cnes.user`, `cnes.control`. Fixture `cnesdata-end-to-end.json`; os cenários raw antigos permanecem como testes/variações e não como experiência principal exclusiva.
