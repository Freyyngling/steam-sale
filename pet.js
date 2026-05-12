// =====================================================
// Steam セール観測所 - キャラクターシステム
// pet.js
// =====================================================

// =====================================================
// ★ 吹き出しコメントはここを編集してください ★
// =====================================================
const MESSAGES = [
  "このセール、見逃したら絶対後悔するよ！",
  "割引率90%以上のゲームがあるよ！急いで！",
  "日本語対応フィルターで絞り込めるの知ってた？",
  "セール終了前に価格確認してね！",
  "今日のおすすめは割引率の高い順で上位のやつだよ！",
  "わたし、ずっとここでセール見てるよ……",
  "気になるゲームはさっさと買わないと後悔するからね！",
  "ねえねえ、そのゲームどうだった？",
  "最近セール多くて財布が大変なことになってる……",
  "割引率80%以上のゲームを狙えば間違いないよ！",
  "この主さん、ズボラなんで、あまり更新、期待しないでね。",
];

// =====================================================
// 画像ファイル設定
// =====================================================
const IMGS = {
  walkRight:   'Right.png',
  walkLeft:    'Left.png',
  walkBack:    'back.png',
  neutral:     'front-neutral.png',
  blinkHalf:   'front-blink-half.png',
  blinkClosed: 'front-blink-closed.png',
  smile:       'front-smile.png',
  happy1:      'front-happy1.png',
  happy2:      'front-happy2.png',
  surprised:   'front-surprised.png',
  sleepy:      'front-sleepy.png',
  sleep:       'front-sleep.png',
  angry1:      'front-angry1.png',
  angry2:      'front-angry2.png',
  cry1:        'front-cry1.png',
  cry2:        'front-cry2.png',
  readBook1:   'read_book1.png',
  readBook2:   'read_book2_blink-closed.png',
  gameplay1:   'gameplay1.png',
  gameplay2:   'gameplay2blink-half.png',
};

const PET_SIZE        = 150;
const PET_SPEED       = 1.5;
const ACTION_RETURN_MS = 10000;

let petEl     = null;
let bubbleEl  = null;
let toggleBtn = null;
let visible   = true;

let posX = 100, posY = 400;
let targetX = 200, targetY = 400;
let direction   = 'right';
let state       = 'walk';
let actionTimer = null;
let blinkTimer  = null;
let bubbleTimer = null;
let animFrame   = null;
let idleTimer   = null;
let dragging    = false;  // グローバルで管理

// =====================================================
// DOM構築
// =====================================================
function buildPetDOM() {
  const wrapper = document.createElement('div');
  wrapper.id = 'pet-wrapper';
  wrapper.style.cssText = `
    position: fixed; inset: 0;
    pointer-events: none;
    z-index: 9000;
  `;

  petEl = document.createElement('img');
  petEl.id  = 'pet-char';
  petEl.src = IMGS.neutral;
  petEl.style.cssText = `
    position: absolute;
    width: ${PET_SIZE}px;
    height: ${PET_SIZE}px;
    object-fit: contain;
    image-rendering: pixelated;
    left: ${posX}px;
    top:  ${posY}px;
    cursor: grab;
    pointer-events: auto;
    filter: drop-shadow(0 4px 8px rgba(0,0,0,0.6));
    user-select: none;
    -webkit-user-drag: none;
  `;

  bubbleEl = document.createElement('div');
  bubbleEl.id = 'pet-bubble';
  bubbleEl.style.cssText = `
    position: absolute;
    background: rgba(15,18,35,0.96);
    border: 1px solid rgba(129,140,248,0.7);
    border-radius: 12px;
    padding: 8px 12px;
    font-size: 12px;
    font-family: 'Noto Sans JP', sans-serif;
    color: #e2e8f0;
    max-width: 200px;
    line-height: 1.6;
    pointer-events: none;
    display: none;
    box-shadow: 0 4px 16px rgba(0,0,0,0.5);
    white-space: normal;
    word-break: break-all;
    z-index: 9002;
  `;

  toggleBtn = document.createElement('button');
  toggleBtn.id = 'pet-toggle';
  toggleBtn.textContent = '🌸 消す';
  toggleBtn.style.cssText = `
    position: fixed;
    bottom: 120px;
    right: 20px;
    background: rgba(15,18,35,0.9);
    border: 1px solid rgba(129,140,248,0.5);
    color: #e2e8f0;
    font-family: 'Noto Sans JP', sans-serif;
    font-size: 12px;
    padding: 6px 14px;
    border-radius: 20px;
    cursor: pointer;
    pointer-events: auto;
    z-index: 9001;
    transition: all 0.15s;
  `;
  toggleBtn.onmouseenter = () => { toggleBtn.style.borderColor = '#818cf8'; };
  toggleBtn.onmouseleave = () => { toggleBtn.style.borderColor = 'rgba(129,140,248,0.5)'; };
  toggleBtn.onclick = togglePet;

  wrapper.appendChild(petEl);
  wrapper.appendChild(bubbleEl);
  document.body.appendChild(wrapper);
  document.body.appendChild(toggleBtn);
}

