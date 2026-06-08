// =====================================================
// Steam セール観測所 - キャラクターチャットシステム
// chat.js  v3
// =====================================================

(function() {

let chatData    = null;
let chatOpen    = false;
let chatHistory = [];
let isTyping    = false;

let chatWrap     = null;
let chatMessages = null;
let chatInput    = null;
let chatSend     = null;
let choicesWrap  = null;
let character    = null;

// アバターアニメーション用
let avatarAnimTimer = null;
let avatarFrame     = 0;

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
      width: 390px;
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
      padding: 10px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: grab;
      user-select: none;
    }
    #chat-header:active { cursor: grabbing; }

    #chat-header-avatar {
      width: 72px;
      height: 72px;
      object-fit: contain;
      image-rendering: pixelated;
      filter: drop-shadow(0 2px 6px rgba(0,0,0,0.6));
      flex-shrink: 0;
      transition: none;
    }

    #chat-header-info { flex: 1; }
    #chat-header-name { font-size:15px; font-weight:700; color:#e2e8f0; }
    #chat-header-status { font-size:11px; color:#64748b; margin-top:2px; }
    #chat-header-status.typing { color:#818cf8; }

    .chat-header-btn {
      background: none;
      border: 1px solid rgba(255,255,255,0.1);
      color: #64748b;
      cursor: pointer;
      font-size: 13px;
      padding: 4px 8px;
      border-radius: 6px;
      transition: all 0.15s;
      line-height: 1;
      flex-shrink: 0;
    }
    .chat-header-btn:hover { color: #e2e8f0; border-color: rgba(255,255,255,0.3); }
    #chat-clear-btn:hover { color: #fbbf24; border-color: #fbbf24; }
    #chat-close-btn:hover { color: #f87171; border-color: #f87171; }

    #chat-messages {
      height: 340px;
      overflow-y: auto;
      padding: 14px 14px 6px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      scrollbar-width: thin;
      scrollbar-color: rgba(129,140,248,0.2) transparent;
    }
    #chat-messages::-webkit-scrollbar { width:4px; }
    #chat-messages::-webkit-scrollbar-thumb { background:rgba(129,140,248,0.2); border-radius:2px; }

    .chat-msg {
      display: flex;
      gap: 10px;
      align-items: flex-end;
      animation: msgFadeIn 0.2s ease;
    }
    @keyframes msgFadeIn {
      from { opacity:0; transform:translateY(6px); }
      to   { opacity:1; transform:translateY(0); }
    }
    .chat-msg.user { flex-direction: row-reverse; }

    .chat-msg-avatar {
      width: 62px;
      height: 62px;
      object-fit: contain;
      image-rendering: pixelated;
      flex-shrink: 0;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
    }

    .chat-msg-bubble {
      max-width: 260px;
      padding: 10px 14px;
      border-radius: 16px;
      font-size: 13px;
      line-height: 1.7;
      color: #e2e8f0;
      word-break: break-all;
    }
    .chat-msg.char .chat-msg-bubble {
      background: rgba(129,140,248,0.15);
      border: 1px solid rgba(129,140,248,0.25);
      border-bottom-left-radius: 4px;
    }
    .chat-msg.user .chat-msg-bubble {
      background: rgba(56,189,248,0.15);
      border: 1px solid rgba(56,189,248,0.25);
      border-bottom-right-radius: 4px;
      text-align: right;
    }

    .typing-indicator { display:flex; align-items:center; gap:8px; padding:4px 0; }
    .typing-dots {
      display:flex; gap:3px; padding:10px 14px;
      background:rgba(129,140,248,0.12);
      border:1px solid rgba(129,140,248,0.2);
      border-radius:16px; border-bottom-left-radius:4px;
    }
    .typing-dots span {
      width:7px; height:7px; background:#818cf8;
      border-radius:50%;
      animation:dotBounce 1.2s ease-in-out infinite;
    }
    .typing-dots span:nth-child(2) { animation-delay:0.2s; }
    .typing-dots span:nth-child(3) { animation-delay:0.4s; }
    @keyframes dotBounce {
      0%,60%,100% { transform:translateY(0); opacity:0.4; }
      30% { transform:translateY(-7px); opacity:1; }
    }
    .typing-label { font-size:11px; color:#818cf8; }

    #chat-choices {
      padding: 10px 14px;
      display: flex;
      flex-wrap: wrap;
      gap: 7px;
      border-top: 1px solid rgba(255,255,255,0.05);
      max-height: 130px;
      overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: rgba(129,140,248,0.2) transparent;
    }
    .choice-btn {
      background: rgba(129,140,248,0.1);
      border: 1px solid rgba(129,140,248,0.3);
      color: #94a3b8;
      font-family: 'Noto Sans JP', sans-serif;
      font-size: 12px;
      padding: 6px 12px;
      border-radius: 20px;
      cursor: pointer;
      transition: all 0.15s;
      white-space: nowrap;
      animation: choiceFadeIn 0.2s ease both;
    }
    .choice-btn:hover {
      background: rgba(129,140,248,0.25);
      border-color: #818cf8; color: #e2e8f0;
      transform: translateY(-1px);
    }
    @keyframes choiceFadeIn {
      from { opacity:0; transform:scale(0.9); }
      to   { opacity:1; transform:scale(1); }
    }

    #chat-input-row {
      display: flex;
      gap: 8px;
      padding: 10px 14px 12px;
      border-top: 1px solid rgba(255,255,255,0.05);
    }
    #chat-input {
      flex: 1;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(129,140,248,0.25);
      border-radius: 22px;
      color: #e2e8f0;
      font-family: 'Noto Sans JP', sans-serif;
      font-size: 13px;
      padding: 8px 16px;
      outline: none;
      transition: border-color 0.15s;
    }
    #chat-input:focus { border-color: rgba(129,140,248,0.6); }
    #chat-input::placeholder { color: #64748b; }
    #chat-send {
      background: linear-gradient(135deg,#818cf8,#38bdf8);
      border: none; border-radius: 50%;
      width: 38px; height: 38px;
      color: #fff; font-size: 15px;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      transition: opacity 0.15s, transform 0.15s;
    }
    #chat-send:hover { opacity:0.85; transform:scale(1.05); }
    #chat-send:disabled { opacity:0.4; cursor:default; transform:none; }

    #chat-toggle-hint {
      position: fixed; z-index: 9400;
      pointer-events: none; opacity: 0;
      transition: opacity 0.3s;
      background: rgba(10,14,23,0.92);
      border: 1px solid rgba(129,140,248,0.5);
      border-radius: 10px; padding: 5px 12px;
      font-size: 12px; color: #818cf8;
      font-family: 'Noto Sans JP', sans-serif;
      white-space: nowrap;
    }
    #chat-toggle-hint.show { opacity:1; }

    .emotion-bounce { animation: emotionBounce 0.4s ease; }
    @keyframes emotionBounce {
      0%   { transform: scale(1); }
      40%  { transform: scale(1.15) rotate(-3deg); }
      70%  { transform: scale(0.95) rotate(2deg); }
      100% { transform: scale(1) rotate(0deg); }
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
        <div id="chat-header-info">
    <div id="chat-header-name">セール観測員</div>

    <div id="chat-header-status">オンライン</div>

    <div id="affection-display">親密度：0</div>

    <div id="affection-rank">ランク：初対面</div>
    
    <div id="bgm-name">♪ BGMなし</div>

    <div id="chat-audio-controls">

     <button class="chat-header-btn" id="bgm-toggle-btn">🔊</button>

     <input
       type="range"
       id="bgm-volume-slider"
       min="0"
       max="100"
     >

    </div>

    <div id="chat-bgm-controls">

      <button class="chat-header-btn" id="bgm-play-btn">▶️</button>

      <button class="chat-header-btn" id="bgm-pause-btn">⏸</button>

      <button class="chat-header-btn" id="bgm-stop-btn">⏹</button>

      <button class="chat-header-btn" id="reset-affection-btn">💔</button>

    </div>

  </div>

  <button class="chat-header-btn" id="chat-clear-btn">🗑</button>
  <button class="chat-header-btn" id="chat-close-btn">✕</button>
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
  document.getElementById('chat-clear-btn').addEventListener('click', clearHistory);
  document.getElementById('bgm-toggle-btn').addEventListener('click', toggleBGM);
  document.getElementById('bgm-play-btn').addEventListener('click', playCurrentBGM);
  document.getElementById('bgm-pause-btn').addEventListener('click', pauseBGM);
  document.getElementById('bgm-stop-btn').addEventListener('click', stopBGM);
  document.getElementById('reset-affection-btn').addEventListener('click', resetAffection);

const volumeSlider =
  document.getElementById('bgm-volume-slider');

volumeSlider.value = bgmPlayer.volume * 100;

volumeSlider.addEventListener('mousedown', (e) => {
  e.stopPropagation();
});

volumeSlider.addEventListener('touchstart', (e) => {
  e.stopPropagation();
});

volumeSlider.addEventListener('input', () => {

  bgmPlayer.volume = volumeSlider.value / 100;

  localStorage.setItem(
    "bgmVolume",
    bgmPlayer.volume
  );

});
  
  chatSend.addEventListener('click', onSendInput);
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') onSendInput();
  });

  setupChatDrag();

  updateAffectionDisplay();
}

