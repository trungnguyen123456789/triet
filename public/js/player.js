// Mobile Player Client Logic
const socket = io();

let myInfo = {
  name: '',
  teamId: null,
  socketId: null
};

let currentGameState = null;

// Screen Elements
const screenLogin = document.getElementById('screenLogin');
const screenGame = document.getElementById('screenGame');

// Load stored info
const savedName = localStorage.getItem('cqg_player_name');
const savedTeam = localStorage.getItem('cqg_player_team');
if (savedName && savedTeam) {
  document.getElementById('inputPlayerName').value = savedName;
  document.getElementById('selectPlayerTeam').value = savedTeam;
}

// Join Form Submit
document.getElementById('joinForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('inputPlayerName').value.trim();
  const teamId = document.getElementById('selectPlayerTeam').value;

  if (!name || !teamId) return;

  myInfo.name = name;
  myInfo.teamId = parseInt(teamId, 10);
  localStorage.setItem('cqg_player_name', name);
  localStorage.setItem('cqg_player_team', teamId);

  socket.emit('player:join', { name: myInfo.name, teamId: myInfo.teamId });

  screenLogin.classList.add('hidden');
  screenGame.classList.remove('hidden');

  document.getElementById('playerHeaderName').textContent = myInfo.name;
  document.getElementById('playerTeamBadge').textContent = `T${myInfo.teamId}`;

  window.gameSound.init();
});

// BÁ KHÍ ACTIVATED EVENT (1 TRÀNG VỖ TAY)
socket.on('game:bakhi_activated', (data) => {
  const modal = document.getElementById('bakhiModal');
  const msgEl = document.getElementById('bakhiMessage');
  if (modal) {
    if (msgEl && data.message) msgEl.textContent = `${data.message} 👏👏👏`;
    modal.classList.remove('hidden');
    if (window.gameSound && window.gameSound.playApplause) {
      window.gameSound.playApplause();
    }
  }
});

const btnCloseBakhiMobile = document.getElementById('btnCloseBakhiModal');
if (btnCloseBakhiMobile) {
  btnCloseBakhiMobile.addEventListener('click', () => {
    const modal = document.getElementById('bakhiModal');
    if (modal) modal.classList.add('hidden');
  });
}

// Answer Option Buttons
let stuckBuzzerClickCount = 0;
let lastStuckQuestionIndex = -1;

function showStuckToast(msg) {
  let toast = document.getElementById('stuckBuzzerToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'stuckBuzzerToast';
    toast.className = 'fixed top-16 left-4 right-4 z-50 p-3 bg-rose-600 text-white font-black text-center text-sm rounded-2xl shadow-2xl border-2 border-yellow-300 animate-bounce';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.remove('hidden');
}

function hideStuckToast() {
  const toast = document.getElementById('stuckBuzzerToast');
  if (toast) toast.classList.add('hidden');
}

const optionButtons = document.querySelectorAll('#mobileOptionsGrid button');
optionButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    if (!currentGameState || currentGameState.status !== 'QUESTION') return;

    const myTeam = currentGameState.teams.find(t => t.id === myInfo.teamId);
    const hasStuckBuzzer = !!(myTeam && myTeam.buffs && myTeam.buffs.stuckBuzzer > 0);

    if (currentGameState.currentQuestionIndex !== lastStuckQuestionIndex) {
      lastStuckQuestionIndex = currentGameState.currentQuestionIndex;
      stuckBuzzerClickCount = 0;
    }

    if (hasStuckBuzzer) {
      stuckBuzzerClickCount++;
      if (navigator.vibrate) navigator.vibrate(50);
      const remainingClicks = 5 - stuckBuzzerClickCount;
      if (remainingClicks > 0) {
        showStuckToast(`🐢 CHUÔNG BỊ KẸT NÚT! Bấm nhanh thêm ${remainingClicks} lần nữa!`);
        btn.classList.add('scale-95');
        setTimeout(() => btn.classList.remove('scale-95'), 100);
        return;
      }
      // Reached 5 clicks!
      stuckBuzzerClickCount = 0;
      hideStuckToast();
    }

    const optIndex = parseInt(btn.getAttribute('data-opt'), 10);

    if (navigator.vibrate) navigator.vibrate(80);
    window.gameSound.playBuzz();

    socket.emit('player:buzz_answer', { optionIndex: optIndex });
  });
});

// Inventory Modal
const inventoryModal = document.getElementById('inventoryModal');
document.getElementById('btnOpenInventory').addEventListener('click', () => {
  renderInventory();
  inventoryModal.classList.remove('hidden');
  socket.emit('player:inventory_opened');
});
document.getElementById('btnCloseInventory').addEventListener('click', () => {
  inventoryModal.classList.add('hidden');
  socket.emit('player:inventory_closed');
});

// Mobile Alert Modal
function showAlert(msg) {
  document.getElementById('mobileAlertMessage').textContent = msg;
  document.getElementById('mobileAlertModal').classList.remove('hidden');
}
document.getElementById('btnDismissMobileAlert').addEventListener('click', () => {
  document.getElementById('mobileAlertModal').classList.add('hidden');
});

socket.on('player:alert', (data) => {
  showAlert(data.message);
});

// Local Delay 3s State
let delayLocalTimer = null;
let delaySecondsLeft = 0;
let isLocalDelayActive = false;

function checkAndStartDelay3s(myTeam) {
  const delayOverlay = document.getElementById('delay3sNoticeOverlay');
  const delayText = document.getElementById('delay3sCountdownText');
  const hasDelay = !!(myTeam && myTeam.buffs && myTeam.buffs.delay3s > 0);

  if (!hasDelay) {
    isLocalDelayActive = false;
    clearInterval(delayLocalTimer);
    if (delayOverlay) delayOverlay.classList.add('hidden');
    return false;
  }

  if (isLocalDelayActive) {
    return true;
  }

  isLocalDelayActive = true;
  delaySecondsLeft = 3;
  if (delayOverlay) delayOverlay.classList.remove('hidden');
  if (delayText) delayText.textContent = `${delaySecondsLeft}s`;

  clearInterval(delayLocalTimer);
  delayLocalTimer = setInterval(() => {
    delaySecondsLeft--;
    if (delaySecondsLeft > 0) {
      if (delayText) delayText.textContent = `${delaySecondsLeft}s`;
    } else {
      clearInterval(delayLocalTimer);
      isLocalDelayActive = false;
      if (delayOverlay) delayOverlay.classList.add('hidden');
      if (currentGameState && currentGameState.status === 'QUESTION') {
        renderMobileQuestion(currentGameState);
      }
    }
  }, 1000);

  return true;
}

