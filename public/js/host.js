// Host Projector Logic
const socket = io();

let currentGameState = null;
let soundEnabled = true;

// ==================== HOST SECURITY PIN PROTECTION ====================
const HOST_PIN = '4829';
const hostPinOverlay = document.getElementById('hostPinOverlay');
const inputHostPin = document.getElementById('inputHostPin');
const btnSubmitHostPin = document.getElementById('btnSubmitHostPin');
const pinErrorMessage = document.getElementById('pinErrorMessage');

function verifyHostPin() {
  const enteredPin = inputHostPin.value.trim();
  if (enteredPin === HOST_PIN) {
    sessionStorage.setItem('host_pin_authenticated', HOST_PIN);
    if (pinErrorMessage) pinErrorMessage.classList.add('hidden');
    if (hostPinOverlay) {
      hostPinOverlay.classList.add('opacity-0');
      setTimeout(() => hostPinOverlay.classList.add('hidden'), 300);
    }
    socket.emit('host:authenticate', { pin: HOST_PIN });
    if (window.gameSound && window.gameSound.playGood) window.gameSound.playGood();
  } else {
    if (pinErrorMessage) pinErrorMessage.classList.remove('hidden');
    inputHostPin.classList.add('border-rose-500');
    inputHostPin.value = '';
    inputHostPin.focus();
  }
}

function checkHostAuth() {
  const savedPin = sessionStorage.getItem('host_pin_authenticated');
  if (savedPin === HOST_PIN) {
    if (hostPinOverlay) hostPinOverlay.classList.add('hidden');
    socket.emit('host:authenticate', { pin: HOST_PIN });
  } else {
    if (hostPinOverlay) hostPinOverlay.classList.remove('hidden');
    if (inputHostPin) inputHostPin.focus();
  }
}

if (btnSubmitHostPin && inputHostPin) {
  btnSubmitHostPin.addEventListener('click', verifyHostPin);
  inputHostPin.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') verifyHostPin();
  });
}

// Auto check auth on start & reconnect
checkHostAuth();
socket.on('connect', () => {
  const savedPin = sessionStorage.getItem('host_pin_authenticated');
  if (savedPin === HOST_PIN) {
    socket.emit('host:authenticate', { pin: HOST_PIN });
  }
});
// ======================================================================

// DOM Elements
const views = {
  lobby: document.getElementById('viewLobby'),
  tutorial: document.getElementById('viewTutorial'),
  countdown: document.getElementById('viewCountdown'),
  question: document.getElementById('viewQuestion'),
  chests: document.getElementById('viewChests'),
  actionPenalty: document.getElementById('viewActionPenalty'),
  wheel: document.getElementById('viewWheel'),
  speedMath: document.getElementById('viewSpeedMath'),
  teamNameChallenge: document.getElementById('viewTeamNameChallenge'),
  postGame: document.getElementById('viewPostGame')
};

function showView(viewKey) {
  Object.keys(views).forEach(key => {
    if (views[key]) views[key].classList.add('hidden');
  });
  if (views[viewKey]) {
    views[viewKey].classList.remove('hidden');
  }
}

// Sound toggle
document.getElementById('toggleSoundBtn').addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  window.gameSound.enabled = soundEnabled;
  const btn = document.getElementById('toggleSoundBtn');
  btn.innerHTML = soundEnabled 
    ? `<i class="fa-solid fa-volume-high text-amber-500"></i><span>Âm Thanh: BẬT</span>`
    : `<i class="fa-solid fa-volume-xmark text-slate-400"></i><span>Âm Thanh: TẮT</span>`;
});

// Reset game button
document.getElementById('resetGameBtn').addEventListener('click', () => {
  if (confirm('Bạn có chắc chắn muốn đặt lại toàn bộ trò chơi về trạng thái ban đầu?')) {
    socket.emit('host:reset_game');
  }
});

// Tutorial open/close
document.getElementById('btnOpenTutorial').addEventListener('click', () => {
  showView('tutorial');
});
document.getElementById('btnCloseTutorial').addEventListener('click', () => {
  showView('lobby');
});
document.getElementById('btnProceedFromTutorial').addEventListener('click', () => {
  showView('lobby');
});

// Start Game from Lobby
document.getElementById('btnStartGame').addEventListener('click', () => {
  socket.emit('host:start_countdown');
});

// Host Next Question / Reopen Navigation
document.getElementById('btnHostNextQuestion').addEventListener('click', () => {
  socket.emit('host:next_question');
});
document.getElementById('btnHostReopen').addEventListener('click', () => {
  socket.emit('host:reopen_question');
});

// Manual proceed from Chest Result Card
const btnNextFromChest = document.getElementById('btnHostNextFromChest');
if (btnNextFromChest) {
  btnNextFromChest.addEventListener('click', () => {
    socket.emit('host:next_question');
  });
}
const btnReopenFromChest = document.getElementById('btnHostReopenFromChest');
if (btnReopenFromChest) {
  btnReopenFromChest.addEventListener('click', () => {
    socket.emit('host:reopen_question');
  });
}

// FIX: LISTEN TO COUNTDOWN 5 4 3 2 1 FROM SERVER ACCURATELY
socket.on('game:countdown_tick', (data) => {
  const el = document.getElementById('countdownNumber');
  if (el) {
    el.textContent = data.count;
    el.classList.remove('animate-pulse');
    void el.offsetWidth; // trigger reflow
    el.classList.add('animate-pulse');
  }
  window.gameSound.playTick();
});

// FIX: LISTEN TO 30S TIMER TICK
socket.on('game:timer_tick', (data) => {
  update30sTimer(data.remaining);
});

function update30sTimer(seconds) {
  const timerText = document.getElementById('timer30sText');
  const timerBar = document.getElementById('timer30sBar');
  if (timerText) timerText.textContent = `${seconds}s`;
  if (timerBar) {
    const percent = Math.max(0, (seconds / 30) * 100);
    timerBar.style.width = `${percent}%`;
    if (seconds <= 5) {
      timerBar.className = 'h-full bg-rose-600 transition-all duration-1000 animate-pulse';
      window.gameSound.playTick();
    } else if (seconds <= 15) {
      timerBar.className = 'h-full bg-amber-500 transition-all duration-1000';
    } else {
      timerBar.className = 'h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-1000';
    }
  }
}

// STOP ALL MEDIA EVENT
socket.on('game:stop_all_media', () => {
  const frame = document.getElementById('penaltyYoutubeFrame');
  if (frame) frame.src = '';
});

// Thanos Snap Event
socket.on('game:thanos_snap', (data) => {
  window.gameSound.playThanosSnap();
  const overlay = document.getElementById('thanosOverlay');
  overlay.classList.remove('hidden');
  document.body.classList.add('anim-snap');
  setTimeout(() => {
    document.body.classList.remove('anim-snap');
    overlay.classList.add('hidden');
  }, 3500);
});

// Listen for Timer Pause / Resume
socket.on('game:timer_pause', (data) => {
  const timerText = document.getElementById('timer30sText');
  const timerBar = document.getElementById('timer30sBar');
  if (data.paused) {
    if (timerText) {
      timerText.innerHTML = `<span class="text-amber-500 animate-pulse"><i class="fa-solid fa-pause mr-1"></i>TẠM DỪNG</span>`;
    }
    if (timerBar) {
      timerBar.classList.add('bg-amber-400');
    }
  } else {
    if (timerBar) {
      timerBar.classList.remove('bg-amber-400');
    }
  }
});

// Dismiss announcement modal resumes timer
document.getElementById('btnDismissAnnouncement').addEventListener('click', () => {
  document.getElementById('announcementModal').classList.add('hidden');
  socket.emit('game:resume_timer');
});

// LISTEN TO ITEM & BUFF ANNOUNCEMENTS WITH SFX
socket.on('game:announcement', (data) => {
  const modal = document.getElementById('announcementModal');
  const icon = document.getElementById('announcementIcon');
  const title = document.getElementById('announcementTitle');
  const desc = document.getElementById('announcementDesc');
  if (modal && title && desc) {
    title.textContent = data.title || 'Thông báo';
    desc.textContent = data.desc || '';
    if (data.soundType === 'bad') {
      if (icon) icon.textContent = '⚡';
      window.gameSound.playWrong();
    } else if (data.soundType === 'good') {
      if (icon) icon.textContent = '🎉';
      window.gameSound.playFanfare();
    } else {
      if (icon) icon.textContent = '📢';
      window.gameSound.playBuzz();
    }
    modal.classList.remove('hidden');
  }
});

// State Update
socket.on('game:state_update', (state) => {
  currentGameState = state;
  renderState(state);
});

