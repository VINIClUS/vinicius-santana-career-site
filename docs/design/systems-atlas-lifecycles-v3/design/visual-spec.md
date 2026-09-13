# Contrato visual V3 — serviços reconhecíveis, uma operação por vez

Este arquivo é normativo junto com `../TECH-SPEC-V3.md`. A V2 permanece como comportamento, não como aparência. As imagens aprovadas estão em `../references/approved/`; consultar `REFERENCE-CORRECTIONS.md` antes de interpretá-las.

## Hierarquia de uma tela

1. Nome do projeto e qualificação sintética discretos.
2. Etapa atual: `03 / 06`, título verbal e frase da ação presente.
3. Palco amplo: símbolos de serviço, um artefato focal e um caminho ativo.
4. Resultado curto: o que mudou e o que continua igual.
5. Faixa de capítulos e controles; detalhes técnicos recolhidos.

Não copiar a grade de storyboard para o runtime. Não mostrar estado JSON ou uma lista de 20 propriedades ao lado da animação inicial. O visitante acompanha operações; o engenheiro abre detalhes quando desejar.

## Objetos e material

Manter a identidade escura das referências aprovadas, placas com profundidade discreta, bordas luminosas contidas e composição arejada. O aspecto visual pode ser 3D real ou 2.5D; não precisa de shaders complexos. Nunca resolver todos os atores com o mesmo cubo e apenas mudar o texto.

Serviços têm ícones legíveis e seus nomes abaixo. Artefatos têm forma e tag de tipo: janela de amostras, registro de incidente, cartão de outbox, trabalho de fila, envelope, arquivo Parquet, manifest JSON, versão e pointer. Objetos derivados mantêm a relação de origem sem fingir identidade única.

Official service art não muda de cor para representar runtime. A placa/halo externo e um badge textual fazem isso. Uma marca verde não prova success; uma marca vermelha não prova failure.

Tokens em `tokens.json` são valores iniciais a verificar no tema final. Não são cores institucionais dos fornecedores nem um benchmark. `layouts.json` usa posições normalizadas somente para os atores do subbeat ativo.

## Foco

Máximo de três atores focais em cada tomada e uma transferência em movimento. Uma transação pode destacar incidente/outbox/store juntos, com uma fronteira explícita. Filas de email e Telegram podem ficar no contexto, mas o percurso de cada canal recebe sua vez.

Nós físicos de infraestrutura permanecem em slots estáveis. Atores persistentes em um mesmo capítulo não trocam de lugar em cada frame. Ao mudar capítulo, orientar por título e breve transição de enquadramento; nada de voos de câmera ou rolagem tomada pelo canvas.

Contexto: geometria com contraste reduzido; texto essencial sempre legível. Serviços fora da etapa podem ir para uma trilha lateral/rodapé resumida ou ficar ocultos até entrar em cena. Não tornar ilegível um motivo de bloqueio ao reduzi-lo junto com o fundo.

## Relógio de apresentação

Cada operação: orientar, destacar, agir, estabilizar. Esperar a leitura do resultado antes de avançar. `choreography.json` identifica microbeats; o player pode ajustar duração à complexidade/viewport sem mudar resultados ou relógio de domínio.

Transferência move o artefato, não o logotipo do serviço. Persistência deixa um registro estável. Query vai do requisitante ao store, resposta retorna depois. Restart faz a instância antiga parar e uma nova geração iniciar; não anima memória sobrevivendo a host morto. Publicação move CURRENT, não todas as versões.

Fila, espera e bloqueio têm lugares de estacionamento visíveis. Spinner infinito sem motivo não é explicação. Use `Waiting for worker`, `Quorum required` ou outro motivo derivado do estado. Nas pausas, nenhum pulso decorativo continua rodando.

## Antes / ação / depois

Todo checkpoint deve permitir comparar o que existia antes e depois. O resultado exibido usa os seletores do engine, não os números pintados nos PNGs. Não expor nomes como `PROVIDER_RECOVERY_ACCEPTED` no player principal; mostrar “Record recovery delivery acceptance” e, nos detalhes, a ação técnica.

Um macro pode ter várias tomadas explicativas. Essas tomadas não são transações independentes. Quando só há um snapshot atômico, o painel informa que apresenta a transição; o resultado fica consolidado ao assentar o quadro. Ações manuais fora do roteiro precisam usar a mesma gramática baseada em eventos, não falhar por ausência de checkpoint.

## Mobile

Um capítulo por vez. Atores 48–64px e nomes >=14 CSS px. Dois atores podem ficar lado a lado; três podem usar composição triangular ou dois pares consecutivos. Não mostrar todos os serviços do lifecycle em 320px.

Altura inicial de cena: 260–360px, ajustável por conteúdo. Reflow ocorre antes de reduzir nomes. Faixa de capítulos tem número atual e vizinhos legíveis, teclado e touch; não exige swipe escondido para descobrir o capítulo atual. Botões de 44px. A página mantém rolagem vertical normal.

## Sem movimento / sem gráficos

Reduced-motion mostra os mesmos antes/depois por quadros e captions. Sem WebGL, SVG/HTML mostra ícones de serviço e seus estados. Sem JavaScript, transcript e figuras têm conteúdo útil. Não tratar accessibility como uma segunda narrativa incompleta.

## Prova visual de aceitação

Capturar início, ação, bloqueio e resultado da implementação em desktop e mobile. Verificar em movimento pelo menos:

- Limnopulse: Outbox → Relay → SQS email → Email worker → SES; depois Telegram espera/retry e reconhecimento/recuperação.
- Infra: node-02 falha → nova geração no node-01; zero workers → definição pending; retorno → boot → ready → autostart.
- CnesData: dado antes/depois → raw/manifest irmãos → v1 candidata enquanto v0 serve → CAS → usuário com a mesma versão.

Reprovar só trocar cor de caixas, copiar a grade 3×2, mostrar todos os cabos ativos, esconder o usuário final ou usar log como única explicação.
