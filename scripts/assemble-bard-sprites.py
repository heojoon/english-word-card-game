"""Pack reviewed Bard source art into runtime strips without repainting it.

Run --inspect before assembly. source/layout.json may supply reviewed cropBoxes,
referenceHeightPx, anchorXs and frameWidth per source sheet. Crops are checked
against the alpha mask; every source/review master is rebuilt with exact 50px
transparent separators. Raw generation originals are never changed.
"""
from pathlib import Path
import argparse
import json
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1] / 'assets/characters/bard'
CONTRACT = json.loads((ROOT / 'animation-contract.json').read_text(encoding='utf-8'))
WIDTH, HEIGHT, GROUND = CONTRACT['frameWidth'], CONTRACT['frameHeight'], CONTRACT['groundLinePx']
GAP = CONTRACT['sourceFrameGapPx']
LAYOUT_PATH = ROOT / 'source/layout.json'
LAYOUT = json.loads(LAYOUT_PATH.read_text(encoding='utf-8')) if LAYOUT_PATH.exists() else {}


def rgba(path):
    image = Image.open(path).convert('RGBA')
    image.putalpha(image.getchannel('A').point(lambda a: 0 if a < CONTRACT['alphaNoiseThreshold'] else a))
    return image


def split_sheet(name, count=3):
    path = ROOT / 'source' / (name + '.png')
    image = rgba(path)
    alpha = image.getchannel('A')
    cfg = LAYOUT.get(name, {})
    boxes = cfg.get('cropBoxes')
    if boxes is None:
        # Locate genuinely empty vertical runs close to expected sheet divisions.
        # Foreground is never sliced on an assumed fixed slot edge.
        columns = [alpha.crop((x, 0, x + 1, image.height)).getbbox() is not None for x in range(image.width)]
        empty, start = [], None
        for x, used in enumerate(columns + [True]):
            if not used and start is None:
                start = x
            if used and start is not None:
                if x - start >= 12:
                    empty.append((start, x))
                start = None
        separators = []
        for division in range(1, count):
            target = image.width * division / count
            candidates = [run for run in empty if abs(sum(run) / 2 - target) <= image.width / count * .30]
            if not candidates:
                raise ValueError(f'{name}: no clear separator near division {division}; supply reviewed cropBoxes')
            separators.append(min(candidates, key=lambda run: abs(sum(run) / 2 - target)))
        cuts = [0] + [round(sum(run) / 2) for run in separators] + [image.width]
        if len(set(cuts)) != count + 1:
            raise ValueError(f'{name}: ambiguous separators; supply reviewed cropBoxes')
        boxes = [(cuts[i], 0, cuts[i + 1], image.height) for i in range(count)]
    if len(boxes) != count:
        raise ValueError(f'{name}: expected {count} reviewed crop boxes')
    frames, bounds = [], []
    for box in boxes:
        frame = image.crop(box)
        bound = frame.getchannel('A').getbbox()
        if not bound:
            raise ValueError(f'{name}: blank frame {box}')
        if bound[0] <= 0 or bound[2] >= frame.width:
            raise ValueError(f'{name}: alpha touches inner crop edge {box}; reject crowded source')
        frames.append(frame)
        bounds.append(bound)
    return frames, bounds, {**cfg, 'resolvedCropBoxes': [list(box) for box in boxes]}


def source_groups(action, variant):
    if action == 'idle':
        names = [f'identity-{variant}', f'idle-{variant}-02']
        images = [rgba(ROOT / 'source' / (name + '.png')) for name in names]
        return [(name, [image], [image.getchannel('A').getbbox()], LAYOUT.get(name, {})) for name, image in zip(names, images)]
    names = ([f'attack-{variant}-01-03', f'attack-{variant}-04-06'] if action == 'attack'
             else [f'hit-{variant}-01-03'] if action == 'hit'
             else ['projectile-01-03', 'projectile-04-06'])
    return [(name, *split_sheet(name)) for name in names]