function renderState(state) {
  const statusBadge = document.getElementById('statusBadge');
  statusBadge.textContent = getStatusText(state.status);

  renderSidebarTeams(state.teams, state.lockedTeamsForQuestion);

  const shopModalEl = document.getElementById('hostShopModal');
  if (shopModalEl && !shopModalEl.classList.contains('hidden')) {
    renderHostShopModal();
  }

  switch (state.status) {
    case 'LOBBY':
      showView('lobby');
      renderLobby(state);
      break;

    case 'COUNTDOWN':
      showView('countdown');
      document.getElementById('buzzBanner').classList.add('hidden');
      const annModal = document.getElementById('announcementModal');
      if (annModal) annModal.classList.add('hidden');
      const el = document.getElementById('countdownNumber');
      if (el) el.textContent = state.countdownNumber;
      const countTitle = document.getElementById('countdownTitle');
      const countDesc = document.getElementById('countdownDesc');
      if (state.isRound2) {
        if (countTitle) countTitle.textContent = '🔔 MỞ LẠI CHUÔNG CHO TẤT CẢ CÁC NHÓM';
        if (countDesc) countDesc.textContent = 'Đang đếm ngược 5 giây trước khi mở chuông lại...';
      } else {
        if (countTitle) countTitle.textContent = 'CHÚ Ý LÊN MÀN HÌNH';
        if (countDesc) countDesc.textContent = 'Câu hỏi chuẩn bị xuất hiện...';
      }
      break;

    case 'QUESTION':
      showView('question');
      document.getElementById('buzzBanner').classList.add('hidden');
      renderQuestion(state);
      update30sTimer(state.questionTimeRemaining);
      break;

    case 'QUESTION_TIMEOUT':
      showView('question');
      document.getElementById('buzzBanner').classList.add('hidden');
      renderQuestion(state);
      renderTimeoutReveal(state);
      break;

    case 'BUZZED':
      showView('question');
      renderQuestion(state);
      renderBuzzBanner(state.buzzerWinner);
      break;

    case 'CHEST_SELECTION':
    case 'CHEST_FINISHED':
      showView('chests');
      renderChests(state);
      break;

    case 'ACTION_PENALTY':
      showView('actionPenalty');
      renderActionPenalty(state.activePenalty);
      break;

    case 'WHEEL_SPIN':
      showView('wheel');
      renderWheelSpin(state.activeWheel);
      break;

    case 'SPEED_MATH':
      showView('speedMath');
      renderSpeedMath(state.speedMath);
      break;

    case 'TEAM_NAME_CHALLENGE':
      showView('teamNameChallenge');
      renderTeamNameChallenge(state.teamNameChallenge);
      break;

    case 'POST_GAME':
      showView('postGame');
      renderPostGame(state);
      break;
  }
}

function getStatusText(status) {
  const map = {
    'LOBBY': 'SẢNH CHỜ',
    'TUTORIAL': 'HƯỚNG DẪN',
    'COUNTDOWN': 'ĐẾM NGƯỢC',
    'QUESTION': 'CÂU HỎI ĐANG MỞ (30S)',
    'QUESTION_TIMEOUT': 'HẾT GIỜ (CÔNG BỐ ĐÁP ÁN)',
    'BUZZED': 'ĐÃ CÓ NGƯỜI BẤM',
    'CHEST_SELECTION': 'MỞ RƯƠNG',
    'CHEST_FINISHED': 'ĐÃ MỞ RƯƠNG',
    'ACTION_PENALTY': 'HÌNH PHẠT HÀNH ĐỘNG',
    'WHEEL_SPIN': 'VÒNG QUAY MAY MẮN',
    'SPEED_MATH': 'THỬ THÁCH THẦN TÍNH',
    'TEAM_NAME_CHALLENGE': 'BẮN TÊN ĐỒNG ĐỘI (+3Đ)',
    'POST_GAME': 'TỔNG KẾT & SHOP'
  };
  return map[status] || status;
}

// 1. Lobby Render
function renderLobby(state) {
  if (state.qrCodeUrl) {
    document.getElementById('hostQrCode').src = state.qrCodeUrl;
  }
  if (state.playUrl) {
    const playLink = document.getElementById('hostPlayUrl');
    playLink.href = state.playUrl;
    playLink.textContent = state.playUrl;
  }
  document.getElementById('lobbyPlayerCount').textContent = state.playerCount;

  const playersList = document.getElementById('lobbyPlayersList');
  playersList.innerHTML = '';
  state.players.forEach(p => {
    const pill = document.createElement('div');
    pill.className = 'px-3 py-1 rounded-full bg-white text-xs font-semibold text-slate-700 border border-slate-200 flex items-center gap-1.5 shadow-sm';
    pill.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-500"></span>${p.name} <span class="text-indigo-600 text-[10px] font-bold">(T${p.teamId})</span>`;
    playersList.appendChild(pill);
  });
}

// 2. Question Render
function renderQuestion(state) {
  const q = state.currentQuestion;
  if (!q) return;

  document.getElementById('questionCounter').textContent = `CÂU HỎI ${state.currentQuestionIndex + 1} / ${state.totalQuestions}`;
  document.getElementById('questionText').textContent = q.question;

  q.options.forEach((opt, idx) => {
    const el = document.getElementById(`optText${idx}`);
    if (el) el.textContent = opt;

    const card = document.getElementById(`optCard${idx}`);
    if (card) {
      card.classList.remove('ring-4', 'ring-emerald-400', 'scale-105');
      if (!state.isRound2) {
        card.classList.remove('ring-rose-500');
      }
      if (q.answer !== null && q.answer === idx) {
        card.classList.add('ring-4', 'ring-emerald-400', 'scale-105');
      }
    }
  });

  const roundBadge = document.getElementById('questionRoundBadge');
  if (roundBadge) {
    if (state.isRound2) {
      roundBadge.classList.remove('hidden');
    } else {
      roundBadge.classList.add('hidden');
    }
  }
}

// Timeout reveal
function renderTimeoutReveal(state) {
  window.gameSound.playWrong();
  const q = state.currentQuestion;
  if (q && q.answer !== null) {
    const card = document.getElementById(`optCard${q.answer}`);
    if (card) card.classList.add('ring-4', 'ring-emerald-400', 'scale-105');
  }
}

// 3. Buzzer Banner Render with 3-Second Suspense Delay
let lastRevealedState = false;

function renderBuzzBanner(winner) {
  const banner = document.getElementById('buzzBanner');
  if (!winner) {
    if (banner) banner.classList.add('hidden');
    lastRevealedState = false;
    return;
  }
  banner.classList.remove('hidden');

  document.getElementById('buzzPlayerName').textContent = winner.playerName;
  document.getElementById('buzzTeamName').textContent = winner.teamName;

  const letters = ['A', 'B', 'C', 'D'];
  document.getElementById('buzzChoiceText').textContent = `[${letters[winner.selectedOption]}]: ${winner.optionText}`;

  const badge = document.getElementById('buzzVerdictBadge');

  // GIAI ĐOẠN 1: 3 GIÂY ĐẦU (HỒI HỘP, CHƯA CÔNG BỐ ĐÚNG/SAI)
  if (!winner.verdictRevealed) {
    badge.textContent = '⏳ ĐANG KIỂM TRA ĐÁP ÁN...';
    badge.className = 'px-4 py-2 rounded-xl text-sm font-black bungee-font bg-amber-100 text-amber-800 border-2 border-amber-400 animate-pulse';
    lastRevealedState = false;
  } 
  // GIAI ĐOẠN 2: SAU 3 GIÂY (CHÍNH THỨC CÔNG BỐ ĐÚNG HOẶC SAI)
  else {
    if (!lastRevealedState) {
      // Chỉ kích hoạt âm thanh & hiệu ứng 1 lần khi vừa lật mở kết quả
      lastRevealedState = true;
      if (winner.isCorrect) {
        badge.textContent = '✅ CHÍNH XÁC! (+5Đ NHÓM)';
        badge.className = 'px-4 py-2 rounded-xl text-sm font-black bungee-font bg-emerald-100 text-emerald-800 border-2 border-emerald-400 animate-bounce';
        window.gameSound.playCorrect();
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      } else {
        badge.textContent = '❌ SAI RỒI! (MỞ RƯƠNG XUI)';
        badge.className = 'px-4 py-2 rounded-xl text-sm font-black bungee-font bg-rose-100 text-rose-800 border-2 border-rose-400 animate-bounce';
        window.gameSound.playWrong();
        // Chỉ viền đỏ thẻ đáp án SAI mà thí sinh vừa chọn, GIỮ KÍN ĐÁP ÁN ĐÚNG!
        const wrongCard = document.getElementById(`optCard${winner.selectedOption}`);
        if (wrongCard) wrongCard.classList.add('ring-4', 'ring-rose-500');
      }
    }
  }
}

