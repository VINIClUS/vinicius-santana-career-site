# Independent performance disposition — final corrected candidate


Independently reviewed the final `docs/design/atlas-v2/lighting-motion/candidate/metrics.json`, source role `lighting-motion-native-preference`, measured2026-09-12T18:59:04Z–19:02:29Z. This section supersedes the earlier candidate's timing values and final disposition. The previous measurements above remain archived observations; no values from different binaries were averaged or substituted.

The final inventory still matches the original baseline's measurement script, environment, browser and profile. **All12 primary visits and8 diagnostic visits pass**, now including dynamic reduced-motion control state. All primary scenes reached ready with no recorded browser errors or failed requests. The models remain485,724bytes; diagnostic maxima remain131calls and18,072triangles per render. Paused, initial/dynamic reduced, hidden and offscreen windows have zero GL draws; restored/resumed windows animate. No detail/simulation requests were found in the primary resource inventories.

### Final loading and long-task results

| Condition | Final scene-ready median | Change from original baseline | Final total long-task median | Final post-last-model→ready median |
| --- | ---: | ---: | ---: | ---: |
| Atlas desktop |1566.2ms |+438.2ms /+38.8% |4424ms (6.77×) |492.5ms |
| Atlas mobile |1563.7ms |+459.8ms /+41.7% |4127ms (7.60×) |506.9ms |
| Home desktop |1545.0ms |+470.5ms /+43.8% |4296ms (7.63×) |449.4ms |
| Home mobile |1616.8ms |+558.1ms /+52.7% |4267ms (7.36×) |511.1ms |

All3 final samples in every condition exceed1.2× their original baseline ready median. The final ready samples are retained in order: Atlas desktop1564.2/1601.1/1566.2ms; Atlas mobile1563.7/1500.3/1820.6ms; Home desktop1467.6/1545.0/1709.0ms; Home mobile1613.8/1616.8/1659.3ms. The review trigger is therefore unequivocally crossed again; the previous+30–35% values must not be presented as the final result.

The final last-model-response medians are1076.9/1056.8/1095.6/1132.1ms. Compared with baseline, the post-response→ready medians worsen by178.0/189.2/180.6/237.3ms. The unchanged additional293,080model bytes still correspond to about234.5ms ideal transfer, but now account for only roughly42–54% of the observed median complete-scene delay as an order-of-magnitude comparison. It is no longer sufficient to describe most of the final slowdown as explained by payload alone. Post-transfer work and observed response scheduling also contribute; the measurements do not identify their individual causes.

The earlier statement that FCP was stable also needs qualification. Final FCP medians are288/252ms on Atlas (+4.3/+5.0%) and408/344ms on Home (+20.0/+19.4%). Home's essential HTML/CTA layout medians remain126.0/125.6ms (baseline118/116ms); Atlas is119.8/121.9ms. Final poster-response medians are169.7/158.4/173.2/166.7ms. Essential content remains early, but final Home paint is measurably later and must not be hidden behind the pre-fix observation.

Splitting the raw long-task entries at scene-ready, startup long-task median overlap grows417.3→639.7ms /404.7→644.1ms on Atlas and319.3→646.5ms /378.5→694.8ms on Home. Thus the total long-task increase is not solely an artifact of comparing active motion against idle: startup itself also gets more expensive. The recorded maximum individual task reaches601/682/732/870ms across the four conditions; those maxima are whole-visit observations, not an attribution to a specific render phase.

During active windows, median long-task occupancy is approximately86.8% /87.9% /90.1% /88.4%; individual visits span86.3–95.6%. Final diagnostic active rates span approximately3.4–4.8fps on desktop Atlas,9.8–12.4fps on mobile Atlas,7.3–9.9fps on desktop Home and9.6–12.7fps on mobile Home. These remain costly, uneven software-rendering results despite satisfying the maximum-rate gate. They reinforce the adaptive-cadence opportunity already identified; they do not establish smooth low-power performance.

### Final-data verdict and limits