def normalize_group(name, images, bounds, cfg, projectile, frame_width):
    # One scale for the complete group, including prone frames. referenceHeightPx
    # is the reviewed upright unit, never the shorter knockdown bounding box.
    reference_height = cfg.get('referenceHeightPx')
    if reference_height is None:
        reference_height = max(box[3] - box[1] for box in bounds)
    scale = (cfg.get('runtimeHeightPx', 156) if projectile else CONTRACT['standingHeightPx']) / reference_height
    frames, details = [], []
    for index, (image, box) in enumerate(zip(images, bounds)):
        crop = image.crop(box)
        size = (round(crop.width * scale), round(crop.height * scale))
        if not all(size):
            raise ValueError(f'{name}: empty normalization size')
        resized = crop.resize(size, Image.Resampling.LANCZOS)
        anchors = cfg.get('anchorXs')
        if anchors:
            source_x = anchors[index]
        elif projectile:
            source_x = (box[0] + box[2]) / 2
        else:
            # Use feet/ground contact rather than a cape or harp's horizontal
            # extent to stabilize the bottom-center anchor across action poses.
            contact_top = box[3] - max(1, round((box[3] - box[1]) * .12))
            contact = image.getchannel('A').crop((0, contact_top, image.width, box[3])).getbbox()
            source_x = (contact[0] + contact[2]) / 2
        x = round(frame_width / 2 - (source_x - box[0]) * scale)
        y = round((HEIGHT - resized.height) / 2) if projectile else GROUND - resized.height
        if x < 8 or x + resized.width > frame_width - 8 or y < 8:
            raise ValueError(f'{name} frame {index + 1}: bounds {(x,y,*size)} do not fit {frame_width}x{HEIGHT}; review scale or widen cell')
        cell = Image.new('RGBA', (frame_width, HEIGHT))
        cell.alpha_composite(resized, (x, y))
        frames.append(cell)
        details.append({'source': f'source/{name}.png', 'sourceFrame': index + 1, 'bounds': list(box),
                        'sourceCropBox': cfg.get('resolvedCropBoxes', [[0, 0, image.width, image.height]])[index if 'resolvedCropBoxes' in cfg else 0],
                        'sourceReferenceHeightPx': reference_height, 'scale': scale, 'anchorXPx': source_x,
                        'anchorMethod': 'reviewed' if anchors else 'effect-center' if projectile else 'lower-12-percent-ground-contact',
                        'destination': [x, y], 'rawSourcePreserved': True})
    return frames, details


def pack(frames, gap):
    width, height = frames[0].size
    strip = Image.new('RGBA', (len(frames) * width + (len(frames) - 1) * gap, height))
    for index, frame in enumerate(frames):
        strip.alpha_composite(frame, (index * (width + gap), 0))
    return strip


def composites(frames, name):
    width, height = frames[0].size
    for display_height, suffix in [(320, 'full'), (128, 'mobile')]:
        factor = display_height / height
        display_width = round(width * factor)
        canvas = Image.new('RGB', (len(frames) * (display_width + 8), 2 * (display_height + 16)), '#F7F7FF')
        draw = ImageDraw.Draw(canvas)
        draw.rectangle((0, display_height + 16, canvas.width, canvas.height), fill='#5751D8')
        for row in range(2):
            for index, frame in enumerate(frames):
                small = frame.resize((display_width, display_height), Image.Resampling.LANCZOS)
                x, y = index * (display_width + 8) + 4, row * (display_height + 16) + 4
                canvas.paste(small, (x, y), small)
                draw.rectangle((x, y, x + display_width - 1, y + display_height - 1), outline='#B3AECF')
                draw.line((x, y + round(GROUND * factor), x + display_width, y + round(GROUND * factor)), fill='#60D9CF')
        canvas.save(ROOT / 'review' / f'{name}-{suffix}-light-violet.png')


