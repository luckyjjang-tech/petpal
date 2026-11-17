/* Petpal 동작 시제품 v0.1
   순수 자바스크립트. 빌드 도구 없음. 파일을 열면 바로 돈다.
   저장은 이 브라우저의 localStorage에만. 서버·계정·결제 없음. */
(function () {
  'use strict';

  var KEY = 'petpal.prototype.v2';
  var HOUR = 3600e3;
  var DAY = 24 * HOUR;
  var MAX_GROWTH = 130;
  var CALLS_TO_LEARN = 10;

  /* ── 단계 ─────────────────────────────────────────────── */
  var STAGES = [
    { at: 0,  d: '새끼',     c: '새끼 고양이' },
    { at: 22, d: '어린 개',  c: '어린 고양이' },
    { at: 54, d: '젊은 개',  c: '젊은 고양이' },
    { at: 96, d: '다 큰 개', c: '다 큰 고양이' }
  ];
  var STAGE_SCALE_T = [0, 0.45, 0.78, 1];
  var HEAD_SCALE    = [1.1, 1.04, 1.0, 0.97];
  var TORSO_W       = [0.87, 0.94, 0.98, 1];

  /* ── 귀 모양 ───────────────────────────────────────────── */
  var EARS = {
    floppy: {
      l: 'M96 80 C68 68 46 88 50 114 C53 138 78 146 88 130 C94 120 96 96 98 86 Z',
      r: 'M144 80 C172 68 194 88 190 114 C187 138 162 146 152 130 C146 120 144 96 142 86 Z'
    },
    upright: {
      l: 'M70 96 L78 40 Q81 31 88 40 L110 80 Q115 87 107 88 Z',
      r: 'M170 96 L162 40 Q159 31 152 40 L130 80 Q125 87 133 88 Z'
    },
    cat: {
      l: 'M66 92 L74 28 Q77 18 85 26 L114 72 Q119 80 110 82 Z',
      r: 'M174 92 L166 28 Q163 18 155 26 L126 72 Q121 80 130 82 Z'
    },
    poodle: {
      l: 'M98 78 C78 70 62 86 66 106 C70 124 86 130 93 118 C98 108 99 92 100 84 Z',
      r: 'M142 78 C162 70 178 86 174 106 C170 124 154 130 147 118 C142 108 141 92 140 84 Z'
    }
  };

  /* ── 품종 ─────────────────────────────────────────────── */
  var BREEDS = [
    {
      id: 'golden', kind: 'dog', name: '골든리트리버', tag: '대형견',
      fur: '#EFC183', furDark: '#D69F5C', belly: '#FFF4E3', nose: '#4A3C36',
      ear: 'floppy', fluff: false,
      tail: { d: 'M150 156 C178 152 190 132 178 112', w: 11 },
      puppy: 0.62, adult: 1.04, top: 64,
      blurb: '사람을 좋아하고 잘 먹는 아이'
    },
    {
      id: 'jindo', kind: 'dog', name: '진돗개', tag: '중대형견',
      fur: '#FAF3E6', furDark: '#E3D5C0', belly: '#FFFFFF', nose: '#4A3C36',
      ear: 'upright', fluff: false,
      tail: { d: 'M150 158 C172 150 180 132 176 114', w: 10 },
      puppy: 0.62, adult: 0.98, top: 34,
      blurb: '한 번 마음을 주면 오래 가는 아이'
    },
    {
      id: 'poodle', kind: 'dog', name: '푸들', tag: '소형견',
      fur: '#F7E4CC', furDark: '#E1C7A4', belly: '#FFF8EE', nose: '#5B4A3E',
      ear: 'poodle', fluff: true,
      tail: { d: 'M150 154 C170 150 178 138 173 126', w: 11 },
      puppy: 0.58, adult: 0.84, top: 54,
      blurb: '작고 발라당 잘 노는 아이'
    },
    {
      id: 'shiba', kind: 'dog', name: '시바', tag: '소형·중형견',
      fur: '#E9A85F', furDark: '#CB8640', belly: '#FFF6E9', nose: '#41352F',
      ear: 'upright', fluff: false,
      tail: { d: 'M152 156 C176 158 188 146 178 133 C170 123 156 127 158 138', w: 9 },
      puppy: 0.59, adult: 0.88, top: 35,
      blurb: '도도한데 은근히 다가오는 아이'
    },
    {
      id: 'ksh', kind: 'cat', name: '코리안 숏헤어', tag: '중형묘',
      fur: '#EFC27E', furDark: '#D3A05C', belly: '#FFF4E0', nose: '#E08C8C',
      ear: 'cat', fluff: false,
      tail: { d: 'M152 158 C182 162 198 146 190 126', w: 8 },
      puppy: 0.58, adult: 0.86, top: 25,
      blurb: '집사 곁에 조용히 와 앉는 아이'
    },
    {
      id: 'russianblue', kind: 'cat', name: '러시안 블루', tag: '중형묘',
      fur: '#B9C0C9', furDark: '#98A1AC', belly: '#DCE1E7', nose: '#B67E86',
      ear: 'cat', fluff: false,
      tail: { d: 'M152 158 C184 160 198 142 189 122', w: 8 },
      puppy: 0.58, adult: 0.87, top: 25,
      blurb: '낯가림이 있지만 한 번 따르면 다정한 아이'
    }
  ];

  /* ── 날씨 이벤트(시험용, 날짜로 정해짐) ─────────────────── */
  var EVENTS = [
    { k: 'sun',   tx: '오늘은 볕이 좋아요', ico: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4.4" fill="#F0B24B"/><g stroke="#F0B24B" stroke-width="1.8" stroke-linecap="round"><path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6"/></g></svg>' },
    { k: 'rain',  tx: '오늘은 비가 와요', ico: '<svg viewBox="0 0 24 24"><path d="M7 14a4 4 0 0 1 .3-8 5.4 5.4 0 0 1 10.2 1.4A3.4 3.4 0 0 1 17.4 14H7Z" fill="#9BB6CC"/><g stroke="#7FA8CC" stroke-width="1.7" stroke-linecap="round"><path d="M8.5 17l-1 3M13 17l-1 3M17.5 17l-1 3"/></g></svg>' },
    { k: 'cloud', tx: '오늘은 흐려요', ico: '<svg viewBox="0 0 24 24"><path d="M7 16a3.6 3.6 0 0 1 .2-7.2A5 5 0 0 1 17 9.6 3.4 3.4 0 0 1 16.8 16H7Z" fill="#B9C3CC"/></svg>' },
    { k: 'wind',  tx: '오늘은 바람이 불어요', ico: '<svg viewBox="0 0 24 24"><g fill="none" stroke="#9DB3B8" stroke-width="1.9" stroke-linecap="round"><path d="M3 9h9.5a2.6 2.6 0 1 0-2.6-2.6"/><path d="M3 14h13a2.6 2.6 0 1 1-2.6 2.6"/><path d="M3 19h6"/></g></svg>' }
  ];

  var FX = {
    heart: '<svg viewBox="0 0 24 24"><path d="M12 20.6c-.4 0-.8-.2-1.1-.4C6.6 17 3.4 13.9 3.4 10.4 3.4 7.5 5.7 5.3 8.4 5.3c1.5 0 2.8.7 3.6 1.8.8-1.1 2.1-1.8 3.6-1.8 2.7 0 5 2.2 5 5.1 0 3.5-3.2 6.6-7.5 9.8-.3.2-.7.4-1.1.4Z" fill="#EE8B9A"/></svg>',
    bowl: '<svg viewBox="0 0 24 24"><path d="M3.2 11.6h17.6a1 1 0 0 1 1 1.1C21.3 17.3 17.4 20.6 12 20.6S2.7 17.3 2.2 12.7a1 1 0 0 1 1-1.1Z" fill="#C9834E"/><circle cx="9" cy="9.4" r="1.5" fill="#8A5A33"/><circle cx="13" cy="8.6" r="1.4" fill="#8A5A33"/><circle cx="16.4" cy="9.6" r="1.3" fill="#8A5A33"/></svg>',
    drop: '<svg viewBox="0 0 24 24"><path d="M12 3.2c.4 0 .7.2.9.5 1.3 2.1 5.2 8 5.2 10.6a6.1 6.1 0 0 1-12.2 0c0-2.6 3.9-8.5 5.2-10.6.2-.3.5-.5.9-.5Z" fill="#7FB9DE"/></svg>',
    paw: '<svg viewBox="0 0 24 24"><g fill="#C7A98A"><ellipse cx="12" cy="16" rx="4.6" ry="3.8"/><ellipse cx="7" cy="11" rx="1.9" ry="2.2"/><ellipse cx="10.2" cy="8.4" rx="1.9" ry="2.3"/><ellipse cx="13.8" cy="8.4" rx="1.9" ry="2.3"/><ellipse cx="17" cy="11" rx="1.9" ry="2.2"/></g></svg>',
    spark: '<svg viewBox="0 0 24 24"><path d="M12 3l1.9 6.1L20 11l-6.1 1.9L12 19l-1.9-6.1L4 11l6.1-1.9z" fill="#F5C765"/></svg>'
  };

  /* ── 도우미 ───────────────────────────────────────────── */
  function $(id) { return document.getElementById(id); }
  function clamp(v, a, b) { a = (a === undefined) ? 0 : a; b = (b === undefined) ? 100 : b; return Math.min(b, Math.max(a, v)); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function daysBetween(t) { return (Date.now() - t) / DAY; }
  function breed() {
    for (var i = 0; i < BREEDS.length; i++) if (BREEDS[i].id === s.breed) return BREEDS[i];
    return BREEDS[0];
  }
  function hasBatchim(str) {
    var t = String(str || '').trim();
    if (!t) return false;
    var c = t.charCodeAt(t.length - 1);
    if (c >= 0xAC00 && c <= 0xD7A3) return (c - 0xAC00) % 28 !== 0;
    return false;
  }
  function voc() { return s.name + (hasBatchim(s.name) ? '아' : '야'); }
  function subj() { return s.name + (hasBatchim(s.name) ? '이' : '가'); }

  /* ── 강아지 그림 ────────────────────────────────────────── */
  function petSvg(b, withIds) {
    var E = EARS[b.ear];
    var id = function (n) { return withIds ? ' id="' + n + '"' : ''; };
    var fluff = b.fluff
      ? '<g class="fluff"><circle cx="101" cy="73" r="9.5"/><circle cx="120" cy="66" r="10.5"/><circle cx="139" cy="73" r="9.5"/></g>'
      : '';

    return '' +
      '<svg class="petSvg" viewBox="30 18 180 204" data-kind="' + b.kind + '"' +
      ' style="--fur:' + b.fur + ';--fur-dark:' + b.furDark + ';--belly:' + b.belly + ';--nose:' + b.nose + '">' +
      '<ellipse class="shadow" cx="120" cy="216" rx="52" ry="9"/>' +
      '<g' + id('petRoot') + '><g' + id('pose') + '>' +

      '<g' + id('tail') + '><path d="' + b.tail.d + '" fill="none" stroke="' + b.furDark +
      '" stroke-width="' + b.tail.w + '" stroke-linecap="round"/></g>' +

      '<g' + id('bodyGroup') + '>' +
      '<rect class="leg back" x="98" y="176" width="19" height="34" rx="9.5"/>' +
      '<rect class="leg back" x="124" y="176" width="19" height="34" rx="9.5"/>' +
      '<g' + id('torso') + '>' +
      '<ellipse class="body-el" cx="120" cy="164" rx="44" ry="38"/>' +
      '<ellipse class="belly-el" cx="120" cy="178" rx="27" ry="22" opacity=".9"/>' +
      '<g class="ribs" stroke="#C99A6E" stroke-width="2.4" stroke-linecap="round" opacity=".5">' +
      '<path d="M84 150 q11 4 21 1"/><path d="M84 162 q11 4 21 1"/><path d="M86 174 q10 3 18 1"/></g>' +
      '</g>' +
      '<rect class="leg front" x="100" y="180" width="19" height="30" rx="9.5"/>' +
      '<rect class="leg front" x="123" y="180" width="19" height="30" rx="9.5"/>' +
      '<ellipse class="paw" cx="109.5" cy="209" rx="11" ry="6"/>' +
      '<ellipse class="paw" cx="132.5" cy="209" rx="11" ry="6"/>' +
      '</g>' +

      '<g class="headScale"><g' + id('headGroup') + '>' +
      '<path class="ear" d="' + E.l + '"/>' +
      '<path class="ear" d="' + E.r + '"/>' +
      '<ellipse class="head-el" cx="120" cy="110" rx="47" ry="43"/>' +
      fluff +
      '<ellipse class="cheek" cx="86" cy="124" rx="10" ry="6.5"/>' +
      '<ellipse class="cheek" cx="154" cy="124" rx="10" ry="6.5"/>' +
      '<ellipse class="muzzle" cx="120" cy="130" rx="25" ry="17"/>' +
      '<g class="eyes-open">' +
      '<ellipse class="eye" cx="100" cy="104" rx="7" ry="8.5"/>' +
      '<ellipse class="eye" cx="140" cy="104" rx="7" ry="8.5"/>' +
      '<circle class="glint" cx="102.6" cy="100.4" r="2.6"/>' +
      '<circle class="glint" cx="142.6" cy="100.4" r="2.6"/>' +
      '</g>' +
      '<g class="eyes-happy" fill="none" stroke="#3F3330" stroke-width="4" stroke-linecap="round">' +
      '<path d="M91 107 q9 -11 18 0"/><path d="M131 107 q9 -11 18 0"/></g>' +
      '<g class="eyes-shut" fill="none" stroke="#3F3330" stroke-width="4" stroke-linecap="round">' +
      '<path d="M91 104 q9 9 18 0"/><path d="M131 104 q9 9 18 0"/></g>' +
      '<g class="brows" fill="none" stroke="#A5744B" stroke-width="3.8" stroke-linecap="round">' +
      '<path d="M90 95 l16 -7"/><path d="M150 95 l-16 -7"/></g>' +
      '<ellipse class="nose" cx="120" cy="121" rx="9" ry="6.5"/>' +
      '<ellipse cx="117" cy="119" rx="2.6" ry="1.5" fill="#fff" opacity=".32"/>' +
      '<g class="mouth" fill="none" stroke="#4A3C36" stroke-width="3.2" stroke-linecap="round">' +
      '<path d="M120 126 q-11 11 -20 3"/><path d="M120 126 q11 11 20 3"/></g>' +
      '<g class="mouth-sad" fill="none" stroke="#4A3C36" stroke-width="3.2" stroke-linecap="round">' +
      '<path d="M110 136 q10 -8 20 0"/></g>' +
      '<path class="tongue" d="M110 132 C110 149 130 149 130 132 Z" fill="#F28C93"/>' +
      '<g class="tear"><path d="M84 111 c-3.2 6.4 -1 10.4 3.2 10.4 4.2 0 6.2 -4.8 3.2 -10.4 z" fill="#8FC9EC"/></g>' +
      '<g class="whiskers"><path d="M80 127 H56"/><path d="M80 133 l-23 6"/><path d="M160 127 H184"/><path d="M160 133 l23 6"/></g>' +
      '</g></g>' +

      '<g class="zzz"><text x="166" y="88" class="z1">Z</text><text x="180" y="72" class="z2">Z</text><text x="193" y="57" class="z3">Z</text></g>' +

      '</g></g></svg>';
  }

  /* ── 상태 ─────────────────────────────────────────────── */
  var s = null;
  var boostUntil = 0;
  var lastActionAt = Date.now();
  var asleep = false;
  var pendingBreed = null;
  var timers = [];

  function freshState(breedId) {
    var now = Date.now();
    return {
      v: 2,
      breed: breedId,
      name: '',
      createdAt: now,
      hunger: 68, mood: 74, thirst: 72,
      growth: 0, calls: 0,
      lastTick: now, lastFedAt: now, lastSeenAt: now
    };
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return null;
      var p = JSON.parse(raw);
      if (!p || p.v !== 2 || !p.breed || !p.name) return null;
      var base = freshState(p.breed);
      for (var k in base) if (!(k in p)) p[k] = base[k];
      return p;
    } catch (e) { return null; }
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* 저장 못 해도 계속 */ }
  }

  /* ── 시간 흐름 ─────────────────────────────────────────── */
  function decay(hours) {
    if (hours <= 0) return;
    s.hunger = clamp(s.hunger - hours * 11);
    s.thirst = clamp(s.thirst - hours * 9);
    var m = hours * 2.2;
    if (s.hunger < 30) m += hours * 3;
    if (s.thirst < 30) m += hours * 1.5;
    s.mood = clamp(s.mood - m);
  }

  function advance() {
    var now = Date.now();
    var h = (now - s.lastTick) / HOUR;
    if (h > 0) decay(h);
    s.lastTick = now;
  }

  function daysSinceFed() { return daysBetween(s.lastFedAt); }

  function thinLevel() {
    var d = daysSinceFed();
    if (d >= 2.4) return 2;
    if (d >= 1.0) return 1;
    return 0;
  }

  function growthAllowed() {
    return daysSinceFed() < 1.6 && s.hunger > 16;
  }

  function stageIndex(g) {
    var i = 0;
    for (var k = 0; k < STAGES.length; k++) if (g >= STAGES[k].at) i = k;
    return i;
  }

  function stageInfo() { return { index: stageIndex(s.growth) }; }

  function stageName(i) {
    return breed().kind === 'cat' ? STAGES[i].c : STAGES[i].d;
  }

  function moodNow() {
    var h = new Date().getHours();
    var idleMin = (Date.now() - lastActionAt) / 60000;
    asleep = (h >= 22 || h < 6) ? idleMin > 2 : idleMin > 9;
    if (asleep) return 'sleep';
    if (Date.now() < boostUntil) return 'happy';
    if (s.mood < 26) return 'sad';
    if (s.hunger < 34) return 'hungry';
    return 'normal';
  }

  /* ── 말풍선 / 설명 / 효과 ──────────────────────────────── */
  var bubbleTimer = null;
  function say(text, ms) {
    var b = $('bubble');
    b.textContent = text;
    b.hidden = false;
    // 다시 뜰 때 애니메이션이 재생되도록
    b.style.animation = 'none';
    void b.offsetWidth;
    b.style.animation = '';
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(function () { b.hidden = true; }, ms || 2300);
  }

  var noteTimer = null;
  function note(text, ms) {
    var n = $('narration');
    n.textContent = text;
    n.style.opacity = '0';
    requestAnimationFrame(function () { n.style.transition = 'opacity .35s'; n.style.opacity = '1'; });
    clearTimeout(noteTimer);
    noteTimer = setTimeout(function () { n.style.opacity = '0'; }, ms || 6000);
  }

  function fx(kind, n) {
    var box = $('effects');
    n = n || 1;
    for (var i = 0; i < n; i++) {
      (function (i) {
        var el = document.createElement('span');
        el.className = 'fx';
        el.innerHTML = FX[kind] || FX.heart;
        el.style.left = (36 + Math.random() * 30) + '%';
        el.style.top = (46 + Math.random() * 16) + '%';
        el.style.animationDelay = (i * 110) + 'ms';
        box.appendChild(el);
        setTimeout(function () { el.remove(); }, 1500 + i * 110);
      })(i);
    }
  }

  function react(ms) { boostUntil = Date.now() + (ms || 1400); render(); }

  function hop() {
    var p = $('pet');
    p.classList.remove('hop');
    void p.offsetWidth;
    p.classList.add('hop');
    setTimeout(function () { p.classList.remove('hop'); }, 850);
  }

  function tilt() {
    var h = $('headGroup');
    h.classList.remove('tilt');
    void h.offsetWidth;
    h.classList.add('tilt');
    setTimeout(function () { h.classList.remove('tilt'); }, 1000);
  }

  /* ── 성장 ─────────────────────────────────────────────── */
  function grow(points) {
    if (!growthAllowed()) return false;
    var q = (s.hunger >= 50 && s.mood >= 50) ? 1 : 0.72;
    var before = stageIndex(s.growth);
    s.growth = Math.min(MAX_GROWTH, s.growth + points * q);
    var after = stageIndex(s.growth);
    if (after > before) stageUp(after);
    return true;
  }

  function stageUp(i) {
    fx('spark', 4);
    fx('heart', 2);
    hop();
    say(pick(['!', '멍!', '왈!']), 1500);
    boostUntil = Date.now() + 4000;
    note('조금 더 자랐어요. 이제 ' + stageName(i) + '예요.', 8000);
    s.lastStage = i;
  }

  /* ── 돌봄 ─────────────────────────────────────────────── */
  function touch() { lastActionAt = Date.now(); }

  function feed() {
    if (!s) return;
    touch();
    if (s.hunger >= 94) {
      say('배불러요…');
      note('밥그릇을 물끄러미 봐요. 지금은 배가 불러요.');
      react(600);
      save(); return;
    }
    s.hunger = clamp(s.hunger + 32);
    s.thirst = clamp(s.thirst + 4);
    s.mood = clamp(s.mood + 7);
    s.lastFedAt = Date.now();
    grow(3.4);
    fx('bowl');
    react(1600);
    say(pick(['냠냠!', '냠냠냠!', '맛있어!', '또 먹을래!']));
    note(subj() + ' 꼬리를 흔들며 밥그릇으로 달려갔어요.');
    render(); save();
  }

  function water() {
    if (!s) return;
    touch();
    if (s.thirst >= 94) {
      say('물은 됐어요');
      note('물그릇에서 입을 뗐어요. 이미 물을 충분히 마셨어요.');
      react(600); save(); return;
    }
    s.thirst = clamp(s.thirst + 45);
    s.hunger = clamp(s.hunger + 2);
    s.mood = clamp(s.mood + 5);
    grow(0.6);
    fx('drop', 2);
    react(1400);
    say(pick(['물이 좋아!', '쩝쩝', '시원해!']));
    note('물을 시원하게 마셨어요.');
    render(); save();
  }

  function walk() {
    if (!s) return;
    touch();
    var hungry = s.hunger < 28;
    s.hunger = clamp(s.hunger - 9);
    s.thirst = clamp(s.thirst - 7);
    s.mood = clamp(s.mood + (hungry ? 7 : 19));
    grow(hungry ? 0.5 : 1.4);
    fx('paw', 3);
    react(1700);
    say(pick(['왈왈!', '멍멍!', '나가자!']));
    note(hungry
      ? subj() + ' 배가 고픈지 금방 돌아왔어요.'
      : subj() + ' 신나서 앞장서서 걸었어요.');
    render(); save();
  }

  function petDog() {
    if (!s) return;
    touch();
    s.mood = clamp(s.mood + 15);
    grow(1.1);
    fx('heart', 3);
    react(2000);
    say(pick(['낑낑', '좋아…', '더!']));
    note(subj() + ' 눈을 감고 머리를 손에 기대요.');
    render(); save();
  }

  /* ── 이름 부르기 ──────────────────────────────────────── */
  function callDog() {
    if (!s) return;
    touch();
    s.calls += 1;

    if (s.calls < CALLS_TO_LEARN) {
      tilt();
      say(pick(['?', '…?', '멍?']), 1600);
      note(voc() + ' 하고 불렀지만, 아직 자기 이름인 줄 모르는 것 같아요.', 5000);
    } else if (s.calls === CALLS_TO_LEARN) {
      s.mood = clamp(s.mood + 8);
      grow(0.8);
      hop();
      fx('heart', 4);
      pounce();
      say('멍멍!', 2400);
      note('처음으로 자기 이름을 알아들은 것 같아요. 세차게 꼬리를 흔들며 달려왔어요.', 9000);
      react(3200);
    } else {
      s.mood = clamp(s.mood + 2);
      hop();
      fx('heart', 1);
      say(pick(['멍멍!', '왈왈!', '낑낑!']), 1800);
      note(subj() + ' 부르는 소리를 알아듣고 달려왔어요.');
      react(1800);
    }
    render(); save();
  }

  function pounce() {
    var p = $('petWrap');
    p.style.transition = 'transform .5s cubic-bezier(.3,1.4,.4,1)';
    p.style.transform = 'translateX(-50%) scale(1.12)';
    setTimeout(function () {
      p.style.transform = 'translateX(-50%) scale(1)';
      setTimeout(function () { p.style.transition = ''; }, 600);
    }, 700);
  }

  /* ── 그림 ─────────────────────────────────────────────── */
  function render() {
    if (!s) return;
    var b = breed();
    var st = stageInfo();
    var thin = thinLevel();
    var mean = moodNow();
    var pet = $('pet');
    if (!pet) return;

    pet.dataset.mood = mean;
    pet.dataset.thin = String(thin);
    pet.dataset.stage = String(st.index + 1);

    var tw = TORSO_W[st.index] * (thin === 1 ? 0.9 : thin === 2 ? 0.78 : 1);
    var th = thin === 2 ? 0.97 : 1;
    pet.style.setProperty('--tw', String(tw));
    pet.style.setProperty('--th', String(th));
    pet.style.setProperty('--hs', String(HEAD_SCALE[st.index]));

    var scale = b.puppy + (b.adult - b.puppy) * STAGE_SCALE_T[st.index];
    var root = $('petRoot');
    if (root) root.style.transform = 'scale(' + scale.toFixed(3) + ')';

    // 말풍선을 강아지 머리 바로 위에 붙인다(크기가 자라도 따라 올라감)
    var wrap = $('petWrap');
    if (wrap) {
      var topPct = Math.min(96, ((214 - b.top) * scale + 8) / 204 * 100 + 3);
      wrap.style.setProperty('--bub', topPct.toFixed(1) + '%');
    }

    // 이름·품종
    $('whoName').textContent = s.name;
    var days = Math.floor(daysBetween(s.createdAt)) + 1;
    $('whoMeta').textContent = '· ' + b.name + ' · ' + days + '일째 · ' + stageName(st.index);

    // 수치
    setBar('barFull', 'numFull', s.hunger, Math.round(s.hunger), s.hunger < 25);
    setBar('barMood', 'numMood', s.mood, Math.round(s.mood), s.mood < 30);

    var nxt = STAGES[st.index + 1];
    var gp = nxt ? ((s.growth - STAGES[st.index].at) / (nxt.at - STAGES[st.index].at)) * 100 : 100;
    setBar('barGrow', 'numGrow', clamp(gp), stageName(st.index), false);

    // 성장 멈춤 안내
    var stall = $('stall');
    if (!growthAllowed()) {
      stall.hidden = false;
      stall.textContent = (thin >= 1)
        ? '며칠 밥을 못 먹어 마른 모습이에요. 지금은 자라지 않고 있어요.'
        : '배가 고파서 지금은 자라지 않고 있어요.';
    } else {
      stall.hidden = true;
    }

    // 부르기 버튼
    var call = $('callBtn');
    call.textContent = voc() + '!';
    var learned = s.calls >= CALLS_TO_LEARN;
    call.classList.toggle('dim', s.calls === 0);

    $('callHint').textContent = learned
      ? '이제 자기 이름을 알아들어요.'
      : '아직 자기 이름을 모르는 것 같아요. 몇 번 더 불러 보세요.';

    $('callCount').textContent = s.calls > 0 ? ('부른 횟수 ' + s.calls) : '';

    save();
  }

  function setBar(barId, numId, pct, label, low) {
    var el = $(barId);
    el.style.width = clamp(pct) + '%';
    el.classList.toggle('low', !!low);
    $(numId).textContent = label;
  }

  /* ── 날씨 ─────────────────────────────────────────────── */
  function eventToday() {
    var d = new Date(); d.setHours(0, 0, 0, 0);
    var n = Math.round((d.getTime() - new Date(2026, 0, 1).getTime()) / DAY);
    return EVENTS[((n % EVENTS.length) + EVENTS.length) % EVENTS.length];
  }

  function applyEvent() {
    var ev = eventToday();
    $('stage').dataset.event = ev.k;
    $('eventText').textContent = ev.tx;
    $('eventIco').innerHTML = ev.ico;
  }

  /* ── 첫 인사와 잔잔한 움직임 ───────────────────────────── */
  function greet() {
    var away = daysBetween(s.lastSeenAt);
    s.lastSeenAt = Date.now();
    var b = breed();
    var what = b.kind === 'cat' ? '고양이' : '강아지';

    if (away > 2.5) {
      note('오랜만이에요. ' + subj() + ' 조용히 앉아 있어요.', 8000);
    } else if (s.hunger < 30) {
      note(subj() + ' 밥그릇 쪽을 보고 있어요.', 7000);
    } else if (s.calls < CALLS_TO_LEARN) {
      note(what + ' 한 마리가 왔어요. ' + voc() + ' 하고 불러 보세요.', 9000);
    } else {
      note(subj() + ' 반갑다고 꼬리를 흔들어요.', 6000);
    }
  }

  var IDLE_OK = [
    '창밖을 멍하니 바라봐요.',
    '꼬리를 천천히 흔들어요.',
    '바닥 냄새를 맡고 있어요.',
    '한 바퀴 돌고 제자리에 앉았어요.',
    '눈이 마주치자 귀를 쫑긋했어요.',
    '장난감을 물고 이리저리 뛰어요.',
    '발을 앞으로 뻗고 엎드렸어요.'
  ];
  var IDLE_HUNGRY = [
    '밥그릇 쪽을 힐끔힐끔 봐요.',
    '배가 고픈지 낑낑거려요.',
    '바닥에 엎드려 눈만 굴리고 있어요.'
  ];
  var IDLE_SAD = [
    '문 쪽을 오래 바라봐요.',
    '귀를 축 내리고 앉아 있어요.',
    '다가오지 않고 조용히 있어요.'
  ];

  function idleNote() {
    if (asleep) { note(pick(['새근새근 자고 있어요.', '자는지 숨소리가 잦아들었어요.']), 6000); return; }
    var pool = IDLE_OK;
    if (s.mood < 30) pool = IDLE_SAD;
    else if (s.hunger < 34) pool = IDLE_HUNGRY;
    note(pick(pool), 5000);
  }

  function tick() {
    if (!s) return;
    var before = { h: s.hunger, m: s.mood };
    advance();
    var changed = Math.abs(before.h - s.hunger) > 0.05 || Math.abs(before.m - s.mood) > 0.05;
    if (changed) render();
    else render();
    if (Math.random() < 0.55) idleNote();
  }

  /* ── 분양 화면 ─────────────────────────────────────────── */
  function buildAdopt() {
    var dogGrid = $('gridDog'), catGrid = $('gridCat');
    BREEDS.forEach(function (b) {
      var el = document.createElement('button');
      el.type = 'button';
      el.className = 'bc';
      el.dataset.id = b.id;
      el.setAttribute('aria-pressed', 'false');
      el.innerHTML =
        '<span class="bcArt">' + petSvg(b, false) + '</span>' +
        '<span class="bcName">' + b.name + '</span>' +
        '<span class="bcTag">' + b.tag + '</span>';
      el.addEventListener('click', function () { selectBreed(b); });
      (b.kind === 'cat' ? catGrid : dogGrid).appendChild(el);
    });
  }

  function selectBreed(b) {
    pendingBreed = b;
    var cards = document.querySelectorAll('.bc');
    for (var i = 0; i < cards.length; i++) {
      cards[i].setAttribute('aria-pressed', cards[i].dataset.id === b.id ? 'true' : 'false');
    }
    $('breedOk').disabled = false;
    $('breedOk').textContent = b.name + ' 새끼로 할게요';
  }

  function goNameStep() {
    if (!pendingBreed) return;
    $('stepBreed').hidden = true;
    $('stepName').hidden = false;
    $('pickedArt').innerHTML = '<span class="bcArt">' + petSvg(pendingBreed, false) + '</span>';
    $('stepNameTitle').textContent = pendingBreed.kind === 'cat'
      ? '새끼 고양이가 왔어요' : '새끼 강아지가 왔어요';
    $('stepNameLead').innerHTML = pendingBreed.name + ' · ' + pendingBreed.tag + ' · ' +
      pendingBreed.blurb + '<br />이름을 지어 주세요. 계속 불러 줄 이름이에요.';
    var inp = $('nameInput');
    inp.value = '';
    $('nameOk').disabled = true;
    setTimeout(function () { inp.focus(); }, 120);
  }

  function startAs(name) {
    s = freshState(pendingBreed.id);
    s.name = name;
    s.createdAt = Date.now();
    s.lastSeenAt = Date.now();
    save();
    $('adopt').hidden = true;
    mount();
    note(subj() + ' 와 함께하는 첫날이에요. ' + voc() + ' 하고 불러 보세요.', 9000);
    hop();
  }

  /* ── 시작 ─────────────────────────────────────────────── */
  function mount() {
    var b = breed();
    $('petSlot').innerHTML = petSvg(b, true);
    var svg = document.querySelector('#petSlot svg');
    svg.id = 'pet';
    applyEvent();
    render();
    greet();
    startTimers();
  }

  function startTimers() {
    timers.forEach(function (t) { clearInterval(t); });
    timers = [setInterval(tick, 15000)];
    setInterval(function () { save(); }, 20000);
  }

  function bind() {
    $('btnFeed').addEventListener('click', feed);
    $('btnWater').addEventListener('click', water);
    $('btnWalk').addEventListener('click', walk);
    $('btnPet').addEventListener('click', petDog);
    $('callBtn').addEventListener('click', callDog);

    $('breedOk').addEventListener('click', goNameStep);

    var inp = $('nameInput');
    inp.addEventListener('input', function () {
      $('nameOk').disabled = inp.value.trim().length === 0;
    });
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && inp.value.trim()) { e.preventDefault(); startAs(inp.value.trim()); }
    });
    $('nameOk').addEventListener('click', function () {
      var v = inp.value.trim();
      if (v) startAs(v);
    });
    $('backBtn').addEventListener('click', function () {
      $('stepName').hidden = true;
      $('stepBreed').hidden = false;
    });

    // 시제품용: 하루 지나가기
    $('skipBtn').addEventListener('click', function () {
      if (!s) return;
      advance();
      decay(24);
      s.lastTick = Date.now();
      render();
      note('하루가 지났어요. (시제품용 시간 건너뛰기)', 5000);
    });

    // 처음부터: 두 번 눌러 확인
    var armed = false, armTimer = null;
    $('resetBtn').addEventListener('click', function () {
      if (!armed) {
        armed = true;
        $('resetBtn').textContent = '한 번 더 누르면 처음부터';
        $('resetBtn').classList.add('armed');
        armTimer = setTimeout(function () {
          armed = false;
          $('resetBtn').textContent = '다시 분양받기';
          $('resetBtn').classList.remove('armed');
        }, 3500);
        return;
      }
      clearTimeout(armTimer);
      try { localStorage.removeItem(KEY); } catch (e) {}
      location.reload();
    });

    window.addEventListener('pagehide', function () { if (s) { advance(); save(); } });
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible' && s) { advance(); render(); }
    });

    // 바깥을 눌러도 분양 화면은 닫히지 않게 한다(먼저 골라야 함)
    $('adopt').addEventListener('click', function (e) {
      if (e.target === $('adopt')) e.stopPropagation();
    });
  }

  function init() {
    bind();
    buildAdopt();
    s = loadState();

    if (!s) {
      $('adopt').hidden = false;
      $('stepBreed').hidden = false;
      $('stepName').hidden = true;
      return;
    }

    if (s.name) {
      advance();
      mount();
    }
  }

  // 오류가 나면 화면 아래에 그대로 보여 준다(시제품이라 숨기지 않는다)
  window.addEventListener('error', function (ev) {
    var el = document.getElementById('errBar');
    if (!el) return;
    el.hidden = false;
    el.textContent = '시제품 오류 — ' + (ev.message || '알 수 없는 오류');
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
