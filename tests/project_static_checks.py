"""NEXT ROOM V5 — 파일 경로·스크립트 구문·오디오 연결 정적 검사 (WebGL 플레이 테스트를 대신하지 않음)."""
from pathlib import Path
import re, subprocess, json
root = Path(__file__).resolve().parent.parent
html = (root / 'index.html').read_text(encoding='utf-8')
# 1) local scripts / css exist and are referenced (no CDN dependency for core runtime)
for src in ['assets/vendor/three.min.js', 'assets/js/audio-manager.js', 'assets/js/procedural-props.js', 'assets/js/monster-models-v2.js', 'assets/js/v5-core.js', 'assets/js/math-bank-v5.js']:
    assert f'src="{src}"' in html, src
    assert (root / src).is_file(), src
assert 'href="assets/css/tailwind.css"' in html and (root / 'assets/css/tailwind.css').stat().st_size > 10000
assert 'cdn.tailwindcss.com' not in html, 'tailwind runtime CDN should not be required'
# script order: three -> props/models -> core -> bank -> inline game
order = [html.index(x) for x in ['assets/vendor/three.min.js', 'procedural-props.js', 'v5-core.js', 'math-bank-v5.js', 'window.NextRoomDebug']]
assert order == sorted(order), 'script order'
# 2) 7 monster constructors still wired
for name in ['gale', 'whisper', 'decoy', 'echo', 'ink', 'warden', 'spook']:
    assert f"NextRoomMonsters.create('{name}')" in html, name
# 3) audio: 실제 파일과 이름(대소문자 포함)이 정확히 일치하는지 — GitHub Pages(리눅스)는 대소문자를 구분함
am = (root / 'assets/js/audio-manager.js').read_text(encoding='utf-8')
tracks = dict(re.findall(r"(\w+): '(\d\d_\w+)'", am.split('const TRACKS')[1].split('};')[0]))
effects = dict(re.findall(r"(\w+): '(\w+)'", am.split('const EFFECTS')[1].split('};')[0]))
bgm_files = {p.name for p in (root / 'assets/audio/bgm').iterdir()}
sfx_files = {p.name for p in (root / 'assets/audio/sfx').iterdir()}
for k, f in tracks.items(): assert f + '.mp3' in bgm_files, ('missing/case bgm', f)
for k, f in effects.items(): assert f + '.mp3' in sfx_files, ('missing/case sfx', f)
assert set(tracks) >= {'lobby', 'explore', 'puzzle', 'darkRoom', 'gale', 'echo', 'ink', 'warden', 'decoy', 'safe'}
assert len(set(tracks.values())) == 9 and len(bgm_files - {'.gitkeep'}) == 9
foot = [f'footstep_{s}_{m}_{i:02d}.mp3' for s in ['carpet', 'wood', 'stone', 'metal'] for m, n in {'walk': 5, 'crouch': 3, 'run': 3}.items() for i in range(1, n + 1)]
missing_foot = [f for f in foot if f not in sfx_files]
assert not missing_foot, missing_foot
# 발소리가 아닌 기존 효과음 54개 + 예전 발소리 2개(대체용)가 모두 그대로 있음
others = {f for f in sfx_files if not f.startswith('footstep_')}
assert len(others) == 54 and {'footstep_carpet.mp3', 'footstep_wood.mp3'} <= sfx_files, len(others)
assert others <= {f + '.mp3' for f in effects.values()}, sorted(others - {f + '.mp3' for f in effects.values()})
used = set(re.findall(r"playSfx\('(\w+)'", html))
missing = sorted(u for u in used if u not in effects)
assert not missing, f'playSfx keys without audio file mapping: {missing}'
assert "playSfx('step')" not in html and "playSfx(player.isCrouching ? 'crouchStep'" not in html, 'old footstep calls remain'
scenes = set(re.findall(r"setBgmMode\('(\w+)'\)", html)) | {'darkRoom', 'decoy', 'explore', 'warden', 'ink'}
assert all(s in tracks for s in scenes), [s for s in scenes if s not in tracks]
# 모든 HTML/JS에서 assets/audio 경로를 직접 쓰는 곳도 실제 파일과 대조
for m in re.findall(r"assets/audio/(bgm|sfx)/([\w\-]+\.mp3)", html + am):
    assert m[1] in (bgm_files if m[0] == 'bgm' else sfx_files), m
# 4) syntax of every script
for p in (root / 'assets/js').glob('*.js'):
    subprocess.run(['node', '--check', str(p)], check=True, capture_output=True)
for p in [root / 'index.html', root / 'monster_gallery.html', root / '3d_asset_gallery.html']:
    text = p.read_text(encoding='utf-8')
    for i, m in enumerate(re.finditer(r'<script(?:\s+[^>]*)?>([\s\S]*?)</script>', text)):
        code = m.group(1)
        if code.strip():
            r = subprocess.run(['node', '--check', '--input-type=commonjs'], input=code, text=True, capture_output=True)
            assert r.returncode == 0, f'{p.name} script {i}: {r.stderr}'
# 5) removed legacy bank must not come back
for legacy in ['INTERACTIVE_MATH_BANK', 'ProblemDeckManager', 'DEFENSE_MATH_BANK']:
    assert legacy not in html, legacy
print('PASS: local runtime files, script order, 7 monsters, 9 BGM + %d effect keys + 44 footsteps (exact-case file names), syntax' % len(effects))