**Final spec/performance verdict: PASS after renewed explicit regression review and justification.** I accept the larger observed loading tradeoff for this authorized richer presentation, while retaining the actual+38.8–52.7% regression and the worsened Home paint/startup-long-task observations in delivery evidence. This acceptance is based on the deliberately changed visual workload, early usable HTML/poster, and passing hard resource/stopped-work gates; it is not a claim that the slowdown is small, fully explained, or waived merely by being under700KB. The original condition requires review and justification, not a fixed upper latency bound. No additional failed performance requirement is established by the final dataset.

**Final code-quality/performance verdict: PASS with the material active-rendering limitation preserved.** No new avoidable-work defect can be attributed from these results alone. The art/model payload and render counters are unchanged, and the only runtime correction is cached MQL state; do not infer that this small correction caused the slower cold visits. Equally, do not dismiss those measured slower values as noise or replace them with the faster prior run. The final run is the delivery observation, and it remains a local three-sample result rather than a causal experiment or physical-device guarantee.

The archived candidate's reduced-motion functional failure no longer applies to this final measured binary: the corrected diagnostic visits pass. The generation audit and broader delivery acceptance remain separately owned by root. No browser, build, benchmark or source work was performed during this final-data review.

---

## Archived review of the first candidate

The final disposition above supersedes these earlier observations.

# Independent performance review — preserved pre-MQL-fix candidate

Reviewed the preserved candidate `performance-review.md`/`.json`, raw `baseline/metrics.json` and `candidate-before-mql-fix/metrics.json`, the binding lighting/motion/map plan, and the original Tech Spec §14. No source changes, builds, browser sessions or benchmark reruns. This is a performance-scope disposition; the separate reduced-motion correctness defect is not re-reviewed here.

## Verdicts

**Spec/performance verdict: PASS after explicit review and justification of the repeated regression, with the limitations below.** The >20% condition was triggered and is not a numerical pass. It requires review and justification, rather than automatic rejection or an automatic waiver from byte budgets. I accept the measured startup tradeoff for the explicitly requested richer presentation: the added payload explains much of the delay, essential HTML/CTA and FCP did not regress materially, and no performance hard gate is exceeded. This does not accept the archived candidate as a complete delivery: its dynamic reduced-motion defect remains a separate failed functional requirement, and the corrected frozen candidate still requires its own verification.

**Code-quality/performance verdict: PASS with a material active-rendering limitation and a non-blocking optimization opportunity.** These data do not establish an additional implementation defect or a breached interaction-latency requirement. They do establish expensive continuous rendering on the measured software backend. Do not describe this result as smooth, low-cost or representative of physical mobile hardware. Lower adaptive animation cadence is a concrete candidate for improvement; its benefit and visual cost are not demonstrated by this dataset.

## Independent evidence check

Raw inventories match for measurement-script hash, machine, browser and profile. Both runs use Chromium 153.0.8010.12, the same i7-7700 host, CPU×4, cold cache, DPR1, decimal 10/1Mbps and 40ms latency. Baseline ran before candidate, with three primary visits for each route/viewport. The renderer string identifies ANGLE/SwiftShader, not a physical mobile GPU. Patched renderer diagnostics are kept separate from unmodified primary timing observations.

| Condition | Median scene-ready baseline → candidate | Change | Median total long-task duration baseline → candidate |
| --- | ---: | ---: | ---: |
| Atlas desktop | 1128.0 → 1520.7ms | +34.8% | 653 → 4370ms |
| Atlas mobile | 1103.9 → 1436.4ms | +30.1% | 543 → 3967ms |
| Home desktop | 1074.5 → 1415.2ms | +31.7% | 563 → 4125ms |
| Home mobile | 1058.7 → 1385.5ms | +30.9% | 580 → 4020ms |

All three candidate scene-ready values in all four conditions exceed 1.2× the corresponding baseline median. Total long-task duration also exceeds that trigger repeatedly. The approximately 6.7–7.3× long-task totals must remain reported, but they compare different workloads: static baseline versus authorized continuous ambient motion. The phase analysis usefully separates that ongoing work from startup rather than relabeling it idle work.

Hard-gate checks in the raw records:

- Requested overview GLBs: **485,724 / 700,000 bytes**, exactly four model requests; zero external texture requests. No detail/simulation resources appear in the retained primary request inventories.
- Diagnostic maximum: **131 / 150 calls per render**, **18,072 / 100,000 triangles**. Accumulated GL draws are not calls per frame. The original baseline was 727 calls/23,582 triangles per render, so the new scene is substantially cheaper per draw by those structural counters.
- Active diagnostic rates remain below the24fps cap. Paused, initially reduced, hidden and offscreen observation windows show zero GL draws; resumed/restored windows render again. Dynamic reduced windows also show zero draws, but their stale control and missing authored reset prevent treating that functional state as correct.
- One poster is requested per visit:70,534desktop /58,790mobile raw bytes, within the220,000/150,000 budgets. JavaScript transfer rises214,324→233,897bytes on Atlas (+9.1%) and157,563→174,859bytes on Home (+11.0%); decoded JS rises793,096→848,197 and609,385→658,706 respectively. Procedural terrain cost has not vanished from the accounting.

## Loading tradeoff and attribution

The original-main comparison grows models192,644→485,724bytes, an additional293,080bytes (+152.1%). At10Mbps those extra bytes alone correspond to about234.5ms of ideal transfer time. The observed last-model-response median moves later210.7–235.1ms; that is consistent with payload being a major contributor, not proof of an exact network-only allocation.

The post-last-response interval also increases101.4–137.6ms. These boundaries include overlapping parsing, world assembly, shader/material setup, draw submission and observation. The existing data cannot isolate milliseconds attributable to the three lights, terrain construction or motion. Animation starts only after the first completed frame, so its subsequent repeated draw workload does not itself explain earlier first-ready delay.

The user explicitly approved richer maquettes before requesting this lighting/map/motion round. The approved rich overview was498,512GLB bytes; this measured round is12,788bytes smaller (−2.6%). It would therefore be incorrect to attribute the entire152.1% main-baseline payload increase to this latest delta or demand that the approved richness be removed to erase it. There is no equivalent approved-rich timing benchmark here to isolate the incremental round.

Meanwhile primary HTML/CTA layout medians remain about114–116ms and FCP stays roughly unchanged or improves. Poster response medians increase by about24–32ms. These observations support accepting an explicitly documented roughly0.33–0.39s later enhanced scene while essential content remains available. The15-second failure deadline is not used as a performance target or justification.

## Active-work cost and avoidable-work assessment

The candidate spends approximately1.72–1.86seconds of its roughly2-second active observations inside long tasks (about84–88% of elapsed time). Diagnostic rates are roughly5fps for desktop Atlas and10–12fps elsewhere. A24fps ceiling limits scheduling frequency; it does not establish smoothness or inexpensive frames. Continuous software rendering can still occupy most of the thread below that ceiling. Pause being effective does not erase this running cost.

No measured duplicate model requests, idle/offscreen rendering, over-budget scene structure or repeated terrain generation is established here. Richer geometry/materials and whole-scene redraws for the moving fixtures are the authorized workload, not by themselves accidental work. Removing the scene's detail or introducing a new rendering/cache architecture would be a disproportionate response without profiling evidence.

**Concrete non-blocking opportunity:** the reviewed playback policy uses a fixed minimum interval before scheduling the next ambient frame. A bounded render-cost-aware delay could give expensive backends more time between complete-scene redraws while preserving absolute motion sampling, the24fps ceiling, authored first pose and zero stopped work. This directly targets the measured sustained workload without changing the approved assets. It would also lower an already-low visible frame rate, so it needs a deliberate visual/interaction comparison; no saving or improved input latency is claimed here. The report contains no interaction-event latency, CPU attribution profile, physical-GPU measurement or energy measurement from which to select a reliable adaptive policy automatically.

The documented cost justifies retaining this as an optimization opportunity rather than inventing a new mandatory duty-cycle/fps budget during review. Conversely, these stress results cannot support a claim that active motion remains responsive on all low-power devices. The final delivery should preserve this limitation, the original threshold crossing and the fresh corrected-candidate evidence separately.