// =====================================================
// アバターアニメーション（2枚交互）
// =====================================================
const EMOTION_MAP = {
  neutral:     ['front-neutral.png',     'front-blink-half.png'],
  smile:       ['front-smile.png',       'front-blink-closed.png'],
  happy1:      ['front-happy1.png',      'front-happy2.png'],
  happy2:      ['front-happy2.png',      'front-happy1.png'],
  surprised:   ['front-surprised.png',   'front-neutral.png'],
  sleepy:      ['front-sleepy.png',      'front-sleep.png'],
  sleep:       ['front-sleep.png',       'front-sleepy.png'],
  angry1:      ['front-angry1.png',      'front-angry2.png'],
  angry2:      ['front-angry2.png',      'front-angry1.png'],
  cry1:        ['front-cry1.png',        'front-cry2.png'],
  cry2:        ['front-cry2.png',        'front-cry1.png'],
};

let currentEmotionFrames = EMOTION_MAP.smile;

function startAvatarAnim() {
  stopAvatarAnim();
  avatarFrame = 0;
  avatarAnimTimer = setInterval(() => {
    const avatar = document.getElementById('chat-header-avatar');
    if (avatar) {
      avatar.src = currentEmotionFrames[avatarFrame % 2];
      avatarFrame++;
    }
  }, 600);
}

