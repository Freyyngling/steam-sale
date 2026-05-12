// =====================================================
// Steam セール観測所 - キャラクターシステム v4
// =====================================================

// ★ 吹き出しコメントはここを編集 ★
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

const PET_SIZE         = 150;
const PET_SPEED        = 1.5;
const ACTION_RETURN_MS = 10000;
const DROP_HIT_MARGIN  = 40; // 判定の余裕（px）

const DROP_ZONE_DEFS = [
  { id: 'dz-book', action: 'book', img: 'desk_aicon.png', label: '調べる' },
  { id: 'dz-game', action: 'game', img: 'TV_aicon.png',   label: 'ゲーム' },
];

let petEl     = null;
let bubbleEl  = null;
let toggleBtn = null;
let visible   = true;
let posX = 200, posY = 400;
let targetX = 200, targetY = 400;
let direction   = 'right';
let state       = 'walk';
let actionTimer = null;
let blinkTimer  = null;
let bubbleTimer = null;
let animFrame   = null;
let idleTimer   = null;
let actionAnim  = null;
let isDragging  = false;
let dragOffX = 0, dragOffY = 0;

// =====================================================
// キャラクターDOM
// =====================================================
function buildPetDOM() {
  const wrapper = document.createElement('div');
  wrapper.id = 'pet-wrapper';
  wrapper.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9000;';

  petEl = document.createElement('img');
  petEl.id = 'pet-char';
  petEl.src = IMGS.neutral;
  petEl.draggable = false;
  petEl.style.cssText = `
    position:absolute;
    width:${PET_SIZE}px;height:${PET_SIZE}px;
    object-fit:contain;image-rendering:pixelated;
    left:${posX}px;top:${posY}px;
    cursor:grab;pointer-events:auto;
    filter:drop-shadow(0 4px 8px rgba(0,0,0,0.6));
    user-select:none;-webkit-user-drag:none;
  `;

  bubbleEl = document.createElement('div');
  bubbleEl.id = 'pet-bubble';
  bubbleEl.style.cssText = `
    position:absolute;
    background:rgba(15,18,35,0.96);
    border:1px solid rgba(129,140,248,0.7);
    border-radius:12px;padding:8px 12px;
    font-size:12px;font-family:'Noto Sans JP',sans-serif;
    color:#e2e8f0;max-width:200px;line-height:1.6;
    pointer-events:none;display:none;
    box-shadow:0 4px 16px rgba(0,0,0,0.5);
    word-break:break-all;z-index:9002;
  `;

  wrapper.appendChild(petEl);
  wrapper.appendChild(bubbleEl);
  document.body.appendChild(wrapper);
}

function buildToggleBtn() {
  toggleBtn = document.createElement('button');
  toggleBtn.id = 'pet-toggle';
  toggleBtn.textContent = '🌸 消す';
  toggleBtn.style.cssText = `
    position:fixed;bottom:20px;right:20px;
    background:rgba(15,18,35,0.9);
    border:1px solid rgba(129,140,248,0.5);
    color:#e2e8f0;font-family:'Noto Sans JP',sans-serif;
    font-size:12px;padding:6px 14px;border-radius:20px;
    cursor:pointer;pointer-events:auto;z-index:9003;transition:all 0.15s;
  `;
  toggleBtn.onmouseenter = () => { toggleBtn.style.borderColor = '#818cf8'; };
  toggleBtn.onmouseleave = () => { toggleBtn.style.borderColor = 'rgba(129,140,248,0.5)'; };
  toggleBtn.onclick = togglePet;
  document.body.appendChild(toggleBtn);
}

// =====================================================
// ドロップゾーン：価格上限バーの右に配置
// =====================================================
function buildDropZones() {
  DROP_ZONE_DEFS.forEach((def, idx) => {
    const wrap = document.createElement('div');
    wrap.className = 'dz-wrap';
    wrap.style.cssText = `
      position:fixed;
      z-index:200;
      display:flex;flex-direction:column;
      align-items:center;gap:3px;
      pointer-events:none;
    `;

    const box = document.createElement('div');
    box.id = def.id;
    box.style.cssText = `
      width:60px;height:60px;
      border:2px dashed rgba(129,140,248,0.4);
      border-radius:10px;
      display:flex;align-items:center;justify-content:center;
      background:rgba(10,14,23,0.8);
      overflow:hidden;
      transition:border-color 0.15s,background 0.15s,transform 0.15s;
    `;

    const img = document.createElement('img');
    img.src = def.img;
    img.className = 'dz-icon';
    img.style.cssText = `
      width:52px;height:52px;
      object-fit:contain;image-rendering:pixelated;
      transition:opacity 0.15s;
      pointer-events:none;
    `;

    const label = document.createElement('span');
    label.textContent = def.label;
    label.style.cssText = 'font-size:9px;color:#64748b;font-family:"Noto Sans JP",sans-serif;';

    box.appendChild(img);
    wrap.appendChild(box);
    wrap.appendChild(label);
    document.body.appendChild(wrap);

    // 価格上限バーの右側に配置する
    function positionZone() {
      // 価格上限のfilter-rowを探す
      const filterRows = document.querySelectorAll('.filter-row');
      let priceRow = null;
      filterRows.forEach(row => {
        if (row.textContent.includes('価格上限')) priceRow = row;
      });

      if (!priceRow) return;
      const r = priceRow.getBoundingClientRect();
      // 右から idx番目に並べる（2つなので右端から60px間隔）
      const rightPos = 32 + idx * 76;
      wrap.style.top   = (r.top + (r.height - 60) / 2) + 'px';
      wrap.style.right = rightPos + 'px';
    }

    positionZone();
    window.addEventListener('resize', positionZone);
    // スクロール時に再計算（filter-panelはスクロールで動かない固定ではないので）
    window.addEventListener('scroll', positionZone, { passive: true });
  });
}

