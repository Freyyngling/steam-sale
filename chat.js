// =====================================================
// Steam セール観測所 - キャラクターチャットシステム
// chat.js  v2
// =====================================================

(function() {

let chatData     = null;
let chatOpen     = false;
let chatHistory  = [];
let isTyping     = false;

let chatWrap     = null;
let chatMessages = null;
let chatInput    = null;
let chatSend     = null;
let choicesWrap  = null;

// =====================================================
// chat_data.json 読み込み
// =====================================================
async function loadChatData() {
  try {
    const res = await fetch('chat_data.json?t=' + Date.now());
    chatData = await res.json();
  } catch(e) {
    console.warn('chat_data.json 読み込み失敗:', e);
    chatData = {
      start: { reply: 'ちょっと調子悪いみたい……後でまた話しかけて！', emotion: 'sleepy', next: [] }
    };
  }
}

// =====================================================
// スタイル
// =====================================================
function injectStyles() {
  const style = document.createElement('style');
  style.textContent = `
    #chat-wrap {
      position: fixed;
      bottom: 60px;
      left: 20px;
      width: 320px;
      z-index: 9500;
      display: none;
      flex-direction: column;
    }
    #chat-wrap.open { display: flex; }

    #chat-window {
      background: rgba(10,14,23,0.97);
      border: 1px solid rgba(129,140,248,0.5);
      border-radius: 16px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 8px 40px rgba(0,0,0,0.7);
      animation: chatSlideIn 0.25s ease;
    }
    @keyframes chatSlideIn {
      from { opacity:0; transform:translateY(16px) scale(0.97); }
      to   { opacity:1; transform:translateY(0) scale(1); }
    }

    #chat-header {
      background: linear-gradient(135deg,rgba(129,140,248,0.2),rgba(56,189,248,0.1));
      border-bottom: 1px solid rgba(129,140,248,0.3);
      padding: 10px 14px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    #chat-header-avatar {
      width: 36px; height: 36px;
      object-fit: contain; image-rendering: pixelated;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
      flex-shrink: 0;
      transition: all 0.2s;
    }
    #chat-header-name { font-size:13px; font-weight:700; color:#e2e8f0; }
    #chat-header-status { font-size:10px; color:#64748b; margin-top:1px; }
    #chat-header-status.typing { color:#818cf8; }
    #chat-close-btn {
      margin-left:auto; background:none; border:none;
      color:#64748b; cursor:pointer; font-size:16px;
      padding:2px 4px; border-radius:4px; transition:color 0.15s; line-height:1;
    }
    #chat-close-btn:hover { color:#f87171; }

    #chat-messages {
      height: 280px;
      overflow-y: auto;
      padding: 12px 12px 4px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      scrollbar-width: thin;
      scrollbar-color: rgba(129,140,248,0.2) transparent;
    }
    #chat-messages::-webkit-scrollbar { width:4px; }
    #chat-messages::-webkit-scrollbar-thumb { background:rgba(129,140,248,0.2); border-radius:2px; }

    .chat-msg {
      display: flex;
      gap: 8px;
      align-items: flex-end;
      animation: msgFadeIn 0.2s ease;
    }
    @keyframes msgFadeIn {
      from { opacity:0; transform:translateY(6px); }
      to   { opacity:1; transform:translateY(0); }
    }
    .chat-msg.user { flex-direction: row-reverse; }

    .chat-msg-avatar {
      width:28px; height:28px;
      object-fit:contain; image-rendering:pixelated;
      flex-shrink:0;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
    }
    .chat-msg-bubble {
      max-width:220px; padding:8px 12px;
      border-radius:14px; font-size:12px;
      line-height:1.6; color:#e2e8f0; word-break:break-all;
    }
    .chat-msg.char .chat-msg-bubble {
      background:rgba(129,140,248,0.15);
      border:1px solid rgba(129,140,248,0.25);
      border-bottom-left-radius:4px;
    }
    .chat-msg.user .chat-msg-bubble {
      background:rgba(56,189,248,0.15);
      border:1px solid rgba(56,189,248,0.25);
      border-bottom-right-radius:4px;
      text-align:right;
    }

    .typing-indicator {
      display:flex; align-items:center; gap:8px; padding:4px 0;
    }
    .typing-dots {
      display:flex; gap:3px; padding:8px 12px;
      background:rgba(129,140,248,0.12);
      border:1px solid rgba(129,140,248,0.2);
      border-radius:14px; border-bottom-left-radius:4px;
    }
    .typing-dots span {
      width:6px; height:6px; background:#818cf8;
      border-radius:50%;
      animation:dotBounce 1.2s ease-in-out infinite;
    }
    .typing-dots span:nth-child(2) { animation-delay:0.2s; }
    .typing-dots span:nth-child(3) { animation-delay:0.4s; }
    @keyframes dotBounce {
      0%,60%,100% { transform:translateY(0); opacity:0.4; }
      30% { transform:translateY(-6px); opacity:1; }
    }
    .typing-label { font-size:10px; color:#818cf8; }

    #chat-choices {
      padding:8px 12px;
      display:flex; flex-wrap:wrap; gap:6px;
      border-top:1px solid rgba(255,255,255,0.05);
      max-height:120px; overflow-y:auto;
      scrollbar-width:thin;
      scrollbar-color:rgba(129,140,248,0.2) transparent;
    }
    .choice-btn {
      background:rgba(129,140,248,0.1);
      border:1px solid rgba(129,140,248,0.3);
      color:#94a3b8;
      font-family:'Noto Sans JP',sans-serif;
      font-size:11px; padding:5px 10px;
      border-radius:20px; cursor:pointer;
      transition:all 0.15s; white-space:nowrap;
      animation:choiceFadeIn 0.2s ease both;
    }
    .choice-btn:hover {
      background:rgba(129,140,248,0.25);
      border-color:#818cf8; color:#e2e8f0;
      transform:translateY(-1px);
    }
    @keyframes choiceFadeIn {
      from { opacity:0; transform:scale(0.9); }
      to   { opacity:1; transform:scale(1); }
    }

    #chat-input-row {
      display:flex; gap:6px;
      padding:8px 12px 10px;
      border-top:1px solid rgba(255,255,255,0.05);
    }
    #chat-input {
      flex:1;
      background:rgba(255,255,255,0.06);
      border:1px solid rgba(129,140,248,0.25);
      border-radius:20px; color:#e2e8f0;
      font-family:'Noto Sans JP',sans-serif;
      font-size:12px; padding:7px 14px;
      outline:none; transition:border-color 0.15s;
    }
    #chat-input:focus { border-color:rgba(129,140,248,0.6); }
    #chat-input::placeholder { color:#64748b; }
    #chat-send {
      background:linear-gradient(135deg,#818cf8,#38bdf8);
      border:none; border-radius:50%;
      width:34px; height:34px; color:#fff;
      font-size:14px; cursor:pointer;
      display:flex; align-items:center; justify-content:center;
      flex-shrink:0; transition:opacity 0.15s,transform 0.15s;
    }
    #chat-send:hover { opacity:0.85; transform:scale(1.05); }
    #chat-send:disabled { opacity:0.4; cursor:default; transform:none; }

    #chat-toggle-hint {
      position:fixed; z-index:9400;
      pointer-events:none; opacity:0;
      transition:opacity 0.3s;
      background:rgba(10,14,23,0.92);
      border:1px solid rgba(129,140,248,0.5);
      border-radius:10px; padding:4px 10px;
      font-size:11px; color:#818cf8;
      font-family:'Noto Sans JP',sans-serif;
      white-space:nowrap;
    }
    #chat-toggle-hint.show { opacity:1; }

    .emotion-bounce { animation:emotionBounce 0.4s ease; }
    @keyframes emotionBounce {
      0%   { transform:scale(1); }
      40%  { transform:scale(1.15) rotate(-3deg); }
      70%  { transform:scale(0.95) rotate(2deg); }
      100% { transform:scale(1) rotate(0deg); }
    }
  `;
  document.head.appendChild(style);
}

// =====================================================
// チャットUI構築
// =====================================================
function buildChatUI() {
  injectStyles();

  chatWrap = document.createElement('div');
  chatWrap.id = 'chat-wrap';
  chatWrap.innerHTML = `
    <div id="chat-window">
      <div id="chat-header">
        <img id="chat-header-avatar" src="front-smile.png" alt="avatar">
        <div>
          <div id="chat-header-name">セール観測員</div>
          <div id="chat-header-status">オンライン</div>
        </div>
        <button id="chat-close-btn" title="閉じる">✕</button>
      </div>
      <div id="chat-messages"></div>
      <div id="chat-choices"></div>
      <div id="chat-input-row">
        <input type="text" id="chat-input" placeholder="自由に入力してね…" maxlength="50">
        <button id="chat-send">➤</button>
      </div>
    </div>
  `;
  document.body.appendChild(chatWrap);

  const hint = document.createElement('div');
  hint.id = 'chat-toggle-hint';
  hint.textContent = '💬 ダブルクリックで話しかける';
  document.body.appendChild(hint);

  chatMessages = document.getElementById('chat-messages');
  chatInput    = document.getElementById('chat-input');
  chatSend     = document.getElementById('chat-send');
  choicesWrap  = document.getElementById('chat-choices');

  document.getElementById('chat-close-btn').addEventListener('click', closeChat);
  chatSend.addEventListener('click', onSendInput);
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') onSendInput();
  });

  // ヘッダーをドラッグして移動できるようにする
  setupChatDrag();
}

