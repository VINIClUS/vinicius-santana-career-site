# V2 → V3: o que foi atualizado

A V2 foi aceita quanto às simulações; o usuário pediu uma apresentação mais próxima dos vídeos originais, com ícones de serviços, transições claras e identificação da etapa atual. Em seguida aprovou os novos storyboards e solicitou sua incorporação à Spec para o Codex CLI.

## Preservado

Cinco cenários; 91 checkpoints; 27 casos alternativos/negativos; contratos de domínio; dados sintéticos; guardas de quorum/storage/fencing; diferença entre instância, workload e réplica; entrega versus ACK; raw versus dataset publicado. Arquivos de comportamento são conservados byte a byte e têm hashes em `checks/v2-behavior-lock.json`.

## Substituído

O diagrama com grupos genéricos não é mais o alvo. MQTT e Telegraf, outbox e relay, filas e workers por canal, SES e Telegram, versão e CURRENT passam a ter identidades visuais próprias. O guia completo é apresentado por seis capítulos por cenário, com uma única etapa ampliada e subbeats legíveis.

Os antigos 91 checkpoints não desaparecem: tornam-se detalhes de comportamento, não 91 botões de igual hierarquia. Um conjunto de 124 subbeats explica as transições sem criar outra engine.

## Acrescentado

Três storyboards PNG aprovados; 18 recortes; mapa de 50 atores; catálogo de 42 seleções de ícones; mapeamento de etapas; coreografia; layout responsivo por etapa; correções normativas das imagens; contrato de apresentação; plano/handoff/prompt atualizados; galeria offline e nova verificação do pacote.

## Correções nas imagens

Os logos desenhados pelo gerador não são assets oficiais. A imagem de Limnopulse omite fronteiras importantes e mistura ramos de entrega; Infrastructure contém uma sequência visual ambígua de proprietário e mistura failover/scaling; CnesData traz marca/slogan e afiliação indevidos. A direção visual foi mantida e essas interpretações foram explicitamente proibidas em `design/REFERENCE-CORRECTIONS.md`.

## Limites da entrega

Nenhum arquivo remoto do repositório foi alterado nesta revisão. Os PNGs estão incluídos; os SVGs oficiais dos fornecedores não foram baixados e não são apresentados como incluídos. O catálogo aponta suas fontes e define a aquisição/proveniência na implementação. Não houve nova auditoria de HEAD, runtime, desempenho ou backends.
