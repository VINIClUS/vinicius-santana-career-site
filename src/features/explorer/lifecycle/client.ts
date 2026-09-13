import { loadEngine } from './engine.ts';
import { createPlayer } from './player.ts';
import { actorSlots, describeOutcome, getPresentationPlan, planEvent } from './presentation.ts';
import { execute, reconstruct, type Scenario, type Command, type Plan } from './types.ts';

export async function initializeLifecycles() {
  const element = document.querySelector<HTMLElement>('[data-lifecycle]');
  if (!element || element.dataset.initialized) return;
  const root: HTMLElement = element;
  root.dataset.initialized = 'true';
  const tours: Scenario[] = JSON.parse(root.querySelector('[data-life-data]')!.textContent!);
  const get = <T extends HTMLElement>(name: string) => root.querySelector<T>(`[data-life-${name}]`)!;
  let scenario = tours[0]!;
  let adapter = await loadEngine(scenario.id);
  let state = reconstruct(adapter,scenario,0);
  let previousState = state;
  let previous = adapter.project(state);
  let manual: Plan | undefined;
  let manualCommand: Command | undefined;
  let animation: Animation | undefined;
  let animationKey = '';
  let generation = 0;
  let profile = 'aws';
  let interacted = false;
  let autoConsumed = false;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const artifact = get('artifact');
  const stage = get('stage');
  const buttons = ['previous','play','next','replay'] as const;
  let player = makePlayer();
  function makePlayer() {
    return createPlayer({count:scenario.checkpoints.length,beatCount:index=>scenario.checkpoints[index]!.plan.microbeats.length,
      durations:{orient:400,focus:250,action:850,settle:1100},
      schedule:(callback,delay)=>{const timer=setTimeout(callback,delay);return()=>clearTimeout(timer);},
      apply:index=>{ previousState=state;previous=adapter.project(state); state=execute(adapter,state,scenario.checkpoints[index]!.command).state; },
      rebuild:index=>{manual=undefined;manualCommand=undefined;state=reconstruct(adapter,scenario,index);previousState=reconstruct(adapter,scenario,Math.max(0,index-1));previous=adapter.project(previousState);},
      changed:()=>render(),
    });
  }
  function cancelMotion() { animation?.cancel(); animation=undefined; animationKey=''; artifact.removeAttribute('data-moving-artifact'); }
  function render() {
    const playback=player.snapshot();
    const cp=scenario.checkpoints[playback.index]!;
    const plan=manual ?? getPresentationPlan(scenario,cp.id);
    const beat=plan.microbeats[manual?0:playback.beat]!;
    const chapter=scenario.chapters.find(ch=>ch.id===cp.plan.chapterId)!;
    const projection=adapter.project(state);
    const settled=Boolean(manual)||(playback.phase==='settle'&&playback.beat===plan.microbeats.length-1);
    get('title').textContent=plan.headline;
    get('caption').textContent=manual ? 'Exploration paused the tour. Replay to start the complete cycle again.' : cp.caption;
    root.querySelector('[data-stage-number]')!.textContent=`${String(chapter.number).padStart(2,'0')} / 06 · ${chapter.title}`;
    get('beat').textContent=beat.label;
    get('outcome').textContent=(settled?'':'Before · ')+describeOutcome(scenario.project, settled?projection:previous);
    get('progress').textContent=`${!playback.guided?'Exploring':playback.complete?'Complete':playback.playing?'Playing':'Paused'} · operation ${playback.index+1} / ${scenario.checkpoints.length} · shot ${playback.beat+1} / ${plan.microbeats.length}`;
    stage.dataset.phase=playback.phase; stage.dataset.playing=String(playback.playing);
    const slots=manual?Object.fromEntries(beat.primaryActors.map((id,i)=>[id,i])):actorSlots(scenario,chapter.id);
    get('actors').replaceChildren(...beat.primaryActors.map(id=>{
      const actor=scenario.actors.find(a=>a.id===id) ?? {id,label:id.split('.').at(-1)!,assetId:'worker'};
      const item=document.createElement('div');item.className='life-actor';item.dataset.primaryActor=id;
      item.style.setProperty('--slot',String(slots[id] ?? 0));
      const plinth=document.createElement('div');plinth.className='life-plinth';
      const img=document.createElement('img');img.width=64;img.height=64;img.alt='';
      img.src=`/assets/services/${profile==='local'&&actor.assetId==='aws-s3'?'filesystem':profile==='local'&&actor.assetId==='aws-dynamodb'?'sqlite':actor.assetId}.svg`;
      plinth.append(img);const name=document.createElement('strong');
      name.textContent=profile==='local'?actor.label.replace(/Amazon S3|S3/g,'Filesystem').replace(/DynamoDB/g,'SQLite'):actor.label;
      const status=document.createElement('span');status.className='life-actor-status';
      status.textContent=actorStatus(id,settled?projection:previous);
      item.append(plinth,name,status);return item;
    }));
    const route=get<HTMLElement>('path');
    const start=slots[beat.primaryActors[0]!]??0,end=slots[beat.primaryActors.at(-1)!]??start;
    route.setAttribute('d',`M ${210+start*290} 120 C ${210+start*290} 240 ${210+end*290} 240 ${210+end*290} 120`);
    route.style.display=beat.routeKind&&start!==end?'':'none';
    artifact.hidden=!beat.routeKind;
    const waiting=plan.motion==='wait'||plan.motion==='guard';
    const identities=beat.primaryActors.join(' ');
    const label=waiting?'Waiting · '+(projection.retryDueTick?`tick ${projection.retryDueTick}`:((projection.blockedReasons as string[]|undefined)?.join(', ').toLowerCase().replaceAll('_',' ')||'guard required')):
      beat.routeKind==='query'?'Request':beat.routeKind==='receipt'?'Response':
      beat.routeKind==='restart'?`New instance · g${projection.instanceGeneration}`:
      identities.includes('cnes.manifest')?'manifest.json':identities.includes('cnes.parquet')||identities.includes('cnes.raw')?'data.parquet':
      identities.includes('cnes.pointer')?`CURRENT → ${projection.currentVersion}`:
      identities.includes('cnes.version')?String(projection.candidateVersion??'Candidate version'):
      identities.includes('limno.outbox')?'Incident / outbox record':identities.includes('limno.delivery-record')?'Durable Delivery':
      identities.includes('limno.worker')||identities.includes('limno.sqs')?`Delivery ID · ${identities.includes('telegram')?'Telegram':'email'}`:
      identities.includes('limno.timeseries')?'Telemetry window':beat.routeKind==='transform'?'Derived records':beat.routeKind==='persist'?'Durable record':'Work / data';
    artifact.querySelector('[data-artifact-label]')!.textContent=label;
    artifact.dataset.kind=label.includes('parquet')||label.includes('json')?'file':label.includes('Delivery')?'delivery':label.includes('CURRENT')?'pointer':'record';
    const key=`${generation}:${cp.id}:${beat.id}:${playback.phase}`;
    const moving=playback.phase==='action'&&Boolean(beat.routeKind)&&!waiting&&!reduced.matches;
    if (!moving) cancelMotion();
    else {
      if (animationKey!==key) {
        cancelMotion(); animationKey=key;
        const width=stage.clientWidth;
        animation=artifact.animate([{transform:`translateX(calc(-50% + ${(start-1)*width*.29}px))`,opacity:1},{transform:`translateX(calc(-50% + ${(end-1)*width*.29}px))`,opacity:1}],{duration:850,fill:'forwards',easing:'ease-in-out'});
      }
      if(playback.playing){animation?.play();artifact.dataset.movingArtifact=beat.routeKind!;}else{animation?.pause();artifact.removeAttribute('data-moving-artifact');}
    }
    get('play').textContent=playback.playing?'Pause':'Play';
    get<HTMLButtonElement>('play').disabled=!playback.guided||playback.complete;
    get<HTMLButtonElement>('next').disabled=!playback.guided||playback.complete;
    get<HTMLButtonElement>('previous').disabled=!playback.guided||playback.index===0;
    for(const button of root.querySelectorAll<HTMLButtonElement>('[data-life-chapter]')){
      const selected=Number(button.dataset.lifeChapter)===chapter.number-1;
      if(selected){button.setAttribute('aria-current','step');button.dataset.currentStage=chapter.id;}else{button.removeAttribute('aria-current');button.removeAttribute('data-current-stage');}
      button.disabled=!playback.guided;
    }
    get('technical').textContent=JSON.stringify({command:manualCommand??cp.command,state:projection},null,2);
    renderRecords(settled?projection:previous);
    renderSamples(settled?state:previousState);
    renderRecipient(settled?projection:previous);
    if(manual||playback.complete)get('announcement').textContent=describeOutcome(scenario.project,projection);
  }
  function renderRecords(p:Record<string,unknown>) {
    let records: string[];
    if(scenario.id==='infra-provision-scale') records=['Host 01 · physical','Host 02 · physical','Host 03 · physical',`Routing · ${p.readyReplicas} ready replicas`, `In flight · ${p.inFlight}`];
    else if(scenario.project==='infrastructure') records=Object.entries(p.nodes as Record<string,string>).map(([id,status])=>`${id} · ${status}`).concat([`Definition · ${p.desired}`,`Durable data · ${p.storageReady?'available':'unavailable'}`]);
    else if(scenario.project==='limnopulse') records=[`Telemetry · ${p.samples} persisted samples`,`Outbox · ${p.outboxCount} records`,`Queues · ${p.queueCount} jobs`, `Recipient · ${String(p.userView).replaceAll('_',' ')}`];
    else records=[`Raw · ${p.rawObjects} objects`,`Normalized · ${p.normalized} sources`,`CURRENT · ${p.currentVersion}`,`Recipient · ${p.servedVersion??'previous version'}`];
    get('records').replaceChildren(...records.map(text=>{const item=document.createElement('span');item.textContent=text;return item;}));
  }
  function renderSamples(presentedState:unknown) {
    if(!adapter.samples)return;
    const preview=adapter.samples(presentedState);
    const panel=get('samples');panel.hidden=preview.rows.length===0;
    get('sample-title').textContent=preview.title;
    const header=document.createElement('tr');
    for(const column of preview.columns){const cell=document.createElement('th');cell.scope='col';cell.textContent=column;header.append(cell);}
    get('sample-head').replaceChildren(header);
    get('sample-body').replaceChildren(...preview.rows.map(row=>{const tr=document.createElement('tr');for(const text of row){const td=document.createElement('td');td.textContent=text;tr.append(td);}return tr;}));
    get('sample-provenance').textContent=preview.provenance;
  }
  function renderRecipient(p:Record<string,unknown>) {
    const panel=root.querySelector<HTMLElement>('[data-life-recipient]');if(!panel)return;
    const limno=scenario.project==='limnopulse';
    panel.hidden=limno?p.userView==='idle':p.servedVersion===null;
    get('recipient-title').textContent=limno?'Limnopulse · synthetic recipient':'CnesData · authorized dashboard';
    get('recipient-message').textContent=limno?
      p.userView==='recovery_shown'?'Water condition recovered. This notification belongs to the same incident.':
      p.userView==='acknowledged'?'Acknowledged. The low condition remains active until a valid clean window confirms recovery.':
      p.userView==='incident_opened'?`Incident ${p.incidentId} · ${p.condition} condition · version ${p.incidentVersion}`:
      'Low oxygen alert · a synthetic notification was accepted. Provider acceptance does not prove that a person read it.':
      `${p.responseComparedRows} records compared · ${p.responseDifferentRows} different · ${p.responseSameRows} equal. Every row belongs to ${p.servedVersion}.`;
    if(limno){
      get<HTMLButtonElement>('recipient-open').disabled=!p.membershipActive||p.userView==='idle';
      get<HTMLButtonElement>('recipient-ack').disabled=!p.membershipActive||p.incident!=='open';
    }
  }
  function actorStatus(id:string,p:Record<string,unknown>):string {
    if(id.startsWith('scale.worker-'))return String((p.workers as Record<string,unknown>|undefined)?.[id.replace('scale.','')]??'absent');
    if(id==='scale.service')return `${p.readyReplicas??0} ready / ${p.desiredReplicas??0} desired`;
    if(id==='cnes.pointer')return String(p.currentVersion??'none');
    if(id==='cnes.version')return String(p.candidateVersion??'no candidate');
    if(id==='cnes.raw')return `${p.rawObjects??0} immutable objects`;
    if(id.startsWith('infra.node-'))return String((p.nodes as Record<string,unknown>|undefined)?.[id.replace('infra.','')]??'Physical host');
    if(id==='infra.workload')return `${p.workloadStatus??'pending'} · gen ${p.instanceGeneration??0}`;
    if(id==='infra.storage')return p.storageReady?'Available':'Unavailable';
    if(id==='limno.outbox')return `${p.outboxCount??0} durable records`;
    if(id.includes('email')||id==='limno.ses')return String(p.email??'idle').replaceAll('_',' ');
    if(id.includes('telegram'))return String(p.telegram??'idle').replaceAll('_',' ');
    if(id==='limno.incident')return String(p.incident??'none');
    return '';
  }
  function applyManual(label:string,command:Command) {
    interacted=true;player.interrupt();cancelMotion();previousState=state;previous=adapter.project(state);
    const result=execute(adapter,state,command);state=result.state;
    const description=result.rejection?`Blocked · ${String(result.rejection).toLowerCase().replaceAll('_',' ')}`:label;
    manualCommand=command;manual=planEvent(scenario.project,{type:command.type,description},previous,adapter.project(state),scenario,command);render();
  }
  function actions() {
    const commands: [string,Command][] = scenario.project==='limnopulse' ? [
      ['Advance clock',{type:'ADVANCE_CLOCK',ticks:3}],['Retry Telegram',{type:'ATTEMPT_DELIVERY',kind:'opening',channel:'telegram'}],['Revoke membership',{type:'SET_MEMBERSHIP',active:false}],
    ]:scenario.id==='infra-provision-scale'?[['Sustained high load',{type:'SET_LOAD',value:0.9}],['Advance clock',{type:'ADVANCE_CLOCK',ticks:3}],['Evaluate scaling policy',{type:'EVALUATE_SCALE_POLICY'}]]:
    scenario.project==='infrastructure'?[['Fail node 02',{type:'FAIL_NODE',nodeId:'node-02'}],['Confirm fencing',{type:'CONFIRM_FENCE',nodeId:'node-02'}],['Restore node 02',{type:'RESTORE_NODE',nodeId:'node-02'}],['Storage unavailable',{type:'SET_STORAGE',ready:false}],['Advance clock',{type:'ADVANCE_CLOCK',ticks:3}],['Reconcile',{type:'RECONCILE'}]]:
    [['Advance clock',{type:'ADVANCE_CLOCK',ticks:3}],['Revoke membership',{type:'REVOKE_MEMBERSHIP'}]];
    get('actions').replaceChildren(...commands.map(([label,command])=>{const button=document.createElement('button');button.type='button';button.textContent=label;
      button.onclick=()=>applyManual(label,command);return button;}));
    const operations=[...scenario.checkpoints.filter(cp=>cp.command.type!=='INIT').map(cp=>({label:cp.title,command:cp.command})),
      ...(scenario.variations??[]).map(v=>({label:v.label,command:{type:'SEQUENCE',commands:v.commands}}))];
    const select=get<HTMLSelectElement>('operation');select.disabled=false;
    select.replaceChildren(...operations.map((o,i)=>{const option=document.createElement('option');option.value=String(i);option.textContent=o.label;return option;}));
    get<HTMLButtonElement>('apply').disabled=false;get('apply').onclick=()=>{const operation=operations[Number(select.value)]!;applyManual(operation.label,operation.command);};
  }
  for(const name of buttons)get<HTMLButtonElement>(name).disabled=false;
  get('previous').onclick=()=>{interacted=true;player.previous();};
  get('next').onclick=()=>{interacted=true;player.next();};
  get('play').onclick=()=>{interacted=true;player.snapshot().playing?player.pause():player.play();};
  get('replay').onclick=()=>{interacted=true;cancelMotion();player.reset();};
  get('chapters').onclick=event=>{const target=(event.target as Element).closest<HTMLElement>('[data-life-chapter]');if(!target)return;interacted=true;const chapter=scenario.chapters[Number(target.dataset.lifeChapter)]!;player.seek(scenario.checkpoints.findIndex(cp=>cp.id===chapter.checkpointIds[0]));};
  get<HTMLSelectElement>('scenario').disabled=false;
  get<HTMLSelectElement>('scenario').onchange=async event=>{
    interacted=true;player.dispose();cancelMotion();const token=++generation;
    const next=tours.find(s=>s.id===(event.target as HTMLSelectElement).value)!;const engine=await loadEngine(next.id);
    if(token!==generation)return;scenario=next;adapter=engine;manual=undefined;manualCommand=undefined;state=reconstruct(adapter,scenario,0);previousState=state;previous=adapter.project(state);player=makePlayer();
    const nav=get('chapters');nav.replaceChildren(...scenario.chapters.map((ch,i)=>{const b=document.createElement('button');b.type='button';b.dataset.lifeChapter=String(i);b.textContent=`${String(ch.number).padStart(2,'0')} ${ch.title}`;return b;}));
    get('context').textContent=scenario.assumptions.join(' ');actions();render();
  };
  const profileControl=root.querySelector<HTMLSelectElement>('[data-life-profile]');
  if(profileControl){profileControl.disabled=false;profileControl.onchange=()=>{interacted=true;player.pause();profile=profileControl.value;render();};}
  if(scenario.project==='limnopulse'){
    get('recipient-open').onclick=()=>applyManual('Open the authorized incident',{type:'OPEN_INCIDENT',tenantId:'tenant-demo-A'});
    get('recipient-ack').onclick=()=>applyManual('Acknowledge the incident',{type:'ACKNOWLEDGE',expectedVersion:adapter.project(state).incidentVersion});
  }
  document.addEventListener('visibilitychange',()=>{if(document.hidden)player.pause();});
  reduced.addEventListener('change',()=>{player.pause();cancelMotion();});
  new IntersectionObserver(entries=>{
    const visible=entries[0]?.isIntersecting;
    if(!visible){player.pause();return;}
    const saveData=(navigator as Navigator&{connection?:{saveData?:boolean}}).connection?.saveData;
    if(!autoConsumed&&!interacted&&!document.hidden&&!reduced.matches&&!saveData&&(!location.hash||location.hash==='#simulation')){autoConsumed=true;player.play();}
  },{threshold:0}).observe(stage);
  window.addEventListener('pagehide',event=>{
    if(event.persisted){player.pause();cancelMotion();return;}
    generation++;player.dispose();cancelMotion();
  });
  window.addEventListener('pageshow',event=>{if(event.persisted){cancelMotion();render();}});
  actions();render();
}