// 4. Chests Render (Host Controls Next/Reopen)
function renderChests(state) {
  const grid = document.getElementById('chestsGrid');
  grid.innerHTML = '';

  const isLucky = (state.chestType === 'LUCKY');
  const badge = document.getElementById('chestTitleBadge');
  const mainTitle = document.getElementById('chestMainTitle');
  const picker = document.getElementById('chestPickerName');

  if (isLucky) {
    badge.textContent = 'RƯƠNG MAY MẮN';
    badge.className = 'inline-block px-4 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300';
    mainTitle.textContent = 'CHỌN 1 TRONG 20 RƯƠNG MAY MẮN!';
  } else {
    badge.textContent = 'RƯƠNG XUI XẺO';
    badge.className = 'inline-block px-4 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300';
    mainTitle.textContent = 'CHỌN 1 TRONG 20 RƯƠNG XUI XẺO!';
  }

  picker.textContent = state.buzzerWinner ? `${state.buzzerWinner.playerName} (${state.buzzerWinner.teamName})` : '';

  state.activeChests.forEach((c) => {
    const card = document.createElement('div');
    const frontClass = isLucky ? 'lucky-front' : 'unlucky-front';
    card.className = `chest-card h-28 ${c.opened ? 'flipped' : 'anim-shake'}`;
    card.innerHTML = `
      <div class="chest-inner">
        <div class="chest-front ${frontClass}">
          <span class="text-2xl">${isLucky ? '🎁' : '💀'}</span>
          <span class="text-xs font-black ${isLucky ? 'text-amber-700' : 'text-rose-700'} mt-1">#${c.id}</span>
        </div>
        <div class="chest-back">
          <span class="text-2xl">${c.reward ? c.reward.icon : '✨'}</span>
          <span class="text-[10px] font-bold text-slate-800 line-clamp-2 mt-1 leading-tight">${c.reward ? c.reward.title : ''}</span>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });

  const openedChest = state.activeChests.find(c => c.opened);
  const resultCard = document.getElementById('chestResultCard');
  if (openedChest && openedChest.reward) {
    resultCard.classList.remove('hidden');
    document.getElementById('chestResultIcon').textContent = openedChest.reward.icon;
    document.getElementById('chestResultTitle').textContent = openedChest.reward.title;
    document.getElementById('chestResultDesc').textContent = openedChest.reward.desc;

    // DRAMATIC EFFECT FOR SUPER UNLUCKY CHEST
    if (openedChest.reward.isSuperUnlucky) {
      resultCard.className = 'glass-panel max-w-lg mx-auto p-6 rounded-3xl border-4 border-rose-600 bg-rose-50 text-center space-y-4 shadow-2xl animate-bounce';
      document.getElementById('chestResultTitle').className = 'text-3xl font-black text-rose-700 bungee-font';
      window.gameSound.playThanosSnap();
    } else {
      resultCard.className = 'glass-panel max-w-lg mx-auto p-6 rounded-3xl border-2 border-indigo-400 text-center space-y-4 shadow-xl animate-fade-in bg-white';
      document.getElementById('chestResultTitle').className = 'text-2xl font-black text-indigo-600';
      window.gameSound.playChestOpen();
      if (isLucky) confetti({ particleCount: 70, spread: 60 });
    }
  } else {
    resultCard.classList.add('hidden');
  }
}

// 5. Action Penalty Render with YouTube / TikTok Embed & 3-2-1 Countdown
let actionPenaltyTimer = null;
let currentActionPenaltyKey = null;

function startActionPenaltyCountdown(penalty, mediaId) {
  const waitingBox = document.getElementById('penaltyWaitingBox');
  const countdownBox = document.getElementById('penaltyCountdownBox');
  const countdownNum = document.getElementById('penaltyCountdownNum');
  const videoContainer = document.getElementById('penaltyVideoContainer');
  const frame = document.getElementById('penaltyYoutubeFrame');
  const tiktokLink = document.getElementById('tiktokLinkContainer');

  if (waitingBox) waitingBox.classList.add('hidden');
  if (videoContainer) videoContainer.classList.add('hidden');
  if (tiktokLink) tiktokLink.classList.add('hidden');
  if (countdownBox) countdownBox.classList.remove('hidden');

  let count = 3;
  if (countdownNum) countdownNum.textContent = '3';
  window.gameSound.playTick();

  if (actionPenaltyTimer) clearInterval(actionPenaltyTimer);
  actionPenaltyTimer = setInterval(() => {
    count--;
    if (count > 0) {
      if (countdownNum) {
        countdownNum.textContent = count;
        countdownNum.classList.remove('animate-pulse');
        void countdownNum.offsetWidth;
        countdownNum.classList.add('animate-pulse');
      }
      window.gameSound.playTick();
    } else {
      clearInterval(actionPenaltyTimer);
      actionPenaltyTimer = null;

      if (countdownBox) countdownBox.classList.add('hidden');
      if (videoContainer) videoContainer.classList.remove('hidden');

      if (penalty.mediaType === 'tiktok' && mediaId) {
        if (tiktokLink) tiktokLink.classList.remove('hidden');
        const tiktokEmbedUrl = `https://www.tiktok.com/embed/v2/${mediaId}`;
        if (!frame.src.includes(mediaId)) {
          frame.src = tiktokEmbedUrl;
        }
      } else if (mediaId) {
        if (tiktokLink) tiktokLink.classList.add('hidden');
        const embedUrl = `https://www.youtube-nocookie.com/embed/${mediaId}?autoplay=1&enablejsapi=1`;
        if (!frame.src.includes(mediaId)) {
          frame.src = embedUrl;
        }
      }
      window.gameSound.playFanfare();
    }
  }, 1000);
}

function renderActionPenalty(penalty) {
  if (!penalty) return;
  document.getElementById('penaltyIcon').textContent = penalty.icon || '💃';
  document.getElementById('penaltyTitle').textContent = penalty.title;
  document.getElementById('penaltyDesc').textContent = `${penalty.playerName} (${penalty.teamName}) - ${penalty.desc}`;

  const waitingBox = document.getElementById('penaltyWaitingBox');
  const countdownBox = document.getElementById('penaltyCountdownBox');
  const videoContainer = document.getElementById('penaltyVideoContainer');
  const frame = document.getElementById('penaltyYoutubeFrame');
  const tiktokLink = document.getElementById('tiktokLinkContainer');
  const judgeSuccessText = document.getElementById('judgeSuccessText');
  const waitingText = document.getElementById('penaltyWaitingText');

  if (waitingText) {
    waitingText.textContent = `Đang đợi ${penalty.playerName} (${penalty.teamName}) nhấn "TÔI SẼ BIỂU DIỄN" trên điện thoại...`;
  }

  if (judgeSuccessText) {
    if (penalty.isGroup) {
      judgeSuccessText.textContent = 'CẢ NHÓM ĐÃ HOÀN THÀNH (+4Đ TẤT CẢ)';
    } else if (['ACTION_CATWALK', 'ACTION_DANCE', 'ACTION_DANCE_2', 'ACTION_RAP'].includes(penalty.type)) {
      judgeSuccessText.textContent = 'ĐÃ HOÀN THÀNH (+2Đ CÁ NHÂN)';
    } else {
      judgeSuccessText.textContent = 'ĐÃ HOÀN THÀNH (THOÁT PHẠT)';
    }
  }

  const mediaId = penalty.mediaId || (penalty.youtubeIds && penalty.youtubeIds[0]);
  const penaltyKey = `${penalty.playerId}_${penalty.type}_${mediaId}`;

  if (currentActionPenaltyKey !== penaltyKey) {
    currentActionPenaltyKey = penaltyKey;
    if (actionPenaltyTimer) {
      clearInterval(actionPenaltyTimer);
      actionPenaltyTimer = null;
    }
  }

  // Not confirmed yet: show waiting screen, hide video & countdown
  if (!penalty.isPerforming) {
    if (actionPenaltyTimer) {
      clearInterval(actionPenaltyTimer);
      actionPenaltyTimer = null;
    }
    if (waitingBox) waitingBox.classList.remove('hidden');
    if (countdownBox) countdownBox.classList.add('hidden');
    if (videoContainer) videoContainer.classList.add('hidden');
    if (tiktokLink) tiktokLink.classList.add('hidden');
    if (frame) frame.src = '';
    return;
  }

  // If already confirmed:
  if (waitingBox) waitingBox.classList.add('hidden');

  // If video is already showing and loaded, don't restart countdown
  if (videoContainer && !videoContainer.classList.contains('hidden') && frame && frame.src) {
    return;
  }

  // If countdown is already ticking, let it continue
  if (actionPenaltyTimer) {
    return;
  }

  // Start 3-2-1 countdown then show video!
  startActionPenaltyCountdown(penalty, mediaId);
}

