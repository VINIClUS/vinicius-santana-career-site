import { readFile, writeFile, mkdir } from 'node:fs/promises';
const briefing = new URL('../../docs/design/systems-atlas-lifecycles-v3/', import.meta.url);
const output = new URL('../../src/features/explorer/lifecycle/data/', import.meta.url);
const read = async path => JSON.parse(await readFile(new URL(path, briefing), 'utf8'));
await mkdir(output, { recursive: true });
const stages = (await read('design/stage-map.json')).scenarios;
const choreography = (await read('design/choreography.json')).checkpoints;
const actors = (await read('design/actor-bindings.json')).actors;
const negatives = (await read('scenarios/negative-cases.json')).cases;
for (const stage of stages) {
  const original = await read(`scenarios/${stage.scenarioId}.json`);
  const checkpoints = original.checkpoints.map(({ expected, ...checkpoint }) => {
    const { stateRef, ...plan } = choreography.find(plan => plan.checkpointId === checkpoint.id);
    if (checkpoint.command.type === 'RELEASE_WORKERS') plan.microbeats = checkpoint.command.ids.map((id,index)=>({
      ...plan.microbeats[0],id:`${checkpoint.id}:release-${index}`,label:`Release ${id} back to the physical pool`,primaryActors:[`scale.${id}`,'scale.capacity'],layout:'pair',
    }));
    // Explicit normative correction; the original briefing is never modified.
    if (checkpoint.id === 'infra-quorum-recovery-07') checkpoint.command = {
      type: 'SEQUENCE', commands: [{ type: 'FAIL_NODE', nodeId: 'node-03' }, { type: 'SET_STORAGE', ready: false }],
    };
    // Query requests and responses are two explanatory shots of the same commit.
    plan.microbeats = plan.microbeats.flatMap(beat => {
      if (beat.routeKind !== 'query') return [beat];
      const routes = beat.primaryActors.includes('limno.user') ? [['limno.user','limno.api'],['limno.api','limno.incident']]
        : beat.primaryActors.includes('cnes.user') ? [['cnes.user','cnes.api'],['cnes.api','cnes.pointer']]
        : beat.primaryActors[0] === 'limno.evaluator' ? [beat.primaryActors]
        : [[...beat.primaryActors].reverse()];
      return [
        ...routes.map((route,index)=>({ ...beat,id:`${beat.id}:${index}:request`,label:`Request · ${beat.label}`,primaryActors:route,layout:'pair' })),
        ...routes.map((route,index)=>({ ...beat,id:`${beat.id}:${index}:response`,label:`Response · ${beat.label}`,primaryActors:[...route].reverse(),routeKind:'receipt',layout:'pair' })).reverse(),
      ];
    });
    return { ...checkpoint, plan };
  });
  const used = new Set(checkpoints.flatMap(cp => cp.plan.microbeats.flatMap(beat => beat.primaryActors)));
  const result = { id: original.id, project: original.project, title: original.title, subtitle: original.subtitle,
    assumptions: original.assumptions, evidenceStatus: original.evidenceStatus, profile: original.profile,
    chapters: stage.chapters, checkpoints, actors: actors.filter(actor => used.has(actor.id)),
    variations: negatives.filter(n => n.scenarioId === original.id).map(n => ({ id:n.id, label:n.reason, commands:n.commands })) };
  await writeFile(new URL(`${stage.scenarioId}.json`, output), `${JSON.stringify(result)}\n`);
}
console.log('Generated five command-only tours; no expected projections or stateRef shipped.');
