import type { InfrastructureCommand, InfrastructureState } from './infrastructure.ts';
import type { LimnopulseCommand, LimnopulseState } from './limnopulse.ts';
import type { Command, DomainAdapter } from './types.ts';

export function normalizeInfrastructureCommand(state: InfrastructureState, command: Command): InfrastructureCommand {
  if (command.type !== 'NODE_READY' || Object.hasOwn(command, 'operationId')) return structuredClone(command) as InfrastructureCommand;
  return { ...structuredClone(command), operationId: state.nodeOperations[String(command.nodeId)] ?? 0 } as InfrastructureCommand;
}

export function normalizeLimnopulseCommand(state: LimnopulseState, command: Command): LimnopulseCommand {
  if (command.type !== 'PROVIDER_RESULT' || Object.hasOwn(command, 'operationId')) return structuredClone(command) as LimnopulseCommand;
  const key = `${String(command.kind)}:${String(command.channel)}` as keyof LimnopulseState['deliveries'];
  return { ...structuredClone(command), operationId: state.deliveries[key]?.operationId ?? '' } as LimnopulseCommand;
}

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
      dispatch: (state, command) => {
        const current = state as ReturnType<typeof engine.createInfrastructureState>;
        return engine.reduceInfrastructure(current, normalizeInfrastructureCommand(current, command));
      },
      project: state => engine.projectInfrastructure(state as ReturnType<typeof engine.createInfrastructureState>),
    };
  }
  const engine = await import('./limnopulse.ts');
  return {
    initialize: engine.createLimnopulseState,
    dispatch: (state, command) => {
      const current = state as ReturnType<typeof engine.createLimnopulseState>;
      return engine.reduceLimnopulse(current, normalizeLimnopulseCommand(current, command));
    },
    project: state => engine.projectLimnopulse(state as ReturnType<typeof engine.createLimnopulseState>),
  };
}