// =====================================================
// 表示・非表示
// =====================================================
function togglePet() {
  visible = !visible;
  const w  = document.getElementById('pet-wrapper');
  const dz = document.getElementById('pet-dropzone-container');
  if (w)  w.style.display  = visible ? '' : 'none';
  if (dz) dz.style.display = visible ? '' : 'none';
  toggleBtn.textContent = visible ? '🌸 消す' : '🌸 出す';
  if (visible) startWalk();
  else stopAll();
}

// =====================================================
// 画像切り替え
// =====================================================
function setImg(src) {
  if (petEl && !petEl.src.endsWith(src)) petEl.src = src;
}

// =====================================================
// 吹き出し
// =====================================================
function showBubble(text, durationMs) {
  clearTimeout(bubbleTimer);
  bubbleEl.textContent = text;
  bubbleEl.style.display = 'block';
  updateBubblePos();
  bubbleTimer = setTimeout(() => { bubbleEl.style.display = 'none'; }, durationMs || 4000);
}

function updateBubblePos() {
  const bw = 200;
  let bx = posX + PET_SIZE / 2 - bw / 2;
  let by = posY - 85;
  if (bx < 10) bx = 10;
  if (bx + bw > window.innerWidth - 10) bx = window.innerWidth - bw - 10;
  if (by < 10) by = posY + PET_SIZE + 10;
  bubbleEl.style.left  = bx + 'px';
  bubbleEl.style.top   = by + 'px';
  bubbleEl.style.width = bw + 'px';
}

function showRandomMessage() {
  const msg = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
  showBubble(msg, 5000);
}

// =====================================================
// まばたき
// =====================================================
function startBlink() {
  stopBlink();
  function doBlink() {
    if (state !== 'idle') return;
    setImg(IMGS.blinkHalf);
    setTimeout(() => {
      if (state !== 'idle') return;
      setImg(IMGS.blinkClosed);
      setTimeout(() => {
        if (state !== 'idle') return;
        setImg(IMGS.blinkHalf);
        setTimeout(() => {
          if (state !== 'idle') return;
          setImg(IMGS.neutral);
        }, 80);
      }, 100);
    }, 80);
    blinkTimer = setTimeout(doBlink, 3000 + Math.random() * 3000);
  }
  blinkTimer = setTimeout(doBlink, 2000 + Math.random() * 2000);
}
function stopBlink() { clearTimeout(blinkTimer); }

// =====================================================
// ターゲット・歩き
// =====================================================
function setNewTarget() {
  const margin = 60;
  targetX = margin + Math.random() * Math.max(0, window.innerWidth  - PET_SIZE - margin * 2);
  targetY = margin + Math.random() * Math.max(0, window.innerHeight - PET_SIZE - margin * 2);
}

function startWalk() {
  state = 'walk';
  stopBlink();
  setNewTarget();
  if (!animFrame) loop();
  scheduleRandomTalk();
}

function scheduleRandomTalk() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (state === 'walk' || state === 'idle') showRandomMessage();
    scheduleRandomTalk();
  }, 8000 + Math.random() * 12000);
}

function goIdle() {
  state = 'idle';
  setImg(IMGS.neutral);
  startBlink();
  clearTimeout(actionTimer);
  actionTimer = setTimeout(() => startWalk(), 3000 + Math.random() * 4000);
}

// =====================================================
// アクション
// =====================================================
let actionAnim = null;

function doAction(type) {
  if (state === 'action') return;
  state = 'action';
  stopBlink();
  clearTimeout(actionTimer);
  clearTimeout(idleTimer);
  clearInterval(actionAnim);

  if (type === 'book') {
    let f = 0;
    const frames = [IMGS.readBook1, IMGS.readBook2];
    actionAnim = setInterval(() => { setImg(frames[f++ % 2]); }, 600);
    showBubble('セールのゲーム……たくさんあるねぇ……', 8000);
  } else if (type === 'game') {
    let f = 0;
    const frames = [IMGS.gameplay1, IMGS.gameplay2];
    actionAnim = setInterval(() => { setImg(frames[f++ % 2]); }, 500);
    showBubble('ゲームしてる……邪魔しないでよ……', 8000);
  }

  actionTimer = setTimeout(() => {
    clearInterval(actionAnim);
    returnToWalk();
  }, ACTION_RETURN_MS);
}

