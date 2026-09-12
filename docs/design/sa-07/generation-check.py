"""Run from a disposable checkout; never copy GPU-dependent generated pixels back."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import time

output = Path(sys.argv[1]).resolve()
report = {"commit": subprocess.check_output(["rtk", "proxy", "git", "rev-parse", "HEAD"], text=True).strip(), "runs": []}
metadata_path = Path("src/content/scenes/generated.json")
expected = sorted(["district-cnesdata", "district-limnopulse", "district-infrastructure", "hub", "detail-cnesdata", "detail-infrastructure", "overview", "detail-infrastructure-failed"])
def inventory():
    metadata = json.loads(metadata_path.read_text())
    assert sorted(metadata) == expected
    for layout in metadata["overview"]["layouts"].values():
        assert sorted(layout["districtPositions"]) == ["cnesdata", "infrastructure", "limnopulse"]
    files = sorted(p.name for p in Path("public/assets/posters").glob("*.webp"))
    assert files == sorted(f"{name}-{variant}.webp" for name in expected for variant in ["desktop", "mobile"])
    return {"metadataIds": sorted(metadata), "posters": files, "models": sorted(p.name for p in Path("public/assets/scenes").glob("*.glb"))}
for args in [["npm", "run", "assets:generate"], ["npm", "run", "assets:generate", "--", "hub"]]:
    if args[-1] == "hub":
        metadata = json.loads(metadata_path.read_text())
        retained = {key: value for key, value in metadata.items() if key != "hub"}
        for key in ["district-public-health", "district-observability", "home-globe", "work-cnesdata"]:
            metadata[key] = {"obsolete": True}
        for layout in metadata["overview"]["layouts"].values():
            layout["districtPositions"]["observability"] = [0, 0, 0]
            layout["districtPositions"]["public-health"] = [0, 0, 0]
        metadata_path.write_text(json.dumps(metadata))
    start = time.time()
    result = subprocess.run(["rtk", *args], capture_output=True, text=True)
    assert result.returncode == 0, result.stdout + result.stderr
    current = inventory()
    if args[-1] == "hub":
        after = json.loads(metadata_path.read_text())
        for key in ["detail-cnesdata", "detail-infrastructure", "detail-infrastructure-failed"]:
            assert after[key] == retained[key]
    report["runs"].append({"command": "rtk " + " ".join(args), "exitCode": result.returncode, "seconds": round(time.time()-start,2), "output": result.stdout+result.stderr, **current})
report["passed"] = True
report["pixelPolicy"] = "Generated pixels remain in disposable checkout; release assets are unchanged except deliberate retired-file deletion."
output.write_text(json.dumps(report, indent=2)+"\n")
print("Full and partial generation passed")