function clearDelay3s() {
  clearInterval(delayLocalTimer);
  isLocalDelayActive = false;
  const delayOverlay = document.getElementById('delay3sNoticeOverlay');
  if (delayOverlay) delayOverlay.classList.add('hidden');
}

// Timer 30s tick
socket.on('game:timer_tick', (data) => {
  if (currentGameState) {
    currentGameState.questionTimeRemaining = data.remaining;
  }

  const textEl = document.getElementById('mTimer30sText');
  const barEl = document.getElementById('mTimer30sBar');
  if (textEl) textEl.textContent = `${data.remaining}s`;
  if (barEl) {
    const percent = Math.max(0, (data.remaining / 30) * 100);
    barEl.style.width = `${percent}%`;
    if (data.remaining <= 5) {
      barEl.className = 'h-full bg-rose-600 transition-all duration-1000';
    } else {
      barEl.className = 'h-full bg-emerald-500 transition-all duration-1000';
    }
  }
});

// Post action 7s tick
socket.on('game:post_action_tick', (data) => {
  const statusNotice = document.getElementById('mobileStatusNotice');
  if (statusNotice) {
    statusNotice.textContent = `⏳ ${data.message} sau ${data.remaining}s...`;
  }
});

// Countdown tick
socket.on('game:countdown_tick', (data) => {
  const statusNotice = document.getElementById('statusNotice');
  if (statusNotice && currentGameState && currentGameState.status === 'COUNTDOWN') {
    statusNotice.textContent = `⏳ ${currentGameState.isRound2 ? 'MỞ LẠI CHUÔNG' : 'CHUẨN BỊ'}: ${data.count}s... CHÚ Ý MÁY CHIẾU!`;
  }
});

// Listen to State Updates
socket.on('game:state_update', (state) => {
  currentGameState = state;
  myInfo.socketId = socket.id;

  // Header Scores
  const myPlayer = state.players.find(p => p.id === socket.id);
  const myTeam = state.teams.find(t => t.id === myInfo.teamId);

  if (myPlayer) {
    document.getElementById('playerScoreVal').textContent = myPlayer.score;
  }
  if (myTeam) {
    document.getElementById('teamScoreVal').textContent = myTeam.score;
    document.getElementById('inventoryCountBadge').textContent = myTeam.inventory.length;
  }

  updateMobileView(state);
});

function updateMobileView(state) {
  const statusNotice = document.getElementById('mobileStatusNotice');
  const questionArea = document.getElementById('mobileQuestionArea');
  const chestPicker = document.getElementById('mobileChestPicker');
  const penaltyArea = document.getElementById('mobilePenaltyArea');
  const wheelArea = document.getElementById('mobileWheelArea');
  const teamNameArea = document.getElementById('mobileTeamNameArea');
  const postGameArea = document.getElementById('mobilePostGameArea');

  if (questionArea) questionArea.classList.add('hidden');
  if (chestPicker) chestPicker.classList.add('hidden');
  if (penaltyArea) penaltyArea.classList.add('hidden');
  if (wheelArea) wheelArea.classList.add('hidden');
  if (teamNameArea) teamNameArea.classList.add('hidden');
  if (postGameArea) postGameArea.classList.add('hidden');

  if (state.status !== 'QUESTION') {
    clearDelay3s();
  }

  switch (state.status) {
    case 'LOBBY':
    case 'TUTORIAL':
      statusNotice.textContent = 'CHỜ BẮT ĐẦU TRÒ CHƠI...';
      break;

    case 'COUNTDOWN':
      statusNotice.textContent = 'ĐANG ĐẾM NGƯỢC... CHÚ Ý MÁY CHIẾU!';
      break;

    case 'QUESTION':
      if (questionArea) questionArea.classList.remove('hidden');
      if (state.isRound2) {
        statusNotice.textContent = '🔔 ĐỢT 2: ĐÃ MỞ LẠI CHUÔNG! TẤT CẢ CÁC NHÓM ĐỀU ĐƯỢC BẤM LẠI!';
      } else {
        statusNotice.textContent = 'BẤM NHANH CHỌN ĐÁP ÁN ĐỂ CƯỚP ĐIỂM!';
      }
      renderMobileQuestion(state);
      break;

    case 'BUZZED':
      if (questionArea) questionArea.classList.remove('hidden');
      renderMobileQuestion(state);
      renderMobileBuzzed(state.buzzerWinner);
      break;

    case 'CHEST_SELECTION':
      if (state.buzzerWinner && state.buzzerWinner.playerId === myInfo.socketId) {
        if (chestPicker) chestPicker.classList.remove('hidden');
        renderMobileChests(state);
        statusNotice.textContent = 'BẠN ĐÃ GIÀNH QUYỀN MỞ RƯƠNG!';
      } else {
        statusNotice.textContent = `${state.buzzerWinner ? state.buzzerWinner.playerName : 'Đối thủ'} đang mở rương...`;
      }
      break;

    case 'ACTION_PENALTY':
      if (state.activePenalty && state.activePenalty.playerId === myInfo.socketId) {
        if (penaltyArea) penaltyArea.classList.remove('hidden');
        renderMobilePenalty(state.activePenalty);
        statusNotice.textContent = 'BẠN PHẢI THỰC HIỆN HÌNH PHẠT!';
      } else {
        statusNotice.textContent = `${state.activePenalty ? state.activePenalty.playerName : 'Người chơi'} đang nhận hình phạt!`;
      }
      break;

    case 'WHEEL_SPIN':
      if (wheelArea) wheelArea.classList.remove('hidden');
      renderMobileWheel(state.activeWheel);
      statusNotice.textContent = '🎯 VUỐT HOẶC BẤM NÚT ĐỂ XOAY VÒNG QUAY!';
      break;

    case 'SPEED_MATH':
      statusNotice.textContent = '⚡ THỬ THÁCH THẦN TÍNH: HÃY HÔ TO ĐÁP ÁN RA MIỆNG TRONG 4S!';
      break;

    case 'TEAM_NAME_CHALLENGE':
      if (teamNameArea) teamNameArea.classList.remove('hidden');
      renderMobileTeamNameChallenge(state.teamNameChallenge);
      if (state.teamNameChallenge && state.teamNameChallenge.playerId === myInfo.socketId) {
        statusNotice.textContent = '🎯 BẮN TÊN ĐỒNG ĐỘI: Hãy đọc to và rõ họ tên của tất cả các bạn trong nhóm mình!';
      } else {
        statusNotice.textContent = `🎯 ${state.teamNameChallenge ? state.teamNameChallenge.playerName : 'Thí sinh'} đang đọc tên các thành viên...`;
      }
      break;

    case 'POST_GAME':
      if (postGameArea) postGameArea.classList.remove('hidden');
      renderMobilePostGame(state);
      statusNotice.textContent = 'TỔNG KẾT & CỬA HÀNG ĐỔI QUÀ';
      break;

    default:
      statusNotice.textContent = 'HÃY QUAN SÁT MÀN HÌNH MÁY CHIẾU!';
  }
}