// Start action countdown event from server
socket.on('game:start_action_countdown', () => {
  if (currentGameState && currentGameState.activePenalty) {
    const penalty = currentGameState.activePenalty;
    const mediaId = penalty.mediaId || (penalty.youtubeIds && penalty.youtubeIds[0]);
    startActionPenaltyCountdown(penalty, mediaId);
  }
});

// Replay video event
socket.on('game:replay_video', () => {
  const frame = document.getElementById('penaltyYoutubeFrame');
  if (frame && frame.src) {
    const current = frame.src;
    frame.src = '';
    setTimeout(() => { frame.src = current; }, 200);
  }
});

// HOST 3-BUTTON ACTION JUDGMENT LISTENERS
const btnJudgeSuccess = document.getElementById('btnJudgeSuccess');
if (btnJudgeSuccess) {
  btnJudgeSuccess.addEventListener('click', () => {
    socket.emit('host:judge_action', { result: 'SUCCESS' });
  });
}

const btnJudgeRetry = document.getElementById('btnJudgeRetry');
if (btnJudgeRetry) {
  btnJudgeRetry.addEventListener('click', () => {
    socket.emit('host:judge_action', { result: 'RETRY' });
  });
}

const btnJudgePunish = document.getElementById('btnJudgePunish');
if (btnJudgePunish) {
  btnJudgePunish.addEventListener('click', () => {
    socket.emit('host:judge_action', { result: 'PUNISH' });
  });
}

// 6. Wheel Spin Render
let wheelAnimFrame = null;
let currentWheelData = null;

function drawHostWheel(wheel, angle) {
  if (!wheel || !wheel.segments) return;
  const canvas = document.getElementById('wheelCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const segments = wheel.segments;
  const numSegs = segments.length;
  const arc = (2 * Math.PI) / numSegs;
  const colors = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = centerX - 10;

  for (let i = 0; i < numSegs; i++) {
    const segAngle = angle + i * arc;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, segAngle, segAngle + arc);
    ctx.closePath();
    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffffff88';
    ctx.stroke();

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(segAngle + arc / 2);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Montserrat';
    ctx.shadowColor = 'black';
    ctx.shadowBlur = 3;
    ctx.fillText(segments[i].label, radius - 20, 5);
    ctx.restore();
  }

  ctx.beginPath();
  ctx.arc(centerX, centerY, 24, 0, 2 * Math.PI);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#f59e0b';
  ctx.stroke();
}

function renderWheelSpin(wheel) {
  if (!wheel) return;
  currentWheelData = wheel;
  document.getElementById('wheelTitle').textContent = wheel.title;
  document.getElementById('wheelResultBox').classList.add('hidden');
  cancelAnimationFrame(wheelAnimFrame);
  drawHostWheel(wheel, 0);
}

// Host Manual Spin Button
const btnHostSpin = document.getElementById('btnHostSpinWheel');
if (btnHostSpin) {
  btnHostSpin.addEventListener('click', () => {
    socket.emit('host:spin_wheel');
  });
}

// Synchronized Wheel Start Spin Event
socket.on('game:wheel_start_spin', (data) => {
  if (!currentWheelData || !currentWheelData.segments) return;
  const segments = currentWheelData.segments;
  const numSegs = segments.length;
  const arc = (2 * Math.PI) / numSegs;
  const targetSeg = data.spinResultIndex !== undefined ? data.spinResultIndex : 0;
  const fullRotations = 6 * 2 * Math.PI;
  const targetAngle = fullRotations + (1.5 * Math.PI) - (targetSeg * arc + arc / 2);

  let currentAngle = 0;
  const duration = data.duration || 5000;
  const startTime = performance.now();
  let lastTickAngle = 0;

  function animate(time) {
    const elapsed = time - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    currentAngle = ease * targetAngle;

    if (Math.abs(currentAngle - lastTickAngle) > arc) {
      window.gameSound.playWheelClick();
      lastTickAngle = currentAngle;
    }

    drawHostWheel(currentWheelData, currentAngle);

    if (progress < 1) {
      wheelAnimFrame = requestAnimationFrame(animate);
    } else {
      window.gameSound.playFanfare();
      confetti({ particleCount: 80, spread: 70 });
      const resultBox = document.getElementById('wheelResultBox');
      resultBox.classList.remove('hidden');
      document.getElementById('wheelResultText').textContent = segments[targetSeg].label;
      setTimeout(() => {
        socket.emit('host:wheel_finished');
      }, 3000);
    }
  }

  cancelAnimationFrame(wheelAnimFrame);
  wheelAnimFrame = requestAnimationFrame(animate);
});

// 7. Speed Math Render (4 GIÂY ĐẾM NGƯỢC)
let mathTimer = null;
function renderSpeedMath(math) {
  if (!math) return;

  document.getElementById('mathFormula').textContent = `${math.num1} + ${math.num2} = ?`;
  document.getElementById('mathCountdownSection').classList.remove('hidden');
  document.getElementById('mathRevealSection').classList.add('hidden');
  document.getElementById('mathHostButtons').classList.add('hidden');

  let remaining = 4.0;
  const timerText = document.getElementById('mathTimerText');
  timerText.textContent = '4.0s';
  clearInterval(mathTimer);

  window.gameSound.playTick();
  mathTimer = setInterval(() => {
    remaining -= 0.1;
    if (remaining > 0) {
      timerText.textContent = remaining.toFixed(1) + 's';
      if (Math.floor(remaining * 10) % 10 === 0) {
        window.gameSound.playTick();
      }
    } else {
      clearInterval(mathTimer);
      timerText.textContent = '0.0s';
      document.getElementById('mathCountdownSection').classList.add('hidden');
      const revealSec = document.getElementById('mathRevealSection');
      revealSec.classList.remove('hidden');
      const waitMsg = document.getElementById('mathWaitingMsg');
      const finalAns = document.getElementById('mathFinalAnswer');
      waitMsg.classList.remove('hidden');
      finalAns.classList.add('hidden');

      setTimeout(() => {
        waitMsg.classList.add('hidden');
        finalAns.textContent = math.answer;
        finalAns.classList.remove('hidden');
        document.getElementById('mathHostButtons').classList.remove('hidden');
        window.gameSound.playBuzz();
      }, 3000);
    }
  }, 100);
}

document.getElementById('btnMathHostCorrect').addEventListener('click', () => {
  socket.emit('host:speed_math_result', { isCorrect: true });
});
document.getElementById('btnMathHostWrong').addEventListener('click', () => {
  socket.emit('host:speed_math_result', { isCorrect: false });
});

// 7B. Team Name Challenge Render (BẮN TÊN ĐỒNG ĐỘI - 10 GIÂY)
let teamNameTimer = null;
function renderTeamNameChallenge(challenge) {
  if (!challenge) return;
  document.getElementById('teamNamePickerName').textContent = challenge.playerName;
  document.getElementById('teamNameTeamName').textContent = challenge.teamName;

  const listEl = document.getElementById('teamMemberList');
  const countEl = document.getElementById('teamMemberCount');
  listEl.innerHTML = '';
  countEl.textContent = `${challenge.members.length} bạn`;

  challenge.members.forEach((name, i) => {
    const li = document.createElement('li');
    li.className = 'flex items-center gap-2.5 p-2 rounded-xl bg-white border border-slate-200 shadow-sm text-sm font-bold text-slate-800';
    li.innerHTML = `
      <span class="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs flex items-center justify-center font-black">${i + 1}</span>
      <span class="text-slate-900">${name}</span>
    `;
    listEl.appendChild(li);
  });

  // 2 Phases: 5s Preparation -> 10s Challenge
  let prepRemaining = 5.0;
  let remaining = 10.0;
  let isPrep = true;

  const timerText = document.getElementById('teamNameTimerText');
  const timerLabel = document.getElementById('teamNameTimerLabel');
  const timerBox = document.getElementById('teamNameTimerBox');

  if (timerBox) timerBox.className = 'p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-center space-y-1 transition-all';
  if (timerText) {
    timerText.className = 'text-5xl font-black bungee-font text-amber-500 animate-pulse';
    timerText.textContent = '5s';
  }
  if (timerLabel) {
    timerLabel.className = 'text-xs font-bold uppercase text-amber-700';
    timerLabel.textContent = '⏳ 5 GIÂY CHUẨN BỊ SẴN SÀNG (NGƯỜI ĐIỀU HÀNH PHỔ BIẾN CƠ CHẾ)...';
  }

  clearInterval(teamNameTimer);
  window.gameSound.playTick();

  teamNameTimer = setInterval(() => {
    if (isPrep) {
      prepRemaining -= 0.1;
      if (prepRemaining > 0) {
        if (timerText) timerText.textContent = Math.ceil(prepRemaining) + 's';
        if (Math.floor(prepRemaining * 10) % 10 === 0) {
          window.gameSound.playTick();
        }
      } else {
        // Switch to Phase 2: 10s Countdown
        isPrep = false;
        window.gameSound.playBuzz();
        if (timerBox) timerBox.className = 'p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 text-center space-y-1 transition-all';
        if (timerText) {
          timerText.className = 'text-5xl font-black bungee-font text-rose-600 animate-pulse';
          timerText.textContent = '10.0s';
        }
        if (timerLabel) {
          timerLabel.className = 'text-xs font-bold uppercase text-rose-700';
          timerLabel.textContent = '🔥 BẮT ĐẦU! HÃY ĐỌC HẾT TÊN THÀNH VIÊN TRƯỚC KHI HẾT 10 GIÂY!';
        }
      }
    } else {
      remaining -= 0.1;
      if (remaining > 0) {
        if (timerText) timerText.textContent = remaining.toFixed(1) + 's';
        if (Math.floor(remaining * 10) % 10 === 0) {
          window.gameSound.playTick();
        }
      } else {
        clearInterval(teamNameTimer);
        if (timerText) timerText.textContent = '0.0s';
        window.gameSound.playWrong();
      }
    }
  }, 100);
}