// =====================================================
// 表示・非表示
// =====================================================
function togglePet() {
  visible = !visible;
  const w = document.getElementById('pet-wrapper');
  if (w) w.style.display = visible ? '' : 'none';
  document.querySelectorAll('.dz-wrap').forEach(el => {
    el.style.display = visible ? '' : 'none';
  });
  toggleBtn.textContent = visible ? '🌸 消す' : '🌸 出す';
  if (visible) startWalk();
  else stopAll();
}

// =====================================================
// 画像・吹き出し
// =====================================================
function setImg(src) {
  if (petEl && !petEl.src.endsWith(src)) petEl.src = src;
}

function showBubble(text, ms) {
  clearTimeout(bubbleTimer);
  bubbleEl.textContent = text;
  bubbleEl.style.display = 'block';
  updateBubblePos();
  bubbleTimer = setTimeout(() => { bubbleEl.style.display = 'none'; }, ms || 4000);
}

function updateBubblePos() {
  const bw = 200;
  let bx = posX + PET_SIZE / 2 - bw / 2;
  let by = posY - 90;
  bx = Math.max(10, Math.min(window.innerWidth - bw - 10, bx));
  if (by < 10) by = posY + PET_SIZE + 10;
  bubbleEl.style.left  = bx + 'px';
  bubbleEl.style.top   = by + 'px';
  bubbleEl.style.width = bw + 'px';
}

function showRandomMessage() {
  showBubble(MESSAGES[Math.floor(Math.random() * MESSAGES.length)], 5000);
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
        setTimeout(() => { if (state !== 'idle') return; setImg(IMGS.neutral); }, 80);
      }, 100);
    }, 80);
    blinkTimer = setTimeout(doBlink, 3000 + Math.random() * 3000);
  }
  blinkTimer = setTimeout(doBlink, 2000 + Math.random() * 2000);
}
function stopBlink() { clearTimeout(blinkTimer); }

