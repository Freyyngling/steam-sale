// =====================================================
// Steam セール観測所 - キャラクターシステム v6
// =====================================================

// ★ 通常の吹き出しコメント ★
// 文字列 → 1回で表示
// 配列   → 順番に分けて表示（1つの会話として）
const MESSAGES = [
  "このセール、見逃したら絶対後悔するよ！",
  "割引率90%以上のゲームがあるよ！急いで！",
  "日本語対応フィルターで絞り込めるの知ってた？",
  [
    "セール終了前に価格確認してね！",
    "Steamのページで実際の価格を確かめてから買うのが安心だよ。",
    "わたしのデータは取得した時点のものだから……ちょっと古いかも。",
  ],
  "今日のおすすめは割引率の高い順で上位のやつだよ！",
  [
    "わたし、ずっとここでセール見てるよ……",
    "それって少し寂しいような、でも楽しいような。",
    "一緒にいてくれてありがとう。",
  ],
  "気になるゲームはさっさと買わないと後悔するからね！",
  [
    "ねえねえ、そのゲームどうだった？",
    "おもしろかった？それともまだ積んでる……？",
    "わたしは積みゲーのことは言えないけどね。",
  ],
  "最近セール多くて財布が大変なことになってる……",
  "割引率80%以上のゲームを狙えば間違いないよ！",
];

// ★ アクション時のコメント（複数セット・順番に切り替わる）★
// 各アクションに対して複数のセットを用意
// 1回目→セット0、2回目→セット1、3回目→セット2、以降ループ
const ACTION_COMMENT_SETS = {
  book: [
    // セット0（1回目）
    [
      "セールのゲーム……たくさんあるねぇ……",
      "これも面白そう。あ、こっちも。全部買えないよ……",
      "割引率と評価を見比べて……うーん、迷う。",
    ],
    // セット1（2回目）
    [
      "このゲーム、レビューすごく良いね。",
      "日本語対応もしてるし、値段も安いし……",
      "買うしかないじゃん……財布が……。",
    ],
    // セット2（3回目）
    [
      "今日だけで何本チェックしたんだろう。",
      "ウィッシュリストがどんどん増えていく……",
      "セールって恐ろしいね。でも楽しい。",
    ],
  ],
  game: [
    // セット0（1回目）
    [
      "ゲームしてる……邪魔しないでよ……",
      "今いいところなんだから！あとちょっとだから！",
      "セールで買ったゲームは積まないって決めたのに……",
    ],
    // セット1（2回目）
    [
      "このゲーム、セールで買ったやつなんだよね。",
      "安かったからって買いすぎたかな……",
      "でも面白いから許して。",
    ],
    // セット2（3回目）
    [
      "ちょっと待って、今ボス戦なの！",
      "…………やった、倒した！",
      "セールで買って正解だったよ、これ。",
    ],
  ],
};

// アクションごとの現在のセットインデックス
const actionSetIndex = { book: 0, game: 0 };

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
const ACTION_RETURN_MS = 15000; // フォールバック最大時間
const DROP_HIT_MARGIN  = 40;
const MSG_INTERVAL_MS  = 4000;

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
let msgSeqTimer = null;