document.getElementById('btnTeamNameCorrect').addEventListener('click', () => {
  clearInterval(teamNameTimer);
  socket.emit('host:team_name_result', { isCorrect: true });
});
document.getElementById('btnTeamNameWrong').addEventListener('click', () => {
  clearInterval(teamNameTimer);
  socket.emit('host:team_name_result', { isCorrect: false });
});

// 8. Sidebar 7 Teams Render
function renderSidebarTeams(teams, lockedTeamIds) {
  const container = document.getElementById('sidebarTeamsList');
  container.innerHTML = '';

  const sorted = [...teams].sort((a, b) => b.score - a.score);

  sorted.forEach((team, idx) => {
    const isLocked = lockedTeamIds && lockedTeamIds.includes(team.id);
    const card = document.createElement('div');
    card.className = `p-2.5 rounded-xl border flex items-center justify-between transition ${
      isLocked 
        ? 'bg-rose-50 border-rose-200 opacity-60' 
        : 'bg-white border-slate-200 shadow-sm hover:border-indigo-300'
    }`;

    let medal = `<span class="w-5 h-5 rounded-full bg-slate-100 text-[10px] font-bold flex items-center justify-center text-slate-700">${idx + 1}</span>`;
    if (idx === 0) medal = `<span class="w-5 h-5 rounded-full bg-amber-400 text-[10px] font-black flex items-center justify-center text-slate-900 shadow-sm">🥇</span>`;
    if (idx === 1) medal = `<span class="w-5 h-5 rounded-full bg-slate-200 text-[10px] font-black flex items-center justify-center text-slate-800 shadow-sm">🥈</span>`;
    if (idx === 2) medal = `<span class="w-5 h-5 rounded-full bg-amber-700 text-[10px] font-black flex items-center justify-center text-amber-100 shadow-sm">🥉</span>`;

    let badges = '';
    if (team.buffs.frozen > 0 || team.buffs.silenced) badges += `<span title="Bị khóa chuông / đóng băng" class="text-xs">🤐</span>`;
    if (team.buffs.delay3s > 0) badges += `<span title="Lời nguyền delay 3 giây" class="text-xs">🐢</span>`;
    if (team.buffs.riskReward) badges += `<span title="Liều ăn nhiều (chỉ chọn A hoặc D)" class="text-xs">🎲</span>`;
    if (team.buffs.nitroX3) badges += `<span title="Bốc đầu Nitro x3 (Đúng x3, Sai -8đ)" class="text-xs animate-bounce">🚀</span>`;
    if (team.buffs.failInsurance) badges += `<span title="Bảo hiểm thất bại (+3đ an ủi nếu sai)" class="text-xs">📜</span>`;
    if (team.buffs.vampireTurns > 0) badges += `<span title="Ký sinh trùng hút máu (${team.buffs.vampireTurns} câu)" class="text-xs">🧛</span>`;
    if (team.buffs.confusion > 0) badges += `<span title="Lời nguyền mù màu / xáo trộn phím" class="text-xs">🌀</span>`;
    if (team.buffs.stuckBuzzer > 0) badges += `<span title="Chuông kẹt nút (bấm 5 lần)" class="text-xs">🐢</span>`;
    if (team.buffs.nationalDebt) badges += `<span title="Nợ công quốc gia" class="text-xs">🏦</span>`;
    if (team.buffs.x2 > 0) badges += `<span title="X2 điểm ở câu sau" class="text-xs">⚡</span>`;
    if (team.buffs.shield) badges += `<span title="Có khiên bảo hộ" class="text-xs">🛡️</span>`;
    if (team.inventory && team.inventory.some(i => i.code === 'ITEM_REFLECT')) badges += `<span title="Sở hữu Gậy Ông Đập Lưng Ông (Phản đòn)" class="text-xs">🪞</span>`;

    card.innerHTML = `
      <div class="flex items-center gap-2">
        ${medal}
        <div>
          <h4 class="text-xs font-bold text-slate-800 flex items-center gap-1">
            ${team.name} ${badges}
          </h4>
          <span class="text-[10px] text-slate-400 font-medium">${team.inventory.length} vật phẩm</span>
        </div>
      </div>
      <div class="text-right">
        <span class="text-sm font-black text-indigo-600 bungee-font">${team.score}đ</span>
      </div>
    `;
    container.appendChild(card);
  });
}

// 9. Post Game Render
function renderPostGame(state) {
  // 1. Team Leaderboard & Podium
  const sortedTeams = [...state.teams].sort((a, b) => b.score - a.score);
  
  if (sortedTeams[0]) {
    document.getElementById('rank1TeamName').textContent = sortedTeams[0].name;
    document.getElementById('rank1TeamScore').textContent = `${sortedTeams[0].score} điểm`;
  }
  if (sortedTeams[1]) {
    document.getElementById('rank2TeamName').textContent = sortedTeams[1].name;
    document.getElementById('rank2TeamScore').textContent = `${sortedTeams[1].score} điểm`;
  }
  if (sortedTeams[2]) {
    document.getElementById('rank3TeamName').textContent = sortedTeams[2].name;
    document.getElementById('rank3TeamScore').textContent = `${sortedTeams[2].score} điểm`;
  }

  // 2. Individual MVP Podium & Rankings
  const sortedPlayers = [...state.players].sort((a, b) => b.score - a.score);
  
  if (sortedPlayers[0]) {
    const elName = document.getElementById('rank1IndivName');
    const elTeam = document.getElementById('rank1IndivTeam');
    const elScore = document.getElementById('rank1IndivScore');
    if (elName) elName.textContent = sortedPlayers[0].name;
    if (elTeam) elTeam.textContent = `Nhóm ${sortedPlayers[0].teamId}`;
    if (elScore) elScore.textContent = `${sortedPlayers[0].score} điểm`;
  }
  if (sortedPlayers[1]) {
    const elName = document.getElementById('rank2IndivName');
    const elTeam = document.getElementById('rank2IndivTeam');
    const elScore = document.getElementById('rank2IndivScore');
    if (elName) elName.textContent = sortedPlayers[1].name;
    if (elTeam) elTeam.textContent = `Nhóm ${sortedPlayers[1].teamId}`;
    if (elScore) elScore.textContent = `${sortedPlayers[1].score} điểm`;
  }
  if (sortedPlayers[2]) {
    const elName = document.getElementById('rank3IndivName');
    const elTeam = document.getElementById('rank3IndivTeam');
    const elScore = document.getElementById('rank3IndivScore');
    if (elName) elName.textContent = sortedPlayers[2].name;
    if (elTeam) elTeam.textContent = `Nhóm ${sortedPlayers[2].teamId}`;
    if (elScore) elScore.textContent = `${sortedPlayers[2].score} điểm`;
  }

  // Full Individual Rankings List
  const indList = document.getElementById('topIndividualsList');
  if (indList) {
    indList.innerHTML = '';
    sortedPlayers.forEach((p, i) => {
      let badgeColor = 'bg-slate-100 text-slate-700';
      let icon = `#${i + 1}`;
      if (i === 0) { badgeColor = 'bg-amber-400 text-slate-900'; icon = '👑 #1'; }
      else if (i === 1) { badgeColor = 'bg-slate-300 text-slate-900'; icon = '🥈 #2'; }
      else if (i === 2) { badgeColor = 'bg-amber-700 text-amber-100'; icon = '🥉 #3'; }

      const row = document.createElement('div');
      row.className = 'flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold';
      row.innerHTML = `
        <div class="flex items-center gap-2.5">
          <span class="px-2 py-0.5 rounded-full ${badgeColor} text-[11px] font-black">${icon}</span>
          <span class="text-slate-800 text-sm font-bold">${p.name} <span class="text-indigo-600 font-semibold text-xs">(Nhóm ${p.teamId})</span></span>
        </div>
        <span class="text-indigo-600 font-black text-sm">${p.score} Điểm</span>
      `;
      indList.appendChild(row);
    });
  }

  // 3. Shop Rewards Grid (Spotlight + Real & Bá Khí + Space Luxury)
  renderPostGameShop(state);

  confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } });
}