// =====================================================
// チャットウィンドウのドラッグ移動
// =====================================================
function setupChatDrag() {
  const header = document.getElementById('chat-header');
  if (!header) return;

  let dragging  = false;
  let startX    = 0;
  let startY    = 0;
  let initLeft  = 0;
  let initBottom = 0;

  function getWrapPos() {
    const style = window.getComputedStyle(chatWrap);
    return {
      left:   parseInt(style.left)   || 0,
      bottom: parseInt(style.bottom) || 0,
    };
  }

  function onDragStart(clientX, clientY) {
    dragging   = true;
    startX     = clientX;
    startY     = clientY;
    const pos  = getWrapPos();
    initLeft   = pos.left;
    initBottom = pos.bottom;
    header.style.cursor = 'grabbing';
  }

  function onDragMove(clientX, clientY) {
    if (!dragging) return;
    const dx  = clientX - startX;
    const dy  = clientY - startY;  // 下に動かすとbottomは減る
    const newLeft   = Math.max(0, Math.min(window.innerWidth  - 320, initLeft   + dx));
    const newBottom = Math.max(0, Math.min(window.innerHeight - 100, initBottom - dy));
    chatWrap.style.left   = newLeft   + 'px';
    chatWrap.style.bottom = newBottom + 'px';
    chatWrap.style.top    = 'auto';
  }

  function onDragEnd() {
    if (!dragging) return;
    dragging = false;
    header.style.cursor = 'grab';
  }

  // マウス
  header.style.cursor = 'grab';
  header.style.userSelect = 'none';
  header.addEventListener('mousedown', (e) => {
    // 閉じるボタンはドラッグしない
    if (e.target.id === 'chat-close-btn') return;
    onDragStart(e.clientX, e.clientY);
    e.preventDefault();
  });
  document.addEventListener('mousemove', (e) => onDragMove(e.clientX, e.clientY));
  document.addEventListener('mouseup',   () => onDragEnd());

  // タッチ
  header.addEventListener('touchstart', (e) => {
    if (e.target.id === 'chat-close-btn') return;
    const t = e.touches[0];
    onDragStart(t.clientX, t.clientY);
  }, { passive: true });
  document.addEventListener('touchmove', (e) => {
    if (!dragging) return;
    const t = e.touches[0];
    onDragMove(t.clientX, t.clientY);
  }, { passive: true });
  document.addEventListener('touchend', () => onDragEnd());
}

