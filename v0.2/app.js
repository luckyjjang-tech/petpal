/* 펫팔(Petpal) 동작 시제품 v0.2
   사진으로 만든 입체(2.5D) 강아지를 three.js 무대 위에서 키운다.
   순수 자바스크립트 · 빌드 도구 없음 · 인터넷 없이 열린다.
   저장은 이 브라우저의 localStorage에만. 서버·계정·결제 없음. */
(function () {
  'use strict';

  var KEY = 'petpal.prototype.v3';
  var HOUR = 3600e3;
  var DAY = 24 * HOUR;
  var MAX_GROWTH = 130;
  var CALLS_TO_LEARN = 10;

  /* ── 성장 단계 ──────────────────────────────────────────── */
  var STAGES = [
    { at: 0,  name: '새끼' },
    { at: 30, name: '어린 개' },
    { at: 62, name: '젊은 개' },
    { at: 96, name: '다 큰 개' }
  ];
  var ADULT_AT = 62; // 이 성장도부터 다 큰 개 사진을 쓴다

  /* ── 품종 ───────────────────────────────────────────────── */
  var BREEDS = [
    {
      id: 'golden', kind: 'dog', name: '골든리트리버', tag: '대형견', ready: true,
      width: 1.62, sets: { puppy: 'golden_puppy', adult: 'golden_adult' },
      blurb: '사람을 좋아하고 잘 먹는 아이'
    },
    {
      id: 'poodle', kind: 'dog', name: '푸들', tag: '소형견', ready: true,
      width: 1.20, sets: { puppy: 'poodle_puppy', adult: 'poodle_adult' },
      blurb: '작고 발라당 잘 노는 아이'
    },
    { id: 'jindo', kind: 'dog', name: '진돗개', tag: '중대형견', ready: false, blurb: '한 번 마음을 주면 오래 가는 아이' },
    { id: 'shiba', kind: 'dog', name: '시바', tag: '소형·중형견', ready: false, blurb: '도도한데 은근히 다가오는 아이' },
    { id: 'ksh', kind: 'cat', name: '코리안 숏헤어', tag: '중형묘', ready: false, blurb: '집사 곁에 조용히 와 앉는 아이' },
    { id: 'russianblue', kind: 'cat', name: '러시안 블루', tag: '중형묘', ready: false, blurb: '낯가림이 있지만 한 번 따르면 다정한 아이' }
  ];

  var FX = {
    heart: '<svg viewBox="0 0 24 24"><path d="M12 20.6c-.4 0-.8-.2-1.1-.4C6.6 17 3.4 13.9 3.4 10.4 3.4 7.5 5.7 5.3 8.4 5.3c1.5 0 2.8.7 3.6 1.8.8-1.1 2.1-1.8 3.6-1.8 2.7 0 5 2.2 5 5.1 0 3.5-3.2 6.6-7.5 9.8-.3.2-.7.4-1.1.4Z" fill="#EE8B9A"/></svg>',
    bowl: '<svg viewBox="0 0 24 24"><path d="M3.2 11.6h17.6a1 1 0 0 1 1 1.1C21.3 17.3 17.4 20.6 12 20.6S2.7 17.3 2.2 12.7a1 1 0 0 1 1-1.1Z" fill="#C9834E"/><circle cx="9" cy="9.4" r="1.5" fill="#8A5A33"/><circle cx="13" cy="8.6" r="1.4" fill="#8A5A33"/><circle cx="16.4" cy="9.6" r="1.3" fill="#8A5A33"/></svg>',
    drop: '<svg viewBox="0 0 24 24"><path d="M12 3.2c.4 0 .7.2.9.5 1.3 2.1 5.2 8 5.2 10.6a6.1 6.1 0 0 1-12.2 0c0-2.6 3.9-8.5 5.2-10.6.2-.3.5-.5.9-.5Z" fill="#7FB9DE"/></svg>',
    paw: '<svg viewBox="0 0 24 24"><g fill="#C7A98A"><ellipse cx="12" cy="16" rx="4.6" ry="3.8"/><ellipse cx="7" cy="11" rx="1.9" ry="2.2"/><ellipse cx="10.2" cy="8.4" rx="1.9" ry="2.3"/><ellipse cx="13.8" cy="8.4" rx="1.9" ry="2.3"/><ellipse cx="17" cy="11" rx="1.9" ry="2.2"/></g></svg>',
    spark: '<svg viewBox="0 0 24 24"><path d="M12 3l1.9 6.1L20 11l-6.1 1.9L12 19l-1.9-6.1L4 11l6.1-1.9z" fill="#F5C765"/></svg>',
    q: '<svg viewBox="0 0 24 24"><text x="12" y="18" font-size="17" font-weight="700" text-anchor="middle" fill="#B79A7E">?</text></svg>'
  };

  /* ── 도우미 ─────────────────────────────────────────────── */
  function $(id) { return document.getElementById(id); }
  function clamp(v, a, b) { a = (a === undefined) ? 0 : a; b = (b === undefined) ? 100 : b; return Math.min(b, Math.max(a, v)); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function daysBetween(t) { return (Date.now() - t) / DAY; }
  function hasBatchim(str) {
    var t = String(str || '').trim();
    if (!t) return false;
    var c = t.charCodeAt(t.length - 1);
    if (c >= 0xAC00 && c <= 0xD7A3) return (c - 0xAC00) % 28 !== 0;
    return false;
  }
  function voc() { return s.name + (hasBatchim(s.name) ? '아' : '야'); }
  function subj() { return s.name + (hasBatchim(s.name) ? '이' : '가'); }
  function breedOf(id) {
    for (var i = 0; i < BREEDS.length; i++) if (BREEDS[i].id === id) return BREEDS[i];
    return BREEDS[0];
  }

  /* ── 상태 ───────────────────────────────────────────────── */
  var s = null;
  var pendingBreed = null;
  var boostUntil = 0;
  var lastActionAt = Date.now();
  var asleep = false;
  var timers = [];
  var action = { until: 0, pose: null, walk: false, bowl: null };
  var tempPose = { until: 0, pose: null };
  var pet = null;
  var readerMode = false;      // 3D를 못 쓰면 사진 한 장으로 내려간다
  var currentSet = null;
  var lastStage = -1;
  var dragSeen = false;

  function freshState(breedId) {
    var now = Date.now();
    return {
      v: 3, breed: breedId, name: '', createdAt: now,
      hunger: 68, mood: 74, thirst: 72,
      growth: 0, calls: 0,
      lastTick: now, lastFedAt: now, lastSeenAt: now, lastStage: 0
    };
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return null;
      var p = JSON.parse(raw);
      if (!p || p.v !== 3 || !p.breed || !p.name) return null;
      var base = freshState(p.breed);
      for (var k in base) if (!(k in p)) p[k] = base[k];
      return p;
    } catch (e) { return null; }
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* 저장 못 해도 계속 */ }
  }

  /* ── 시간 ───────────────────────────────────────────────── */
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
  function growthAllowed() { return daysSinceFed() < 1.6 && s.hunger > 16; }

  function stageIndex(g) {
    var i = 0;
    for (var k = 0; k < STAGES.length; k++) if (g >= STAGES[k].at) i = k;
    return i;
  }
  function stageName(i) { return STAGES[i].name; }

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

  /* ── 말풍선 / 설명 / 효과 ───────────────────────────────── */
  var bubbleTimer = null;
  function say(text, ms) {
    var b = $('bubble');
    b.textContent = text;
    b.hidden = false;
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
    n.style.opacity = '1';
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
        el.style.left = (34 + Math.random() * 32) + '%';
        el.style.top = (48 + Math.random() * 18) + '%';
        el.style.animationDelay = (i * 110) + 'ms';
        box.appendChild(el);
        setTimeout(function () { el.remove(); }, 1500 + i * 110);
      })(i);
    }
  }

  function react(ms) { boostUntil = Date.now() + (ms || 1400); render(); }

  /* ── 3D 무대 ────────────────────────────────────────────── */
  function initStage() {
    var scene = $('scene');
    if (window.PETPAL_BACKDROP) scene.style.backgroundImage = 'url(' + window.PETPAL_BACKDROP + ')';
    try {
      pet = window.Pet3D.create($('petCanvas'), window.PETPAL_ASSETS);
    } catch (e) {
      readerMode = true;
      showErr('이 브라우저에서는 3D(WebGL)를 켤 수 없어 사진으로 보여 줍니다.');
    }
  }

  function petSetName() {
    var b = breedOf(s.breed);
    if (!b.ready) return null;
    return s.growth >= ADULT_AT ? b.sets.adult : b.sets.puppy;
  }

  /* 성장 배율: 새끼 0.62 → 다 큰 개 1.0 */
  function growthScale() {
    var p = clamp(s.growth / MAX_GROWTH, 0, 1);
    if (p < 0.62) return 0.62 + 0.30 * (p / 0.62);
    return 0.92 + 0.08 * ((p - 0.62) / 0.38);
  }

  function poseNow() {
    var t = Date.now();
    if (action.until > t && action.pose) return action.pose;
    if (tempPose.until > t && tempPose.pose) return tempPose.pose;
    if (moodNow() === 'sad') return 'sad';
    if (moodNow() === 'sleep') return 'sit';
    return 'stand';
  }

  function syncScene() {
    if (!s) return;
    if (readerMode || !pet) return;
    var desired = petSetName();
    if (!desired) return;
    if (!setLoaded(desired)) {
      ensureSet(desired, function () { currentSet = null; syncScene(); });
      return;
    }
    var pose = poseNow();
    if (currentSet !== desired) {
      currentSet = desired;
      pet.use(desired, pose, true);
      pet.setWidth(breedOf(s.breed).width);
    } else {
      pet.pose(pose, 340);
    }
    pet.scale(growthScale());
    pet.walk(action.until > Date.now() && action.walk);
    var boost = Date.now() < boostUntil;
    var wag = boost ? 1 : (moodNow() === 'sad' ? 0.08 : (moodNow() === 'sleep' ? 0.05 : 0.35));
    pet.wag(wag);
    pet.thin(thinLevel() / 2);

    var feeding = (action.until > Date.now()) ? action.bowl : null;
    $('bowlFood').classList.toggle('on', feeding === 'food');
    $('bowlWater').classList.toggle('on', feeding === 'water');
  }

  function startAction(opts) {
    if (readerMode || !pet) { action = { until: 0 }; render(); return; }
    action = {
      until: Date.now() + (opts.ms || 1600),
      pose: opts.pose || null,
      walk: !!opts.walk,
      bowl: opts.bowl || null
    };
    if (opts.jump) pet.jump();
    render();
    setTimeout(function () { action = { until: 0 }; render(); syncScene(); }, (opts.ms || 1600) + 40);
  }

  /* ── 성장 ───────────────────────────────────────────────── */
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
    fx('spark', 5);
    fx('heart', 2);
    say(pick(['!', '멍!', '왈!']), 1500);
    boostUntil = Date.now() + 4000;
    note('조금 더 자랐어요. 이제 ' + stageName(i) + '예요.', 8000);
    s.lastStage = i;
    lastStage = i;
    if ((s.growth >= ADULT_AT) !== (currentSet === breedOf(s.breed).sets.adult)) syncScene();
    if (pet && !readerMode) pet.jump();
  }

  /* ── 돌봄 ───────────────────────────────────────────────── */
  function touch() { lastActionAt = Date.now(); }

  function feed() {
    if (!s) return;
    touch();
    if (s.hunger >= 94) {
      say('배불러요…');
      note('밥그릇을 물끄러미 봐요. 지금은 배가 불러요.');
      react(600); save(); return;
    }
    s.hunger = clamp(s.hunger + 32);
    s.thirst = clamp(s.thirst + 4);
    s.mood = clamp(s.mood + 7);
    s.lastFedAt = Date.now();
    grow(3.4);
    fx('bowl');
    say(pick(['냠냠!', '냠냠냠!', '맛있어!', '또 먹을래!']));
    note(subj() + ' 밥그릇으로 달려가 고개를 숙이고 먹어요.');
    startAction({ pose: 'sad', bowl: 'food', ms: 4200 });
    react(1800);
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
    say(pick(['물이 좋아!', '쩝쩝', '시원해!']));
    note('물을 시원하게 마셨어요.');
    startAction({ pose: 'sad', bowl: 'water', ms: 3600 });
    react(1400);
    render(); save();
  }

  function walkOut() {
    if (!s) return;
    touch();
    var hungry = s.hunger < 28;
    s.hunger = clamp(s.hunger - 9);
    s.thirst = clamp(s.thirst - 7);
    s.mood = clamp(s.mood + (hungry ? 7 : 19));
    grow(hungry ? 0.5 : 1.4);
    fx('paw', 3);
    say(pick(['왈왈!', '멍멍!', '나가자!']));
    note(hungry
      ? subj() + ' 배가 고픈지 금방 돌아왔어요.'
      : subj() + ' 신나서 앞장서서 걸었어요.');
    startAction({ pose: 'walk', walk: true, ms: 4400 });
    react(2000);
    render(); save();
  }

  function petDog() {
    if (!s) return;
    touch();
    s.mood = clamp(s.mood + 15);
    grow(1.1);
    fx('heart', 3);
    say(pick(['낑낑', '좋아…', '더!']));
    note(subj() + ' 눈을 감고 머리를 손에 기대요.');
    startAction({ pose: 'sit', ms: 4200 });
    react(2400);
    render(); save();
  }

  /* ── 이름 부르기 ────────────────────────────────────────── */
  function callDog() {
    if (!s) return;
    touch();
    s.calls += 1;
    if (s.calls < CALLS_TO_LEARN) {
      say(pick(['?', '…?', '멍?']), 1600);
      if (pet && !readerMode) pet.jump();
      note(voc() + ' 하고 불렀지만, 아직 자기 이름인 줄 모르는 것 같아요.', 5000);
      startAction({ pose: 'stand', ms: 700 });
    } else if (s.calls === CALLS_TO_LEARN) {
      s.mood = clamp(s.mood + 8);
      grow(0.8);
      fx('heart', 4);
      say('멍멍!', 2400);
      note('처음으로 자기 이름을 알아들은 것 같아요. 꼬리를 세차게 흔들며 달려왔어요.', 9000);
      startAction({ pose: 'stand', ms: 3200, jump: true });
      react(3200);
    } else {
      s.mood = clamp(s.mood + 2);
      fx('heart', 1);
      say(pick(['멍멍!', '왈왈!', '낑낑!']), 1800);
      note(subj() + ' 부르는 소리를 알아듣고 달려왔어요.');
      startAction({ pose: 'stand', ms: 2600, jump: true });
      react(1800);
    }
    render(); save();
  }

  /* ── 화면 ───────────────────────────────────────────────── */
  function render() {
    if (!s) return;
    var b = breedOf(s.breed);
    var st = stageIndex(s.growth);
    var thin = thinLevel();

    $('whoName').textContent = s.name;
    var days = Math.floor(daysBetween(s.createdAt)) + 1;
    $('whoMeta').textContent = '· ' + b.name + ' · ' + days + '일째 · ' + stageName(st);

    setBar('barFull', 'numFull', s.hunger, Math.round(s.hunger), s.hunger < 25);
    setBar('barMood', 'numMood', s.mood, Math.round(s.mood), s.mood < 30);

    var nxt = STAGES[st + 1];
    var gp = nxt ? ((s.growth - STAGES[st].at) / (nxt.at - STAGES[st].at)) * 100 : 100;
    setBar('barGrow', 'numGrow', clamp(gp), stageName(st), false);

    var stall = $('stall');
    if (!growthAllowed()) {
      stall.hidden = false;
      stall.textContent = (thin >= 1)
        ? '며칠 밥을 못 먹어 마른 모습이에요. 지금은 자라지 않고 있어요.'
        : '배가 고파서 지금은 자라지 않고 있어요.';
    } else {
      stall.hidden = true;
    }

    $('callBtn').textContent = voc() + '!';
    $('callBtn').classList.toggle('dim', s.calls === 0);
    $('callHint').textContent = s.calls >= CALLS_TO_LEARN
      ? '이제 자기 이름을 알아들어요.'
      : '아직 자기 이름을 모르는 것 같아요. 몇 번 더 불러 보세요.';
    $('callCount').textContent = s.calls > 0 ? ('부른 횟수 ' + s.calls) : '';

    var h = new Date().getHours();
    $('stage').dataset.tod = (h < 6 || h >= 20) ? 'night' : (h < 10 ? 'morning' : (h >= 17 ? 'evening' : 'day'));

    syncScene();
    save();
  }

  function setBar(barId, numId, pct, label, low) {
    var el = $(barId);
    el.style.width = clamp(pct) + '%';
    el.classList.toggle('low', !!low);
    $(numId).textContent = label;
  }

  function showErr(msg) {
    var el = $('errBar');
    el.hidden = false;
    el.textContent = msg;
  }

  /* ── 첫 인사와 잠잠한 움직임 ────────────────────────────── */
  function greet() {
    var away = daysBetween(s.lastSeenAt);
    s.lastSeenAt = Date.now();
    if (away > 2.5) note('오랜만이에요. ' + subj() + ' 조용히 앉아 있어요.', 8000);
    else if (s.hunger < 30) note(subj() + ' 밥그릇 쪽을 보고 있어요.', 7000);
    else if (s.calls < CALLS_TO_LEARN) note(voc() + ' 하고 불러 보세요. 아직 이름을 모르는 것 같아요.', 9000);
    else note(subj() + ' 반갑다고 꼬리를 흔들어요.', 6000);
  }

  var IDLE_OK = [
    '창밖을 멍하니 바라봐요.', '꼬리를 천천히 흔들어요.', '바닥 냄새를 맡고 있어요.',
    '눈이 마주치자 귀를 쫑긋했어요.', '제 꼬리를 잡으려고 돌아요.', '한참 나를 올려다봐요.'
  ];
  var IDLE_SIT = ['제자리에 앉아 나를 기다려요.', '앉아서 꼬리를 살랑살랑 흔들어요.', '고개를 갸웃하며 앉아 있어요.'];
  var IDLE_HUNGRY = ['밥그릇 쪽을 힐끔힐끔 봐요.', '배가 고픈지 낑낑거려요.', '바닥에 엎드려 눈만 굴리고 있어요.'];
  var IDLE_SAD = ['문 쪽을 오래 바라봐요.', '귀를 축 내리고 앉아 있어요.', '다가오지 않고 조용히 있어요.'];

  function idleTick() {
    if (!s || action.until > Date.now()) return;
    if (asleep) {
      tempPose = { until: 0, pose: null };
      note(pick(['새근새근 자고 있어요.', '자는지 숨소리가 잦아들었어요.']), 6000);
      syncScene();
      return;
    }
    var r = Math.random();
    var pool = IDLE_OK;
    if (r < 0.35) {
      tempPose = { until: Date.now() + 6000, pose: 'sit' };
      pool = IDLE_SIT;
    } else if (r < 0.55) {
      tempPose = { until: Date.now() + 4000, pose: 'walk' };
      if (pet && !readerMode) pet.walk(true);
      setTimeout(function () { if (pet && !readerMode) pet.walk(false); }, 3600);
      pool = ['혼자 방 안을 한 바퀴 돌아요.', '어슬렁어슬렁 걸어 다녀요.'];
    } else {
      tempPose = { until: 0, pose: null };
    }
    if (s.mood < 30) pool = IDLE_SAD;
    else if (s.hunger < 34) pool = IDLE_HUNGRY;
    note(pick(pool), 5000);
    syncScene();
    setTimeout(syncScene, 5200);
  }

  function tick() {
    if (!s) return;
    advance();
    render();
    if (moodNow() === 'sleep' && !readerMode && pet) pet.wag(0.03);
  }

  /* ── 분양 화면 ──────────────────────────────────────────── */
  var pawSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="#B7A491" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="16" rx="4.6" ry="3.8"/><ellipse cx="7" cy="11" rx="1.9" ry="2.2"/><ellipse cx="10.2" cy="8.4" rx="1.9" ry="2.3"/><ellipse cx="13.8" cy="8.4" rx="1.9" ry="2.3"/><ellipse cx="17" cy="11" rx="1.9" ry="2.2"/></svg>';

  function thumbFor(b) {
    var key = b.sets && b.sets.puppy;
    var src = key && window.PETPAL_THUMBS ? window.PETPAL_THUMBS[key] : null;
    if (src) return '<img src="' + src + '" alt="" />';
    return pawSvg;
  }

  /* 사진 묶음은 그 품종을 고를 때 내려받는다(느린 인터넷에서 처음 화면을 가볍게) */
  var loading = {};
  function setLoaded(name) {
    var arr = window.PETPAL_ASSETS || [];
    for (var i = 0; i < arr.length; i++) if (arr[i].name === name) return true;
    return false;
  }
  function ensureSet(name, cb) {
    if (!name) return;
    if (setLoaded(name)) { if (cb) cb(); return; }
    if (loading[name]) { if (cb) loading[name].push(cb); return; }
    loading[name] = cb ? [cb] : [];
    var sc = document.createElement('script');
    sc.src = 'assets/set-' + name + '.js';
    sc.onload = function () {
      var q = loading[name] || [];
      delete loading[name];
      for (var i = 0; i < q.length; i++) if (q[i]) q[i]();
    };
    sc.onerror = function () {
      delete loading[name];
      showErr('사진 묶음을 불러오지 못했어요 — assets/set-' + name + '.js 파일이 같은 폴더에 있는지 확인해 주세요.');
    };
    document.body.appendChild(sc);
  }

  function buildAdopt() {
    var dogGrid = $('gridDog'), catGrid = $('gridCat');
    BREEDS.forEach(function (b) {
      var el = document.createElement('button');
      el.type = 'button';
      el.className = 'bc' + (b.ready ? '' : ' bcSoon');
      el.dataset.id = b.id;
      el.setAttribute('aria-pressed', 'false');
      el.innerHTML =
        (b.ready ? '' : '<span class="soonBadge">준비 중</span>') +
        '<span class="bcArt">' + thumbFor(b) + '</span>' +
        '<span class="bcName">' + b.name + '</span>' +
        '<span class="bcTag">' + (b.ready ? b.tag : b.tag + ' · 다음 판') + '</span>';
      if (b.ready) el.addEventListener('click', function () { selectBreed(b); });
      else el.setAttribute('aria-disabled', 'true');
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
    $('pickedArt').innerHTML = '<span class="bcArt">' + thumbFor(pendingBreed) + '</span>';
    $('stepNameTitle').textContent = '새끼 ' + (pendingBreed.kind === 'cat' ? '고양이' : '강아지') + '가 왔어요';
    $('stepNameLead').innerHTML = pendingBreed.name + ' · ' + pendingBreed.tag + ' · ' + pendingBreed.blurb +
      '<br />이름을 지어 주세요. 계속 불러 줄 이름이에요.';
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
    ensureSet(breedOf(s.breed).sets.puppy, mount);
    note(s.name + (hasBatchim(s.name) ? '이와' : '와') + ' 함께하는 첫날이에요. ' + voc() + ' 하고 불러 보세요.', 9000);
  }

  /* ── 시작 ───────────────────────────────────────────────── */
  function mount() {
    initStage();
    currentSet = null;
    render();
    greet();
    if (pet && !readerMode) setTimeout(function () { pet.jump(); }, 280);
    startTimers();
  }

  function startTimers() {
    timers.forEach(function (t) { clearInterval(t); });
    timers = [setInterval(tick, 15000), setInterval(idleTick, 17000)];
    setInterval(function () { save(); }, 20000);
  }

  function bind() {
    $('btnFeed').addEventListener('click', feed);
    $('btnWater').addEventListener('click', water);
    $('btnWalk').addEventListener('click', walkOut);
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

    $('skipBtn').addEventListener('click', function () {
      if (!s) return;
      advance();
      decay(24);
      s.lastTick = Date.now();
      render();
      note('하루가 지났어요. (시제품용 시간 건너뛰기)', 5000);
    });

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
      s = null;                                  // pagehide에서 다시 저장되지 않도록
      try { localStorage.removeItem(KEY); } catch (e) {}
      location.reload();
    });

    // 드래그 안내는 한 번 돌려 보면 사라진다
    var canvas = $('petCanvas');
    function hideHint() {
      if (dragSeen) return;
      dragSeen = true;
      $('dragHint').classList.add('off');
    }
    canvas.addEventListener('mousedown', hideHint);
    canvas.addEventListener('touchstart', hideHint, { passive: true });

    window.addEventListener('pagehide', function () { if (s) { advance(); save(); } });
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible' && s) { advance(); render(); }
    });

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
      ensureSet(petSetName(), mount);
    }
  }

  window.addEventListener('error', function (ev) {
    showErr('시제품 오류 — ' + (ev.message || '알 수 없는 오류'));
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
