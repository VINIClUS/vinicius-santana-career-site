# SO-09 — reference release audit

This release aligns the shared portfolio routes, selected-work details and
Systems Observatory with the approved [visual reference](../systems-observatory-visual-reference.png).
Captures were made from a fresh local production build (`npm run build`) served
with Astro preview, in Chromium at 1440×900 and 390×844. Route captures are
deterministic full-page images. The three interactive-state captures use the
actual relevant panel/map crop so their selected or fallback state remains
legible: **View 2D** is the Observatory map, while Infrastructure failed/reset
are the Infrastructure failover panel.

## Route and state evidence

| Route or state | Desktop (1440×900) | Mobile (390×844) |
| --- | --- | --- |
| Home | [home-1440.png](home-1440.png) | [home-390.png](home-390.png) |
| Work | [work-1440.png](work-1440.png) | [work-390.png](work-390.png) |
| Work — CnesData | [work-cnesdata-1440.png](work-cnesdata-1440.png) | [work-cnesdata-390.png](work-cnesdata-390.png) |
| Work — LimnoPulse | [work-limnopulse-1440.png](work-limnopulse-1440.png) | [work-limnopulse-390.png](work-limnopulse-390.png) |
| Work — Infrastructure | [work-infrastructure-1440.png](work-infrastructure-1440.png) | [work-infrastructure-390.png](work-infrastructure-390.png) |
| Systems Observatory | [observatory-1440.png](observatory-1440.png) | [observatory-390.png](observatory-390.png) |
| Infrastructure failed | [infrastructure-failed-1440.png](infrastructure-failed-1440.png) | [infrastructure-failed-390.png](infrastructure-failed-390.png) |
| Infrastructure reset | [infrastructure-reset-1440.png](infrastructure-reset-1440.png) | [infrastructure-reset-390.png](infrastructure-reset-390.png) |
| Observatory — View 2D | [view-2d-1440.png](view-2d-1440.png) | [view-2d-390.png](view-2d-390.png) |
| About | [about-1440.png](about-1440.png) | [about-390.png](about-390.png) |
| Resume | [resume-1440.png](resume-1440.png) | [resume-390.png](resume-390.png) |

## Audit observations

- The primary navigation exposes **Work**, **Explore**, **About**, **Contact**
  and **Resume** on the shared shell. Home’s two hero actions lead to selected
  work and the Observatory.
- `/explore/` shows its HTML poster and district links immediately. On this
  capable Chromium run the on-demand 3D canvas completed before the Observatory
  capture; **View 2D** then returned to the poster while retaining the selected
  CnesData district.
- The Infrastructure failure capture was produced with the page’s **Fail
  node-02** control: node-02 is failed, the workload is transferred to node-01
  and the synthetic timeline has three entries. **Reset simulation** restores the
  three online nodes, original workload placement and empty timeline.
- Desktop and portrait layouts stayed within their viewport widths on every
  captured route. The route tops retain the reference’s dark blue field,
  technical grid/illustration language, restrained cyan accents and editorial
  type hierarchy; the portrait layout preserves readable navigation and calls
  to action.