// =====================================================
// DOM構築
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
    color:#e2e8f0;max-width:220px;line-height:1.6;
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
// ドロップゾーン：価格上限スライダーの右側・少し離して配置
// =====================================================
function buildDropZones() {
  DROP_ZONE_DEFS.forEach((def, idx) => {
    const wrap = document.createElement('div');
    wrap.className = 'dz-wrap';
    wrap.style.cssText = `
      position:fixed;z-index:300;
      display:flex;flex-direction:column;
      align-items:center;gap:3px;
      pointer-events:none;
    `;

    const box = document.createElement('div');
    box.id = def.id;
    box.style.cssText = `
      width:56px;height:56px;
      border:2px dashed rgba(129,140,248,0.45);
      border-radius:10px;
      display:flex;align-items:center;justify-content:center;
      background:rgba(10,14,23,0.82);
      overflow:hidden;
      transition:border-color 0.15s,background 0.15s,transform 0.15s;
    `;

    const img = document.createElement('img');
    img.src = def.img;
    img.className = 'dz-icon';
    img.style.cssText = `
      width:48px;height:48px;
      object-fit:contain;image-rendering:pixelated;
      transition:opacity 0.15s;pointer-events:none;
    `;

    const label = document.createElement('span');
    label.textContent = def.label;
    label.style.cssText = 'font-size:9px;color:#64748b;font-family:"Noto Sans JP",sans-serif;';

    box.appendChild(img);
    wrap.appendChild(box);
    wrap.appendChild(label);
    document.body.appendChild(wrap);

    function positionZone() {
      const priceRow = (() => {
        const rows = document.querySelectorAll('.filter-row');
        for (const r of rows) {
          if (r.textContent.includes('価格上限')) return r;
        }
        return null;
      })();
      if (!priceRow) return;

      const r = priceRow.getBoundingClientRect();
      // 右端から十分離す（idx=0が一番右、idx=1がその左）
      // 画面右端から: 20px + idx * 72px
      const rightPx = 20 + idx * 72;
      wrap.style.top   = (r.top + (r.height - 56) / 2) + 'px';
      wrap.style.right = rightPx + 'px';
    }

    positionZone();
    window.addEventListener('resize', positionZone);
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
// 画像切り替え
// =====================================================
function setImg(src) {
  if (petEl && !petEl.src.endsWith(src)) petEl.src = src;
}

// =====================================================
// 吹き出し
// =====================================================
function showBubble(text, ms) {
  clearTimeout(bubbleTimer);
  bubbleEl.textContent = text;
  bubbleEl.style.display = 'block';
  updateBubblePos();
  bubbleTimer = setTimeout(() => { bubbleEl.style.display = 'none'; }, ms || 4000);
}

function hideBubble() {
  clearTimeout(bubbleTimer);
  bubbleEl.style.display = 'none';
}

function updateBubblePos() {
  const bw = 220;
  let bx = posX + PET_SIZE / 2 - bw / 2;
  let by = posY - 90;
  bx = Math.max(10, Math.min(window.innerWidth - bw - 10, bx));
  if (by < 10) by = posY + PET_SIZE + 10;
  bubbleEl.style.left  = bx + 'px';
  bubbleEl.style.top   = by + 'px';
  bubbleEl.style.width = bw + 'px';
}

// 複数行を順に表示
function showMessageSequence(lines, intervalMs, onComplete) {
  clearTimeout(msgSeqTimer);
  let i = 0;
  function showNext() {
    if (i >= lines.length) {
      hideBubble();
      if (onComplete) onComplete();
      return;
    }
    showBubble(lines[i], intervalMs + 500);
    i++;
    msgSeqTimer = setTimeout(showNext, intervalMs);
  }
  showNext();
}

function showRandomMessage(onComplete) {
  clearTimeout(msgSeqTimer);
  const msg = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
  if (Array.isArray(msg)) {
    showMessageSequence(msg, MSG_INTERVAL_MS, onComplete);
  } else {
    showBubble(msg, 5000);
    if (onComplete) msgSeqTimer = setTimeout(onComplete, 5500);
  }
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
  }, 9000 + Math.random() * 12000);
}

function goIdle() {
  state = 'idle';
  setImg(IMGS.neutral);
  startBlink();
  clearTimeout(actionTimer);
  actionTimer = setTimeout(() => startWalk(), 3000 + Math.random() * 4000);
}

// =====================================================
// アクション（セット順番切り替え対応）
// =====================================================
function doAction(type) {
  clearInterval(actionAnim);
  clearTimeout(actionTimer);
  clearTimeout(idleTimer);
  clearTimeout(msgSeqTimer);
  stopBlink();
  state = 'action';

  // 現在のセットを取得して次回のためにインデックスを進める
  const sets  = ACTION_COMMENT_SETS[type] || [["……"]];
  const idx   = actionSetIndex[type] || 0;
  const comments = sets[idx % sets.length];
  actionSetIndex[type] = (idx + 1) % sets.length;

  // アニメーション開始
  if (type === 'book') {
    const frames = [IMGS.readBook1, IMGS.readBook2];
    let f = 0;
    setImg(frames[0]);
    actionAnim = setInterval(() => { setImg(frames[f++ % 2]); }, 600);
  } else if (type === 'game') {
    const frames = [IMGS.gameplay1, IMGS.gameplay2];
    let f = 0;
    setImg(frames[0]);
    actionAnim = setInterval(() => { setImg(frames[f++ % 2]); }, 500);
  }

  // コメントを順に表示し、全部終わったら少し待って徘徊へ
  showMessageSequence(comments, MSG_INTERVAL_MS, () => {
    clearTimeout(actionTimer);
    actionTimer = setTimeout(() => {
      clearInterval(actionAnim);
      actionAnim = null;
      returnToWalk();
    }, 2000);
  });

  // フォールバック（万が一コメントが終わらない場合）
  const fallbackMs = comments.length * MSG_INTERVAL_MS + 4000;
  actionTimer = setTimeout(() => {
    clearInterval(actionAnim);
    actionAnim = null;
    clearTimeout(msgSeqTimer);
    returnToWalk();
  }, fallbackMs);
}

function returnToWalk() {
  clearInterval(actionAnim);
  actionAnim = null;
  clearTimeout(msgSeqTimer);
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

function stopAll() {
  cancelAnimationFrame(animFrame); animFrame = null;
  clearTimeout(actionTimer); clearTimeout(blinkTimer);
  clearTimeout(bubbleTimer); clearTimeout(idleTimer);
  clearTimeout(msgSeqTimer); clearInterval(actionAnim); actionAnim = null;
}

// =====================================================
// ドロップゾーン判定
// =====================================================
function getOverlappingZone() {
  const cx = posX + PET_SIZE / 2;
  const cy = posY + PET_SIZE / 2;
  for (const def of DROP_ZONE_DEFS) {
    const el = document.getElementById(def.id);
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (cx >= r.left   - DROP_HIT_MARGIN &&
        cx <= r.right  + DROP_HIT_MARGIN &&
        cy >= r.top    - DROP_HIT_MARGIN &&
        cy <= r.bottom + DROP_HIT_MARGIN) {
      return def;
    }
  }
  return null;
}

function updateZoneVisuals() {
  const over = getOverlappingZone();
  DROP_ZONE_DEFS.forEach(def => {
    const box = document.getElementById(def.id);
    const img = box ? box.querySelector('.dz-icon') : null;
    if (!box) return;
    const isOver = over && over.id === def.id;
    box.style.borderColor = isOver ? '#818cf8'               : 'rgba(129,140,248,0.45)';
    box.style.background  = isOver ? 'rgba(129,140,248,0.22)' : 'rgba(10,14,23,0.82)';
    box.style.transform   = isOver ? 'scale(1.1)'            : 'scale(1)';
    if (img) img.style.opacity = isOver ? '0' : '1';
  });
}

function clearZoneVisuals() {
  DROP_ZONE_DEFS.forEach(def => {
    const box = document.getElementById(def.id);
    const img = box ? box.querySelector('.dz-icon') : null;
    if (box) {
      box.style.borderColor = 'rgba(129,140,248,0.45)';
      box.style.background  = 'rgba(10,14,23,0.82)';
      box.style.transform   = 'scale(1)';
    }
    if (img) img.style.opacity = '1';
  });
}

// =====================================================
// スクロール固定
// =====================================================
let scrollX = 0, scrollY = 0;

function lockScroll() {
  scrollX = window.scrollX;
  scrollY = window.scrollY;
  document.body.style.overflow = 'hidden';
  document.body.style.position = 'fixed';
  document.body.style.top      = `-${scrollY}px`;
  document.body.style.left     = `-${scrollX}px`;
  document.body.style.width    = '100%';
}

function unlockScroll() {
  document.body.style.overflow = '';
  document.body.style.position = '';
  document.body.style.top      = '';
  document.body.style.left     = '';
  document.body.style.width    = '';
  window.scrollTo(scrollX, scrollY);
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
    state = 'drag';
    stopBlink();
    clearTimeout(actionTimer);
    clearTimeout(idleTimer);
    clearTimeout(msgSeqTimer);
    clearInterval(actionAnim); actionAnim = null;
    lockScroll(); // スクロール固定
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
    unlockScroll(); // スクロール解除

    const zone = getOverlappingZone();
    clearZoneVisuals();

    if (zone) {
      doAction(zone.action);
    } else {
      setImg(IMGS.smile);
      showBubble('どこに連れてくの〜？', 3000);
      state = 'action';
      actionTimer = setTimeout(() => returnToWalk(), 2500);
    }
  }

  petEl.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    onStart(e.clientX, e.clientY);
    e.preventDefault();
  });
  document.addEventListener('mousemove', (e) => onMove(e.clientX, e.clientY));
  document.addEventListener('mouseup',   () => onEnd());

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
// 初期化
// =====================================================
function initPet() {
  posX    = window.innerWidth  / 2 - PET_SIZE / 2;
  posY    = window.innerHeight - PET_SIZE - 100;
  targetX = posX;
  targetY = posY;

  buildPetDOM();
  buildToggleBtn();
  setTimeout(() => { buildDropZones(); }, 400);
  setupDrag();
  setupClick();

  setTimeout(() => {
    showBubble('こんにちは！セール情報を一緒にチェックしよ！', 4000);
    setTimeout(() => startWalk(), 2000);
  }, 1000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPet);
} else {
  initPet();
}
