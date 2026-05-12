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

// =====================================================
// キャラクター設定
// =====================================================
const PET_SIZE       = 150;
const PET_SPEED      = 1.5;
const ACTION_RETURN_MS = 10000;

// =====================================================
// 状態管理
// =====================================================
let petEl     = null;
let bubbleEl  = null;
let toggleBtn = null;
let visible   = true;

let posX = 100, posY = 400;
let targetX = 200, targetY = 400;
let direction  = 'right';
let state      = 'walk';
let actionTimer = null;
let blinkTimer  = null;
let bubbleTimer = null;
let animFrame   = null;
let idleTimer   = null;

// =====================================================
// DOM構築
// =====================================================
function buildPetDOM() {
  const wrapper = document.createElement('div');
  wrapper.id = 'pet-wrapper';
  wrapper.style.cssText = `
    position: fixed;
    inset: 0;
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
    bottom: 96px;
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
  document.getElementById('pet-wrapper').style.display = visible ? '' : 'none';
  // ドロップゾーンも連動
  const dzContainer = document.getElementById('pet-dropzone-container');
  if (dzContainer) dzContainer.style.display = visible ? '' : 'none';
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
  bubbleTimer = setTimeout(() => {
    bubbleEl.style.display = 'none';
  }, durationMs || 4000);
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

function stopBlink() {
  clearTimeout(blinkTimer);
}

// =====================================================
// ターゲット設定
// =====================================================
function setNewTarget() {
  const margin = 60;
  const maxX   = window.innerWidth  - PET_SIZE - margin;
  const maxY   = window.innerHeight - PET_SIZE - margin;
  targetX = margin + Math.random() * Math.max(0, maxX);
  targetY = margin + Math.random() * Math.max(0, maxY);
}

// =====================================================
// 歩き開始
// =====================================================
function startWalk() {
  state = 'walk';
  stopBlink();
  setNewTarget();
  if (!animFrame) loop();
  scheduleRandomTalk();
}

function scheduleRandomTalk() {
  clearTimeout(idleTimer);
  const delay = 8000 + Math.random() * 12000;
  idleTimer = setTimeout(() => {
    if (state === 'walk' || state === 'idle') showRandomMessage();
    scheduleRandomTalk();
  }, delay);
}

// =====================================================
// アイドル
// =====================================================
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
function doAction(type) {
  if (state === 'action') return;
  state = 'action';
  stopBlink();
  clearTimeout(actionTimer);
  clearTimeout(idleTimer);

  let anim;
  if (type === 'book') {
    let frame = 0;
    const frames = [IMGS.readBook1, IMGS.readBook2];
    anim = setInterval(() => { setImg(frames[frame++ % 2]); }, 600);
    showBubble('セールのゲーム……たくさんあるねぇ……', 8000);
  } else if (type === 'game') {
    let frame = 0;
    const frames = [IMGS.gameplay1, IMGS.gameplay2];
    anim = setInterval(() => { setImg(frames[frame++ % 2]); }, 500);
    showBubble('ゲームしてる……邪魔しないでよ……', 8000);
  }

  actionTimer = setTimeout(() => {
    clearInterval(anim);
    returnToWalk();
  }, ACTION_RETURN_MS);
}

function returnToWalk() {
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

  const dx   = targetX - posX;
  const dy   = targetY - posY;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < PET_SPEED * 2) {
    goIdle();
  } else {
    posX += (dx / dist) * PET_SPEED;
    posY += (dy / dist) * PET_SPEED;

    if (Math.abs(dx) > Math.abs(dy) * 0.5) {
      if (dx > 0) { direction = 'right'; setImg(IMGS.walkRight); }
      else        { direction = 'left';  setImg(IMGS.walkLeft);  }
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
  cancelAnimationFrame(animFrame);
  animFrame = null;
  clearTimeout(actionTimer);
  clearTimeout(blinkTimer);
  clearTimeout(bubbleTimer);
  clearTimeout(idleTimer);
}

// =====================================================
// ドラッグ
// =====================================================
function setupDrag() {
  let dragging = false;
  let dragOffX = 0, dragOffY = 0;

  petEl.addEventListener('mousedown', (e) => {
    dragging = true;
    dragOffX = e.clientX - posX;
    dragOffY = e.clientY - posY;
    petEl.style.cursor = 'grabbing';
    state = 'action';
    stopBlink();
    clearTimeout(actionTimer);
    clearTimeout(idleTimer);
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    posX = e.clientX - dragOffX;
    posY = e.clientY - dragOffY;
    setImg(IMGS.surprised);
    petEl.style.left = posX + 'px';
    petEl.style.top  = posY + 'px';
    updateBubblePos();
    // ドロップゾーンをホバー時にハイライト
    highlightDropZone(e.clientX, e.clientY);
  });

  document.addEventListener('mouseup', (e) => {
    if (!dragging) return;
    dragging = false;
    petEl.style.cursor = 'grab';
    clearAllHighlights();
    const dropped = checkDropZone(e.clientX, e.clientY);
    if (!dropped) {
      setImg(IMGS.smile);
      showBubble('どこに連れてくの〜？', 3000);
      actionTimer = setTimeout(() => returnToWalk(), 2000);
    }
  });

  // タッチ対応
  petEl.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    dragging = true;
    dragOffX = t.clientX - posX;
    dragOffY = t.clientY - posY;
    state = 'action';
    stopBlink();
    clearTimeout(actionTimer);
    clearTimeout(idleTimer);
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    if (!dragging) return;
    const t = e.touches[0];
    posX = t.clientX - dragOffX;
    posY = t.clientY - dragOffY;
    setImg(IMGS.surprised);
    petEl.style.left = posX + 'px';
    petEl.style.top  = posY + 'px';
    updateBubblePos();
    highlightDropZone(t.clientX, t.clientY);
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    if (!dragging) return;
    dragging = false;
    clearAllHighlights();
    const t = e.changedTouches[0];
    const dropped = checkDropZone(t.clientX, t.clientY);
    if (!dropped) {
      setImg(IMGS.smile);
      showBubble('どこに連れてくの〜？', 3000);
      actionTimer = setTimeout(() => returnToWalk(), 2000);
    }
  });
}

// =====================================================
// ドロップゾーン
// =====================================================
const DROP_ZONE_DEFS = [
  { id: 'dz-book', action: 'book', img: 'desk_aicon.png', label: '調べる' },
  { id: 'dz-game', action: 'game', img: 'TV_aicon.png',   label: 'ゲーム' },
];

function buildDropZones() {
  const container = document.createElement('div');
  container.id = 'pet-dropzone-container';
  container.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 20px;
    z-index: 9001;
    pointer-events: none;
    align-items: flex-end;
  `;

  DROP_ZONE_DEFS.forEach(def => {
    const wrap = document.createElement('div');
    wrap.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    `;

    const el = document.createElement('div');
    el.id = def.id;
    el.style.cssText = `
      width: 80px;
      height: 80px;
      border: 2px dashed rgba(129,140,248,0.35);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: border-color 0.2s, background 0.2s, transform 0.15s;
      background: rgba(10,14,23,0.6);
      overflow: hidden;
    `;

    const img = document.createElement('img');
    img.src = def.img;
    img.style.cssText = `
      width: 68px;
      height: 68px;
      object-fit: contain;
      image-rendering: pixelated;
    `;

    const label = document.createElement('span');
    label.textContent = def.label;
    label.style.cssText = `
      font-size: 10px;
      color: #64748b;
      font-family: 'Noto Sans JP', sans-serif;
    `;

    el.appendChild(img);
    wrap.appendChild(el);
    wrap.appendChild(label);
    container.appendChild(wrap);
  });

  document.body.appendChild(container);
}

function highlightDropZone(cx, cy) {
  DROP_ZONE_DEFS.forEach(def => {
    const el = document.getElementById(def.id);
    if (!el) return;
    const r = el.getBoundingClientRect();
    const over = cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom;
    el.style.borderColor  = over ? 'rgba(129,140,248,0.9)' : 'rgba(129,140,248,0.35)';
    el.style.background   = over ? 'rgba(129,140,248,0.2)' : 'rgba(10,14,23,0.6)';
    el.style.transform    = over ? 'scale(1.1)' : 'scale(1)';
  });
}

function clearAllHighlights() {
  DROP_ZONE_DEFS.forEach(def => {
    const el = document.getElementById(def.id);
    if (!el) return;
    el.style.borderColor = 'rgba(129,140,248,0.35)';
    el.style.background  = 'rgba(10,14,23,0.6)';
    el.style.transform   = 'scale(1)';
  });
}

function checkDropZone(cx, cy) {
  for (const def of DROP_ZONE_DEFS) {
    const el = document.getElementById(def.id);
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom) {
      doAction(def.action);
      return true;
    }
  }
  return false;
}

// =====================================================
// クリックで喋る
// =====================================================
function setupClick() {
  petEl.addEventListener('click', (e) => {
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
  posY    = window.innerHeight - PET_SIZE - 120;
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