// Render Mobile Question
function renderMobileQuestion(state) {
  const q = state.currentQuestion;
  if (!q) return;

  document.getElementById('mobileQIndex').textContent = `CÂU HỎI ${state.currentQuestionIndex + 1} / ${state.totalQuestions}`;
  document.getElementById('mobileQTitle').textContent = q.question;

  q.options.forEach((opt, idx) => {
    const el = document.getElementById(`mOptText${idx}`);
    if (el) el.textContent = opt;
  });

  const myTeam = state.teams.find(t => t.id === myInfo.teamId);
  const isTeamLocked = state.lockedTeamsForQuestion.includes(myInfo.teamId);
  const isSilenced = !!(myTeam && myTeam.buffs && (myTeam.buffs.silenced || myTeam.buffs.frozen > 0));
  const hasRiskReward = !!(myTeam && myTeam.buffs && myTeam.buffs.riskReward);
  const hideTwoWrong = (myTeam && myTeam.buffs && myTeam.buffs.hideTwoWrong) || [];
  const hasConfusion = !!(myTeam && myTeam.buffs && myTeam.buffs.confusion > 0);
  const hasStuckBuzzer = !!(myTeam && myTeam.buffs && myTeam.buffs.stuckBuzzer > 0);
  const hasNitroX3 = !!(myTeam && myTeam.buffs && myTeam.buffs.nitroX3);

  // Silenced banner
  const silencedNotice = document.getElementById('silencedNotice');
  if (silencedNotice) {
    if (isSilenced) silencedNotice.classList.remove('hidden');
    else silencedNotice.classList.add('hidden');
  }

  // Risk/Reward banner
  const riskNotice = document.getElementById('riskRewardNotice');
  if (riskNotice) {
    if (hasRiskReward) riskNotice.classList.remove('hidden');
    else riskNotice.classList.add('hidden');
  }

  // Nitro X3 banner
  let nitroNotice = document.getElementById('nitroNotice');
  if (!nitroNotice) {
    const parent = document.getElementById('mobileOptionsGrid').parentElement;
    nitroNotice = document.createElement('div');
    nitroNotice.id = 'nitroNotice';
    nitroNotice.className = 'mb-2 p-2 bg-gradient-to-r from-red-600 to-amber-500 text-white rounded-xl text-center text-xs font-black shadow animate-pulse';
    parent.insertBefore(nitroNotice, document.getElementById('mobileOptionsGrid'));
  }
  if (hasNitroX3) {
    nitroNotice.textContent = '🚀 BỐC ĐẦU NITRO X3: Đúng x3 điểm, Sai hoặc Không bấm được -8 điểm!';
    nitroNotice.classList.remove('hidden');
  } else {
    nitroNotice.classList.add('hidden');
  }

  // 50/50 banner
  let fiftyFiftyNotice = document.getElementById('fiftyFiftyNotice');
  if (!fiftyFiftyNotice) {
    const parent = document.getElementById('mobileOptionsGrid').parentElement;
    fiftyFiftyNotice = document.createElement('div');
    fiftyFiftyNotice.id = 'fiftyFiftyNotice';
    fiftyFiftyNotice.className = 'mb-2 p-2 bg-blue-600 text-white rounded-xl text-center text-xs font-bold shadow';
    parent.insertBefore(fiftyFiftyNotice, document.getElementById('mobileOptionsGrid'));
  }
  if (hideTwoWrong && hideTwoWrong.length > 0) {
    fiftyFiftyNotice.textContent = '🔍 ĐÃ DÙNG 50/50: Đã gạch bỏ 2 phương án sai!';
    fiftyFiftyNotice.classList.remove('hidden');
  } else {
    fiftyFiftyNotice.classList.add('hidden');
  }

  // Confusion (shuffle keys)
  let confusionNotice = document.getElementById('confusionNotice');
  if (!confusionNotice) {
    const parent = document.getElementById('mobileOptionsGrid').parentElement;
    confusionNotice = document.createElement('div');
    confusionNotice.id = 'confusionNotice';
    confusionNotice.className = 'mb-2 p-2 bg-purple-700 text-white rounded-xl text-center text-xs font-bold shadow animate-pulse';
    parent.insertBefore(confusionNotice, document.getElementById('mobileOptionsGrid'));
  }
  if (hasConfusion) {
    confusionNotice.textContent = '🌀 LỜI NGUYỀN XÁO TRỘN PHÍM! Vị trí các nút A-B-C-D đã bị đảo lộn!';
    confusionNotice.classList.remove('hidden');
    const permOrder = [
      [2, 0, 3, 1],
      [3, 1, 0, 2],
      [1, 3, 2, 0],
      [2, 3, 1, 0]
    ][(state.currentQuestionIndex || 0) % 4];
    optionButtons.forEach(btn => {
      const idx = parseInt(btn.getAttribute('data-opt'), 10);
      btn.style.order = permOrder[idx];
    });
  } else {
    confusionNotice.classList.add('hidden');
    optionButtons.forEach(btn => {
      btn.style.order = '';
    });
  }

  // Stuck buzzer banner
  let stuckNotice = document.getElementById('stuckNotice');
  if (!stuckNotice) {
    const parent = document.getElementById('mobileOptionsGrid').parentElement;
    stuckNotice = document.createElement('div');
    stuckNotice.id = 'stuckNotice';
    stuckNotice.className = 'mb-2 p-2 bg-amber-600 text-white rounded-xl text-center text-xs font-bold shadow';
    parent.insertBefore(stuckNotice, document.getElementById('mobileOptionsGrid'));
  }
  if (hasStuckBuzzer) {
    stuckNotice.textContent = '🐢 CHUÔNG KẸT NÚT: Bạn phải nhấn liên tục 5 lần vào nút đáp án!';
    stuckNotice.classList.remove('hidden');
  } else {
    stuckNotice.classList.add('hidden');
  }

  // Delay 3s check
  let isDelaying = false;
  if (state.status === 'QUESTION') {
    isDelaying = checkAndStartDelay3s(myTeam);
  }

  const buzzedNotice = document.getElementById('mobileBuzzedNotice');

  optionButtons.forEach(btn => {
    const optIdx = parseInt(btn.getAttribute('data-opt'), 10);
    btn.classList.remove('ring-4', 'ring-amber-400', 'line-through');

    const isEliminated = (hideTwoWrong && hideTwoWrong.includes(optIdx));

    if (state.status === 'QUESTION' && !isTeamLocked && !isSilenced && !isDelaying) {
      if (hasRiskReward && (optIdx === 1 || optIdx === 2)) {
        // Locked B and C due to Risk/Reward card
        btn.disabled = true;
        btn.classList.add('opacity-20', 'cursor-not-allowed');
      } else if (isEliminated) {
        // Eliminated by 50/50
        btn.disabled = true;
        btn.classList.add('opacity-20', 'cursor-not-allowed', 'line-through');
      } else {
        btn.disabled = false;
        btn.classList.remove('opacity-20', 'opacity-30', 'opacity-40', 'cursor-not-allowed', 'line-through');
        if (hasRiskReward && (optIdx === 0 || optIdx === 3)) {
          btn.classList.add('ring-4', 'ring-amber-400');
        }
      }
    } else {
      btn.disabled = true;
      btn.classList.add('opacity-30', 'cursor-not-allowed');
    }
  });

  if (state.status === 'QUESTION') {
    buzzedNotice.classList.add('hidden');
  }
}

