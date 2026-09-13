#!/usr/bin/env python3
"""Validate the V3 package and frozen V2 fixtures, NOT application reducers.
Standard library checks always run. jsonschema enables full structural checks.
"""
from pathlib import Path
import json, re, sys, hashlib, struct, xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[1]
def load(f): return json.loads((ROOT/f).read_text())
def require(ok,msg):
    if not ok:raise AssertionError(msg)
def main():
    scenes=load('archive/v2/scene-map.json')['scenes']
    paths=sorted(p for p in (ROOT/'scenarios').glob('*.json') if p.name!='negative-cases.json')
    scenarios={p.stem:json.loads(p.read_text()) for p in paths}
    schema=load('schemas/scenario.schema.json')
    neg=load('scenarios/negative-cases.json')
    try:
        import jsonschema
        for s in scenarios.values():jsonschema.validate(s,schema)
        jsonschema.validate(neg,load('schemas/negative-cases.schema.json'))
        full_schema=True
    except ImportError:full_schema=False
    seen=set();checkpoints={};counts={};assertion_count=0
    for sid,s in scenarios.items():
        require(s['id']==sid,f'filename/id mismatch {sid}')
        actors={a['id'] for a in scenes[s['scene']]['actors']}
        require(len(actors)==len(scenes[s['scene']]['actors']),'duplicate actor IDs')
        require(s['checkpoints'][0]['command']['type']=='INIT','scenario must begin with INIT')
        prev=None
        for i,c in enumerate(s['checkpoints']):
            e=c['expected'];cpid=c['id'];require(cpid not in seen,f'duplicate checkpoint {cpid}');seen.add(cpid);checkpoints[cpid]=c
            require(set(c['focus'])<=actors,f'unknown focus ID in {cpid}')
            require(e.get('logicalTick',0)>=0,'negative logical tick')
            if prev:require(e.get('logicalTick',0)>=prev.get('logicalTick',0),'time moved backwards')
            if s['scene']=='infrastructure':
                require(len(e['nodes'])==3,'infra fixture should have 3 nodes')
                if e['profile']=='three-voters':require(e['quorum']==(sum(v=='ready' for v in e['nodes'].values())>=2),'invalid quorum')
                if e['workloadStatus'] in ['starting','running']:
                    require(e['nodeId'] in e['nodes'],'active instance needs node')
                    require(e['nodes'][e['nodeId']]=='ready','instance on unready node')
                    require(e['unsafeOwner'] is None,'unsafe owner while starting/running')
                    require(e['storageReady'] and e['quorum'] and e['controllerAvailable'],'start guard violation')
                require(e['clientAvailable']==(e['workloadStatus']=='running'),'client/service mismatch')
                if all(v=='offline' for v in e['nodes'].values()):require(e['nodeId'] is None,'instance with zero nodes')
                if prev:require(e['instanceGeneration']>=prev['instanceGeneration'],'generation decrease')
            elif s['scene']=='scaling':
                require(e['physicalHosts']==3,'guest scaling cannot create physical hosts')
                require(0<=e['usedSlots']+e['reservedSlots']<=e['totalSlots'],'capacity exceeded')
                require(e['reservedSlots']==sum(v=='reserved' for v in e['workers'].values()),'reservation count mismatch')
                require(e['usedSlots']==sum(v not in ['absent','reserved'] for v in e['workers'].values()),'used slots mismatch')
                require(e['readyReplicas']==sum(v=='ready' for v in e['replicas'].values()),'ready count mismatch')
                require(1<=e['desiredReplicas']<=3,'replica bounds')
                require(e['inFlight']>=0,'negative inFlight')
            elif s['scene']=='limnopulse':
                require(not e['telegramEnabled'] or (e['telegramBound'] and e['membershipActive']),'channel enrollment guard')
                if e['incident']!='none':require(e['windowValid'] and e['incidentId']=='evt-demo-01','incident without inputs')
                if e['userView']!='idle':require(e['telegram']=='accepted','show message before acceptance')
                if e['incident']=='recovered':require(e['condition']=='normal','recover while condition low')
                for channel in ['email','telegram']:require(e['openingConfirmed'][channel]==(e[channel]=='accepted'),'opening receipt not channel-scoped')
                if e['recoveryTelegram']!='idle':require(e['openingConfirmed']['telegram'],'recovery without confirmed opening')
                if c['command']['type']=='ATTEMPT_DELIVERY' and c['command'].get('channel')=='telegram' and prev and prev['retryDueTick'] is not None:require(e['logicalTick']>=prev['retryDueTick'],'early retry')
            else:
                if e['normalized']:require(e['localAccepted'] and e['nationalAccepted'],'normalize without required inputs')
                if e['reconciled']:require(e['normalized']==2,'reconcile before normalization')
                if e['servingReady']:require(e['reconciled'],'serving before reconciliation')
                if e['candidateVersion']:require(e['artifactsVerified'] and e['servingReady'],'version before verified outputs')
                if e['currentVersion']=='v-demo-01':require(e['run']=='PUBLISHED' and e['artifactsVerified'],'publish prematurely')
                if e['servedVersion']:require(e['servedVersion']==e['currentVersion'],'unrelated serving version')
                if prev and c['command']['type']=='REPLAY_RAW_OBJECT':require(e['rawObjects']==prev['rawObjects'],'raw replay duplicates objects')
                if prev and e['currentVersion']!=prev['currentVersion']:require(c['command']['type']=='PUBLISH_CURRENT','pointer moved outside CAS')
            prev=e;assertion_count+=1
        counts[sid]=len(s['checkpoints'])
    negids=set()
    for n in neg['cases']:
        require(n['id'] not in negids,'duplicate negative case');negids.add(n['id'])
        require(n['scenarioId'] in scenarios,'negative case unknown scenario')
        require(n['fromCheckpoint'] in checkpoints,'negative case unknown checkpoint')
        require(n['fromCheckpoint'].startswith(n['scenarioId']+'-'),'negative case wrong scenario')
        require(n['commands'] and n['expectedSubset'],'empty test acceptance')
    svgs=list((ROOT/'visuals').glob('*.svg'))
    for f in svgs:
        doc=ET.parse(f);ids=[x.attrib['id'] for x in doc.iter() if 'id' in x.attrib]
        require(len(ids)==len(set(ids)),f'duplicate SVG IDs {f.name}')
        require(f.with_suffix('.png').exists(),f'PNG missing {f.name}')
    # Prove the small worked data transformation is internally consistent.
    samples=load('design/sample-data.json')
    def norm(rows):return {(r['establishment'].strip(),r['professional'].strip()):int(r['hours'].strip()) for r in rows}
    a,b=norm(samples['local']),norm(samples['national']);keys=a.keys() & b.keys()
    require(len(keys)==samples['expected']['comparedRows'],'sample row count')
    require(sum(a[k]!=b[k] for k in keys)==samples['expected']['differentRows'],'sample reconciliation mismatch')
    # Check local Markdown document links, not remote source reachability.
    local_links=0
    for f in ROOT.rglob('*.md'):
        if 'archive' in f.relative_to(ROOT).parts: continue
        for target in re.findall(r'(?<!!)\[[^\]]+\]\(([^)]+)\)',f.read_text()):
            if '://' in target or target.startswith('#'):continue
            target=target.split('#')[0]
            if target:require((f.parent/target).exists(),f'broken link {f.name} -> {target}');local_links+=1
    # New V3 structural checks; acquisition sources are not fetched or licensed by this tool.
    locked=load('checks/v2-behavior-lock.json')['files']
    for rel,expected_hash in locked.items():
        p=ROOT/rel
        require(p.is_file(),f'missing locked V2 file {rel}')
        require(hashlib.sha256(p.read_bytes()).hexdigest()==expected_hash,f'behavior changed: {rel}')
    asset_data=load('design/service-assets.json')['assets']
    assets={a['id']:a for a in asset_data}
    require(len(assets)==len(asset_data),'duplicate asset ID')
    for a in assets.values():
        require(a['sourceUrl'].startswith('https://'),f'asset source missing: {a["id"]}')
        require(a['acquisitionStatus']=='not-vendored','briefing must not claim acquired vendor artwork')
        require(a['sha256'] is None and a['licenseRecord'] is None,'unverified asset claims')
        if a.get('fallback'): require(a['fallback']['assetId'] in assets,'unknown asset fallback')
    bindings=load('design/actor-bindings.json')
    actors={a['id']:a for a in bindings['actors']}
    require(len(actors)==len(bindings['actors']),'duplicate V3 actor')
    for a in actors.values(): require(a['assetId'] in assets,f'unknown asset for {a["id"]}')
    for group,members in bindings['aliases'].items():
        require(members and set(members)<=actors.keys(),f'unknown actor in alias {group}')
    for profile,overrides in bindings['profileOverrides'].items():
        for actor_id,override in overrides.items():
            require(actor_id in actors and override['assetId'] in assets,f'bad profile override {profile}')
    stages=load('design/stage-map.json')
    stage_for={};chapter_count=0
    require({s['scenarioId'] for s in stages['scenarios']}==set(scenarios),'stage scenario coverage')
    for s in stages['scenarios']:
        require(len(s['chapters'])==6,'six readable chapters per scenario')
        flattened=[]
        for n,ch in enumerate(s['chapters'],1):
            require(ch['number']==n,'chapter numbering')
            require(ch['id']==s['scenarioId']+':stage-'+str(n),'chapter identity')
            require(ch['title'] and ch['summary'],'empty chapter copy')
            for cp in ch['checkpointIds']:
                require(cp not in stage_for,'checkpoint appears in two chapters')
                stage_for[cp]=ch['id'];flattened.append(cp)
            chapter_count+=1
        require(flattened==[c['id'] for c in scenarios[s['scenarioId']]['checkpoints']],'chapter ordering changed')
    choreo=load('design/choreography.json');micro_seen=set();cp_seen=set()
    for c in choreo['checkpoints']:
        cid=c['checkpointId'];require(cid in checkpoints and cid not in cp_seen,'choreography checkpoint invalid');cp_seen.add(cid)
        require(c['chapterId']==stage_for[cid],'choreography chapter mismatch')
        sid=c['scenarioId'];seq=scenarios[sid]['checkpoints'];idx=[x['id'] for x in seq].index(cid)
        require(c['previousCheckpointId']==(seq[idx-1]['id'] if idx else None),'previous checkpoint mismatch')
        require(c['stateRef']==f'scenarios/{sid}.json#/checkpoints/{idx}/expected','stateRef mismatch')
        require(set(c['outcomeFields'])<=seq[idx]['expected'].keys(),'unknown outcome field')
        require(all(v>=0 for v in c['defaultPhaseMs'].values()),'negative display timing')
        for b in c['microbeats']:
            require(b['id'] not in micro_seen,'duplicate microbeat');micro_seen.add(b['id'])
            ids=b['primaryActors'];require(1<=len(ids)<=3,'focus must have 1..3 actors')
            require(len(set(ids))==len(ids),'duplicate actor in focus')
            require(set(ids)<=actors.keys(),f'unknown focus actor {b["id"]}')
            require(b['layout']=={1:'single',2:'pair',3:'triad'}[len(ids)],'layout/focus mismatch')
    require(cp_seen==set(checkpoints),'choreography does not cover original scenarios')
    refs=load('references/manifest.json');png_count=0
    for r in refs['images']:
        p=ROOT/r['file'];raw=p.read_bytes()
        require(hashlib.sha256(raw).hexdigest()==r['sha256'],'approved image bytes changed')
        require(raw[:8]==b'\x89PNG\r\n\x1a\n','image is not PNG')
        require(list(struct.unpack('>II',raw[16:24]))==r['size'],'PNG dimensions mismatch');png_count+=1
        for crop in r['crops']:
            raw=(ROOT/crop['path']).read_bytes();box=crop['bbox']
            require(raw[:8]==b'\x89PNG\r\n\x1a\n','crop not PNG')
            require(list(struct.unpack('>II',raw[16:24]))==[box[2]-box[0],box[3]-box[1]],'crop dimensions mismatch');png_count+=1
    require((ROOT/'references/index.html').is_file(),'gallery missing')
    if full_schema:
        jsonschema.validate(choreo,load('schemas/choreography.schema.json'))
    report_v3={'lockedBehaviorFilesUnchanged':len(locked),'stageCount':chapter_count,
      'presentationCheckpointCount':len(cp_seen),'presentationMicrobeatCount':len(micro_seen),
      'actorCount':len(actors),'assetSpecifications':len(assets),'vendorSvgFilesAcquired':0,
      'approvedImages':len(refs['images']),'pngFilesChecked':png_count,
      'currentMarkdownLinksChecked':local_links,
      'remoteSourceReachabilityChecked':False,'brandUsePermissionGrantedByThisCheck':False}
    report={'scope':'Reference package validation, not application or backend tests','fullJsonSchema':full_schema,'scenarios':counts,'checkpointsValidated':assertion_count,'negativeCasesStructurallyValidated':len(negids),'negativeCasesExecutedAgainstApplication':0,'svgParsed':len(svgs),'localMarkdownLinksChecked':local_links,'sampleTransformationVerified':True,'result':'PASS',**report_v3}
    (ROOT/'checks/package-validation.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n')
    print(json.dumps(report,indent=2,ensure_ascii=False))
if __name__=='__main__':
    try:main()
    except Exception as exc:print(f'FAIL: {exc}',file=sys.stderr);raise