function stopAvatarAnim() {
  clearInterval(avatarAnimTimer);
  avatarAnimTimer = null;
}

function setEmotion(key) {
  const frames = EMOTION_MAP[key] || EMOTION_MAP.neutral;
  currentEmotionFrames = frames;

  const petEl  = document.getElementById('pet-char');
  const avatar = document.getElementById('chat-header-avatar');

  if (petEl) {
    petEl.src = frames[0];
    petEl.classList.remove('emotion-bounce');
    void petEl.offsetWidth;
    petEl.classList.add('emotion-bounce');
    petEl.addEventListener('animationend', () => petEl.classList.remove('emotion-bounce'), { once: true });
  }
  if (avatar) avatar.src = frames[0];
}

// =====================================================
// チャットウィンドウのドラッグ移動
// =====================================================
function setupChatDrag() {
  const header = document.getElementById('chat-header');
  if (!header) return;

  let dragging = false;
  let startX = 0, startY = 0;
  let initLeft = 0, initBottom = 0;

  function getPos() {
    const s = window.getComputedStyle(chatWrap);
    return { left: parseInt(s.left) || 0, bottom: parseInt(s.bottom) || 0 };
  }

  function onStart(cx, cy) {
    dragging = true;
    startX = cx; startY = cy;
    const p = getPos();
    initLeft = p.left; initBottom = p.bottom;
  }

  function onMove(cx, cy) {
    if (!dragging) return;
    const dx = cx - startX, dy = cy - startY;
    chatWrap.style.left   = Math.max(0, Math.min(window.innerWidth  - 380, initLeft   + dx)) + 'px';
    chatWrap.style.bottom = Math.max(0, Math.min(window.innerHeight - 100, initBottom - dy)) + 'px';
    chatWrap.style.top    = 'auto';
  }

  function onEnd() { dragging = false; }

  header.addEventListener('mousedown', (e) => {
　　　if (e.target.closest('.chat-header-btn') ||
         e.target.closest('#chat-audio-controls') ||
         e.target.closest('#bgm-volume-slider')
     ) return;

  onStart(e.clientX, e.clientY);

  e.preventDefault();

});
  document.addEventListener('mousemove', (e) => onMove(e.clientX, e.clientY));
  document.addEventListener('mouseup', onEnd);

  header.addEventListener('touchstart', (e) => {
     if (e.target.closest('.chat-header-btn') ||
         e.target.closest('#chat-audio-controls') ||
         e.target.closest('#bgm-volume-slider')
    ) return;

  const t = e.touches[0];

  onStart(t.clientX, t.clientY);

}, { passive: true });
  
  document.addEventListener('touchmove', (e) => {
    if (!dragging) return;
    const t = e.touches[0];
    onMove(t.clientX, t.clientY);
  }, { passive: true });
  document.addEventListener('touchend', onEnd);
}

