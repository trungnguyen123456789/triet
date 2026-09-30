// Host Projector Logic
const socket = io();

let currentGameState = null;
let soundEnabled = true;

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

  switch (state.status) {
    case 'LOBBY':
      showView('lobby');
      renderLobby(state);
      break;

    case 'COUNTDOWN':
      showView('countdown');
      document.getElementById('buzzBanner').classList.add('hidden');
      const el = document.getElementById('countdownNumber');
      if (el) el.textContent = state.countdownNumber;
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

// 5. Action Penalty Render with YouTube / TikTok Embed
function renderActionPenalty(penalty) {
  if (!penalty) return;
  document.getElementById('penaltyIcon').textContent = penalty.icon || '💃';
  document.getElementById('penaltyTitle').textContent = penalty.title;
  document.getElementById('penaltyDesc').textContent = `${penalty.playerName} (${penalty.teamName}) - ${penalty.desc}`;

  const videoContainer = document.getElementById('penaltyVideoContainer');
  const frame = document.getElementById('penaltyYoutubeFrame');
  const tiktokLink = document.getElementById('tiktokLinkContainer');
  const judgeSuccessText = document.getElementById('judgeSuccessText');

  if (judgeSuccessText) {
    if (penalty.isGroup) {
      judgeSuccessText.textContent = 'CẢ NHÓM ĐÃ HOÀN THÀNH (+4Đ TẤT CẢ)';
    } else {
      judgeSuccessText.textContent = 'ĐÃ HOÀN THÀNH (+2Đ CÁ NHÂN)';
    }
  }

  const mediaId = penalty.mediaId || (penalty.youtubeIds && penalty.youtubeIds[0]);

  if (penalty.mediaType === 'tiktok' && mediaId) {
    videoContainer.classList.remove('hidden');
    if (tiktokLink) tiktokLink.classList.remove('hidden');
    const tiktokEmbedUrl = `https://www.tiktok.com/embed/v2/${mediaId}`;
    if (!frame.src.includes(mediaId)) {
      frame.src = tiktokEmbedUrl;
    }
  } else if (mediaId) {
    videoContainer.classList.remove('hidden');
    if (tiktokLink) tiktokLink.classList.add('hidden');
    const embedUrl = `https://www.youtube-nocookie.com/embed/${mediaId}?autoplay=1&enablejsapi=1`;
    if (!frame.src.includes(mediaId)) {
      frame.src = embedUrl;
    }
  } else {
    videoContainer.classList.add('hidden');
    if (tiktokLink) tiktokLink.classList.add('hidden');
    frame.src = '';
  }
}

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

  // 10s Timer
  let remaining = 10.0;
  const timerText = document.getElementById('teamNameTimerText');
  if (timerText) timerText.textContent = '10.0s';
  clearInterval(teamNameTimer);

  window.gameSound.playTick();
  teamNameTimer = setInterval(() => {
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
    if (team.buffs.frozen > 0) badges += `<span title="Đang bị đóng băng" class="text-xs">❄️</span>`;
    if (team.buffs.delay3s > 0) badges += `<span title="Lời nguyền delay 3 giây" class="text-xs">🐢</span>`;
    if (team.buffs.riskReward) badges += `<span title="Liều ăn nhiều (chỉ chọn A hoặc D)" class="text-xs">🎲</span>`;
    if (team.buffs.x2 > 0) badges += `<span title="X2 điểm ở câu sau" class="text-xs">⚡</span>`;
    if (team.buffs.shield) badges += `<span title="Có khiên bảo hộ" class="text-xs">🛡️</span>`;

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

  // 3. Shop Rewards Grid
  const shopGrid = document.getElementById('shopGrid');
  if (shopGrid) {
    shopGrid.innerHTML = '';
    state.shopRewards.forEach(r => {
      const item = document.createElement('div');
      item.className = 'p-5 rounded-2xl glass-panel border border-slate-200 space-y-3 flex flex-col justify-between bg-white shadow-sm hover:shadow-md transition';
      item.innerHTML = `
        <div>
          <div class="text-4xl mb-2">${r.icon}</div>
          <h4 class="font-extrabold text-base text-slate-900">${r.name}</h4>
          <p class="text-xs text-slate-500 mt-1">${r.desc}</p>
        </div>
        <div class="flex items-center justify-between pt-3 border-t border-slate-100">
          <span class="text-xs font-bold text-slate-500">Còn lại: <strong class="text-slate-900">${r.stock}</strong></span>
          <span class="text-sm font-black text-indigo-600 bungee-font">${r.price} Xu</span>
        </div>
      `;
      shopGrid.appendChild(item);
    });
  }

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