// =====================================================
// 歩き・アイドル
// =====================================================
function setNewTarget() {
  const m = 60;
  targetX = m + Math.random() * Math.max(0, window.innerWidth  - PET_SIZE - m * 2);
  targetY = m + Math.random() * Math.max(0, window.innerHeight - PET_SIZE - m * 2);
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
// アクション（フリーズしないよう確実にアニメーション）
// =====================================================
function doAction(type) {
  // 既存アクションをクリア
  clearInterval(actionAnim);
  clearTimeout(actionTimer);
  clearTimeout(idleTimer);
  stopBlink();
  state = 'action';

  if (type === 'book') {
    const frames = [IMGS.readBook1, IMGS.readBook2];
    let f = 0;
    setImg(frames[0]);
    actionAnim = setInterval(() => { setImg(frames[f++ % 2]); }, 600);
    showBubble('セールのゲーム……たくさんあるねぇ……', 8000);
  } else if (type === 'game') {
    const frames = [IMGS.gameplay1, IMGS.gameplay2];
    let f = 0;
    setImg(frames[0]);
    actionAnim = setInterval(() => { setImg(frames[f++ % 2]); }, 500);
    showBubble('ゲームしてる……邪魔しないでよ……', 8000);
  }

  // 10秒後に自動で徘徊に戻る
  actionTimer = setTimeout(() => {
    clearInterval(actionAnim);
    actionAnim = null;
    returnToWalk();
  }, ACTION_RETURN_MS);
}

function returnToWalk() {
  clearInterval(actionAnim);
  actionAnim = null;
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
  clearInterval(actionAnim); actionAnim = null;
}

// =====================================================
// ドロップゾーン判定
// キャラクター中心とゾーンの矩形で重なりを判定
// =====================================================
function getOverlappingZone() {
  // キャラクターの中心座標（viewport座標）
  const cx = posX + PET_SIZE / 2;
  const cy = posY + PET_SIZE / 2;

  for (const def of DROP_ZONE_DEFS) {
    const el = document.getElementById(def.id);
    if (!el) continue;
    const r = el.getBoundingClientRect();
    // マージンを加えて判定しやすくする
    if (cx >= r.left   - DROP_HIT_MARGIN &&
        cx <= r.right  + DROP_HIT_MARGIN &&
        cy >= r.top    - DROP_HIT_MARGIN &&
        cy <= r.bottom + DROP_HIT_MARGIN) {
      return def;
    }
  }
  return null;
}

// ドラッグ中の視覚更新（重なりチェック）
function updateZoneVisuals() {
  const over = getOverlappingZone();
  DROP_ZONE_DEFS.forEach(def => {
    const box = document.getElementById(def.id);
    const img = box ? box.querySelector('.dz-icon') : null;
    if (!box) return;
    const isOver = over && over.id === def.id;
    box.style.borderColor = isOver ? '#818cf8'             : 'rgba(129,140,248,0.4)';
    box.style.background  = isOver ? 'rgba(129,140,248,0.2)' : 'rgba(10,14,23,0.8)';
    box.style.transform   = isOver ? 'scale(1.12)'         : 'scale(1)';
    if (img) img.style.opacity = isOver ? '0' : '1'; // 乗ってる間アイコン非表示
  });
}

function clearZoneVisuals() {
  DROP_ZONE_DEFS.forEach(def => {
    const box = document.getElementById(def.id);
    const img = box ? box.querySelector('.dz-icon') : null;
    if (box) {
      box.style.borderColor = 'rgba(129,140,248,0.4)';
      box.style.background  = 'rgba(10,14,23,0.8)';
      box.style.transform   = 'scale(1)';
    }
    if (img) img.style.opacity = '1';
  });
}

// =====================================================
// ドラッグ設定
// =====================================================
function setupDrag() {
  function onStart(clientX, clientY) {
    isDragging = true;
    dragOffX = clientX - posX;
    dragOffY = clientY - posY;
    petEl.style.cursor = 'grabbing';
    // stateをdragにしてループを維持しつつ歩きを止める
    state = 'drag';
    stopBlink();
    clearTimeout(actionTimer);
    clearTimeout(idleTimer);
    clearInterval(actionAnim);
    actionAnim = null;
  }

  function onMove(clientX, clientY) {
    if (!isDragging) return;
    posX = Math.max(0, Math.min(window.innerWidth  - PET_SIZE, clientX - dragOffX));
    posY = Math.max(0, Math.min(window.innerHeight - PET_SIZE, clientY - dragOffY));
    setImg(IMGS.surprised);
    petEl.style.left = posX + 'px';
    petEl.style.top  = posY + 'px';
    updateBubblePos();
    updateZoneVisuals();
  }

  function onEnd() {
    if (!isDragging) return;
    isDragging = false;
    petEl.style.cursor = 'grab';

    const zone = getOverlappingZone();
    clearZoneVisuals();

    if (zone) {
      // アクション発動
      doAction(zone.action);
    } else {
      setImg(IMGS.smile);
      showBubble('どこに連れてくの〜？', 3000);
      state = 'action';
      actionTimer = setTimeout(() => returnToWalk(), 2000);
    }
  }

  // マウス
  petEl.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    onStart(e.clientX, e.clientY);
    e.preventDefault();
  });
  document.addEventListener('mousemove', (e) => onMove(e.clientX, e.clientY));
  document.addEventListener('mouseup',   () => onEnd());

  // タッチ
  petEl.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    onStart(t.clientX, t.clientY);
  }, { passive: true });
  document.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    const t = e.touches[0];
    onMove(t.clientX, t.clientY);
  }, { passive: true });
  document.addEventListener('touchend', () => onEnd());
}

// =====================================================
// クリックで喋る
// =====================================================
function setupClick() {
  petEl.addEventListener('click', (e) => {
    if (isDragging) return;
    if (state === 'action' || state === 'drag') return;
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
// ループ修正（dragステートに対応）
// =====================================================
// loop関数内でstate === 'drag'の時は位置更新のみ行う
// （既にonMoveで更新しているので何もしない）

// =====================================================
// 初期化
// =====================================================
function initPet() {
  posX    = window.innerWidth  / 2 - PET_SIZE / 2;
  posY    = window.innerHeight - PET_SIZE - 100;
  targetX = posX;
  targetY = posY;

  buildPetDOM();
  buildToggleBtn();

  // フィルターパネルが描画された後にドロップゾーンを配置
  setTimeout(() => {
    buildDropZones();
  }, 300);

  setupDrag();
  setupClick();

  setTimeout(() => {
    showBubble('こんにちは！セール情報を一緒にチェックしよ！', 4000);
    setTimeout(() => startWalk(), 2000);
  }, 1000);
}

// =====================================================
// ループ（drag対応版）
// =====================================================
function loop() {
  animFrame = requestAnimationFrame(loop);

  // drag中はonMoveで位置更新済みなので何もしない
  if (state === 'drag') return;

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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPet);
} else {
  initPet();
}
