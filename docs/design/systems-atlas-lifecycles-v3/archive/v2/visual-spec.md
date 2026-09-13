# Gramática visual V2 — referência para implementação

## Objetivo de aparência

Conservar a identidade dark/ortográfica do portfólio. As pranchas são mapas de composição e causalidade; **não são uma instrução para substituir a maquete por um fluxograma genérico**. A implementação deve usar volumes, luz e movimento adequados à stack existente, mantendo labels e controles HTML.

O palco é o elemento dominante. Legenda com uma ação e uma consequência, no máximo três atores em foco. Trace/contadores detalhados ficam em disclosure. Um background low-contrast contextualiza; não preencher todos os espaços com cabos, partículas e dashboards.

## Fontes

`scene-map.json`: anchors nomeados, arranjos desktop/mobile, tipos de relação. Coordenadas são de composição, não posições físicas do sistema real. `tokens.json`: paleta, espaçamento e tipos. Cada `<g data-entity-id>` de SVG corresponde a um actor ID. `checkpoints[].focus` declara o foco daquele capítulo.

`componentRef=null` significa metáfora ou mapeamento a conferir; não vincular automaticamente a um componente real nem inventar seu status. Criar os mappings no portfólio após verificar os IDs existentes em `case-studies.yaml`.

## Gestos de movimento

| Evento | Movimento proposto | O que deve permanecer |
|---|---|---|
| Transferência de dados | Objeto percorre rota clara, 500–900ms por segmento | ID/linhagem legível |
| Persistência | Objeto assenta no slot, 250–400ms | Conteúdo/ID continuam após o movimento |
| Transformação | Registro se abre em campos e se recompõe, 600–1100ms | Fonte e run acompanham saída |
| Restart | Instância antiga interrompe; nova geração emerge no destino | Definição lógica/dados persistidos |
| Boot | Silhueta aparece, depois indicador ready; 800–1400ms editoriais | Boot não vira serviço saudável |
| Bloqueio | Movimento termina no dock de espera; reason estático | Objeto pendente não desaparece |
| Scale-out | Reserva → blueprint → worker → réplica | Counts desired/ready/used independentes |
| Scale-in | Saída de roteamento → drain → stop → release | Requisições em voo terminam antes |
| Conflito raw | Tentativa rejeitada volta ao dock, sem substituir original | O objeto original e seu hash |
| Publicação | Pointer muda de versão apenas no commit | Versões e artefatos antigos |
| Ação humana | Tela muda após clique explícito simulado | ACK separado da recuperação |

Durações são sugestões visuais, não tempo de operação. Evitar spring/bounce exagerado em dados e falhas; câmera fixa ou cortes suaves entre enquadramentos. Pausa cancela interpolação com checkpoint coerente. Reduced-motion usa o quadro final da transição, sem deslocamento.

## Desktop

Começar com cena ampla suficiente para enxergar a fronteira de origem e o desfecho. Aproximar grupos ativos sem ocultar permanentemente a continuidade; uma faixa pequena de capítulos informa onde estamos. Não exigir pan/orbit. Telemetria e trace não devem parecer live.

## Mobile

Reordenar os anchors verticalmente conforme scene-map. Rótulos mínimos de 12–14px na implementação; targets 44px. O usuário rola a página normalmente. Quando o ciclo inteiro ficar alto, renderizar o capítulo ativo com mini-overview não interativo; nunca encolher todos os labels para caber em uma viewport.

Os SVGs mobile deste pacote mostram a distribuição completa para revisão. Eles não obrigam uma cena de 780px no produto nem dispensam reflow/contexto do capítulo.

## Regras específicas

**Infrastructure:** desenhar controller/storage externos na cena que sobreviverá a zero workers. No perfil de quorum, o indicador representa a decisão distribuída entre votantes, não um controller mágico fora do cluster. Workload pendente é uma definição persistida, não um processo fantasma executando sem host.

**Limnopulse:** ao chegar ao usuário, ampliar o telefone/painel e mostrar conteúdo legível. Manter badges pequenos do incidente e dos canais; aceite do provedor não gera um check de “lido”. A tela muda em três passos: mensagem, detalhe/reconhecimento, recuperação. Veja a prancha de detalhe do usuário.

**CnesData:** abrir uma pequena tabela de três registros durante transformação; mostrar antes/depois e proveniência. Durante publicação, manter v0 ativa e v1 candidata lado a lado até o CAS. Veja a prancha de transformação de dados.

## Aprovação

Reprovar: animação que só troca cor de caixas; zero nodes sem estado pending; uma VM aparece e cria capacidade física; Telegram accepted com “user read” automático; CURRENT muda antes dos artefatos; CnesData volta a usar Gold/MinIO no target; artefato planejado ganha label implemented; fontes de referência usadas como screenshot de testes.

Aprovar: o observador consegue acompanhar a cadeia completa e responder por que ela espera, falha, retoma ou conclui, sem abrir o JSON técnico.