function returnToWalk() {
  clearInterval(actionAnim);
  state = 'walk';
  stopBlink();
  setNewTarget();
  scheduleRandomTalk();
}

// =====================================================
// メインループ
// =====================================================
function loop() {
  animFrame = requestAnimationFrame(loop);
  if (state !== 'walk') {
    petEl.style.left = posX + 'px';
    petEl.style.top  = posY + 'px';
    updateBubblePos();
    return;
  }
  const dx = targetX - posX, dy = targetY - posY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < PET_SPEED * 2) {
    goIdle();
  } else {
    posX += (dx / dist) * PET_SPEED;
    posY += (dy / dist) * PET_SPEED;
    if (Math.abs(dx) > Math.abs(dy) * 0.5) {
      direction = dx > 0 ? 'right' : 'left';
      setImg(dx > 0 ? IMGS.walkRight : IMGS.walkLeft);
    } else if (dy < -10) {
      setImg(IMGS.walkBack);
    } else {
      setImg(direction === 'right' ? IMGS.walkRight : IMGS.walkLeft);
    }
  }
  petEl.style.left = posX + 'px';
  petEl.style.top  = posY + 'px';
  updateBubblePos();
}

function stopAll() {
  cancelAnimationFrame(animFrame); animFrame = null;
  clearTimeout(actionTimer); clearTimeout(blinkTimer);
  clearTimeout(bubbleTimer); clearTimeout(idleTimer);
  clearInterval(actionAnim);
}

// =====================================================
// ドロップゾーン定義
// =====================================================
const DROP_ZONE_DEFS = [
  { id: 'dz-book', action: 'book', img: 'desk_aicon.png', label: '調べる' },
  { id: 'dz-game', action: 'game', img: 'TV_aicon.png',   label: 'ゲーム' },
];

