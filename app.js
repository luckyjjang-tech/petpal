/* 펫팔(Petpal) 시제품 v1.0 — 사진으로 만든 2D판
   ────────────────────────────────────────────────────────────
   · 새끼로 분양받아 밥을 먹인 만큼만 자란다. 3끼/일 × 약 1년에 다 자란다.
   · 이름은 10번 불러야 알아듣는다. 그전에는 반응하지 않는다.
   · 벌은 없다. 야단치면 화내지 않고 서운해한다.
   · 순수 자바스크립트 · 빌드 도구 없음 · 인터넷 없이 파일만 열면 돈다.
   · 저장은 이 브라우저의 localStorage에만. 서버·계정·결제 없음.

   아직 정하지 않은 것은 아래 CONFIG 기본값으로 두었고, README 표에
   '바꾸는 방법'을 적어 두었다. 값만 고치면 그대로 반영된다.
*/
(function () {
  'use strict';

  /* ═══ 여기 다섯 가지가 아직 정하지 않은 항목의 기본값 ═══════
     ① 강아지·고양이 함께 / ② 시작 품종 2종 / ③ 무료·기기당 1마리
     ④ 성장 기간 365일 / ⑤ 대화 기능 꺼 둠(자리만 있음)          */
  var CONFIG = {
    growthDays: 365,       // ④ 다 자라는 데 걸리는 기간(일). 30으로 바꾸면 한 달에 다 큰다
    mealsPerDay: 3,        //   하루 세 끼를 다 먹였을 때의 성장량
    callsToLearn: 10,      //   이름을 알아듣기까지 부르는 횟수 (10~20 사이에서 조절)
    maxBreeds: 2,          // ② 실제로 분양되는 품종 수 (2 = 강아지 1 · 고양이 1)
    onePetPerDevice: true, // ③ 한 브라우저에 한 마리
    talk: { enabled: false } // ⑤ 켜는 방법은 talk.js와 README 참고
  };

  var KEY = 'petpal.v1';
  var HOUR = 3600e3;
  var DAY = 24 * HOUR;
  var MAX_GROWTH = 100;
  var LEARN = CONFIG.callsToLearn;

  /* ── 성장 단계 ───────────────────────────────────────────── */
  var STAGES = [
    { at: 0,  dog: '새끼',     cat: '아기 고양이' },
    { at: 34, dog: '어린 개',  cat: '어린 고양이' },
    { at: 70, dog: '성견',     cat: '성묘' }
  ];

  /* ── 품종 ──────────────────────────────────────────────────
     사진은 assets/pets/<세트>_<자세>.webp  (자세: stand sit walk sad)
     widths = 무대 너비에 대한 아이의 가로 비율 (단계별)
     aspects = 사진의 가로/세로 비율 (그 비율로 높이가 정해진다)  */
  var BREEDS = [
    {
      id: 'golden', kind: 'dog', name: '골든리트리버', tag: '대형견', ready: true,
      sets: ['golden_s1', 'golden_s2', 'golden_s3'],
      widths: [0.66, 0.82, 0.96],
      aspects: [840 / 575, 840 / 605, 840 / 670],
      blurb: '사람을 좋아하고 잘 먹는 아이'
    },
    {
      id: 'ksh', kind: 'cat', name: '코리안 숏헤어', tag: '중형묘 · 치즈', ready: true,
      sets: ['ksh_s1', 'ksh_s2', 'ksh_s3'],
      widths: [0.52, 0.62, 0.72],
      aspects: [840 / 527, 840 / 555, 840 / 558],
      blurb: '집사 곁에 조용히 와 앉는 아이'
    },
    { id: 'poodle', kind: 'dog', name: '푸들', tag: '소형견', ready: false, blurb: '곱슬곱슬 잘 노는 아이' },
    { id: 'jindo', kind: 'dog', name: '진돗개', tag: '중대형견', ready: false, blurb: '한 번 마음을 주면 오래 가는 아이' },
    { id: 'shiba', kind: 'dog', name: '시바', tag: '소형·중형견', ready: false, blurb: '도도한데 은근히 다가오는 아이' },
    { id: 'russianblue', kind: 'cat', name: '러시안 블루', tag: '중형묘', ready: false, blurb: '낯가림이 있지만 한 번 따르면 다정한 아이' }
  ];

  var FX = {
    heart: '<svg viewBox="0 0 24 24"><path d="M12 20.6c-.4 0-.8-.2-1.1-.4C6.6 17 3.4 13.9 3.4 10.4 3.4 7.5 5.7 5.3 8.4 5.3c1.5 0 2.8.7 3.6 1.8.8-1.1 2.1-1.8 3.6-1.8 2.7 0 5 2.2 5 5.1 0 3.5-3.2 6.6-7.5 9.8-.3.2-.7.4-1.1.4Z" fill="#EE8B9A"/></svg>',
    bowl: '<svg viewBox="0 0 24 24"><path d="M3.2 11.6h17.6a1 1 0 0 1 1 1.1C21.3 17.3 17.4 20.6 12 20.6S2.7 17.3 2.2 12.7a1 1 0 0 1 1-1.1Z" fill="#C9834E"/><circle cx="9" cy="9.4" r="1.5" fill="#8A5A33"/><circle cx="13" cy="8.6" r="1.4" fill="#8A5A33"/><circle cx="16.4" cy="9.6" r="1.3" fill="#8A5A33"/></svg>',
    drop: '<svg viewBox="0 0 24 24"><path d="M12 3.2c.4 0 .7.2.9.5 1.3 2.1 5.2 8 5.2 10.6a6.1 6.1 0 0 1-12.2 0c0-2.6 3.9-8.5 5.2-10.6.2-.3.5-.5.9-.5Z" fill="#7FB9DE"/></svg>',
    paw: '<svg viewBox="0 0 24 24"><g fill="#C7A98A"><ellipse cx="12" cy="16" rx="4.6" ry="3.8"/><ellipse cx="7" cy="11" rx="1.9" ry="2.2"/><ellipse cx="10.2" cy="8.4" rx="1.9" ry="2.3"/><ellipse cx="13.8" cy="8.4" rx="1.9" ry="2.3"/><ellipse cx="17" cy="11" rx="1.9" ry="2.2"/></g></svg>',
    spark: '<svg viewBox="0 0 24 24"><path d="M12 3l1.9 6.1L20 11l-6.1 1.9L12 19l-1.9-6.1L4 11l6.1-1.9z" fill="#F5C765"/></svg>'
  };

  /* ── 도우미 ─────────────────────────────────────────────── */
  function $(id) { return document.getElementById(id); }
  function clamp(v, a, b) {
    a = (a === undefined) ? 0 : a; b = (b === undefined) ? 100 : b;
    return Math.min(b, Math.max(a, v));
  }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function daysBetween(t) { return (Date.now() - t) / DAY; }
  function hasBatchim(str) {
    var t = String(str || '').trim();
    if (!t) return false;
    var c = t.charCodeAt(t.length - 1);
    if (c >= 0xAC00 && c <= 0xD7A3) return (c - 0xAC00) % 28 !== 0;
    return false;
  }
  function breedOf(id) {
    for (var i = 0; i < BREEDS.length; i++) if (BREEDS[i].id === id) return BREEDS[i];
    return BREEDS[0];
  }

  /* ── 상태 ───────────────────────────────────────────────── */
  var st = null;              // 저장되는 상태
  var pendingBreed = null;
  var lastActionAt = Date.now();
  var boostUntil = 0;
  var asleep = false;
  var timers = [];
  var action = { until: 0, pose: null, walk: false, bowl: null };
  var tempPose = { until: 0, pose: null };
  var scoldUntil = 0;
  var stageFlashUntil = 0;

  function freshState(breedId) {
    var now = Date.now();
    return {
      v: 1, breed: breedId, name: '', createdAt: now,
      hunger: 68, mood: 74, thirst: 72,
      growth: 0, calls: 0, feeds: 0, feedDay: '',
      lastTick: now, lastFedAt: now, lastSeenAt: now
    };
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return null;
      var p = JSON.parse(raw);
      if (!p || p.v !== 1 || !p.breed || !p.name) return null;
      if (!breedOf(p.breed).ready) return null;
      var base = freshState(p.breed);
      for (var k in base) if (!(k in p)) p[k] = base[k];
      return p;
    } catch (e) { return null; }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* 저장 못 해도 계속 */ }
  }

  /* ── 시간 흐름 ──────────────────────────────────────────── */
  function decay(hours) {
    if (hours <= 0) return;
    st.hunger = clamp(st.hunger - hours * 11);
    st.thirst = clamp(st.thirst - hours * 9);
    var m = hours * 2.2;
    if (st.hunger < 30) m += hours * 3;
    if (st.thirst < 30) m += hours * 1.5;
    st.mood = clamp(st.mood - m);
  }
  function advance() {
    if (!st) return;
    var now = Date.now();
    var h = (now - st.lastTick) / HOUR;
    if (h > 0) decay(h);
    st.lastTick = now;
  }

  function daysSinceFed() { return daysBetween(st.lastFedAt); }
  function thinLevel() {
    var d = daysSinceFed();
    if (d >= 2.4) return 2;
    if (d >= 1.0) return 1;
    return 0;
  }
  function growthAllowed() { return daysSinceFed() < 1.6 && st.hunger > 16; }

  function stageIndex(g) {
    var i = 0;
    for (var k = 0; k < STAGES.length; k++) if (g >= STAGES[k].at) i = k;
    return i;
  }
  function isCat() { return st && breedOf(st.breed).kind === 'cat'; }
  function stageName(i) { return isCat() ? STAGES[i].cat : STAGES[i].dog; }
  function setOfStage(i) { return breedOf(st.breed).sets[Math.min(i, 2)]; }
  function voc() { return st.name + (hasBatchim(st.name) ? '아' : '야'); }
  function subj() { return st.name + (hasBatchim(st.name) ? '이' : '가'); }

  function moodNow() {
    var h = new Date().getHours();
    var idleMin = (Date.now() - lastActionAt) / 60000;
    asleep = (h >= 22 || h < 6) ? idleMin > 2 : idleMin > 10;
    if (Date.now() < scoldUntil) return 'sad';
    if (asleep) return 'sleep';
    if (Date.now() < boostUntil) return 'happy';
    if (st.mood < 26) return 'sad';
    if (st.hunger < 34) return 'hungry';
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
        el.style.top = (46 + Math.random() * 20) + '%';
        el.style.animationDelay = (i * 110) + 'ms';
        box.appendChild(el);
        setTimeout(function () { el.remove(); }, 1500 + i * 110);
      })(i);
    }
  }

  /* ── 사진 무대 (2D) ─────────────────────────────────────── */
  var layers = [];
  var activeLayer = 0;
  var currentKey = '';
  var preloaded = {};

  function photoUrl(setName, pose) {
    return 'assets/pets/' + setName + '_' + pose + '.webp';
  }

  /* 단계 안에서의 자람: 0.96 → 1.03 (마지막 단계는 더 자라지 않음) */
  function growthScale() {
    var i = stageIndex(st.growth);
    var from = STAGES[i].at;
    var to = (i < 2) ? STAGES[i + 1].at : MAX_GROWTH;
    var p = clamp((st.growth - from) / Math.max(1, to - from), 0, 1);
    if (i === 2) return 1;
    return 0.96 + 0.07 * p;
  }

  function layoutPet() {
    if (!st) return;
    var i = Math.min(stageIndex(st.growth), 2);
    var b = breedOf(st.breed);
    var stageEl = $('stage');
    var stageH = stageEl.clientHeight || 360;
    var stageW = stageEl.clientWidth || 380;
    var h = (stageW * b.widths[i] * growthScale()) / b.aspects[i];
    h = Math.min(h, stageH * 0.92);
    h = Math.round(h);
    $('petBox').style.setProperty('--petH', h + 'px');
    $('petShadow').style.setProperty('--shadowW', Math.round(h * (b.kind === 'cat' ? 1.05 : 0.95)) + 'px');
  }

  function showPhoto(pose, fadeMs) {
    if (!st) return;
    var i = stageIndex(st.growth);
    var setName = setOfStage(i);
    var key = setName + '|' + pose;
    if (key === currentKey) return;

    var next = layers[1 - activeLayer];
    var prev = layers[activeLayer];
    var url = photoUrl(setName, pose);

    function swap() {
      next.style.setProperty('--fade', (fadeMs || 340) + 'ms');
      if (next.getAttribute('src') !== url) next.src = url;
      next.classList.add('on');
      prev.classList.remove('on');
      activeLayer = 1 - activeLayer;
      currentKey = key;
    }

    if (next.src && next.src.indexOf(encodeURI(url)) >= 0) { swap(); return; }
    var probe = new Image();
    probe.onload = swap;
    probe.onerror = function () {
      showErr('사진을 불러오지 못했어요 — assets/pets/ 폴더가 index.html 옆에 있는지 확인해 주세요.');
    };
    probe.src = url;
  }

  function preloadAround() {
    if (!st) return;
    var b = breedOf(st.breed);
    var i = stageIndex(st.growth);
    var list = [];
    ['stand', 'sit', 'walk', 'sad'].forEach(function (p) { list.push(photoUrl(setOfStage(i), p)); });
    if (i < 2) ['stand', 'sit'].forEach(function (p) { list.push(photoUrl(b.sets[i + 1], p)); });
    list.forEach(function (u) {
      if (preloaded[u]) return;
      preloaded[u] = true;
      var im = new Image(); im.src = u;
    });
  }

  function poseNow() {
    if (action.until > Date.now() && action.pose) return action.pose;
    if (tempPose.until > Date.now() && tempPose.pose) return tempPose.pose;
    var m = moodNow();
    if (m === 'sad') return 'sad';
    if (m === 'sleep') return 'sit';
    if (m === 'hungry') return 'sit';
    return 'stand';
  }

  function render() {
    if (!st) return;
    var b = breedOf(st.breed);
    var i = stageIndex(st.growth);
    var thin = thinLevel();
    var m = moodNow();

    $('walkLabel').textContent = b.kind === 'cat' ? '놀이' : '산책';
    $('whoName').textContent = st.name;
    var days = Math.floor(daysBetween(st.createdAt)) + 1;
    $('whoMeta').textContent = '· ' + b.name + ' · ' + days + '일째 · ' + stageName(i);

    setBar('barFull', 'numFull', st.hunger, Math.round(st.hunger), st.hunger < 25);
    setBar('barMood', 'numMood', st.mood, Math.round(st.mood), st.mood < 30);
    var to = (i < 2) ? STAGES[i + 1].at : MAX_GROWTH;
    var gp = ((st.growth - STAGES[i].at) / Math.max(1, to - STAGES[i].at)) * 100;
    setBar('barGrow', 'numGrow', clamp(gp), stageName(i), false);

    var stall = $('stall');
    if (i >= 2) {
      stall.hidden = false;
      stall.textContent = '다 자랐어요. 이제 더 크지 않고, 함께하는 날만 쌓입니다.';
    } else if (!growthAllowed()) {
      stall.hidden = false;
      stall.textContent = (thin >= 1)
        ? '며칠 밥을 못 먹어 마른 모습이에요. 지금은 자라지 않고 있어요.'
        : '배가 고파서 지금은 자라지 않고 있어요.';
    } else {
      stall.hidden = true;
    }

    $('callBtn').textContent = voc() + '!';
    $('callBtn').classList.toggle('dim', st.calls === 0);
    $('callHint').textContent = st.calls >= LEARN
      ? '이제 자기 이름을 알아들어요.'
      : '아직 자기 이름을 모르는 것 같아요. ' + (LEARN - st.calls) + '번 더 불러 보세요.';
    $('callCount').textContent = st.calls > 0 ? ('부른 횟수 ' + st.calls) : '';

    var hNow = new Date().getHours();
    $('stage').dataset.tod = (hNow < 6 || hNow >= 20) ? 'night' : (hNow < 10 ? 'morning' : (hNow >= 17 ? 'evening' : 'day'));

    var box = $('petBox');
    box.classList.toggle('sad', m === 'sad');
    box.classList.toggle('thin-1', thin === 1);
    box.classList.toggle('thin-2', thin === 2);
    layers.forEach(function (l) { l.style.setProperty('--sx', thin === 2 ? 0.9 : (thin === 1 ? 0.95 : 1)); });

    var tag = $('stageTag');
    if (Date.now() < stageFlashUntil) { tag.hidden = false; }
    else { tag.hidden = true; }

    layoutPet();
    showPhoto(poseNow());
    syncProps();
    save();
  }

  function setBar(barId, numId, pct, label, low) {
    var el = $(barId);
    el.style.width = clamp(pct) + '%';
    el.classList.toggle('low', !!low);
    $(numId).textContent = label;
  }

  function syncProps() {
    var feeding = (action.until > Date.now()) ? action.bowl : null;
    $('bowlFood').classList.toggle('on', feeding === 'food');
    $('bowlWater').classList.toggle('on', feeding === 'water');
    $('toyBall').classList.toggle('on', feeding === 'toy');
  }

  function showErr(msg) {
    var el = $('errBar');
    el.hidden = false;
    el.textContent = msg;
  }

  function hop() {
    var box = $('petBox');
    box.classList.remove('hopping');
    void box.offsetWidth;
    box.classList.add('hopping');
    setTimeout(function () { box.classList.remove('hopping'); }, 700);
  }
  function pettedAnim() {
    var box = $('petBox');
    box.classList.remove('petted');
    void box.offsetWidth;
    box.classList.add('petted');
    setTimeout(function () { box.classList.remove('petted'); }, 950);
  }
  function setWalking(on) {
    $('petBox').classList.toggle('walking', !!on);
  }

  function startAction(opts) {
    action = {
      until: Date.now() + (opts.ms || 1600),
      pose: opts.pose || null,
      walk: !!opts.walk,
      bowl: opts.bowl || null
    };
    if ($('petBox').classList.contains('hopping')) { /* hop 끝나기를 기다린다 */ }
    if (opts.jump) hop();
    render();
    setTimeout(function () {
      action = { until: 0, pose: null, walk: false, bowl: null };
      setWalking(false);
      render();
    }, (opts.ms || 1600) + 40);
  }

  /* ── 성장 ───────────────────────────────────────────────── */
  function grow(points) {
    if (!growthAllowed()) return false;
    var q = (st.hunger >= 50 && st.mood >= 50) ? 1 : 0.72;
    var before = Math.floor(st.growth);
    st.growth = Math.min(MAX_GROWTH, st.growth + points * q);
    var after = stageIndex(st.growth);
    if (after > stageIndex(before)) stageUp(after);
    return true;
  }

  function stageUp(i) {
    stageFlashUntil = Date.now() + 8000;
    $('stageTag').textContent = '조금 더 자랐어요 · 이제 ' + stageName(i);
    fx('spark', 6);
    fx('heart', 2);
    say(isCat() ? '야옹!' : '멍!', 1600);
    boostUntil = Date.now() + 4000;
    note('조금 더 자랐어요. 이제 ' + stageName(i) + '예요. 몸집도 생김새도 달라졌어요.', 9000);
    hop();
    currentKey = '';
    preloadAround();
  }

  /* ── 돌봄 ───────────────────────────────────────────────── */
  function touch() { lastActionAt = Date.now(); }

  function feed() {
    if (!st) return;
    touch();
    if (st.hunger >= 94) {
      say(isCat() ? '배불러…' : '배불러요…');
      note('밥그릇을 물끄러미 봐요. 지금은 배가 불러요.');
      return;
    }
    st.hunger = clamp(st.hunger + 32);
    st.thirst = clamp(st.thirst + 4);
    st.mood = clamp(st.mood + 7);
    st.lastFedAt = Date.now();

    var d = new Date().toDateString();
    if (st.feedDay !== d) { st.feedDay = d; st.feeds = 0; }
    var gain = 0;
    if (st.feeds < CONFIG.mealsPerDay) {
      st.feeds += 1;
      gain = MAX_GROWTH / (CONFIG.growthDays * CONFIG.mealsPerDay);
      if (!growthAllowed()) {
        note('배가 고파 힘이 없어요. 밥은 먹었지만 아직 몸이 회복되지 않아 오늘은 자라지 않을 것 같아요.', 7000);
        gain = 0;
      }
    }
    if (gain > 0) grow(gain);

    fx('bowl');
    say(pick(isCat() ? ['냠냠', '맛있다 냐옹', '쩝쩝'] : ['냠냠!', '냠냠냠!', '맛있어!', '또 먹을래!']));
    note(subj() + ' 밥그릇으로 달려가 고개를 숙이고 먹어요.');
    startAction({ pose: 'sad', bowl: 'food', ms: 8000 });
    boostUntil = Date.now() + 1800;
    render();
  }

  function water() {
    if (!st) return;
    touch();
    if (st.thirst >= 94) {
      say('물은 됐어요');
      note('물그릇에서 입을 떼요. 이미 물을 충분히 마셨어요.');
      return;
    }
    st.thirst = clamp(st.thirst + 45);
    st.hunger = clamp(st.hunger + 2);
    st.mood = clamp(st.mood + 5);
    fx('drop', 2);
    say(pick(isCat() ? ['물 좋아', '쩝쩝'] : ['물이 좋아!', '쩝쩝', '시원해!']));
    note('물을 시원하게 마셨어요.');
    startAction({ pose: 'sad', bowl: 'water', ms: 7000 });
    boostUntil = Date.now() + 1400;
    render();
  }

  function outAndPlay() {
    if (!st) return;
    touch();
    var hungry = st.hunger < 28;
    st.hunger = clamp(st.hunger - 9);
    st.thirst = clamp(st.thirst - 7);
    st.mood = clamp(st.mood + (hungry ? 7 : 19));
    fx('paw', 3);
    if (isCat()) {
      say(pick(['야옹!', '같이 놀자!', '냐옹!']));
      note(hungry
        ? subj() + ' 배가 고픈지 금방 돌아와 앉았어요.'
        : '장난감을 앞발로 톡톡 치며 쫓아다녀요.');
      startAction({ pose: 'walk', walk: true, bowl: 'toy', ms: 8000 });
    } else {
      say(pick(['왈왈!', '멍멍!', '나가자!']));
      note(hungry
        ? subj() + ' 배가 고픈지 금방 돌아왔어요.'
        : subj() + ' 신나서 앞장서서 걸었어요.');
      startAction({ pose: 'walk', walk: true, ms: 8000 });
    }
    setWalking(true);
    boostUntil = Date.now() + 2000;
    render();
  }

  function petIt() {
    if (!st) return;
    touch();
    st.mood = clamp(st.mood + 15);
    fx('heart', 3);
    say(pick(isCat() ? ['골골골', '그르릉…', '더 해줘'] : ['낑낑', '좋아…', '더!']));
    note(isCat()
      ? subj() + ' 눈을 감고 머리를 손에 비벼요.'
      : subj() + ' 눈을 감고 머리를 손에 기대요.');
    startAction({ pose: 'sit', ms: 6000 });
    pettedAnim();
    boostUntil = Date.now() + 2400;
    render();
  }

  /* ── 이름 부르기 ────────────────────────────────────────── */
  function callPet() {
    if (!st) return;
    touch();
    st.calls += 1;
    var cat = isCat();

    if (st.calls >= LEARN && st.calls > LEARN) {
      st.mood = clamp(st.mood + 2);
      fx('heart', 1);
      say(pick(cat ? ['야옹!', '냐옹!', '골골!'] : ['멍멍!', '왈왈!', '낑낑!']), 1800);
      note(subj() + ' 부르는 소리를 알아듣고 달려왔어요.');
      startAction({ pose: 'stand', ms: 2600, jump: true });
      boostUntil = Date.now() + 1800;
      render();
      return;
    }

    if (st.calls === LEARN) {
      st.mood = clamp(st.mood + 12);
      fx('heart', 5);
      say(cat ? '야옹!' : '멍멍!', 2400);
      note('처음으로 자기 이름을 알아들은 것 같아요. ' + (cat
        ? '꼬리를 세우고 다가왔어요.'
        : '꼬리를 세차게 흔들며 달려왔어요.'), 9000);
      startAction({ pose: 'stand', ms: 4200, jump: true });
      boostUntil = Date.now() + 3200;
      render();
      return;
    }

    if (st.calls < 3) {
      $('bubble').hidden = true;
      note(voc() + ' 하고 불렀지만, 고개도 들지 않아요. 아직 이 이름이 자기 것인지 모르는 것 같아요.', 6000);
      startAction({ pose: 'stand', ms: 600 });
    } else {
      say('?', 1400);
      note(voc() + ' 소리에 고개를 갸웃해요. 어디서 들은 소리인가 봐요. (' + st.calls + '번째)', 5000);
      startAction({ pose: 'sit', ms: 1400 });
    }
    render();
  }

  /* ── 야단치기 (벌 대신 서운함) ──────────────────────────── */
  function scold() {
    if (!st) return;
    touch();
    st.mood = clamp(st.mood - 18);
    scoldUntil = Date.now() + 20000;
    say('…', 2000);
    note('야단을 맞자 화를 내지 않아요. 고개를 떨구고 앉아 서운해해요. 벌은 없어요 — 마음이 상할 뿐이에요.', 9000);
    startAction({ pose: 'sad', ms: 9000 });
    render();
  }

  /* ── 화면 ───────────────────────────────────────────────── */
  function greet() {
    var away = daysBetween(st.lastSeenAt);
    st.lastSeenAt = Date.now();
    var cat = isCat();
    if (away > 2.5) {
      note('오랜만이에요. ' + Math.floor(away) + '일 만이네요. ' + subj() + ' 조용히 앉아 있어요.', 9000);
    } else if (st.hunger < 30) {
      note(subj() + ' 밥그릇 쪽을 보고 있어요.', 7000);
    } else if (st.calls < LEARN) {
      note(voc() + ' 하고 불러 보세요. 아직 이름을 모르는 것 같아요.', 9000);
    } else {
      note(subj() + (cat ? ' 꼬리를 세우고 다가와요.' : ' 반갑다고 꼬리를 흔들어요.'), 6000);
    }
  }

  var IDLE_DOG = [
    '창밖을 멍하니 바라봐요.', '꼬리를 천천히 흔들어요.', '바닥 냄새를 맡고 있어요.',
    '눈이 마주치자 귀를 쫑긋했어요.', '제 꼬리를 잡으려고 돌아요.', '한참 나를 올려다봐요.'
  ];
  var IDLE_CAT = [
    '창밖을 멍하니 바라봐요.', '꼬리 끝을 살랑살랑 흔들어요.', '앞발로 얼굴을 씻고 있어요.',
    '눈이 마주치자 천천히 눈을 감았다 떠요.', '한참 나를 올려다봐요.', '바닥에 몸을 낮게 붙이고 있어요.'
  ];
  var IDLE_SIT = ['제자리에 앉아 나를 기다려요.', '앉아서 꼬리를 살랑살랑 흔들어요.', '고개를 갸웃하며 앉아 있어요.'];
  var IDLE_HUNGRY = ['밥그릇 쪽을 힐끔힐끔 봐요.', '배가 고픈지 낑낑거려요.', '바닥에 엎드려 눈만 굴리고 있어요.'];
  var IDLE_SAD = ['문 쪽을 오래 바라봐요.', '귀를 축 내리고 앉아 있어요.', '다가오지 않고 조용히 있어요.'];

  function idleTick() {
    if (!st || action.until > Date.now()) return;
    if (asleep) {
      tempPose = { until: 0, pose: null };
      note(pick(['새근새근 자고 있어요.', '자는지 숨소리가 잦아들었어요.']), 6000);
      render();
      return;
    }
    var r = Math.random();
    var pool = isCat() ? IDLE_CAT : IDLE_DOG;
    if (r < 0.35) {
      tempPose = { until: Date.now() + 6000, pose: 'sit' };
      pool = IDLE_SIT;
    } else if (r < 0.55) {
      tempPose = { until: Date.now() + 4000, pose: 'walk' };
      setWalking(true);
      setTimeout(function () { setWalking(false); }, 3600);
      pool = ['혼자 방 안을 한 바퀴 돌아요.', '어슬렁어슬렁 걸어 다녀요.'];
    } else {
      tempPose = { until: 0, pose: null };
    }
    if (st.mood < 30) pool = IDLE_SAD;
    else if (st.hunger < 34) pool = IDLE_HUNGRY;
    note(pick(pool), 5000);
    render();
    setTimeout(render, 5200);
  }

  function tick() {
    if (!st) return;
    advance();
    render();
  }

  /* ── 분양 화면 ──────────────────────────────────────────── */
  var pawSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="#B7A491" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="16" rx="4.6" ry="3.8"/><ellipse cx="7" cy="11" rx="1.9" ry="2.2"/><ellipse cx="10.2" cy="8.4" rx="1.9" ry="2.3"/><ellipse cx="13.8" cy="8.4" rx="1.9" ry="2.3"/><ellipse cx="17" cy="11" rx="1.9" ry="2.2"/></svg>';

  function thumbFor(b) {
    if (!b.ready) return pawSvg;
    return '<img src="' + photoUrl(b.sets[0], 'stand') + '" alt="" />';
  }

  function buildAdopt() {
    var dogGrid = $('gridDog'), catGrid = $('gridCat');
    var readyCount = 0;
    BREEDS.forEach(function (b) {
      var allowed = b.ready && (readyCount < CONFIG.maxBreeds);
      if (allowed) readyCount++;
      var el = document.createElement('button');
      el.type = 'button';
      el.className = 'bc' + (allowed ? '' : ' bcSoon');
      el.dataset.id = b.id;
      el.setAttribute('aria-pressed', 'false');
      el.innerHTML =
        (allowed ? '' : '<span class="soonBadge">준비 중</span>') +
        '<span class="bcArt">' + (allowed ? thumbFor(b) : pawSvg) + '</span>' +
        '<span class="bcName">' + b.name + '</span>' +
        '<span class="bcTag">' + (allowed ? b.tag : b.tag + ' · 다음 판') + '</span>';
      if (allowed) el.addEventListener('click', function () { selectBreed(b); });
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
    $('stepNameTitle').textContent = '이름을 지어 주세요';
    $('stepNameLead').innerHTML = '새끼 ' + (pendingBreed.kind === 'cat' ? '고양이' : '강아지') +
      '가 왔어요. ' + pendingBreed.name + ' · ' + pendingBreed.tag + ' · ' + pendingBreed.blurb +
      '<br>계속 불러 줄 이름이에요.';
    var inp = $('nameInput');
    inp.value = '';
    $('nameOk').disabled = true;
    setTimeout(function () { inp.focus(); }, 120);
  }

  function startAs(name) {
    st = freshState(pendingBreed.id);
    st.name = name;
    save();
    $('adopt').hidden = true;
    currentKey = '';
    preloadAround();
    render();
    note(st.name + (hasBatchim(st.name) ? '이와' : '와') + ' 함께하는 첫날이에요. ' + voc() + ' 하고 불러 보세요.', 9000);
    hop();
    startTimers();
  }

  /* ── 대화 자리 (기본 꺼짐) ──────────────────────────────── */
  function setupTalk() {
    var form = $('talkForm');
    var on = CONFIG.talk.enabled && typeof window.PETPAL_TALK === 'function';
    form.hidden = !on;
    if (!on) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var inp = $('talkInput');
      var text = inp.value.trim();
      if (!text) return;
      inp.value = '';
      var out = window.PETPAL_TALK(text);
      if (out && typeof out.then === 'function') {
        out.then(function (reply) {
          if (reply) { say(reply, 4000); note('“' + text + '” — ' + reply, 6000); }
        });
      } else if (typeof out === 'string') {
        say(out, 4000);
      }
    });
  }

  /* ── 시작 ───────────────────────────────────────────────── */
  function startTimers() {
    timers.forEach(function (t) { clearInterval(t); });
    timers = [setInterval(tick, 15000), setInterval(idleTick, 17000)];
    setInterval(function () { if (st) save(); }, 20000);
  }

  function bind() {
    $('btnFeed').addEventListener('click', feed);
    $('btnWater').addEventListener('click', water);
    $('btnWalk').addEventListener('click', outAndPlay);
    $('btnPet').addEventListener('click', petIt);
    $('callBtn').addEventListener('click', callPet);
    $('petBox').addEventListener('click', petIt);

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
      if (!st) return;
      advance();
      decay(24);
      st.lastTick = Date.now();
      st.feeds = 0;
      st.feedDay = new Date().toDateString();
      render();
      note('하루가 지났어요. (시제품용 시간 건너뛰기)', 5000);
    });

    $('growBtn').addEventListener('click', function () {
      if (!st) return;
      var i = stageIndex(st.growth);
      if (i >= 2) {
        note('이미 다 자랐어요. ' + stageName(2) + '에서는 더 자라지 않아요.', 5000);
        return;
      }
      if (!growthAllowed()) {
        note('지금은 자라지 않아요. 밥을 먹여 주세요.', 5000);
        return;
      }
      st.growth = STAGES[i + 1].at + 0.4;
      st.lastFedAt = Date.now();
      stageUp(i + 1);
      render();
    });

    $('scoldBtn').addEventListener('click', function () {
      if (!st) return;
      scold();
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
        }, 6000);
        return;
      }
      clearTimeout(armTimer);
      st = null;
      try { localStorage.removeItem(KEY); } catch (e) {}
      location.reload();
    });

    window.addEventListener('resize', function () { layoutPet(); });
    window.addEventListener('pagehide', function () { if (st) { advance(); save(); } });
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible' && st) { advance(); render(); }
    });
  }

  function init() {
    layers = [$('petA'), $('petB')];
    bind();
    setupTalk();
    buildAdopt();
    st = loadState();
    if (!st) {
      $('adopt').hidden = false;
      $('stepBreed').hidden = false;
      $('stepName').hidden = true;
      return;
    }
    if (st.name) {
      advance();
      render();
      preloadAround();
      greet();
      setTimeout(hop, 300);
      startTimers();
    }
  }

  window.addEventListener('error', function (ev) {
    showErr('시제품 오류 — ' + (ev.message || '알 수 없는 오류'));
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
