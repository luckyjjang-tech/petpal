/* Petpal v0.2 — 사진 같은 펫을 3D 무대에 세우는 모듈
   ─ 사진(투명 배경) + 깊이 지도를 겹쳐 실제로 볼록한 판(2.5D)으로 만든다.
   ─ 판을 조금 돌리면 사진이 아니라 입체로 보인다. 숨쉬기·꼬리 흔들기·걷기는 정점을 직접 움직인다.
   ─ 외부 라이브러리는 같은 폴더의 lib/three.min.js 하나뿐이고, 사진은 assets.js 안에 들어 있다(인터넷 불필요).
*/
(function (global) {
  'use strict';

  var THREE = global.THREE;

  var VERT = [
    'uniform sampler2D uDepthA;',
    'uniform sampler2D uDepthB;',
    'uniform float uMix;',
    'uniform float uRelief;',
    'uniform float uTime;',
    'uniform float uWag;',
    'uniform vec4  uWagRect;',
    'uniform float uWalk;',
    'uniform float uBreath;',
    'varying vec2 vUv;',
    'varying vec3 vNrm;',
    '',
    'float depthAt(vec2 p) {',
    '  return mix(texture2D(uDepthA, p).r, texture2D(uDepthB, p).r, uMix);',
    '}',
    'float rectMask(vec2 p, vec4 r) {',
    '  float mx = smoothstep(r.x, r.x + 0.09, p.x) * (1.0 - smoothstep(r.y - 0.09, r.y, p.x));',
    '  float my = smoothstep(r.z, r.z + 0.11, p.y) * (1.0 - smoothstep(r.w - 0.11, r.w, p.y));',
    '  return mx * my;',
    '}',
    'void main() {',
    '  vUv = uv;',
    '  float d  = depthAt(uv);',
    '  float e  = 0.0035;',
    '  float dL = depthAt(uv - vec2(e, 0.0));',
    '  float dR = depthAt(uv + vec2(e, 0.0));',
    '  float dD = depthAt(uv - vec2(0.0, e));',
    '  float dU = depthAt(uv + vec2(0.0, e));',
    '',
    '  vec3 p = position;',
    '  float rel = (d - 0.10) * uRelief;',
    '',
    '  /* 꼬리 흔들기: 꼬리 구역만 옆으로 크게 흔든다 */',
    '  float wm = rectMask(uv, uWagRect) * uWag;',
    '  float ph1 = sin(uTime * 7.4) * 0.65 + sin(uTime * 12.7) * 0.35;',
    '  p.x += ph1 * 0.055 * wm;',
    '  rel += ph1 * 0.05 * wm;',
    '',
    '  /* 걷기: 다리 구역을 앞뒤로 번갈아 내딛는다 */',
    '  float legW = (1.0 - smoothstep(0.30, 0.46, uv.y)) * smoothstep(0.01, 0.06, uv.y) * uWalk;',
    '  float ph2 = (uv.x > 0.45) ? 3.14159 : 0.0;',
    '  p.x += sin(uTime * 7.2 + ph2) * 0.030 * legW;',
    '  p.y += max(0.0, sin(uTime * 14.4 + ph2)) * 0.014 * legW;',
    '',
    '  /* 숨쉬기 (발은 붙은 채 몸통만) */',
    '  p.y *= 1.0 + sin(uTime * 1.85) * 0.008 * uBreath;',
    '',
    '  p.z += rel;',
    '',
    '  vec3 tx = vec3(e, 0.0, (dR - dL) * uRelief);',
    '  vec3 ty = vec3(0.0, e, (dU - dD) * uRelief);',
    '  vNrm = normalize(cross(tx, ty));',
    '',
    '  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);',
    '}'
  ].join('\n');

  var FRAG = [
    'uniform sampler2D uPhotoA;',
    'uniform sampler2D uPhotoB;',
    'uniform float uMix;',
    'uniform float uShade;',
    'uniform float uThin;',
    'uniform vec3 uLight;',
    'varying vec2 vUv;',
    'varying vec3 vNrm;',
    '',
    'void main() {',
    '  vec4 a = texture2D(uPhotoA, vUv);',
    '  vec4 b = texture2D(uPhotoB, vUv);',
    '  vec4 c = mix(a, b, uMix);',
    '  if (c.a < 0.035) discard;',
    '  vec3 n = normalize(vNrm);',
    '  float lam = clamp(dot(n, normalize(uLight)), 0.0, 1.0);',
    '  float shade = mix(1.0 - 0.20 * uShade, 1.0 + 0.14 * uShade, lam);',
    '  float rim = pow(1.0 - abs(n.z), 2.5) * 0.22 * uShade;',
    '  vec3 col = c.rgb * shade + vec3(rim) * c.a;',
    '  float lum = dot(col, vec3(0.299, 0.587, 0.114));',
    '  col = mix(col, vec3(lum) * 0.96, 0.55 * uThin);',
    '  col *= 1.0 - 0.06 * uThin;',
    '  gl_FragColor = vec4(col, c.a);',
    '}'
  ].join('\n');

  function shadowTexture() {
    var c = document.createElement('canvas');
    c.width = c.height = 256;
    var g = c.getContext('2d');
    var rad = g.createRadialGradient(128, 128, 4, 128, 128, 126);
    rad.addColorStop(0, 'rgba(46,32,22,0.62)');
    rad.addColorStop(0.45, 'rgba(46,32,22,0.30)');
    rad.addColorStop(1, 'rgba(48,34,24,0)');
    g.fillStyle = rad;
    g.fillRect(0, 0, 256, 256);
    var t = new THREE.CanvasTexture(c);
    t.minFilter = THREE.LinearFilter;
    return t;
  }

  function create(canvas, sets) {
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setClearAlpha(0);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(30, 1, 0.05, 40);
    camera.position.set(0, 0.66, 3.15);
    camera.lookAt(0, 0.48, 0);

    var geo = new THREE.PlaneGeometry(1, 1, 190, 150);
    geo.translate(0, 0.5, 0);           // 발이 y=0 에 닿도록

    var uniforms = {
      uPhotoA: { value: null }, uPhotoB: { value: null },
      uDepthA: { value: null }, uDepthB: { value: null },
      uMix: { value: 1 },
      uRelief: { value: 0.20 },
      uTime: { value: 0 },
      uWag: { value: 0.0 },
      uWagRect: { value: new THREE.Vector4(0.74, 0.99, 0.22, 0.62) },
      uWalk: { value: 0 },
      uBreath: { value: 1 },
      uShade: { value: 0.7 },
      uThin: { value: 0 },
      uLight: { value: new THREE.Vector3(-0.55, 0.75, 0.9).normalize() }
    };

    var material = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      side: THREE.FrontSide,
      depthWrite: true
    });

    var mesh = new THREE.Mesh(geo, material);
    var group = new THREE.Group();
    group.add(mesh);
    scene.add(group);

    var shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false })
    );
    shadow.position.set(0, 0.001, 0.0);
    shadow.scale.set(1.2, 0.34, 1);
    scene.add(shadow);

    /* ── 자산 ─────────────────────────────────────────── */
    var loader = new THREE.TextureLoader();
    var texCache = {};
    function findSet(name) {
      for (var i = 0; i < sets.length; i++) if (sets[i].name === name) return sets[i];
      return null;
    }

    function texFor(key, url) {
      if (!texCache[key]) {
        var t = loader.load(url);
        t.minFilter = THREE.LinearFilter;
        t.magFilter = THREE.LinearFilter;
        t.generateMipmaps = false;
        t.anisotropy = renderer.capabilities.getMaxAnisotropy ? Math.min(4, renderer.capabilities.getMaxAnisotropy()) : 1;
        texCache[key] = t;
      }
      return texCache[key];
    }

    function prepare(setName) {
      var set = findSet(setName);
      if (!set) return null;
      Object.keys(set.poses).forEach(function (pose) {
        texFor(setName + '/' + pose + '/p', set.poses[pose].photo);
        texFor(setName + '/' + pose + '/d', set.poses[pose].depth);
      });
      return set;
    }

    /* ── 상태 ─────────────────────────────────────────── */
    var cur = { set: null, pose: null, w: 1.2 };
    var from = { set: null, pose: null };
    var mixT = 1;
    var mixDur = 0.35;
    var targetScale = 1;
    var shownScale = 1;
    var walkAmt = 0, walkTarget = 0;
    var wagAmt = 0.25, wagTarget = 0.25;
    var jumpT = -1;
    var yBase = 0;
    var lastH = 1;
    var frameCount = 0;
    var dragging = false, dragX = 0, dragYaw = 0, idleYaw = 0;
    var clock = new THREE.Clock();
    var alive = true;

    var WAG = {
      stand: [0.76, 0.99, 0.20, 0.60],
      walk: [0.76, 0.99, 0.20, 0.60],
      sit: [0.72, 0.99, 0.08, 0.34],
      sad: [0.70, 0.99, 0.06, 0.30]
    };

    function applyPose(set, pose, instant) {
      if (!set) return;
      var p = set.poses[pose] || set.poses[Object.keys(set.poses)[0]];
      var poseName = set.poses[pose] ? pose : Object.keys(set.poses)[0];
      var ph = texFor(set.name + '/' + poseName + '/p', p.photo);
      var dp = texFor(set.name + '/' + poseName + '/d', p.depth);
      var prev = { p: uniforms.uPhotoB.value, d: uniforms.uDepthB.value };
      // 지금 보이는 것(A)은 그대로 두고, 새 것(B)을 섞어 넣는다
      uniforms.uPhotoA.value = prev.p || ph;
      uniforms.uDepthA.value = prev.d || dp;
      uniforms.uPhotoB.value = ph;
      uniforms.uDepthB.value = dp;
      uniforms.uMix.value = instant ? 1 : 0;
      mixT = instant ? 1 : 0;
      var wr = WAG[poseName] || WAG.stand;
      uniforms.uWagRect.value.set(wr[0], wr[1], wr[2], wr[3]);
      var dy = (p && typeof p.dy === 'number') ? p.dy : 0;
      cur = {
        set: set.name, pose: poseName, aspect: set.aspect, w: cur.w || 1.2,
        anchor: (typeof set.anchorX === 'number' ? set.anchorX : 0.5),
        dy: dy
      };
      applySize();
    }

    /* ── 크기 ─────────────────────────────────────────── */
    function layout() {
      var w = canvas.clientWidth || 320;
      var h = canvas.clientHeight || 320;
      renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, 2));
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }

    function viewSize() {
      var vh = 2 * Math.tan(camera.fov * 0.5 * Math.PI / 180) * camera.position.z;
      return { w: vh * camera.aspect, h: vh };
    }

    function applySize() {
      var slim = 1 - 0.06 * uniforms.uThin.value;
      var base = cur.w * targetScale * slim;
      var h0 = base * (cur.aspect || 0.8);
      // 화면 밖으로 나가지 않게 (폰 세로 화면에서도)
      var vs = viewSize();
      var fit = Math.min(1, (vs.w * 0.90) / base, (vs.h * 0.66) / h0);
      var w = base * fit;
      var h = h0 * fit;
      lastH = h;
      mesh.scale.set(w, h, w);
      mesh.position.x = (0.5 - (cur.anchor || 0.5)) * w;
      mesh.position.y = -(cur.dy || 0) * h;
      shadow.scale.set(w * 1.0, w * 0.21, 1);
      shadow.position.x = group.position.x;
      shadow.position.y = -0.004;
      shadow.material.opacity = jumpT >= 0 ? 0.5 : 1.0;
    }

    /* ── 애니메이션 ───────────────────────────────────── */
    function frame() {
      if (!alive) return;
      frameCount++;
      var dt = Math.min(clock.getDelta(), 0.05);
      var t = clock.elapsedTime;
      uniforms.uTime.value = t;

      if (mixT < 1) {
        mixT = Math.min(1, mixT + dt / mixDur);
        uniforms.uMix.value = mixT * mixT * (3 - 2 * mixT);
      }

      shownScale += (targetScale - shownScale) * Math.min(1, dt * 6);

      // 걷기·꼬리 세기
      walkAmt += (walkTarget - walkAmt) * Math.min(1, dt * 5);
      uniforms.uWalk.value = walkAmt;
      wagAmt += (wagTarget - wagAmt) * Math.min(1, dt * 4);
      uniforms.uWag.value = wagAmt;

      // 점프
      if (jumpT >= 0) {
        jumpT += dt;
        var k = jumpT / 0.62;
        if (k >= 1) { jumpT = -1; yBase = 0; }
        else {
          var arc = Math.sin(Math.PI * k);
          yBase = arc * 0.34;
          var squash = 1 - 0.10 * Math.sin(Math.PI * Math.min(1, k * 1.6));
          group.position.y = yBase;
          mesh.scale.y = lastH * squash;
        }
      } else {
        group.position.y += (0 - group.position.y) * Math.min(1, dt * 10);
        mesh.scale.y = lastH * (1 + Math.sin(t * 1.85) * 0.004);
      }

      // 살짝 흔들리는 시선(입체감)
      if (!dragging) {
        idleYaw = Math.sin(t * 0.38) * 0.10;
        dragYaw += (0 - dragYaw) * Math.min(1, dt * 2.2);
      }
      group.rotation.y = idleYaw + dragYaw;
      group.rotation.z = Math.sin(t * 0.9) * 0.004;

      applySize();
      if (walkAmt > 0.01) {
        group.position.x = Math.sin(t * 0.55) * 0.05 * walkAmt;
      } else {
        group.position.x += (0 - group.position.x) * Math.min(1, dt * 3);
      }

      renderer.render(scene, camera);
      requestAnimationFrame(frame);
    }

    /* ── 드래그로 돌려 보기 ───────────────────────────── */
    function pointerDown(e) {
      dragging = true;
      dragX = (e.touches ? e.touches[0].clientX : e.clientX);
    }
    function pointerMove(e) {
      if (!dragging) return;
      var x = (e.touches ? e.touches[0].clientX : e.clientX);
      var d = (x - dragX) / (canvas.clientWidth || 320);
      dragX = x;
      dragYaw = Math.max(-0.55, Math.min(0.55, dragYaw + d * 2.2));
    }
    function pointerUp() { dragging = false; }

    canvas.addEventListener('mousedown', pointerDown);
    global.addEventListener('mousemove', pointerMove);
    global.addEventListener('mouseup', pointerUp);
    canvas.addEventListener('touchstart', pointerDown, { passive: true });
    canvas.addEventListener('touchmove', pointerMove, { passive: true });
    canvas.addEventListener('touchend', pointerUp);

    var ro = global.ResizeObserver ? new ResizeObserver(layout) : null;
    if (ro) ro.observe(canvas);
    global.addEventListener('resize', layout);

    layout();
    requestAnimationFrame(frame);

    return {
      use: function (setName, pose, instant) {
        var set = prepare(setName);
        applyPose(set, pose, instant !== false);
        applySize();
        return this;
      },
      pose: function (pose, dur) {
        var set = findSet(cur.set);
        if (!set) return this;
        if (cur.pose === pose) return this;
        mixDur = (dur || 350) / 1000;
        applyPose(set, pose, false);
        return this;
      },
      /* 성장 배율: 새끼 0.78 → 다 큰 개 1.0 */
      scale: function (k) { targetScale = k; return this; },
      walk: function (on) { walkTarget = on ? 1 : 0; return this; },
      wag: function (k) { wagTarget = k; return this; },
      thin: function (k) {
        uniforms.uThin.value = Math.max(0, Math.min(1, k));
        applySize();
        return this;
      },
      jump: function () { jumpT = 0; return this; },
      setWidth: function (w) { cur.w = w; applySize(); return this; },
      resize: layout,
      poseName: function () { return cur.pose; },
      debug: function () {
        var t = uniforms.uPhotoB.value;
        return {
          calls: renderer.info.render.calls,
          triangles: renderer.info.render.triangles,
          tex: t && t.image ? [t.image.width, t.image.height] : null,
          texLoaded: t ? !!t.needsUpdate || !!(t.image && t.image.width) : false,
          scale: [mesh.scale.x, mesh.scale.y, mesh.scale.z],
          aspect: cur.aspect, w: cur.w, target: targetScale,
          mix: uniforms.uMix.value,
          pose: cur.pose, set: cur.set, dy: cur.dy, frames: frameCount,
          uniforms: { thin: uniforms.uThin.value, walk: uniforms.uWalk.value, wag: uniforms.uWag.value },
          size: [canvas.width, canvas.height],
          cam: [camera.position.x, camera.position.y, camera.position.z, camera.aspect]
        };
      },
      destroy: function () { alive = false; }
    };
  }

  global.Pet3D = { create: create };
})(window);