// =====================================================
// 開閉
// =====================================================
function openChat() {
  if (chatOpen) return;
  chatOpen = true;
  chatWrap.classList.add('open');
  positionChatWrap();
  if (chatHistory.length === 0) {
    setTimeout(() => respond('start'), 400);
  }
}

function closeChat() {
  chatOpen = false;
  chatWrap.classList.remove('open');
}

function positionChatWrap() {
  const petEl = document.getElementById('pet-char');
  if (!petEl) return;
  const r   = petEl.getBoundingClientRect();
  const left = Math.max(10, Math.min(window.innerWidth - 330, r.left - 10));
  chatWrap.style.left   = left + 'px';
  chatWrap.style.bottom = (window.innerHeight - r.top + 10) + 'px';
  chatWrap.style.top    = 'auto';
}

// =====================================================
// メッセージ追加
// =====================================================
function addMessage(text, type, imgSrc) {
  const msg = document.createElement('div');
  msg.className = 'chat-msg ' + type;
  if (type === 'char') {
    msg.innerHTML = `
      <img class="chat-msg-avatar" src="${imgSrc || 'front-neutral.png'}" alt="">
      <div class="chat-msg-bubble">${text}</div>
    `;
  } else {
    msg.innerHTML = `<div class="chat-msg-bubble">${text}</div>`;
  }
  chatMessages.appendChild(msg);
  chatHistory.push({ type, text });
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// =====================================================
// タイピング演出
// =====================================================
function showTyping() {
  const el = document.createElement('div');
  el.className = 'chat-msg char typing-indicator';
  el.id = 'chat-typing';
  el.innerHTML = `
    <img class="chat-msg-avatar" src="front-blink-half.png" alt="">
    <div class="typing-dots"><span></span><span></span><span></span></div>
    <span class="typing-label">入力中...</span>
  `;
  chatMessages.appendChild(el);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  const st = document.getElementById('chat-header-status');
  if (st) { st.textContent = '入力中...'; st.classList.add('typing'); }
}

function hideTyping() {
  const el = document.getElementById('chat-typing');
  if (el) el.remove();
  const st = document.getElementById('chat-header-status');
  if (st) { st.textContent = 'オンライン'; st.classList.remove('typing'); }
}

// =====================================================
// 選択肢表示
// =====================================================
function showChoices(nexts) {
  choicesWrap.innerHTML = '';
  if (!nexts || nexts.length === 0) return;
  nexts.forEach((choice, i) => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.textContent = choice;
    btn.style.animationDelay = (i * 0.05) + 's';
    btn.addEventListener('click', () => {
      if (isTyping) return;
      choicesWrap.innerHTML = '';
      addMessage(choice, 'user');
      setTimeout(() => respond(choice), 300);
    });
    choicesWrap.appendChild(btn);
  });
}