// Post Game 3-Tab Switching on Host
const tabBtnLeaderboard = document.getElementById('tabBtnLeaderboard');
const tabBtnIndiv = document.getElementById('tabBtnIndiv');
const tabBtnShop = document.getElementById('tabBtnShop');

const tabContentLeaderboard = document.getElementById('tabContentLeaderboard');
const tabContentIndiv = document.getElementById('tabContentIndiv');
const tabContentShop = document.getElementById('tabContentShop');

function switchHostPostGameTab(activeTab) {
  const activeClass = 'py-3 px-6 rounded-2xl font-black text-xs md:text-sm bungee-font transition bg-amber-500 text-white shadow-md flex items-center gap-2';
  const inactiveClass = 'py-3 px-6 rounded-2xl font-black text-xs md:text-sm bungee-font transition bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center gap-2';

  if (tabContentLeaderboard) tabContentLeaderboard.classList.add('hidden');
  if (tabContentIndiv) tabContentIndiv.classList.add('hidden');
  if (tabContentShop) tabContentShop.classList.add('hidden');

  if (tabBtnLeaderboard) tabBtnLeaderboard.className = inactiveClass;
  if (tabBtnIndiv) tabBtnIndiv.className = inactiveClass;
  if (tabBtnShop) tabBtnShop.className = inactiveClass;

  if (activeTab === 'leaderboard') {
    if (tabContentLeaderboard) tabContentLeaderboard.classList.remove('hidden');
    if (tabBtnLeaderboard) tabBtnLeaderboard.className = activeClass;
  } else if (activeTab === 'indiv') {
    if (tabContentIndiv) tabContentIndiv.classList.remove('hidden');
    if (tabBtnIndiv) tabBtnIndiv.className = activeClass;
  } else if (activeTab === 'shop') {
    if (tabContentShop) tabContentShop.classList.remove('hidden');
    if (tabBtnShop) tabBtnShop.className = activeClass;
  }
}

if (tabBtnLeaderboard) {
  tabBtnLeaderboard.addEventListener('click', () => switchHostPostGameTab('leaderboard'));
}
if (tabBtnIndiv) {
  tabBtnIndiv.addEventListener('click', () => switchHostPostGameTab('indiv'));
}
if (tabBtnShop) {
  tabBtnShop.addEventListener('click', () => switchHostPostGameTab('shop'));
}

// ==================== PREMIUM SHOP PRODUCT CARDS & HOST MODAL ====================
let cachedShopRewards = null;

async function fetchShopRewardsFallback() {
  if (cachedShopRewards && cachedShopRewards.length > 0) return cachedShopRewards;
  try {
    const res = await fetch('/api/rewards');
    if (res.ok) {
      cachedShopRewards = await res.json();
      return cachedShopRewards;
    }
  } catch (e) {
    console.warn('Could not fetch /api/rewards:', e);
  }
  return [];
}

// Pre-fetch shop rewards on load
fetchShopRewardsFallback();

function getShopProductConfig(r) {
  const nameLower = (r.name || '').toLowerCase();
  
  // 1. Máy bay (Spotlight)
  if (r.id === 100 || r.isSpotlight || nameLower.includes('máy bay') || nameLower.includes('boeing')) {
    return {
      badge: '⭐ SPOTLIGHT TRIỆU ĐÔ',
      badgeClass: 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-slate-950 font-black shadow-lg shadow-amber-400/30',
      borderClass: 'border-amber-400 hover:border-yellow-300 shadow-amber-200/50',
      headerBg: 'from-sky-950 via-slate-900 to-indigo-950 text-white',
      priceColor: 'text-amber-400',
      priceDisplay: r.priceFormatted || '23.000.000.000đ',
      pointsText: r.pointsFormatted || '23.000.000 Điểm',
      unit: 'chiếc',
      tagline: 'Boeing 787-9 Dreamliner bao trọn bầu trời!',
      isSpotlight: true
    };
  }

  // 2. Bá Khí
  if (r.id === 101 || r.isBaKhi || nameLower.includes('bá khí')) {
    return {
      badge: '❄️ BÁ KHÍ VÔ ĐỊCH',
      badgeClass: 'bg-gradient-to-r from-cyan-400 to-blue-600 text-white shadow-cyan-400/40',
      borderClass: 'border-cyan-300 hover:border-cyan-400 shadow-cyan-100/60 bakhi-frost-glow',
      headerBg: 'from-cyan-100/80 via-blue-50/60 to-white',
      priceColor: 'text-cyan-700',
      priceDisplay: r.priceFormatted || '50.000đ',
      pointsText: r.pointsFormatted || '50 Điểm',
      unit: 'lần',
      tagline: 'Kèm 1 tràng pháo tay tán thưởng cả lớp!',
      isBaKhi: true
    };
  }

  // 3. Swing
  if (nameLower.includes('swing')) {
    return {
      badge: '👑 CỰC PHẨM CHIẾN THẦN',
      badgeClass: 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white shadow-amber-500/30',
      borderClass: 'border-amber-300 hover:border-amber-500 shadow-amber-100',
      headerBg: 'from-amber-100/70 via-orange-50/50 to-white',
      priceColor: 'text-amber-600',
      priceDisplay: r.priceFormatted || '60.000đ',
      pointsText: r.pointsFormatted || '60 Điểm',
      unit: 'gói',
      tagline: 'Khoai tây chiên bít tết New York giòn rụm'
    };
  }

  // 4. Sting
  if (nameLower.includes('sting')) {
    return {
      badge: '⭐ ĐỘC BẢN 1 LON',
      badgeClass: 'bg-gradient-to-r from-rose-500 via-red-600 to-pink-600 text-white shadow-rose-500/30',
      borderClass: 'border-rose-300 hover:border-rose-500 shadow-rose-100',
      headerBg: 'from-rose-100/70 via-red-50/50 to-white',
      priceColor: 'text-rose-600',
      priceDisplay: r.priceFormatted || '50.000đ',
      pointsText: r.pointsFormatted || '50 Điểm',
      unit: 'lon',
      tagline: 'Năng lượng dâu tây mát lạnh giải khát đỉnh cao'
    };
  }

  // 5. Hảo Hảo
  if (nameLower.includes('hảo')) {
    return {
      badge: '🍜 ĂN VẶT QUỐC DÂN',
      badgeClass: 'bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-600 text-white shadow-orange-500/30',
      borderClass: 'border-orange-300 hover:border-orange-500 shadow-orange-100',
      headerBg: 'from-orange-100/70 via-amber-50/50 to-white',
      priceColor: 'text-orange-600',
      priceDisplay: r.priceFormatted || '25.000đ',
      pointsText: r.pointsFormatted || '25 Điểm',
      unit: 'gói',
      tagline: 'Hương vị tôm chua cay huyền thoại tuổi học trò'
    };
  }

  // 6. Kẹo dừa
  if (nameLower.includes('dừa') || nameLower.includes('kẹo')) {
    return {
      badge: '🍬 NGỌT NGÀO BẾN TRE',
      badgeClass: 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600 text-white shadow-emerald-500/30',
      borderClass: 'border-emerald-300 hover:border-emerald-500 shadow-emerald-100',
      headerBg: 'from-emerald-100/70 via-teal-50/50 to-white',
      priceColor: 'text-emerald-600',
      priceDisplay: r.priceFormatted || '5.000đ',
      pointsText: r.pointsFormatted || '5 Điểm / viên',
      unit: 'viên',
      tagline: 'Kẹo dừa Yến Hoàng nguyên chất béo ngậy'
    };
  }

  // 7. Chuối
  if (nameLower.includes('chuối')) {
    return {
      badge: '🍌 NGHỆ THUẬT SIÊU ĐẮT',
      badgeClass: 'bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-900 font-black shadow-yellow-400/30',
      borderClass: 'border-yellow-400 hover:border-yellow-500 shadow-yellow-100',
      headerBg: 'from-yellow-100/80 via-amber-50/50 to-white',
      priceColor: 'text-amber-600',
      priceDisplay: r.priceFormatted || '10.000.000đ',
      pointsText: r.pointsFormatted || '10.000 Điểm',
      unit: 'quả',
      tagline: 'Chuối dán băng keo bạc nghệ thuật đương đại Comedian'
    };
  }

  // 8. Voi
  if (nameLower.includes('voi')) {
    return {
      badge: '🐘 ĐẠI GIA NGUYÊN CON',
      badgeClass: 'bg-gradient-to-r from-slate-600 to-slate-800 text-white shadow-slate-600/30',
      borderClass: 'border-slate-400 hover:border-slate-600 shadow-slate-200',
      headerBg: 'from-slate-100 via-stone-50 to-white',
      priceColor: 'text-slate-800',
      priceDisplay: r.priceFormatted || '10.000.000.000đ',
      pointsText: r.pointsFormatted || '10.000.000 Điểm',
      unit: 'con',
      tagline: 'Voi bụi cỏ châu Phi trưởng thành khỏe mạnh, bao ship lớp học'
    };
  }

  // 9. Soyuz
  if (nameLower.includes('soyuz') || nameLower.includes('vũ trụ')) {
    return {
      badge: '🚀 LIÊN HÀNH TINH (ISS)',
      badgeClass: 'bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white shadow-purple-600/40',
      borderClass: 'border-purple-400 hover:border-purple-600 shadow-purple-200',
      headerBg: 'from-purple-100/70 via-indigo-50/50 to-white',
      priceColor: 'text-purple-700',
      priceDisplay: r.priceFormatted || '10.000.000.000.000.000đ',
      pointsText: r.pointsFormatted || '10 Triệu Tỷ Điểm',
      unit: 'chiếc',
      tagline: 'Tàu vũ trụ đưa cả nhóm lên trạm không gian quốc tế ISS'
    };
  }

  // Fallback
  return {
    badge: '🎁 PHẦN THƯỞNG',
    badgeClass: 'bg-indigo-600 text-white shadow-indigo-500/30',
    borderClass: 'border-slate-300 hover:border-indigo-500 shadow-slate-100',
    headerBg: 'from-slate-100 via-indigo-50/40 to-white',
    priceColor: 'text-indigo-600',
    priceDisplay: r.priceFormatted || (r.price.toLocaleString('vi-VN') + 'đ'),
    pointsText: r.pointsFormatted || `${Math.round(r.price / 1000)} Điểm`,
    unit: 'phần',
    tagline: r.desc || ''
  };
}

