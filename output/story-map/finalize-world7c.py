import json
from pathlib import Path

root=Path(__file__).resolve().parents[2]
layout=json.loads((root/'assets/story/chapter-7c-map-layout.json').read_text(encoding='utf-8'))
review=json.loads((root/'output/story-map/world7c-browser-review.json').read_text(encoding='utf-8'))
prompts=(root/'assets/story/source/world7c/prompts.txt').read_text(encoding='utf-8').split('\n--- Revision 2 ---\n')
metadata={
 'date':'2026-10-25', 'world':'7C', 'tool':'built-in image_gen.imagegen', 'model':'not disclosed by tool',
 'styleReference':'assets/story/chapter-1-library-map.webp', 'initialLayoutReference':None,
 'generationHistory':[
  {'source':'assets/story/source/world7c/01-initial-29-waypoints.png','prompt':prompts[0],'review':'Rejected: 29 waypoints instead of 30.'},
  {'source':'assets/story/source/world7c/02-final-30-waypoints.png','references':['assets/story/chapter-1-library-map.webp','assets/story/source/world7c/01-initial-29-waypoints.png'],'prompt':prompts[1],'review':'30 visible waypoints; added landing before final vault.'}
 ],
 'runtime':'assets/story/chapter-7c-royal-dungeon-map.webp',
 'targetDimensions':[1024,3072], 'actualSourceDimensions':[724,2172], 'runtimeDimensions':[724,2172],
 'stageCount':30, 'midbossStage':10, 'finalBossStage':30, 'progression':'top-to-bottom',
 'actualWaypointPixelCenters':layout['pixelCenters'], 'actualWaypointPositions':layout['positions'],
 'coordinateMeasurement':'Manual review of gold pedestal centers with violet-body component detection and numbered overlay.',
 'review':{'technical':'passed','style':'Compared to authoritative library map: painterly cream stone, foliage, violet crystals and atmospheric depth. Underground light matches dungeon setting.','waypoints':'30 separate pedestals; increasing y; continuous descending path; no clipping.','browser':review,'coordinateOverlay':'output/story-map/world7c-coordinate-review.jpg','browserEvidence':'output/story-map/world7c-browser-review.json','build':'npm run build passed','userApproval':'not requested or recorded'},
 'integration':'Map preview only. Disabled stage buttons; no combat, score records, new vocabulary or rewards. Navigation from 6B.'
}
(root/'assets/story/chapter-7c-royal-dungeon-map.generation.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Wrote full prompts, references, measured coordinates, dimensions and review record.')