// =====================================================
// 表情変更
// =====================================================
const EMOTION_MAP = {
  neutral:     'front-neutral.png',
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
};

function setEmotion(key) {
  const src    = EMOTION_MAP[key] || EMOTION_MAP.neutral;
  const petEl  = document.getElementById('pet-char');
  const avatar = document.getElementById('chat-header-avatar');
  if (petEl) {
    petEl.src = src;
    petEl.classList.remove('emotion-bounce');
    void petEl.offsetWidth;
    petEl.classList.add('emotion-bounce');
    petEl.addEventListener('animationend', () => petEl.classList.remove('emotion-bounce'), { once: true });
  }
  if (avatar) avatar.src = src;
}

// =====================================================
// 応答処理（1つにまとめた版）
// =====================================================
function respond(key) {
  if (isTyping) return;

  // ノードを取得（なければ_unknownフォールバック）
  let node = chatData ? chatData[key] : null;
  if (!node) {
    node = (chatData && chatData['_unknown']) || {
      reply: 'うーん……それはちょっとわからないかも。選択肢から選んでくれると嬉しいな！',
      emotion: 'sleepy',
      next: ['使い方を教えて', 'セールの豆知識', '雑談したい']
    };
  }

  isTyping = true;
  chatSend.disabled = true;
  choicesWrap.innerHTML = '';

  const delay = Math.min(600 + node.reply.length * 18, 2200);
  showTyping();

  setTimeout(() => {
    hideTyping();
    if (node.emotion) setEmotion(node.emotion);
    const imgSrc = EMOTION_MAP[node.emotion] || EMOTION_MAP.neutral;
    addMessage(node.reply, 'char', imgSrc);
    setTimeout(() => {
      showChoices(node.next);
      isTyping = false;
      chatSend.disabled = false;
    }, 200);
  }, delay);
}

// =====================================================
// フリー入力処理
// =====================================================
function matchKeyword(text) {
  if (!chatData) return null;
  const lower = text.toLowerCase();

  // 完全一致（キーが存在するか）
  if (chatData[text]) return text;

  // _keywordsでマッチング
  const kws = chatData['_keywords'];
  if (kws) {
    for (const [kw, target] of Object.entries(kws)) {
      if (lower.includes(kw.toLowerCase())) return target;
    }
  }
  return null;
}

function onSendInput() {
  const text = chatInput.value.trim();
  if (!text || isTyping) return;
  chatInput.value = '';
  choicesWrap.innerHTML = '';
  addMessage(text, 'user');

  const matched = matchKeyword(text);
  setTimeout(() => respond(matched || '_unknown'), 300);
}

// =====================================================
// キャラクターへのダブルクリック設定
// =====================================================
function setupPetInteraction() {
  const petEl = document.getElementById('pet-char');
  if (!petEl) { setTimeout(setupPetInteraction, 500); return; }

  let lastClick = 0;
  let hintTimer = null;

  petEl.addEventListener('mouseenter', () => {
    const hint = document.getElementById('chat-toggle-hint');
    if (!hint || chatOpen) return;
    const r = petEl.getBoundingClientRect();
    hint.style.left = (r.left + r.width / 2 - 80) + 'px';
    hint.style.top  = (r.top - 36) + 'px';
    hint.classList.add('show');
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => hint.classList.remove('show'), 2000);
  });

  petEl.addEventListener('mouseleave', () => {
    const hint = document.getElementById('chat-toggle-hint');
    if (hint) hint.classList.remove('show');
  });

  petEl.addEventListener('click', (e) => {
    const now = Date.now();
    if (now - lastClick < 400) {
      e.stopPropagation();
      const hint = document.getElementById('chat-toggle-hint');
      if (hint) hint.classList.remove('show');
      chatOpen ? closeChat() : (positionChatWrap(), openChat());
    }
    lastClick = now;
  });

  let lastTouch = 0;
  petEl.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouch < 400) {
      e.preventDefault();
      chatOpen ? closeChat() : (positionChatWrap(), openChat());
    }
    lastTouch = now;
  });
}

// =====================================================
// 初期化
// =====================================================
async function initChat() {
  await loadChatData();
  buildChatUI();
  setupPetInteraction();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initChat);
} else {
  initChat();
}

})();