// SPOTLIGHT HERO CARD (BOEING 787-9 AIRPLANE 23 TỶ - VỊ TRÍ SPOTLIGHT ĐỈNH CAO)
function createSpotlightAirplaneHero(r, isModal = false) {
  const hero = document.createElement('div');
  
  hero.className = `spotlight-hero-card relative rounded-3xl overflow-hidden border-2 border-amber-400 text-white flex flex-col justify-between shadow-2xl h-full ${
    isModal ? 'p-3 sm:p-4' : 'p-5 sm:p-6'
  }`;

  hero.innerHTML = `
    <!-- Background atmospheric glow -->
    <div class="absolute -top-16 -right-16 w-60 h-60 bg-sky-500/25 rounded-full blur-3xl pointer-events-none"></div>
    <div class="absolute -bottom-16 -left-16 w-60 h-60 bg-amber-500/25 rounded-full blur-3xl pointer-events-none"></div>

    <!-- 1. Top Crown Banner -->
    <div class="relative z-10 flex items-center justify-between gap-2">
      <span class="px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-slate-950 font-black text-[11px] sm:text-xs uppercase tracking-wider shadow-lg flex items-center gap-1.5">
        <i class="fa-solid fa-crown text-amber-900"></i>
        <span>⭐ CỰC PHẨM SPOTLIGHT • TRIỆU ĐÔ</span>
      </span>
      <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
        r.stock > 0 
          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
          : 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
      }">
        <i class="fa-solid fa-plane"></i> Tồn: <strong class="text-white">${r.stock > 0 ? `${r.stock} chiếc` : 'HẾT HÀNG'}</strong>
      </span>
    </div>

    <!-- 2. Majestic Airplane Showroom Pedestal Stage (Clean White Showroom Pedestal - Large Image) -->
    <div class="relative z-10 my-2 rounded-2xl bg-white border-2 border-sky-300/80 flex flex-col items-center justify-center p-2.5 relative overflow-hidden shadow-lg group flex-1 min-h-[160px] sm:min-h-[180px]">
      <img src="${r.image}" alt="${r.name}" class="plane-anim ${
        isModal ? 'max-h-36 sm:max-h-44 md:max-h-48' : 'max-h-44 sm:max-h-52'
      } w-full object-contain filter drop-shadow-md cursor-pointer transition-transform duration-300 group-hover:scale-105" onclick="sellShopReward(${r.id})" title="Bấm để trừ tồn kho chiếc máy bay" />
      <div class="mt-1 flex items-center justify-between w-full text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-50 border border-slate-200/80 shrink-0">
        <span class="text-sky-800">✈️ Boeing 787-9 Dreamliner</span>
        <span class="text-amber-600 font-black">Vietnam Airlines</span>
      </div>
    </div>

    <!-- 3. Title & Intro Description -->
    <div class="relative z-10 space-y-0.5 text-left">
      <h3 class="text-sm sm:text-base font-black text-amber-300 bungee-font tracking-tight leading-snug">
        ${r.name}
      </h3>
      <p class="text-[11px] text-slate-300 leading-relaxed font-normal line-clamp-2">
        ${r.desc}
      </p>
    </div>

    <!-- 4. Price Showcase Card (No points line, maximizes image space) -->
    <div class="relative z-10 mt-1.5 p-2.5 rounded-2xl bg-slate-900/90 border border-amber-400/60 shadow-md text-left flex items-baseline justify-between">
      <span class="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Trị giá niêm yết:</span>
      <div class="text-base sm:text-lg xl:text-xl font-black text-amber-400 bungee-font tracking-tight drop-shadow-md">
        ${r.priceFormatted || '23.000.000.000đ'}
        <span class="text-[10px] font-bold text-amber-200 uppercase tracking-normal">(23 TỶ)</span>
      </div>
    </div>

    <!-- 5. Action Buttons (Sell / Restock) -->
    <div class="relative z-10 pt-2 flex items-center gap-2 shrink-0">
      <button type="button" onclick="sellShopReward(${r.id})" ${r.stock <= 0 ? 'disabled' : ''} class="flex-1 py-2 sm:py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-lg active:scale-95 cursor-pointer ${
        r.stock > 0 
          ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 text-white shadow-emerald-500/40 ring-1 ring-emerald-400/40' 
          : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
      }">
        <i class="fa-solid fa-check-double text-xs"></i>
        <span>${r.stock > 0 ? 'ĐÃ BÁN CHIẾC NÀY (-1)' : 'ĐÃ HẾT HÀNG'}</span>
      </button>
      <button type="button" onclick="restockShopReward(${r.id})" title="Hoàn lại +1 nếu bấm nhầm" class="py-2 sm:py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-xs transition border border-slate-700 active:scale-95 cursor-pointer">
        +1
      </button>
    </div>
  `;
  return hero;
}