// =====================================================
// ドロップゾーン構築
// =====================================================
function buildDropZones() {
  const container = document.createElement('div');
  container.id = 'pet-dropzone-container';
  container.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 24px;
    z-index: 9001;
    pointer-events: none;
    align-items: flex-end;
  `;

  DROP_ZONE_DEFS.forEach(def => {
    const wrap = document.createElement('div');
    wrap.style.cssText = `
      display: flex; flex-direction: column;
      align-items: center; gap: 4px;
    `;

    const el = document.createElement('div');
    el.id = def.id;
    el.dataset.action = def.action;
    el.style.cssText = `
      width: 80px; height: 80px;
      border: 2px dashed rgba(129,140,248,0.35);
      border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      background: rgba(10,14,23,0.7);
      overflow: hidden;
      transition: border-color 0.15s, background 0.15s, transform 0.15s;
      position: relative;
    `;

    const img = document.createElement('img');
    img.src = def.img;
    img.className = 'dz-icon';
    img.style.cssText = `
      width: 68px; height: 68px;
      object-fit: contain;
      image-rendering: pixelated;
      transition: opacity 0.2s;
    `;

    const label = document.createElement('span');
    label.textContent = def.label;
    label.style.cssText = `
      font-size: 10px; color: #64748b;
      font-family: 'Noto Sans JP', sans-serif;
    `;

    el.appendChild(img);
    wrap.appendChild(el);
    wrap.appendChild(label);
    container.appendChild(wrap);
  });

  document.body.appendChild(container);
}

// =====================================================
// ドラッグ中のゾーン判定ヘルパー
// =====================================================
function getHoveredZone(cx, cy) {
  for (const def of DROP_ZONE_DEFS) {
    const el = document.getElementById(def.id);
    if (!el) continue;
    const r = el.getBoundingClientRect();
    // ヒット判定を少し広げる（キャラ中心で判定）
    const px = posX + PET_SIZE / 2;
    const py = posY + PET_SIZE / 2;
    if (px >= r.left - 20 && px <= r.right + 20 &&
        py >= r.top  - 20 && py <= r.bottom + 20) {
      return def;
    }
  }
  return null;
}

function updateZoneHighlight(cx, cy) {
  DROP_ZONE_DEFS.forEach(def => {
    const el  = document.getElementById(def.id);
    const img = el ? el.querySelector('.dz-icon') : null;
    if (!el) return;

    const r   = el.getBoundingClientRect();
    const px  = posX + PET_SIZE / 2;
    const py  = posY + PET_SIZE / 2;
    const over = px >= r.left - 20 && px <= r.right + 20 &&
                 py >= r.top  - 20 && py <= r.bottom + 20;

    el.style.borderColor = over ? 'rgba(129,140,248,0.95)' : 'rgba(129,140,248,0.35)';
    el.style.background  = over ? 'rgba(129,140,248,0.18)' : 'rgba(10,14,23,0.7)';
    el.style.transform   = over ? 'scale(1.12)' : 'scale(1)';
    // アイコンをキャラが乗っている間は非表示
    if (img) img.style.opacity = over ? '0' : '1';
  });
}

function clearAllHighlights() {
  DROP_ZONE_DEFS.forEach(def => {
    const el  = document.getElementById(def.id);
    const img = el ? el.querySelector('.dz-icon') : null;
    if (el) {
      el.style.borderColor = 'rgba(129,140,248,0.35)';
      el.style.background  = 'rgba(10,14,23,0.7)';
      el.style.transform   = 'scale(1)';
    }
    if (img) img.style.opacity = '1';
  });
}

// =====================================================
// ドラッグ設定
// =====================================================
function setupDrag() {
  let dragOffX = 0, dragOffY = 0;

  // ----- マウス -----
  petEl.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    dragging = true;
    dragOffX = e.clientX - posX;
    dragOffY = e.clientY - posY;
    petEl.style.cursor = 'grabbing';
    state = 'action';
    stopBlink();
    clearTimeout(actionTimer);
    clearTimeout(idleTimer);
    clearInterval(actionAnim);
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    posX = e.clientX - dragOffX;
    posY = e.clientY - dragOffY;
    // 画面外に出ないようにクランプ
    posX = Math.max(0, Math.min(window.innerWidth  - PET_SIZE, posX));
    posY = Math.max(0, Math.min(window.innerHeight - PET_SIZE, posY));
    setImg(IMGS.surprised);
    petEl.style.left = posX + 'px';
    petEl.style.top  = posY + 'px';
    updateBubblePos();
    updateZoneHighlight(e.clientX, e.clientY);
  });

  document.addEventListener('mouseup', (e) => {
    if (!dragging) return;
    dragging = false;
    petEl.style.cursor = 'grab';

    const zone = getHoveredZone(e.clientX, e.clientY);
    clearAllHighlights();

    if (zone) {
      doAction(zone.action);
    } else {
      setImg(IMGS.smile);
      showBubble('どこに連れてくの〜？', 3000);
      actionTimer = setTimeout(() => returnToWalk(), 2000);
    }
  });

  // ----- タッチ -----
  petEl.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    dragging = true;
    dragOffX = t.clientX - posX;
    dragOffY = t.clientY - posY;
    state = 'action';
    stopBlink();
    clearTimeout(actionTimer);
    clearTimeout(idleTimer);
    clearInterval(actionAnim);
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    if (!dragging) return;
    const t = e.touches[0];
    posX = t.clientX - dragOffX;
    posY = t.clientY - dragOffY;
    posX = Math.max(0, Math.min(window.innerWidth  - PET_SIZE, posX));
    posY = Math.max(0, Math.min(window.innerHeight - PET_SIZE, posY));
    setImg(IMGS.surprised);
    petEl.style.left = posX + 'px';
    petEl.style.top  = posY + 'px';
    updateBubblePos();
    updateZoneHighlight(t.clientX, t.clientY);
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    if (!dragging) return;
    dragging = false;
    const t = e.changedTouches[0];
    const zone = getHoveredZone(t.clientX, t.clientY);
    clearAllHighlights();
    if (zone) {
      doAction(zone.action);
    } else {
      setImg(IMGS.smile);
      showBubble('どこに連れてくの〜？', 3000);
      actionTimer = setTimeout(() => returnToWalk(), 2000);
    }
  });
}

// =====================================================
// クリックで喋る
// =====================================================
function setupClick() {
  petEl.addEventListener('click', (e) => {
    if (dragging) return;
    if (state === 'action') return;
    e.stopPropagation();
    const happy = [IMGS.happy1, IMGS.happy2];
    let f = 0;
    const anim = setInterval(() => { setImg(happy[f++ % 2]); }, 300);
    showRandomMessage();
    setTimeout(() => {
      clearInterval(anim);
      if (state !== 'action') setImg(IMGS.smile);
    }, 1500);
  });
}

// =====================================================
// 初期化
// =====================================================
function initPet() {
  posX    = window.innerWidth  / 2 - PET_SIZE / 2;
  posY    = window.innerHeight - PET_SIZE - 140;
  targetX = posX;
  targetY = posY;

  buildPetDOM();
  buildDropZones();
  setupDrag();
  setupClick();

  setTimeout(() => {
    showBubble('こんにちは！セール情報を一緒にチェックしよ！', 4000);
    setTimeout(() => startWalk(), 2000);
  }, 800);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPet);
} else {
  initPet();
}