// Render Mobile Buzzed Banner
function renderMobileBuzzed(winner) {
  const buzzedNotice = document.getElementById('mobileBuzzedNotice');
  if (!winner) {
    if (buzzedNotice) buzzedNotice.classList.add('hidden');
    return;
  }
  buzzedNotice.classList.remove('hidden');

  const letters = ['A', 'B', 'C', 'D'];
  document.getElementById('mobileBuzzerName').textContent = `${winner.playerName} (${winner.teamName})`;

  if (!winner.verdictRevealed) {
    document.getElementById('mobileBuzzerChoice').innerHTML = `Đã chọn đáp án [${letters[winner.selectedOption]}]: ${winner.optionText} <br><span class="text-amber-600 font-bold animate-pulse">⏳ Đang hồi hộp chờ kết quả...</span>`;
  } else {
    if (winner.isCorrect) {
      document.getElementById('mobileBuzzerChoice').innerHTML = `Đã chọn [${letters[winner.selectedOption]}]: ${winner.optionText} <br><span class="text-emerald-600 font-black text-sm">✅ CHÍNH XÁC (+5Đ NHÓM)</span>`;
    } else {
      document.getElementById('mobileBuzzerChoice').innerHTML = `Đã chọn [${letters[winner.selectedOption]}]: ${winner.optionText} <br><span class="text-rose-600 font-black text-sm">❌ SAI RỒI (MỞ RƯƠNG XUI)</span>`;
    }
  }
}

// Render 20 Mini Chests on Mobile (FIX BUG: chestType logic)
function renderMobileChests(state) {
  const grid = document.getElementById('mChestsGrid');
  grid.innerHTML = '';

  const isLucky = (state.chestType === 'LUCKY');
  const badge = document.getElementById('mChestBadge');
  if (isLucky) {
    badge.textContent = 'RƯƠNG MAY MẮN';
    badge.className = 'px-3 py-1 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-300';
  } else {
    badge.textContent = 'RƯƠNG XUI XẺO';
    badge.className = 'px-3 py-1 rounded-full text-[10px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-300';
  }

  state.activeChests.forEach(c => {
    const btn = document.createElement('button');
    btn.className = `p-3 rounded-xl border flex flex-col items-center justify-center transition active:scale-90 shadow-sm ${
      c.opened 
        ? 'bg-indigo-50 border-indigo-300 cursor-not-allowed' 
        : (isLucky ? 'bg-amber-50 border-amber-300 hover:border-amber-400' : 'bg-rose-50 border-rose-300 hover:border-rose-400')
    }`;
    btn.disabled = c.opened;

    btn.innerHTML = `
      <span class="text-2xl">${c.opened ? (c.reward ? c.reward.icon : '✨') : (isLucky ? '🎁' : '💀')}</span>
      <span class="text-[10px] font-black ${isLucky ? 'text-amber-800' : 'text-rose-800'} mt-1">#${c.id}</span>
    `;

    btn.addEventListener('click', () => {
      if (navigator.vibrate) navigator.vibrate(60);
      socket.emit('player:pick_chest', { chestId: c.id });
    });

    grid.appendChild(btn);
  });
}

// Render Action Penalty on Mobile
function renderMobilePenalty(penalty) {
  document.getElementById('mPenaltyIcon').textContent = penalty.icon || '💃';
  document.getElementById('mPenaltyTitle').textContent = penalty.title;
  document.getElementById('mPenaltyDesc').textContent = penalty.desc;

  const btnSkip = document.getElementById('btnMobileUseSkipCard');
  if (btnSkip) {
    const myTeam = currentGameState && currentGameState.teams ? currentGameState.teams.find(t => t.id === myInfo.teamId) : null;
    const skipItem = myTeam && myTeam.inventory ? myTeam.inventory.find(i => i.code === 'ITEM_SKIP_PENALTY' || i.code === 'ITEM_SKIP') : null;
    if (skipItem) {
      btnSkip.classList.remove('hidden');
      btnSkip.onclick = () => {
        socket.emit('player:use_item', { itemId: skipItem.id });
      };
    } else {
      btnSkip.classList.add('hidden');
      btnSkip.onclick = null;
    }
  }
}