function createShopProductElement(r, isModal = false) {
  const cfg = getShopProductConfig(r);
  const card = document.createElement('div');
  
  card.className = `product-card group relative flex flex-col justify-between rounded-2xl border-2 ${cfg.borderClass} bg-white overflow-hidden shadow-sm hover:shadow-lg transition-all text-left ${
    isModal ? 'p-2 sm:p-2.5' : 'p-3'
  }`;

  const nameLower = (r.name || '').toLowerCase();
  // Photographic items fill the frame with object-cover (Voi, Chuối, Soyuz), while Bá Khí and snacks stay uncropped (object-contain)
  const isPhotoCover = nameLower.includes('voi') || nameLower.includes('chuối') || nameLower.includes('soyuz') || nameLower.includes('vũ trụ');

  const mediaHtml = r.image 
    ? (isPhotoCover
        ? `<img src="${r.image}" alt="${r.name}" class="product-img w-full h-full object-cover object-center rounded-lg transition-transform duration-300 group-hover:scale-105" />`
        : `<img src="${r.image}" alt="${r.name}" class="product-img max-h-24 sm:max-h-28 w-auto max-w-full object-contain filter drop-shadow-md transition-transform duration-300 group-hover:scale-110" />`
      )
    : `<div class="${isModal ? 'text-3xl' : 'text-4xl'} filter drop-shadow">${r.icon || '🎁'}</div>`;

  const baKhiPreviewBtn = cfg.isBaKhi
    ? `<button type="button" onclick="triggerBaKhiPreview()" class="px-1.5 py-0.5 rounded-md bg-cyan-100 hover:bg-cyan-200 text-cyan-800 text-[10px] font-black transition cursor-pointer flex items-center gap-1 shadow-xs shrink-0" title="Bấm nghe thử tràng pháo tay!">
        <i class="fa-solid fa-hands-clapping text-cyan-600"></i>
        <span>Vỗ tay</span>
      </button>`
    : '';

  card.innerHTML = `
    <!-- Top Bar: Badge and Preview button -->
    <div class="flex items-center justify-between gap-1 mb-1">
      <span class="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${cfg.badgeClass} truncate">
        ${cfg.badge}
      </span>
      ${baKhiPreviewBtn}
    </div>

    <!-- Product Showcase Spotlight Pedestal (TĂNG KÍCH THƯỚC ẢNH TO RÕ RÀNG) -->
    <div class="${isModal ? 'h-24 sm:h-28 md:h-32' : 'h-28 sm:h-36'} bg-gradient-to-b ${cfg.headerBg} product-card-spotlight rounded-xl flex items-center justify-center p-1 border border-slate-100 relative mb-1.5 overflow-hidden">
      ${mediaHtml}
    </div>

    <!-- Info & Pricing -->
    <div class="space-y-1 flex-1 flex flex-col justify-between">
      <div>
        <h4 class="font-black text-slate-900 ${isModal ? 'text-xs sm:text-[13px]' : 'text-xs lg:text-sm'} leading-snug line-clamp-1 group-hover:text-indigo-600 transition" title="${r.name}">
          ${r.name}
        </h4>
      </div>

      <div class="pt-1 border-t border-slate-100 space-y-1">
        <!-- Price in VNĐ (ĐÃ XÓA DÒNG CẦN BAO NHIÊU ĐIỂM ĐỂ DÀNH KHÔNG GIAN CHO ẢNH TO) -->
        <div class="flex items-baseline justify-between">
          <span class="text-[9px] font-bold uppercase tracking-wider text-slate-400">Trị giá:</span>
          <span class="${isModal ? 'text-xs sm:text-sm' : 'text-sm lg:text-base'} font-black ${cfg.priceColor} bungee-font tracking-tight truncate">
            ${cfg.priceDisplay}
          </span>
        </div>

        <!-- TỒN KHO ROW (CỰC KỲ RÕ RÀNG, ĐỘC LẬP) -->
        <div class="flex items-center justify-between text-[10px] font-bold py-0.5">
          <span class="text-slate-500 text-[9px]">Tồn kho:</span>
          <span class="px-2 py-0.5 rounded-md font-black text-[9px] sm:text-[10px] ${
            r.stock > 0 
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
              : 'bg-rose-100 text-rose-700 border border-rose-300 animate-pulse'
          }">
            ${r.stock > 0 ? `Còn ${r.stock} ${cfg.unit}` : 'HẾT HÀNG'}
          </span>
        </div>

        <!-- Host Sold / Restock Control Button -->
        <div class="pt-1 border-t border-slate-100 flex items-center gap-1">
          <button type="button" onclick="sellShopReward(${r.id})" ${r.stock <= 0 ? 'disabled' : ''} class="flex-1 py-1 px-1.5 rounded-lg font-black text-[10px] sm:text-[11px] transition-all flex items-center justify-center gap-1 shadow-xs active:scale-95 cursor-pointer ${
            r.stock > 0 
              ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 text-white shadow-emerald-500/20' 
              : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
          }">
            <i class="fa-solid fa-check text-[9px]"></i>
            <span>${r.stock > 0 ? 'ĐÃ BÁN (-1)' : 'HẾT'}</span>
          </button>
          <button type="button" onclick="restockShopReward(${r.id})" title="Hoàn lại +1 nếu bấm nhầm" class="py-1 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-[10px] sm:text-[11px] transition border border-slate-200 active:scale-95 cursor-pointer">
            +1
          </button>
        </div>
      </div>
    </div>
  `;
  return card;
}

window.sellShopReward = function(rewardId) {
  socket.emit('host:sell_reward', { rewardId });
  if (window.gameSound && window.gameSound.playCorrect) {
    window.gameSound.playCorrect();
  }
};

window.restockShopReward = function(rewardId) {
  socket.emit('host:restock_reward', { rewardId });
  if (window.gameSound && window.gameSound.playTick) {
    window.gameSound.playTick();
  }
};

window.triggerBaKhiPreview = function() {
  socket.emit('host:trigger_bakhi', {
    playerName: 'Đại diện Bá Khí',
    teamName: 'Nhóm Siêu Đẳng'
  });
};

// Render Post-Game Shop on Projector
function renderPostGameShop(state) {
  const spotlightContainer = document.getElementById('shopSpotlightContainer');
  const gridReal = document.getElementById('shopGridReal');
  const gridLuxury = document.getElementById('shopGridLuxury');
  const rewardsList = (state && state.shopRewards && state.shopRewards.length > 0) ? state.shopRewards : (cachedShopRewards || []);

  if (!rewardsList || rewardsList.length === 0) return;

  const airplane = rewardsList.find(r => r.id === 100 || r.isSpotlight);
  const realItems = rewardsList.filter(r => r.id !== 100 && !r.isSpotlight && (r.category === 'real' || !r.category || r.id === 101 || [1, 2, 3, 4].includes(r.id)));
  const luxuryItems = rewardsList.filter(r => r.category === 'luxury' || [102, 103, 104].includes(r.id));

  if (spotlightContainer && airplane) {
    spotlightContainer.innerHTML = '';
    spotlightContainer.appendChild(createSpotlightAirplaneHero(airplane, false));
  }

  if (gridReal) {
    gridReal.innerHTML = '';
    realItems.forEach(r => {
      gridReal.appendChild(createShopProductElement(r, false));
    });
  }

  if (gridLuxury) {
    gridLuxury.innerHTML = '';
    luxuryItems.forEach(r => {
      gridLuxury.appendChild(createShopProductElement(r, false));
    });
  }
}

// Render Host Modal Shop
async function renderHostShopModal() {
  const spotlightContainer = document.getElementById('hostShopSpotlightContainer');
  const gridReal = document.getElementById('hostShopGridReal');
  const gridLuxury = document.getElementById('hostShopGridLuxury');

  let rewardsList = (currentGameState && currentGameState.shopRewards && currentGameState.shopRewards.length > 0)
    ? currentGameState.shopRewards
    : await fetchShopRewardsFallback();

  if (!rewardsList || rewardsList.length === 0) return;

  const airplane = rewardsList.find(r => r.id === 100 || r.isSpotlight);
  const realItems = rewardsList.filter(r => r.id !== 100 && !r.isSpotlight && (r.category === 'real' || !r.category || r.id === 101 || [1, 2, 3, 4].includes(r.id)));
  const luxuryItems = rewardsList.filter(r => r.category === 'luxury' || [102, 103, 104].includes(r.id));

  if (spotlightContainer && airplane) {
    spotlightContainer.innerHTML = '';
    spotlightContainer.appendChild(createSpotlightAirplaneHero(airplane, true));
  }

  if (gridReal) {
    gridReal.innerHTML = '';
    realItems.forEach(r => {
      gridReal.appendChild(createShopProductElement(r, true));
    });
  }

  if (gridLuxury) {
    gridLuxury.innerHTML = '';
    luxuryItems.forEach(r => {
      gridLuxury.appendChild(createShopProductElement(r, true));
    });
  }
}

const btnHostOpenShopPreview = document.getElementById('btnHostOpenShopPreview');
const hostShopModal = document.getElementById('hostShopModal');
const btnCloseHostShopModal = document.getElementById('btnCloseHostShopModal');
const btnCloseHostShopModalBottom = document.getElementById('btnCloseHostShopModalBottom');

if (btnHostOpenShopPreview) {
  btnHostOpenShopPreview.addEventListener('click', () => {
    renderHostShopModal();
    if (hostShopModal) hostShopModal.classList.remove('hidden');
  });
}
if (btnCloseHostShopModal) {
  btnCloseHostShopModal.addEventListener('click', () => {
    if (hostShopModal) hostShopModal.classList.add('hidden');
  });
}
if (btnCloseHostShopModalBottom) {
  btnCloseHostShopModalBottom.addEventListener('click', () => {
    if (hostShopModal) hostShopModal.classList.add('hidden');
  });
}

// BÁ KHÍ ACTIVATED EVENT LISTENER ON HOST (1 TRÀNG VỖ TAY CHO NHÓM BÁ KHÍ NHẤT LỚP)
socket.on('game:bakhi_activated', (data) => {
  const modal = document.getElementById('bakhiModal');
  const msgEl = document.getElementById('bakhiMessage');
  if (modal) {
    if (msgEl && data.message) {
      msgEl.textContent = `${data.message} 👏👏👏`;
    }
    modal.classList.remove('hidden');
    if (window.gameSound && window.gameSound.playApplause) {
      window.gameSound.playApplause();
    }
    confetti({ particleCount: 160, spread: 100, origin: { y: 0.55 } });
  }
});

const btnCloseBakhiHost = document.getElementById('btnCloseBakhiModal');
if (btnCloseBakhiHost) {
  btnCloseBakhiHost.addEventListener('click', () => {
    const modal = document.getElementById('bakhiModal');
    if (modal) modal.classList.add('hidden');
  });
}
