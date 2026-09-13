import type { DomainAdapter } from './types.ts';
export async function loadEngine(scenarioId: string): Promise<DomainAdapter> {
  if (scenarioId === 'cnesdata-end-to-end') {
    const engine = await import('./cnesdata.ts');
    return {
      initialize: engine.createCnesdataState,
      dispatch: (state, command) => {
        const current = state as ReturnType<typeof engine.createCnesdataState>;
        return engine.reduceCnesdata(current, engine.normalizeCnesdataCommand(current, command));
      },
      project: state => engine.projectCnesdata(state as ReturnType<typeof engine.createCnesdataState>),
      samples: state => {
        const current=state as ReturnType<typeof engine.createCnesdataState>;
        const samples=engine.projectCnesdataSamples(current);
        const normalized=samples.normalized.length>0;
        const local=normalized?samples.normalized.filter(row=>row.source==='CNES_LOCAL'):samples.local;
        const national=normalized?samples.normalized.filter(row=>row.source==='CNES_NATIONAL'):samples.national;
        return {
          title:samples.comparison.length?'Reconciliation · 3 comparisons':normalized?'Normalized records':'Source captures',
          columns:['Record','Municipal h','National h','Comparison'],
          rows:local.map((row,i)=>[row.establishment,normalized?String(row.hours):JSON.stringify(row.hours), national[i]?(normalized?String(national[i].hours):JSON.stringify(national[i].hours)):'pending',samples.comparison[i]?(samples.comparison[i].different?'Different':'Equal'):'pending']),
          provenance:`CNES_LOCAL + CNES_NATIONAL · ${current.competencia} · ${current.runId}`,
        };
      },
    };
  }
  if (scenarioId === 'infra-provision-scale') {
    const engine = await import('./scaling.ts');
    return {
      initialize: engine.createScalingState,
      dispatch: (state, command) => {
        const current=state as ReturnType<typeof engine.createScalingState>;
        return engine.reduceScaling(current,engine.normalizeScalingCommand(current,command as Parameters<typeof engine.reduceScaling>[1]));
      },
      project: state => engine.projectScaling(state as ReturnType<typeof engine.createScalingState>),
    };
  }
  if (scenarioId.startsWith('infra-')) {
    const engine = await import('./infrastructure.ts');
    return {
      initialize: () => engine.createInfrastructureState(scenarioId),
      dispatch: (state, command) => engine.reduceInfrastructure(state as ReturnType<typeof engine.createInfrastructureState>, command as Parameters<typeof engine.reduceInfrastructure>[1]),
      project: state => engine.projectInfrastructure(state as ReturnType<typeof engine.createInfrastructureState>),
    };
  }
  const engine = await import('./limnopulse.ts');
  return {
    initialize: engine.createLimnopulseState,
    dispatch: (state, command) => engine.reduceLimnopulse(state as ReturnType<typeof engine.createLimnopulseState>, command as Parameters<typeof engine.reduceLimnopulse>[1]),
    project: state => engine.projectLimnopulse(state as ReturnType<typeof engine.createLimnopulseState>),
  };
}
