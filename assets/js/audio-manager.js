/* NEXT ROOM V5 — 오디오 관리자 (BGM 9곡 · 효과음 · 표면별 발소리)
 * - Web Audio API: 디코딩한 버퍼를 이음새 없이 루프하고(앞뒤 디코더 무음 자동 제거), 장면이 바뀌면 1.2초 크로스페이드.
 * - BGM / 효과음 볼륨은 서로 독립된 버스(GainNode). 발소리는 효과음 버스 안의 '발소리 버스'(저역 필터)로 더 낮고 부드럽게.
 * - 첫 클릭/터치/키 입력 전에는 아무것도 재생하지 않음 → 브라우저 자동재생 차단 오류 없음.
 * - Web Audio가 없는 브라우저에서는 HTMLAudioElement로 재생(이전 방식).
 * 공개 API(이전과 동일): settings, setVolume, setMuted, unlock, init, refreshControls, setScene, playSfx, stopEffects
 * 추가 API: playFootstep(surface, mode, volume), stopFootsteps(), status()
 */
(function () {
  'use strict';
  const TRACKS = {
    lobby: '01_title_lobby',
    explore: '02_hotel_exploration',
    puzzle: '03_math_puzzle',
    darkRoom: '04_blackout_darkroom',
    gale: '05_gale_echo_tension',
    echo: '05_gale_echo_tension',
    closet: '05_gale_echo_tension',
    ink: '06_ink_chase',
    warden: '07_warden_library',
    decoy: '08_decoy_secretrooms',
    safe: '09_safe_recovery'
  };
  // 발소리(step/crouchStep)는 여기서 빼고 playFootstep()으로만 재생 → 예전 발소리와 겹치지 않음
  const EFFECTS = {
    key: 'keypad_press', itemPickup: 'item_pickup', drawerOpen: 'drawer_pull_open', drawerClose: 'drawer_push_close',
    unlock: 'door_unlock_magic', mechanism: 'puzzle_device_activate', closetOpen: 'closet_wood_open', closetClose: 'closet_wood_close',
    closetRattle: 'closet_knocks', closetCreakSlow: 'closet_slow_handle', closetEnter: 'closet_enter_muffle',
    doorSlam: 'door_heavy_slam', doorOpen: 'door_wood_creak_open', doorLock: 'door_lock_click', flicker: 'light_flicker',
    galeDistant: 'gale_light_warning', galeApproach: 'gale_fast_approach', galePass: 'gale_corridor_pass', galeReturn: 'gale_return_growl', galeAttack: 'gale_attack_shriek',
    echoWarn: 'echo_glitch_warning', echoPass: 'echo_bypass', echoReturn: 'echo_turn_back',
    psst: 'whisper_corner_whisper', whisperGiggle: 'whisper_airy_giggle', whisperWince: 'whisper_spotted_hiss', whisperBanish: 'whisper_light_repel', whisperAttack: 'whisper_attack_scream',
    wardenStep: 'warden_step', wardenGrowl: 'warden_breath_growl', wardenAlert: 'warden_alert_roar', wardenSniff: 'warden_sniff',
    spookStartle: 'spook_jumpscare_sting', spookLaugh: 'spook_creepy_laugh',
    closetKnock: 'closet_knocks', closetEject: 'closet_force_exit', closetBreath: 'closet_stale_breath',
    hitImpact: 'player_hit_dizzy', playerRecover: 'player_breath_recover', breath: 'player_breath_recover',
    win: 'puzzle_correct', puzzleCorrect: 'puzzle_correct', puzzleWrong: 'puzzle_wrong',
    batteryWarning: 'battery_warning', flashlightOn: 'flashlight_on', flashlightOff: 'flashlight_off', keyPickup: 'key_pickup',
    decoyDistortion: 'decoy_door_distortion', decoyAttack: 'decoy_lunge_attack',
    inkRoar: 'ink_chase_roar', inkEmerge: 'ink_emerge', inkSteps: 'ink_steps_heavy',
    bridge: 'bridge_deploy', doorLocked: 'door_rattle_locked',
    heartbeat: 'ambient_heartbeat', pipeKnock: 'ambient_pipe_knock', hotelWhisper: 'ambient_hotel_whisper'
  };
  // 효과음별 기본 음량 배율: 퍼즐 답 입력 버튼 '삑' 소리(keypad_press)가 다른 소리보다 커서 낮춤 (V5.2)
  const EFFECT_GAIN = { key: 0.35 };
  // 표면별 발소리 파일: footstep_{surface}_{mode}_{NN}.mp3
  const SURFACES = ['carpet', 'wood', 'stone', 'metal'];
  const STEP_COUNT = { walk: 5, crouch: 3, run: 3 };
  const STEP_GAIN = { walk: 0.30, crouch: 0.14, run: 0.42 };     // 예전 발소리(0.45/0.26)보다 낮게
  const LEGACY_STEP = { carpet: 'footstep_carpet', wood: 'footstep_wood', stone: 'footstep_wood', metal: 'footstep_wood' };
  const footstepFile = (s, m, i) => `footstep_${s}_${m}_${String(i).padStart(2, '0')}`;

  const BASE = 'assets/audio/';
  const limits = { key: 55, wardenStep: 220, closetKnock: 900, psst: 1500, galeDistant: 1300, echoWarn: 1300, heartbeat: 300, doorLocked: 600, wardenAlert: 900 };
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, Number(v) || 0));
  const FADE = 1.2;

  function readSettings() {
    try {
      const v = JSON.parse(localStorage.getItem('mathDoorsAudioSettings_v1') || '{}');
      return { bgm: clamp(v.bgm ?? 0.38), sfx: clamp(v.sfx ?? 0.75), muted: !!v.muted };
    } catch (_) { return { bgm: 0.38, sfx: 0.75, muted: false }; }
  }

  class SoundManager {
    constructor() {
      this.settings = readSettings();
      this.mode = null; this.wantedTrack = null;
      this.unlocked = false; this.ready = false;
      this.ctx = null; this.useWebAudio = !!(window.AudioContext || window.webkitAudioContext);
      this.buffers = new Map();      // name -> Promise<AudioBuffer|null>
      this.failed = new Set();       // 불러오지 못한 파일 이름
      this.track = null;             // {name, src, gain} (Web Audio) or {name, el, gain} (HTML)
      this.fading = [];
      this.effects = new Set();      // HTML fallback voices
      this.footVoices = new Set();
      this.lastEffect = new Map();
      this.lastStep = new Map();     // surface:mode -> last index (같은 파일 연속 방지)
      this.lastStepFile = '';
      this.pausedForVisibility = false;
      this.stats = { bgmStarts: 0, sfx: 0, steps: 0, errors: [] };
      document.addEventListener('visibilitychange', () => this._onVisibility());
      // 첫 사용자 입력에서 잠금 해제 (클릭·터치·키). 해제 후 리스너 제거
      this._unlockHandler = () => { this.unlock(); };
      ['pointerdown', 'touchend', 'keydown', 'click'].forEach(ev => document.addEventListener(ev, this._unlockHandler, { capture: true, passive: true }));
    }

    // ------------------------------------------------------------ 공통
    save() { try { localStorage.setItem('mathDoorsAudioSettings_v1', JSON.stringify(this.settings)); } catch (_) { /* ignore */ } }
    _busLevel(kind) { return this.settings.muted ? 0 : this.settings[kind]; }
    applyVolume() {
      if (this.ctx) {
        const t = this.ctx.currentTime;
        this.bgmBus.gain.setTargetAtTime(this._busLevel('bgm'), t, 0.05);
        this.sfxBus.gain.setTargetAtTime(this._busLevel('sfx'), t, 0.05);
      }
      if (this.track && this.track.el) this.track.el.volume = clamp(this.track.gain * this._busLevel('bgm'));
      for (const t of this.fading) if (t.el) t.el.volume = clamp(t.gain * this._busLevel('bgm'));
      for (const fx of this.effects) fx.el.volume = clamp(fx.gain * this._busLevel('sfx'));
    }
    setVolume(kind, value) { if (kind !== 'bgm' && kind !== 'sfx') return; this.settings[kind] = clamp(value); this.save(); this.applyVolume(); this.refreshControls(); }
    setMuted(value) { this.settings.muted = !!value; this.save(); this.applyVolume(); if (!this.settings.muted) this.unlock(); this.refreshControls(); }
    init() { this.ready = true; this.refreshControls(); }
    refreshControls() {
      const m = document.getElementById('audio-muted-checkbox'); if (m) m.checked = this.settings.muted;
      for (const kind of ['bgm', 'sfx']) {
        const s = document.getElementById('audio-' + kind + '-volume');
        const txt = document.getElementById('audio-' + kind + '-value');
        const val = Math.round(this.settings[kind] * 100);
        if (s) s.value = val; if (txt) txt.textContent = val + '%';
      }
      const l = document.getElementById('lobby-sound-btn'); if (l) l.textContent = this.settings.muted ? '🔇 소리 OFF' : '🔊 소리 ON';
      const h = document.getElementById('hud-sound-btn'); if (h) h.textContent = this.settings.muted ? '🔇' : '🔊';
    }
    status() {
      return {
        mode: this.mode, track: this.track && this.track.name, unlocked: this.unlocked, webAudio: !!this.ctx,
        ctxState: this.ctx ? this.ctx.state : 'none', failed: Array.from(this.failed), stats: this.stats, footVoices: this.footVoices.size,
        bgmLevel: this._busLevel('bgm'), sfxLevel: this._busLevel('sfx')
      };
    }

    // 사용자 입력 안에서만 호출됨 → AudioContext 생성/재개
    unlock() {
      if (this.useWebAudio && !this.ctx) {
        try {
          const C = window.AudioContext || window.webkitAudioContext;
          this.ctx = new C({ latencyHint: 'interactive' });
          this.bgmBus = this.ctx.createGain();
          this.sfxBus = this.ctx.createGain();
          this.footFilter = this.ctx.createBiquadFilter();
          this.footFilter.type = 'lowpass'; this.footFilter.frequency.value = 3200; this.footFilter.Q.value = 0.5;
          this.footBus = this.ctx.createGain(); this.footBus.gain.value = 1;
          this.footBus.connect(this.footFilter); this.footFilter.connect(this.sfxBus);
          this.bgmBus.connect(this.ctx.destination); this.sfxBus.connect(this.ctx.destination);
          this.applyVolume();
        } catch (e) { this.useWebAudio = false; this.ctx = null; this.stats.errors.push('ctx:' + e.message); }
      }
      if (this.ctx && this.ctx.state === 'suspended' && !document.hidden) this.ctx.resume().catch(() => {});
      const first = !this.unlocked;
      this.unlocked = true;
      if (first) {
        ['pointerdown', 'touchend', 'keydown', 'click'].forEach(ev => document.removeEventListener(ev, this._unlockHandler, { capture: true }));
        this._preload();
      }
      // 잠금 해제 전에 요청된 장면 음악을 지금 시작
      if (this.mode && (!this.track || this.track.name !== TRACKS[this.mode])) this.setScene(this.mode, true);
      else if (this.track && this.track.el && !this.settings.muted && !document.hidden) this.track.el.play().catch(() => {});
    }
    _onVisibility() {
      if (document.hidden) {
        this.pausedForVisibility = true;
        if (this.ctx) this.ctx.suspend().catch(() => {});
        for (const t of this.fading) if (t.el) t.el.pause();
        if (this.track && this.track.el) this.track.el.pause();
        this.stopFootsteps();
      } else if (this.pausedForVisibility) {
        this.pausedForVisibility = false;
        if (this.ctx && this.unlocked) this.ctx.resume().catch(() => {});
        if (this.track && this.track.el && this.unlocked && !this.settings.muted) this.track.el.play().catch(() => {});
      }
    }

    // ------------------------------------------------------------ 버퍼 로딩
    _load(path) {
      if (this.buffers.has(path)) return this.buffers.get(path);
      const p = fetch(BASE + path + '.mp3')
        .then(r => { if (!r.ok) throw new Error(r.status + ' ' + path); return r.arrayBuffer(); })
        .then(ab => new Promise((res, rej) => { const q = this.ctx.decodeAudioData(ab, res, rej); if (q && q.then) q.then(res, rej); }))
        .then(buf => { buf._loop = findLoopPoints(buf); return buf; })
        .catch(e => { this.failed.add(path); this.stats.errors.push(String(e && e.message || e)); return null; });
      this.buffers.set(path, p);
      return p;
    }
    _preload() {
      if (!this.ctx) return;
      // 자주 쓰는 소리를 미리 디코딩 (괴물 경고·발소리는 처음 재생 때 늦지 않게)
      ['puzzle_correct', 'puzzle_wrong', 'keypad_press', 'gale_light_warning', 'echo_glitch_warning', 'closet_wood_open', 'closet_wood_close', 'player_hit_dizzy'].forEach(n => this._load('sfx/' + n));
      SURFACES.forEach(s => Object.keys(STEP_COUNT).forEach(m => { for (let i = 1; i <= STEP_COUNT[m]; i++) this._load('sfx/' + footstepFile(s, m, i)); }));
    }

    // ------------------------------------------------------------ BGM
    setScene(mode, force) {
      this.mode = mode;
      const name = TRACKS[mode] || TRACKS.explore;
      this.wantedTrack = name;
      if (!force && this.track && this.track.name === name) return;
      if (!this.unlocked) return;                 // 첫 입력 후 unlock()에서 시작
      if (this.ctx) this._sceneWebAudio(name); else this._sceneHtml(name);
    }
    _sceneWebAudio(name) {
      this._load('bgm/' + name).then(buf => {
        if (!buf || this.wantedTrack !== name) return;      // 그 사이 다른 장면으로 바뀜
        if (this.track && this.track.name === name) return;
        const ctx = this.ctx, t = ctx.currentTime;
        const src = ctx.createBufferSource();
        src.buffer = buf; src.loop = true;
        src.loopStart = buf._loop.start; src.loopEnd = buf._loop.end;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(1, t + FADE);
        src.connect(g); g.connect(this.bgmBus);
        src.start(t, buf._loop.start);
        const prev = this.track;
        this.track = { name, src, gain: g };
        this.stats.bgmStarts++;
        if (prev) {
          prev.gain.gain.cancelScheduledValues(t);
          prev.gain.gain.setValueAtTime(Math.max(prev.gain.gain.value, 0.0001), t);
          prev.gain.gain.linearRampToValueAtTime(0.0001, t + FADE);
          try { prev.src.stop(t + FADE + 0.05); } catch (_) { /* ignore */ }
          prev.src.onended = () => { try { prev.src.disconnect(); prev.gain.disconnect(); } catch (_) { /* ignore */ } };
        }
      });
    }
    _sceneHtml(name) {
      const el = new Audio(BASE + 'bgm/' + name + '.mp3');
      el.loop = true; el.preload = 'auto'; el.volume = 0;
      el.addEventListener('error', () => this.failed.add('bgm/' + name), { once: true });
      const next = { el, name, gain: 0 };
      const prev = this.track; this.track = next;
      if (prev) this.fading.push(prev);
      if (!this.settings.muted && !document.hidden) el.play().catch(() => {});
      this.stats.bgmStarts++;
      const start = performance.now(), dur = FADE * 1000;
      const tick = (now) => {
        const r = clamp((now - start) / dur);
        if (this.track !== next) { el.pause(); el.removeAttribute('src'); return; }
        next.gain = r; if (prev) prev.gain = 1 - r;
        this.applyVolume();
        if (r < 1) requestAnimationFrame(tick);
        else if (prev) { prev.el.pause(); prev.el.removeAttribute('src'); prev.el.load(); this.fading = this.fading.filter(x => x !== prev); }
      };
      requestAnimationFrame(tick);
    }

    // ------------------------------------------------------------ 효과음
    playSfx(type, volume = 1) {
      if (type === 'step' || type === 'crouchStep') return;   // 예전 발소리 호출은 무시 (playFootstep 사용)
      if (this.settings.muted || document.hidden || !this.unlocked) return;
      const name = EFFECTS[type]; if (!name) return;
      const now = performance.now(), last = this.lastEffect.get(type) || -1e9;
      if (now - last < (limits[type] || 65)) return;
      this.lastEffect.set(type, now);
      this.stats.sfx++;
      const gain = clamp(volume * (EFFECT_GAIN[type] || 1), 0, 1.3);
      if (this.ctx) { this._playBuffer('sfx/' + name, gain, this.sfxBus, 1, now); return; }
      this._playHtml('sfx/' + name, gain);
    }
    _playBuffer(path, gain, bus, rate, requestedAt, track) {
      return this._load(path).then(buf => {
        if (!buf) return null;
        if (performance.now() - requestedAt > 350) return null;   // 늦게 디코딩된 소리는 재생하지 않음(어긋난 타이밍 방지)
        const src = this.ctx.createBufferSource();
        src.buffer = buf; src.playbackRate.value = rate || 1;
        const g = this.ctx.createGain(); g.gain.value = gain;
        src.connect(g); g.connect(bus);
        src.start();
        const voice = { src, g };
        if (track) { track.add(voice); src.onended = () => { track.delete(voice); try { g.disconnect(); } catch (_) { /* */ } }; }
        else src.onended = () => { try { g.disconnect(); } catch (_) { /* */ } };
        return voice;
      });
    }
    _playHtml(path, gain) {
      if (this.effects.size >= 18) { const first = this.effects.values().next().value; first?.el.pause(); first?.el.removeAttribute('src'); this.effects.delete(first); }
      const el = new Audio(BASE + path + '.mp3'); el.preload = 'auto';
      const fx = { el, gain }; this.effects.add(fx);
      el.volume = clamp(gain * this._busLevel('sfx'));
      const clean = () => { this.effects.delete(fx); el.removeAttribute('src'); };
      el.addEventListener('ended', clean, { once: true });
      el.addEventListener('error', () => { this.failed.add(path); clean(); }, { once: true });
      el.play().catch(clean);
      return fx;
    }
    stopEffects() {
      for (const v of this.effects) { v.el.pause(); v.el.removeAttribute('src'); }
      this.effects.clear();
      this.stopFootsteps();
    }

    // ------------------------------------------------------------ 발소리
    // surface: carpet|wood|stone|metal, mode: walk|crouch|run
    playFootstep(surface, mode, volume = 1) {
      if (this.settings.muted || document.hidden || !this.unlocked) return null;
      if (!SURFACES.includes(surface)) surface = 'carpet';
      if (!STEP_COUNT[mode]) mode = 'walk';
      const key = surface + ':' + mode, n = STEP_COUNT[mode];
      let idx;
      do { idx = 1 + Math.floor(Math.random() * n); } while (n > 1 && idx === this.lastStep.get(key));
      this.lastStep.set(key, idx);
      let file = footstepFile(surface, mode, idx);
      if (this.failed.has('sfx/' + file)) file = LEGACY_STEP[surface];   // 파일을 못 불러오면 예전 발소리 1개로 대체
      this.lastStepFile = file;
      this.stats.steps++;
      const gain = STEP_GAIN[mode] * clamp(volume, 0, 1.5);
      const rate = 0.96 + Math.random() * 0.08;
      if (this.ctx) return this._playBuffer('sfx/' + file, gain, this.footBus, rate, performance.now(), this.footVoices);
      const fx = this._playHtml('sfx/' + file, gain * 0.8);
      this.footVoices.add(fx);
      fx.el.addEventListener('ended', () => this.footVoices.delete(fx), { once: true });
      return fx;
    }
    // 멈추면 남아 있는 발소리를 짧게 줄이며 끊는다
    stopFootsteps() {
      for (const v of this.footVoices) {
        try {
          if (v.g && this.ctx) { const t = this.ctx.currentTime; v.g.gain.setTargetAtTime(0, t, 0.02); v.src.stop(t + 0.09); }
          else if (v.el) { v.el.pause(); v.el.removeAttribute('src'); }
        } catch (_) { /* ignore */ }
      }
      this.footVoices.clear();
    }
  }

  // 디코더가 붙인 앞뒤 무음(보통 수십 ms)을 찾아 루프 구간에서 제외 → 반복 지점의 '뚝' 끊김 방지
  function findLoopPoints(buf) {
    const ch = buf.getChannelData(0), sr = buf.sampleRate, max = Math.floor(sr * 0.15), thr = 1e-4;
    let s = 0; while (s < max && Math.abs(ch[s]) < thr) s++;
    let e = ch.length - 1; while (ch.length - 1 - e < max && Math.abs(ch[e]) < thr) e--;
    if (s >= max) s = 0;
    if (ch.length - 1 - e >= max) e = ch.length - 1;
    return { start: s / sr, end: (e + 1) / sr };
  }

  window.NextRoomAudio = new SoundManager();
  window.NextRoomAudio.init();
  window.NextRoomAudio.TRACKS = TRACKS;
  window.NextRoomAudio.EFFECTS = EFFECTS;
  window.NextRoomAudio.FOOTSTEPS = { SURFACES, STEP_COUNT, file: footstepFile };
})();