def build(action, variant=None):
    projectile = action == 'projectile'
    name = action if projectile else f'{action}-{variant}'
    spec = CONTRACT['actions'][action]
    groups = source_groups(action, variant)
    frame_width = max([spec.get('frameWidth', WIDTH)] + [cfg.get('frameWidth', WIDTH) for _, _, _, cfg in groups])
    frames, normalization, source_crops = [], [], []
    for group_name, images, bounds, cfg in groups:
        normalized, details = normalize_group(group_name, images, bounds, cfg, projectile, frame_width)
        frames.extend(normalized)
        normalization.extend(details)
        # Keep cropped original-size frames separate from normalized runtime art.
        extracted = ROOT / 'source-frames' / name
        extracted.mkdir(parents=True, exist_ok=True)
        start = len(frames) - len(images)
        for index, (image, box) in enumerate(zip(images, bounds)):
            crop = image.crop(box)
            crop.save(extracted / f'{start + index + 1:02}.png')
            source_crops.append(crop)
    if len(frames) != spec['frameCount']:
        raise ValueError(f'{name}: incorrect frame count')
    destination = ROOT / name
    destination.mkdir(parents=True, exist_ok=True)
    for index, frame in enumerate(frames):
        frame.save(destination / f'{index + 1:02}.png')
    filename = 'char_bard_sd_projectile_strip.png' if projectile else f'char_bard_{variant}_sd_{action}_strip.png'
    pack(frames, 0).save(ROOT / filename)
    pack(frames, GAP).save(ROOT / 'review' / f'{name}-source-50px.png')
    source_width = max(crop.width for crop in source_crops) + 16
    source_height = max(crop.height for crop in source_crops) + 16
    source_cells = []
    for crop in source_crops:
        cell = Image.new('RGBA', (source_width, source_height))
        cell.alpha_composite(crop, ((source_width - crop.width) // 2, source_height - crop.height - 8))
        source_cells.append(cell)
    source_master = ROOT / 'source-frames' / name / 'source-master-50px.png'
    pack(source_cells, GAP).save(source_master)
    manifest_frames = []
    for index, (frame_name, duration) in enumerate(zip(spec['names'], spec['durationsMs'])):
        frame = {'index': index, 'name': frame_name, 'durationMs': duration}
        if index == spec.get('releaseFrame'):
            frame['release'] = True
        if index == spec.get('hitFrame'):
            frame['hit'] = True
        if action == 'hit' and index == 2:
            frame['finalHold'] = True
        manifest_frames.append(frame)
    manifest = {'image': filename, 'frameWidth': frame_width, 'frameHeight': HEIGHT,
                'frameCount': len(frames), 'layout': 'horizontal', 'facing': 'right',
                'anchor': CONTRACT['projectileAnchor'] if projectile else CONTRACT['anchor'],
                'groundLinePx': None if projectile else GROUND, 'sourceFrameGapPx': GAP,
                'frames': manifest_frames, 'projectile': projectile, 'normalization': normalization,
                'canonicalIllustration': CONTRACT['canonicalIllustration'],
                'identityMaster': None if projectile else f'source/identity-{variant}.png',
                'sourceMaster': f'source-frames/{name}/source-master-50px.png',
                'sourceFrameWidth': source_width, 'sourceFrameHeight': source_height,
                'rawGenerationSheets': list(dict.fromkeys(detail['source'] for detail in normalization)),
                'rawGenerationSpacing': 'Preserved raw; extracted source master repacked with exact 50px transparent gaps.',
                'reviewMaster': f'review/{name}-source-50px.png',
                'reviewStatus': 'Alpha, equal slots and transparent spacing checked; visual and browser review pending.'}
    if action in ('attack', 'projectile'):
        manifest.update({'releaseMs': CONTRACT['releaseMs'], 'contactMs': CONTRACT['contactMs'],
                         'reducedContactMs': CONTRACT['reducedContactMs'], 'finalActive': action == 'attack'})
    if action == 'attack':
        manifest['frame01MatchesIdle'] = False
        manifest['effectBounds'] = 'Harp charge glow stays with hero; detached notes use separate centered projectile layer.'
    if action == 'idle':
        manifest['loop'] = True
    (ROOT / filename.replace('.png', '.json')).write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    composites(frames, name)
    preview = [frame.resize((round(frame_width * .4), 128), Image.Resampling.LANCZOS) for frame in frames]
    preview[0].save(ROOT / 'review' / f'{name}-preview.webp', save_all=True, append_images=preview[1:],
                    duration=spec['durationsMs'], loop=0, lossless=True)
    print(f'{name}: {len(frames)} frames, {frame_width}x{HEIGHT}, exact {GAP}px review gaps')


def profiles():
    original = Image.open(ROOT / CONTRACT['canonicalIllustration']).convert('RGBA')
    output = ROOT.parents[1] / 'avatars/variants'
    output.mkdir(parents=True, exist_ok=True)
    # Preserve original illustration, including existing backdrop, as requested.
    boxes = {'male': (0, 0, 740, 740), 'female': (750, 0, 1536, 786)}
    records = {}
    for variant, box in boxes.items():
        filename = f'bard-{variant}.webp'
        original.crop(box).resize((512, 512), Image.Resampling.LANCZOS).save(output / filename, quality=92, method=6)
        records[variant] = {'source': CONTRACT['canonicalIllustration'], 'cropBox': list(box),
                            'export': f'assets/avatars/variants/{filename}', 'size': [512, 512],
                            'background': 'Preserved from concept; no background removal or redesign.', 'battleArt': False}
    (ROOT / 'profile-exports.json').write_text(json.dumps(records, indent=2) + '\n', encoding='utf-8')
    print('Profile crops exported from original non-SD concept artwork.')


def battle_composites():
    """Offline diagnostics using the production CSS dimensions and clock order."""
    arena_height, hero_size, projectile_size = 160, 120.5, 72
    projectile_frames = [rgba(ROOT / 'projectile' / f'{index:02}.png') for index in range(1, 7)]
    enemy = rgba(ROOT.parents[1] / 'monsters/royal-slime/royal-slime-sd.png')
    enemy = enemy.crop(enemy.getchannel('A').getbbox())
    enemy.thumbnail((78, 78), Image.Resampling.LANCZOS)
    times = [0, 300, 400, 520, 640, 700, 760]
    metadata = {'method': 'Offline composite, not browser or in-engine verification',
                'arenaHeight': arena_height, 'heroCellHeight': hero_size,
                'heroGroundBottom': 13, 'castOriginNormalized': [.64, .47],
                'projectileBox': [projectile_size, projectile_size],
                'releaseMs': 400, 'contactMs': 640, 'finalBurstMs': 700,
                'resetMs': 760, 'reducedMotionScale': .4, 'viewports': [320, 390],
                'visualReview': 'Pending compositor inspection.'}
    for variant in CONTRACT['variants']:
        attack = [rgba(ROOT / f'attack-{variant}' / f'{index:02}.png') for index in range(1, 7)]
        idle = rgba(ROOT / f'idle-{variant}/01.png')
        for arena_width in [320, 390]:
            hero_left = .02 * arena_width + (148 - hero_size) / 2
            hero_top = arena_height - 13 - hero_size
            origin = (hero_left + hero_size * .64, hero_top + hero_size * .47)
            target = (arena_width - 58, 96)

            def snapshot(time, color):
                arena = Image.new('RGBA', (arena_width, arena_height), color)
                draw = ImageDraw.Draw(arena)
                draw.line((0, 144, arena_width, 144), fill='#60D9CF', width=1)
                draw.line((target[0] - 4, target[1], target[0] + 4, target[1]), fill='#EF5B67')
                draw.line((target[0], target[1] - 4, target[0], target[1] + 4), fill='#EF5B67')
                arena.alpha_composite(enemy, (round(target[0] - enemy.width / 2), round(target[1] - enemy.height / 2)))
                source = idle if time >= 760 else attack[min(5, int(time // 100))]
                hero = source.resize((round(hero_size), round(hero_size)), Image.Resampling.LANCZOS)
                arena.alpha_composite(hero, (round(hero_left), round(hero_top)))
                if 400 <= time < 760:
                    index = min(5, int((time - 400) // 60))
                    progress = min(1, (time - 400) / 240)
                    center = tuple(origin[i] + (target[i] - origin[i]) * progress for i in range(2))
                    projectile = projectile_frames[index].resize((projectile_size, projectile_size), Image.Resampling.LANCZOS)
                    arena.alpha_composite(projectile, (round(center[0] - projectile_size / 2), round(center[1] - projectile_size / 2)))
                return arena

            # Rows show both backgrounds and both motion clocks; the same beats
            # must remain visible when every timing is shortened to forty percent.
            composite = Image.new('RGB', (arena_width * len(times), (arena_height + 22) * 4), '#F7F7FF')
            draw = ImageDraw.Draw(composite)
            for row, (color, motion_scale) in enumerate([('#F7F7FF', 1), ('#5751D8', 1), ('#F7F7FF', .4), ('#5751D8', .4)]):
                for index, time in enumerate(times):
                    x, y = arena_width * index, (arena_height + 22) * row
                    arena = snapshot(time, color)
                    composite.paste(arena.convert('RGB'), (x, y + 22))
                    draw.text((x + 5, y + 5), f'{round(time * motion_scale)}ms | {"normal" if motion_scale == 1 else "reduced"}', fill='#24214C')
                    draw.rectangle((x, y + 22, x + arena_width - 1, y + arena_height + 21), outline='#B3AECF')
            composite.save(ROOT / 'review' / f'battle-timeline-{variant}-{arena_width}-light-violet.png')
            animation_times = [0, 100, 200, 300, 400, 460, 520, 580, 640, 700, 760]
            durations = [animation_times[index + 1] - time for index, time in enumerate(animation_times[:-1])] + [500]
            for motion_scale, suffix in [(1, 'normal'), (.4, 'reduced')]:
                frames = [snapshot(time, '#F7F7FF') for time in animation_times]
                frames[0].save(ROOT / 'review' / f'battle-timeline-{variant}-{arena_width}-{suffix}.webp',
                               save_all=True, append_images=frames[1:],
                               duration=[round(value * motion_scale) for value in durations], loop=0, lossless=True)
    (ROOT / 'review/battle-composite-review.json').write_text(json.dumps(metadata, indent=2) + '\n', encoding='utf-8')
    print('Offline combined timelines: male/female, 320/390px, light/violet, normal/reduced.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--inspect', action='store_true')
    parser.add_argument('--profiles-only', action='store_true')
    parser.add_argument('--composites-only', action='store_true')
    parser.add_argument('--action', choices=['idle', 'attack', 'hit', 'projectile'])
    parser.add_argument('--variant', choices=CONTRACT['variants'])
    args = parser.parse_args()
    (ROOT / 'review').mkdir(parents=True, exist_ok=True)
    if args.inspect:
        for path in sorted((ROOT / 'source').glob('*.png')):
            image = rgba(path)
            print(json.dumps({'source': path.name, 'size': image.size, 'alphaBounds': image.getchannel('A').getbbox()}))
    elif args.profiles_only:
        profiles()
    elif args.composites_only:
        battle_composites()
    else:
        for variant in ([args.variant] if args.variant else CONTRACT['variants']):
            for action in ([args.action] if args.action and args.action != 'projectile' else [] if args.action else ['idle', 'attack', 'hit']):
                build(action, variant)
        if args.action in (None, 'projectile'):
            build('projectile')
        if args.action is None:
            profiles()
            battle_composites()