// =====================================================
// 開閉
// =====================================================
function openChat() {
  if (chatOpen) return;
  chatOpen = true;
  chatWrap.classList.add('open');
  positionChatWrap();
  startAvatarAnim();
  if (chatHistory.length === 0) {
    setTimeout(() => respond('start'), 400);
  }
}

function closeChat() {
  chatOpen = false;
  chatWrap.classList.remove('open');
  stopAvatarAnim();
}

function positionChatWrap() {
  const petEl = document.getElementById('pet-char');
  if (!petEl) return;
  const r    = petEl.getBoundingClientRect();
  const left = Math.max(10, Math.min(window.innerWidth - 390, r.left - 10));
  chatWrap.style.left   = left + 'px';
  chatWrap.style.bottom = (window.innerHeight - r.top + 10) + 'px';
  chatWrap.style.top    = 'auto';
}

// =====================================================
// 履歴クリア
// =====================================================
function clearHistory() {
  chatHistory  = [];
  chatMessages.innerHTML = '';
  choicesWrap.innerHTML  = '';
  // クリア後に挨拶から再スタート
  setTimeout(() => respond('start'), 300);
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
function showChoices(nextOptions) {
  choicesWrap.innerHTML = '';

  if (!nextOptions || nextOptions.length === 0) return;

  nextOptions.forEach((choice, i) => {

    const btn = document.createElement('button');

    btn.className = 'choice-btn';
    btn.textContent = choice;
    btn.style.animationDelay = (i * 0.05) + 's';

    btn.addEventListener('click', () => {

      if (isTyping) return;

      playSound("click.mp3");

      choicesWrap.innerHTML = '';

      addMessage(choice, 'user');

      setTimeout(() => respond(choice), 300);

    });

    choicesWrap.appendChild(btn);

  });
}

// =====================================================
// 応答処理（ランダム回答対応）
// =====================================================
function respond(key) {

  if (key !== "start") {

    affection++;

    localStorage.setItem(
      "affection",
      affection
    );

    updateAffectionDisplay();

  }
  
  if (isTyping) return;

  let node = chatData ? chatData[key] : null;
  if (!node) {
    node = (chatData && chatData['_unknown']) || {
      reply: 'うーん……それはちょっとわからないかも。選択肢から選んでくれると嬉しいな！',
      emotion: 'sleepy',
      next: ['使い方を教えて', 'セールの豆知識', '雑談したい']
    };
  }

  // replyが配列の場合はランダムで1つ選ぶ
  let replyText, emotionKey, nextOptions, voiceFile, bgmFile, imageFile, videoFile, soundFile, effectName;
  if (Array.isArray(node.reply)) {

  const idx = Math.floor(Math.random() * node.reply.length);

replyText = node.reply[idx];

emotionKey = Array.isArray(node.emotion)
  ? node.emotion[idx]
  : node.emotion;

voiceFile = Array.isArray(node.voice)
  ? node.voice[idx]
  : node.voice;

bgmFile = Array.isArray(node.bgm)
  ? node.bgm[idx]
  : node.bgm;

soundFile = Array.isArray(node.sound)
  ? node.sound[idx]
  : node.sound;

effectName = Array.isArray(node.effect)
  ? node.effect[idx]
  : node.effect;

imageFile = Array.isArray(node.image)
  ? node.image[idx]
  : node.image;
    
videoFile = Array.isArray(node.video)
  ? node.video[idx]
  : node.video;

nextOptions = Array.isArray(node.next?.[0])
  ? node.next[idx]
  : node.next;

} else {

  replyText = node.reply;
  emotionKey = node.emotion;
  voiceFile = node.voice;
  bgmFile = node.bgm;
  soundFile = node.sound;
  effectName = node.effect;
  imageFile = node.image;
  videoFile = node.video;
  nextOptions = node.next;

}
  
  const level =
  String(getAffectionLevel());

if (
  node.replyByLevel &&
  node.replyByLevel[level]
) {

  replyText =
    node.replyByLevel[level];

}

  isTyping = true;
  chatSend.disabled = true;
  choicesWrap.innerHTML = '';

  const delay = Math.min(600 + replyText.length * 18, 2200);
  showTyping();

  setTimeout(() => {
    hideTyping();
    if (emotionKey) setEmotion(emotionKey);

    if (voiceFile) {
  playVoice(voiceFile);
    }

    if (bgmFile) {
  playBGM(bgmFile);
    }

    if (soundFile) {
  playSound(soundFile);
    }
    
    const frames = EMOTION_MAP[emotionKey] || EMOTION_MAP.neutral;
    addMessage(replyText, 'char', frames[0]);

    if (imageFile) {
  addImage(imageFile);
    }

    if (videoFile) {
  addVideo(videoFile);
    }
    
    if (effectName) {
  playEffect(effectName);
    }

    
    setTimeout(() => {
      showChoices(nextOptions);
      isTyping = false;
      chatSend.disabled = false;
    }, 200);
  }, delay);
}

  // =====================================================
  // Voice再生
  // =====================================================

let voicePlayer = new Audio();
function playVoice(file) {

  voicePlayer.pause();
  voicePlayer.currentTime = 0;

  voicePlayer.src = "voice/" + file;

  voicePlayer.volume = 0.8;

  voicePlayer.play().catch(() => {});
}

// =====================================================
// 親密度
// =====================================================

let affection = 0;

const savedAffection =
  localStorage.getItem(
    "affection"
  );

if (savedAffection !== null) {

  affection =
    parseInt(savedAffection, 10);

}

  function getAffectionRank() {

  if (affection >= 100)
    return "親友";

  if (affection >= 50)
    return "仲良し";

  if (affection >= 20)
    return "友達";

  return "初対面";

  }

  function updateAffectionDisplay() {

  const affectionEl =
    document.getElementById(
      "affection-display"
    );

  const rankEl =
    document.getElementById(
      "affection-rank"
    );

  if (affectionEl) {

    affectionEl.textContent =
      "親密度：" + affection;

  }

  if (rankEl) {

    rankEl.textContent =
      "ランク：" +
      getAffectionRank();

  }

  }

function resetAffection() {

  affection = 0;

  localStorage.setItem(
    "affection",
    affection
  );

  updateAffectionDisplay();

}

function getAffectionLevel() {

  if (affection >= 100) return 4;

  if (affection >= 50) return 3;

  if (affection >= 20) return 2;

  return 1;

  }

  
  // =====================================================
  // BGM再生
  // =====================================================

let currentBGM = "";
let bgmPlayer = new Audio();

bgmPlayer.loop = true;

bgmPlayer.volume = 0.3;

  const savedVolume =
  localStorage.getItem("bgmVolume");

if (savedVolume !== null) {

  bgmPlayer.volume =
    parseFloat(savedVolume);

}

function playBGM(file) {
  
  currentBGM = file.replace(".mp3", "");

  bgmPlayer.pause();

  bgmPlayer.currentTime = 0;

  bgmPlayer.src = "bgm/" + file;

  const bgmName =
    document.getElementById("bgm-name");

  if (bgmName) {
    bgmName.textContent =
      "Now Playing : " +
      currentBGM;
  }

  bgmPlayer.play().catch(() => {});
}

function playCurrentBGM() {

  bgmPlayer.play().catch(() => {});
  
  const bgmName =
    document.getElementById("bgm-name");

  if (bgmName && currentBGM) {

    bgmName.textContent =
      "Now Playing : " + currentBGM;

  }

}

function pauseBGM() {

  bgmPlayer.pause();
  
  const bgmName =
    document.getElementById("bgm-name");

  if (bgmName && currentBGM) {

    bgmName.textContent =
      "⏸ 一時停止 : " +
      currentBGM;

  }

}

function stopBGM() {

  bgmPlayer.pause();

  bgmPlayer.currentTime = 0;
  
  const bgmName =
    document.getElementById("bgm-name");

  if (bgmName) {
    bgmName.textContent =
      "⏹ 停止中";
  }

}


// =====================================================
// 効果音再生
// =====================================================

function playSound(file) {

  const sound = new Audio("sound/" + file);

  sound.volume = 0.8;

  sound.play().catch(() => {});

}
  
// =====================================================
// エフェクト
// =====================================================

function playEffect(effect) {

  const petEl = document.getElementById('pet-char');

  if (!petEl) return;

  petEl.classList.remove(
    "shake",
    "jump",
    "spin",
    "bounce",
    "flash",
    "heartbeat",
    "tremble",
    "float"
  );

  petEl.classList.add(effect);

  setTimeout(() => {
    petEl.classList.remove(effect);
  }, 1000);
}

// =====================================================
// イメージ画像
// =====================================================

function addImage(file) {

  const wrap = document.createElement('div');
  wrap.className = 'chat-image';

  wrap.innerHTML = `
    <img src="images/${file}" alt="">
  `;

  chatMessages.appendChild(wrap);

  chatMessages.scrollTop = chatMessages.scrollHeight;
  }

// =====================================================
// ビデオ再生
// =====================================================
  
  function addVideo(file) {

  const wrap = document.createElement('div');
  wrap.className = 'chat-video';

  wrap.innerHTML = `
    <video controls>
      <source src="videos/${file}" type="video/mp4">
    </video>
  `;

  chatMessages.appendChild(wrap);

  chatMessages.scrollTop = chatMessages.scrollHeight;
  }

// =====================================================
// ボリューム関係
// =====================================================
  
  function toggleBGM() {

  if (bgmPlayer.paused) {

    bgmPlayer.play();

    document.getElementById('bgm-toggle-btn').textContent = '🔊';

  } else {

    bgmPlayer.pause();

    document.getElementById('bgm-toggle-btn').textContent = '🔇';

  }

  }

function volumeDown() {

  bgmPlayer.volume =
    Math.max(0, bgmPlayer.volume - 0.1);

}

function volumeUp() {

  bgmPlayer.volume =
    Math.min(1, bgmPlayer.volume + 0.1);

}
  
  // =====================================================
  // フリー入力
  // =====================================================
function matchKeyword(text) {
  if (!chatData) return null;
  const lower = text.toLowerCase();
  if (chatData[text]) return text;
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
  playSound("send.mp3");
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