document.getElementById('btnMobileAcceptPenalty').addEventListener('click', () => {
  const penaltyArea = document.getElementById('mobilePenaltyArea');
  const penalty = currentGameState ? currentGameState.activePenalty : null;
  const isGroup = penalty && penalty.isGroup;

  penaltyArea.innerHTML = `
    <div class="text-center py-6 space-y-3">
      <div class="text-5xl animate-bounce">${isGroup ? '🔥' : '🎬'}</div>
      <h3 class="text-lg font-black bungee-font text-indigo-600">
        ${isGroup ? 'CẢ NHÓM HÃY BƯỚC LÊN BỤC GIẢNG!' : 'ĐANG PHÁT VIDEO TRÊN MÁY CHIẾU!'}
      </h3>
      <p class="text-xs text-slate-600 font-semibold leading-relaxed">
        ${isGroup 
          ? 'Cả nhóm hãy cùng nhau nhảy cover theo điệu nhảy trên máy chiếu! Nếu hoàn thành tốt, tất cả thành viên trong nhóm sẽ được CỘNG +4 ĐIỂM!' 
          : 'Hãy tự tin bước lên bục giảng và biểu diễn theo nhịp nhạc nhé! Nếu hoàn thành bạn sẽ được cộng +2 điểm cá nhân!'}
      </p>
    </div>
  `;
  socket.emit('player:start_action_performance');
});
document.getElementById('btnMobileForfeitPenalty').addEventListener('click', () => {
  socket.emit('player:forfeit_action_penalty');
});

// Render Inventory (Túi Đồ)
function renderInventory() {
  const container = document.getElementById('inventoryItemsList');
  container.innerHTML = '';

  if (!currentGameState) return;
  const team = currentGameState.teams.find(t => t.id === myInfo.teamId);
  if (!team || team.inventory.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 text-slate-400 text-xs">
        <span class="text-3xl block mb-2">📭</span>
        Túi đồ của nhóm hiện đang trống.<br>Hãy trả lời đúng và mở Rương May Mắn để thu thập thẻ bài!
      </div>
    `;
    return;
  }

  const isActionPenaltyActive = (currentGameState.status === 'ACTION_PENALTY');

  team.inventory.forEach(item => {
    const card = document.createElement('div');
    card.className = 'p-3 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col gap-2.5 shadow-sm';

    let targetSelectHtml = '';
    const needsTarget = (item.code === 'ITEM_STEAL' || item.code === 'ITEM_SILENCE' || item.code === 'ITEM_VAMPIRE' || item.code === 'ITEM_PASS_PENALTY');
    if (needsTarget) {
      targetSelectHtml = `
        <div class="flex items-center gap-2">
          <label class="text-[10px] text-slate-500 font-bold">Mục tiêu:</label>
          <select id="targetTeam_${item.id}" class="py-1 px-2 rounded-lg bg-white border border-slate-300 text-xs font-bold text-indigo-600">
            ${[1,2,3,4,5,6,7].filter(id => id !== myInfo.teamId).map(id => `<option value="${id}">Nhóm ${id}</option>`).join('')}
          </select>
        </div>
      `;
    }

    const isSkipItem = (item.code === 'ITEM_SKIP_PENALTY' || item.code === 'ITEM_SKIP');
    const isPassPenalty = (item.code === 'ITEM_PASS_PENALTY');
    const isPassive = (item.code === 'ITEM_REFLECT');
    const is5050 = (item.code === 'ITEM_50_50');
    const isQuestionActive = (currentGameState.status === 'QUESTION');

    let btnClass = 'py-1.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-xs ml-auto shadow active:scale-95';
    let btnText = 'KÍCH HOẠT DÙNG 🔥';
    let isBtnDisabled = false;

    if (isPassive) {
      btnClass = 'py-1.5 px-3 rounded-xl bg-purple-100 text-purple-700 border border-purple-300 font-black text-[11px] ml-auto cursor-default shadow-sm';
      btnText = '🛡️ TỰ ĐỘNG PHẢN ĐÒN (BỊ ĐỘNG)';
      isBtnDisabled = true;
    } else if (isActionPenaltyActive) {
      if (isSkipItem) {
        btnClass = 'py-1.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-xs ml-auto shadow animate-pulse';
        btnText = 'DÙNG BỎ QUA LƯỢT ⏭️';
      } else if (isPassPenalty) {
        btnClass = 'py-1.5 px-3 rounded-xl bg-gradient-to-r from-rose-500 to-amber-600 text-white font-black text-xs ml-auto shadow animate-pulse';
        btnText = 'GẮP PHẠT CHO ĐỐI THỦ 🔄';
      } else {
        btnClass = 'py-1.5 px-3 rounded-xl bg-slate-300 text-slate-500 font-bold text-xs ml-auto cursor-not-allowed opacity-60';
        btnText = '🚫 KHÓA TRONG HÌNH PHẠT';
        isBtnDisabled = true;
      }
    } else {
      if (isSkipItem || isPassPenalty) {
        btnClass = 'py-1.5 px-3 rounded-xl bg-slate-200 text-slate-400 font-bold text-xs ml-auto cursor-not-allowed';
        btnText = 'CHỈ DÙNG KHI DÍNH PHẠT';
        isBtnDisabled = true;
      } else if (is5050 && !isQuestionActive) {
        btnClass = 'py-1.5 px-3 rounded-xl bg-slate-200 text-slate-400 font-bold text-xs ml-auto cursor-not-allowed';
        btnText = 'CHỈ DÙNG TRONG CÂU HỎI';
        isBtnDisabled = true;
      }
    }

    card.innerHTML = `
      <div class="flex items-start gap-2.5">
        <span class="text-2xl">${item.icon}</span>
        <div class="flex-1">
          <h4 class="text-xs font-bold text-slate-800">${item.name}</h4>
          <p class="text-[10px] text-slate-500 mt-0.5 leading-snug">${item.desc}</p>
        </div>
      </div>
      <div class="flex items-center justify-between pt-1 border-t border-slate-200">
        ${targetSelectHtml}
        <button id="btnUse_${item.id}" ${isBtnDisabled ? 'disabled' : ''} class="${btnClass}">
          ${btnText}
        </button>
      </div>
    `;

    container.appendChild(card);

    setTimeout(() => {
      const useBtn = document.getElementById(`btnUse_${item.id}`);
      if (useBtn && !isBtnDisabled) {
        useBtn.addEventListener('click', () => {
          if (currentGameState && currentGameState.status === 'ACTION_PENALTY' && !isSkipItem && !isPassPenalty) {
            alert('Khi đang nhảy cover, chỉ có vật phẩm Bỏ Qua Lượt hoặc Gắp Lửa Bỏ Tay Người mới được phép sử dụng!');
            return;
          }

          let targetTeamId = null;
          const selectEl = document.getElementById(`targetTeam_${item.id}`);
          if (selectEl) targetTeamId = parseInt(selectEl.value, 10);

          socket.emit('player:use_item', {
            itemId: item.id,
            targetTeamId: targetTeamId
          });

          inventoryModal.classList.add('hidden');
        });
      }
    }, 0);
  });
}

// ==================== INTERACTIVE MOBILE WHEEL ====================
let mobileWheelAnim = null;
let currentMobileWheel = null;
let wheelCanvasAngle = 0;
let isWheelDragging = false;
let wheelStartAngle = 0;
let wheelTouchLastAngle = 0;
let wheelAngularVelocity = 0;
let wheelLastTouchTime = 0;

function drawMobileWheel(wheel, angle) {
  if (!wheel || !wheel.segments) return;
  const canvas = document.getElementById('mWheelCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const segments = wheel.segments;
  const numSegs = segments.length;
  const arc = (2 * Math.PI) / numSegs;
  const colors = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = centerX - 8;

  for (let i = 0; i < numSegs; i++) {
    const segAngle = angle + i * arc;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, segAngle, segAngle + arc);
    ctx.closePath();
    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffffffaa';
    ctx.stroke();

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(segAngle + arc / 2);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px Montserrat';
    ctx.shadowColor = 'black';
    ctx.shadowBlur = 3;
    ctx.fillText(segments[i].label, radius - 14, 4);
    ctx.restore();
  }

  // Center hub
  ctx.beginPath();
  ctx.arc(centerX, centerY, 20, 0, 2 * Math.PI);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#f59e0b';
  ctx.stroke();
}

function initMobileWheelGestures() {
  const canvas = document.getElementById('mWheelCanvas');
  if (!canvas || canvas.dataset.gesturesInit) return;
  canvas.dataset.gesturesInit = 'true';

  function getAngle(e) {
    const rect = canvas.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return Math.atan2(clientY - cy, clientX - cx);
  }

  function startDrag(e) {
    isWheelDragging = true;
    wheelStartAngle = getAngle(e);
    wheelTouchLastAngle = wheelStartAngle;
    wheelLastTouchTime = performance.now();
    wheelAngularVelocity = 0;
  }

  function moveDrag(e) {
    if (!isWheelDragging) return;
    const currentTouchAngle = getAngle(e);
    let delta = currentTouchAngle - wheelTouchLastAngle;
    while (delta > Math.PI) delta -= 2 * Math.PI;
    while (delta < -Math.PI) delta += 2 * Math.PI;

    wheelCanvasAngle += delta;
    drawMobileWheel(currentMobileWheel, wheelCanvasAngle);

    const now = performance.now();
    const dt = now - wheelLastTouchTime;
    if (dt > 0) {
      wheelAngularVelocity = delta / dt;
    }
    wheelTouchLastAngle = currentTouchAngle;
    wheelLastTouchTime = now;
  }

  function endDrag(e) {
    if (!isWheelDragging) return;
    isWheelDragging = false;
    // If user flicked or rotated significantly, spin the wheel!
    if (Math.abs(wheelAngularVelocity) > 0.003 || Math.abs(wheelCanvasAngle) > 0.4) {
      if (navigator.vibrate) navigator.vibrate(60);
      socket.emit('player:spin_wheel');
    }
  }

  canvas.addEventListener('touchstart', startDrag, { passive: true });
  canvas.addEventListener('touchmove', moveDrag, { passive: true });
  canvas.addEventListener('touchend', endDrag);
  canvas.addEventListener('mousedown', startDrag);
  window.addEventListener('mousemove', moveDrag);
  window.addEventListener('mouseup', endDrag);
}

function renderMobileWheel(wheel) {
  if (!wheel) return;
  currentMobileWheel = wheel;
  const titleEl = document.getElementById('mobileWheelTitle');
  if (titleEl) titleEl.textContent = wheel.title || 'QUAY VÒNG MAY MẮN!';
  const resBox = document.getElementById('mobileWheelResult');
  if (resBox) resBox.classList.add('hidden');
  initMobileWheelGestures();
  cancelAnimationFrame(mobileWheelAnim);
  wheelCanvasAngle = 0;
  drawMobileWheel(wheel, 0);
}

const btnMobileSpin = document.getElementById('btnMobileSpinWheel');
if (btnMobileSpin) {
  btnMobileSpin.addEventListener('click', () => {
    if (navigator.vibrate) navigator.vibrate(60);
    socket.emit('player:spin_wheel');
  });
}

// Synchronized Wheel Spin on Mobile
socket.on('game:wheel_start_spin', (data) => {
  if (!currentMobileWheel || !currentMobileWheel.segments) return;
  const segments = currentMobileWheel.segments;
  const numSegs = segments.length;
  const arc = (2 * Math.PI) / numSegs;
  const targetSeg = data.spinResultIndex !== undefined ? data.spinResultIndex : 0;
  const fullRotations = 6 * 2 * Math.PI;
  const targetAngle = fullRotations + (1.5 * Math.PI) - (targetSeg * arc + arc / 2);

  let startA = wheelCanvasAngle % (2 * Math.PI);
  const duration = data.duration || 5000;
  const startTime = performance.now();
  let lastTickA = startA;

  function anim(time) {
    const elapsed = time - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    const angle = startA + ease * (targetAngle - startA);

    if (Math.abs(angle - lastTickA) > arc) {
      window.gameSound.playWheelClick();
      lastTickA = angle;
    }

    drawMobileWheel(currentMobileWheel, angle);

    if (progress < 1) {
      mobileWheelAnim = requestAnimationFrame(anim);
    } else {
      window.gameSound.playFanfare();
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      const resBox = document.getElementById('mobileWheelResult');
      if (resBox) resBox.classList.remove('hidden');
      const resText = document.getElementById('mobileWheelResultText');
      if (resText) resText.textContent = segments[targetSeg].label;
    }
  }

  cancelAnimationFrame(mobileWheelAnim);
  mobileWheelAnim = requestAnimationFrame(anim);
});

// ==================== TEAM NAME CHALLENGE (5S CHUẨN BỊ + 10S ĐỌC TÊN) ====================
let mobileChallengeTimer = null;
function renderMobileTeamNameChallenge(challenge) {
  if (!challenge) return;
  let prepRemaining = 5.0;
  let remaining = 10.0;
  let isPrep = true;

  const timerEl = document.getElementById('mTeamNameTimer');
  const phaseEl = document.getElementById('mTeamNamePhase');
  const descEl = document.getElementById('mTeamNameDesc');
  const boxEl = document.getElementById('mTeamNameBox');

  if (boxEl) boxEl.className = 'p-3 bg-amber-50 border border-amber-200 rounded-2xl transition-all';
  if (phaseEl) phaseEl.textContent = '⏳ 5 GIÂY CHUẨN BỊ (LẮNG NGHE CƠ CHẾ)';
  if (timerEl) {
    timerEl.className = 'text-3xl font-black text-amber-500 bungee-font animate-pulse';
    timerEl.textContent = '5s';
  }
  if (descEl) descEl.textContent = 'Người điều hành đang phổ biến cơ chế, sau 5 giây đếm ngược sẽ bắt đầu đọc tên!';

  clearInterval(mobileChallengeTimer);
  window.gameSound.playTick();

  mobileChallengeTimer = setInterval(() => {
    if (isPrep) {
      prepRemaining -= 0.1;
      if (prepRemaining > 0) {
        if (timerEl) timerEl.textContent = Math.ceil(prepRemaining) + 's';
        if (Math.floor(prepRemaining * 10) % 10 === 0) {
          window.gameSound.playTick();
        }
      } else {
        // Switch to 10s challenge
        isPrep = false;
        window.gameSound.playBuzz();
        if (boxEl) boxEl.className = 'p-3 bg-rose-50 border border-rose-200 rounded-2xl transition-all';
        if (phaseEl) phaseEl.textContent = '🔥 BẮT ĐẦU! THỜI GIAN CÒN LẠI:';
        if (timerEl) {
          timerEl.className = 'text-3xl font-black text-rose-600 bungee-font animate-pulse';
          timerEl.textContent = '10.0s';
        }
        if (descEl) descEl.textContent = 'Hãy đọc to và chính xác họ tên các thành viên trong nhóm của bạn trước lớp!';
      }
    } else {
      remaining -= 0.1;
      if (remaining > 0) {
        if (timerEl) timerEl.textContent = remaining.toFixed(1) + 's';
        if (Math.floor(remaining * 10) % 10 === 0) {
          window.gameSound.playTick();
        }
      } else {
        clearInterval(mobileChallengeTimer);
        if (timerEl) timerEl.textContent = '0.0s';
        window.gameSound.playWrong();
      }
    }
  }, 100);
}

// ==================== ANNOUNCEMENTS WITH SFX ====================
socket.on('game:announcement', (data) => {
  if (data.soundType === 'bad') {
    window.gameSound.playWrong();
  } else if (data.soundType === 'good') {
    window.gameSound.playFanfare();
  } else {
    window.gameSound.playBuzz();
  }
  showAlert(`${data.title}\n\n${data.desc}`);
});

// ==================== POST GAME & TABS ON MOBILE ====================
const mTabBtnLeaderboard = document.getElementById('mTabBtnLeaderboard');
const mTabBtnIndiv = document.getElementById('mTabBtnIndiv');

const mTabContentLeaderboard = document.getElementById('mTabContentLeaderboard');
const mTabContentIndiv = document.getElementById('mTabContentIndiv');

function switchMobilePostGameTab(activeTab) {
  const activeClass = 'py-2 rounded-xl font-black text-xs text-center transition bg-white text-slate-900 shadow-sm';
  const inactiveClass = 'py-2 rounded-xl font-black text-xs text-center transition text-slate-600 hover:text-slate-900';

  if (mTabContentLeaderboard) mTabContentLeaderboard.classList.add('hidden');
  if (mTabContentIndiv) mTabContentIndiv.classList.add('hidden');

  if (mTabBtnLeaderboard) mTabBtnLeaderboard.className = inactiveClass;
  if (mTabBtnIndiv) mTabBtnIndiv.className = inactiveClass;

  if (activeTab === 'leaderboard') {
    if (mTabContentLeaderboard) mTabContentLeaderboard.classList.remove('hidden');
    if (mTabBtnLeaderboard) mTabBtnLeaderboard.className = activeClass;
  } else if (activeTab === 'indiv') {
    if (mTabContentIndiv) mTabContentIndiv.classList.remove('hidden');
    if (mTabBtnIndiv) mTabBtnIndiv.className = activeClass;
  }
}

if (mTabBtnLeaderboard) mTabBtnLeaderboard.addEventListener('click', () => switchMobilePostGameTab('leaderboard'));
if (mTabBtnIndiv) mTabBtnIndiv.addEventListener('click', () => switchMobilePostGameTab('indiv'));

function renderMobilePostGame(state) {
  // 1. Teams Podium & List
  const sortedTeams = [...state.teams].sort((a, b) => b.score - a.score);
  if (sortedTeams[0]) {
    const el = document.getElementById('mRank1TeamName');
    if (el) el.textContent = sortedTeams[0].name;
    const sc = document.getElementById('mRank1TeamScore');
    if (sc) sc.textContent = `${sortedTeams[0].score}đ`;
  }
  if (sortedTeams[1]) {
    const el = document.getElementById('mRank2TeamName');
    if (el) el.textContent = sortedTeams[1].name;
    const sc = document.getElementById('mRank2TeamScore');
    if (sc) sc.textContent = `${sortedTeams[1].score}đ`;
  }
  if (sortedTeams[2]) {
    const el = document.getElementById('mRank3TeamName');
    if (el) el.textContent = sortedTeams[2].name;
    const sc = document.getElementById('mRank3TeamScore');
    if (sc) sc.textContent = `${sortedTeams[2].score}đ`;
  }

  const teamsList = document.getElementById('mTeamsList');
  if (teamsList) {
    teamsList.innerHTML = '';
    sortedTeams.forEach((t, i) => {
      const row = document.createElement('div');
      row.className = `p-2 rounded-xl border flex items-center justify-between text-xs font-bold ${t.id === myInfo.teamId ? 'bg-amber-50 border-amber-300' : 'bg-white border-slate-200'}`;
      row.innerHTML = `
        <div class="flex items-center gap-2">
          <span class="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black">${i + 1}</span>
          <span>${t.name} ${t.id === myInfo.teamId ? '⭐ (Nhóm bạn)' : ''}</span>
        </div>
        <span class="text-indigo-600 font-black">${t.score}đ</span>
      `;
      teamsList.appendChild(row);
    });
  }

  // 2. Individuals Podium & List
  const sortedPlayers = [...state.players].sort((a, b) => b.score - a.score);
  if (sortedPlayers[0]) {
    const el = document.getElementById('mRank1IndivName');
    if (el) el.textContent = sortedPlayers[0].name;
    const sc = document.getElementById('mRank1IndivScore');
    if (sc) sc.textContent = `${sortedPlayers[0].score}đ`;
  }
  if (sortedPlayers[1]) {
    const el = document.getElementById('mRank2IndivName');
    if (el) el.textContent = sortedPlayers[1].name;
    const sc = document.getElementById('mRank2IndivScore');
    if (sc) sc.textContent = `${sortedPlayers[1].score}đ`;
  }
  if (sortedPlayers[2]) {
    const el = document.getElementById('mRank3IndivName');
    if (el) el.textContent = sortedPlayers[2].name;
    const sc = document.getElementById('mRank3IndivScore');
    if (sc) sc.textContent = `${sortedPlayers[2].score}đ`;
  }

  const playersList = document.getElementById('mPlayersList');
  if (playersList) {
    playersList.innerHTML = '';
    sortedPlayers.forEach((p, i) => {
      const isMe = p.id === socket.id;
      const row = document.createElement('div');
      row.className = `p-2 rounded-xl border flex items-center justify-between text-xs font-bold ${isMe ? 'bg-indigo-50 border-indigo-300' : 'bg-white border-slate-200'}`;
      row.innerHTML = `
        <div class="flex items-center gap-2">
          <span class="w-5 h-5 rounded-full ${i === 0 ? 'bg-amber-400 text-slate-900' : i === 1 ? 'bg-slate-300' : i === 2 ? 'bg-amber-700 text-amber-100' : 'bg-slate-100'} flex items-center justify-center text-[10px] font-black">#${i + 1}</span>
          <span class="truncate max-w-[140px]">${p.name} ${isMe ? '⭐ (Bạn)' : ''} <span class="text-slate-400 font-normal text-[10px]">(T${p.teamId})</span></span>
        </div>
        <span class="text-indigo-600 font-black">${p.score}đ</span>
      `;
      playersList.appendChild(row);
    });
  }

  // 3. Shop
  renderMobileShop(state);
}

// Render Mobile Shop
function renderMobileShop(state) {
  const team = state.teams.find(t => t.id === myInfo.teamId);
  const teamTokens = team ? team.score * 1000 : 0;
  const tokenEl = document.getElementById('mTeamTokens');
  if (tokenEl) tokenEl.textContent = teamTokens.toLocaleString('vi-VN') + 'đ';

  const myTeamPlayers = state.players.filter(p => p.teamId === myInfo.teamId);
  myTeamPlayers.sort((a, b) => b.score - a.score);
  const isTeamMVP = myTeamPlayers.length > 0 && myTeamPlayers[0].id === socket.id;

  const container = document.getElementById('mShopItemsList');
  if (!container) return;
  container.innerHTML = '';

  state.shopRewards.forEach(r => {
    const card = document.createElement('div');
    card.className = 'p-3 rounded-2xl glass-panel border border-slate-200 bg-white flex items-center justify-between gap-3 shadow-sm';

    const canAfford = teamTokens >= r.price && r.stock > 0;

    let actionBtnHtml = '';
    if (isTeamMVP) {
      actionBtnHtml = `
        <button id="btnBuy_${r.id}" ${canAfford ? '' : 'disabled'}
          class="py-2 px-3 rounded-xl text-xs font-black transition ${
            canAfford 
              ? 'bg-rose-600 hover:bg-rose-700 text-white shadow active:scale-95' 
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          }">
          ${r.stock <= 0 ? 'HẾT HÀNG' : 'ĐỔI QUÀ'}
        </button>
      `;
    } else {
      actionBtnHtml = `<span class="text-[10px] text-slate-400 italic">Chỉ MVP tổ được đổi</span>`;
    }

    const mediaHtml = r.image 
      ? `<img src="${r.image}" alt="${r.name}" class="w-12 h-12 object-contain rounded-xl bg-slate-50 p-0.5 border border-slate-200 shadow-sm shrink-0">` 
      : `<span class="text-3xl shrink-0">${r.icon}</span>`;

    card.innerHTML = `
      <div class="flex items-center gap-3">
        ${mediaHtml}
        <div>
          <h4 class="text-xs font-bold text-slate-800 leading-snug">${r.name}</h4>
          <p class="text-[11px] text-rose-600 font-black mt-0.5">${r.price.toLocaleString('vi-VN')}đ <span class="text-slate-400 font-normal text-[10px]">• Còn: ${r.stock}</span></p>
        </div>
      </div>
      <div>${actionBtnHtml}</div>
    `;

    container.appendChild(card);

    if (isTeamMVP && canAfford) {
      setTimeout(() => {
        const btn = document.getElementById(`btnBuy_${r.id}`);
        if (btn) {
          btn.addEventListener('click', () => {
            if (confirm(`Bạn có chắc muốn dùng ${r.price.toLocaleString('vi-VN')}đ của nhóm để đổi: ${r.name}?`)) {
              socket.emit('player:buy_reward', { rewardId: r.id });
            }
          });
        }
      }, 0);
    }
  });
}
