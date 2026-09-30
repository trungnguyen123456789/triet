const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const os = require('os');
const QRCode = require('qrcode');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const PORT = process.env.PORT || 3000;

// Load questions and rewards with resilient fallback and auto-creation
const questionsPath = path.join(__dirname, 'data', 'questions.json');
const rewardsPath = path.join(__dirname, 'data', 'rewards.json');

const defaultQuestions = [
  { id: 1, question: "Con gì đập thì sống, không đập thì chết?", options: ["Con tim", "Con muỗi", "Con cua", "Con rắn"], answer: 0, explanation: "Con tim đập thì người ta mới sống được!" },
  { id: 2, question: "Bác Hồ đọc Tuyên ngôn Độc lập khai sinh ra nước Việt Nam Dân chủ Cộng hòa vào ngày tháng năm nào?", options: ["19/08/1945", "02/09/1945", "30/04/1975", "03/02/1930"], answer: 1, explanation: "Ngày 02/09/1945 tại Quảng trường Ba Đình lịch sử." },
  { id: 3, question: "Cái gì đen khi bạn mua nó, đỏ khi bạn dùng nó, và xám xịt khi bạn vứt nó đi?", options: ["Thanh sô cô la", "Cục than tổ ong", "Cây nến sinh nhật", "Bật lửa"], answer: 1, explanation: "Cục than lúc mua màu đen, khi đốt đỏ rực, cháy tàn thành tro màu xám." },
  { id: 4, question: "Hành tinh nào trong Hệ Mặt Trời được mệnh danh là 'Hành tinh Đỏ'?", options: ["Sao Kim (Venus)", "Sao Hỏa (Mars)", "Sao Mộc (Jupiter)", "Sao Thổ (Saturn)"], answer: 1, explanation: "Sao Hỏa (Mars) có bề mặt giàu oxit sắt màu đỏ cam." },
  { id: 5, question: "Con chuột nào đi bằng hai chân?", options: ["Chuột Mickey", "Chuột túi (Kangaroo)", "Chuột cống", "Chuột Jerry"], answer: 0, explanation: "Chuột Mickey luôn đi đứng bằng 2 chân như người!" },
  { id: 6, question: "Tác phẩm văn học 'Chí Phèo' là của nhà văn nào?", options: ["Vũ Trọng Phụng", "Ngô Tất Tố", "Nam Cao", "Nguyễn Tuân"], answer: 2, explanation: "Truyện ngắn kinh điển của nhà văn Nam Cao." },
  { id: 7, question: "Đỉnh núi nào được mệnh danh là 'Nóc nhà của Đông Dương'?", options: ["Phan Xi Păng (Fansipan)", "Bạch Mộc Lương Tử", "Pusilung", "Núi Bà Đen"], answer: 0, explanation: "Đỉnh Fansipan cao 3.143m tại Sa Pa, Lào Cai." },
  { id: 8, question: "Trong bảng tuần hoàn hóa học, nguyên tố Fe là tên của kim loại nào?", options: ["Đồng", "Kẽm", "Nhôm", "Sắt"], answer: 3, explanation: "Fe viết tắt từ tiếng Latin Ferrum, nghĩa là Sắt." },
  { id: 9, question: "Thủ đô của nước Úc (Australia) là thành phố nào?", options: ["Sydney", "Melbourne", "Canberra", "Brisbane"], answer: 2, explanation: "Thủ đô của Úc là Canberra, không phải Sydney hay Melbourne." },
  { id: 10, question: "Có một người đi ra ngoài mưa mà không đội mũ, không che ô nhưng không một sợi tóc nào bị ướt. Vì sao?", options: ["Người đó đi xe ô tô", "Người đó bị hói (không có tóc)", "Người đó mặc áo mưa", "Cơn mưa rào nhỏ"], answer: 1, explanation: "Vì người đó bị hói đầu nên làm gì có sợi tóc nào để ướt!" }
];

const defaultRewards = [
  { id: 1, name: "Trà Sữa Full Topping (Ly Lớn)", price: 1500, stock: 2, icon: "🧋", desc: "Thưởng thức ly trà sữa mát lạnh cho cả tổ cùng chia vui." },
  { id: 2, name: "Thẻ Miễn Trực Nhật 1 Tuần", price: 2000, stock: 1, icon: "🧹", desc: "Được giáo viên phê duyệt miễn phân công trực nhật lớp 1 tuần." },
  { id: 3, name: "Gói Snack Khổng Lồ", price: 1000, stock: 3, icon: "🍿", desc: "Combo bánh snack đủ vị cho cả tổ nhâm nhi giờ ra chơi." },
  { id: 4, name: "Bút Ký Tên Cao Cấp", price: 800, stock: 4, icon: "🖊️", desc: "Chiếc bút phong thủy viết chữ đẹp, thi cử may mắn." },
  { id: 5, name: "Vé Cộng +1 Điểm Kiểm Tra Miệng", price: 2500, stock: 2, icon: "💯", desc: "Vé vàng quyền lực cộng thẳng 1 điểm vào bài kiểm tra miệng tiếp theo!" },
  { id: 6, name: "Tập Vở Ghi Chép Xịn", price: 500, stock: 5, icon: "📓", desc: "Quyển sổ tay bìa cứng chất lượng cao." },
  { id: 7, name: "Kẹo Mút Cầu Vồng (Gói 10 que)", price: 400, stock: 6, icon: "🍭", desc: "Ngọt ngào tình bạn, chia đều cho các thành viên trong tổ." }
];

let questions = defaultQuestions;
let rewards = defaultRewards;

const questionsInSubdir = path.join(__dirname, 'data', 'questions.json');
const questionsInRoot = path.join(__dirname, 'questions.json');
const rewardsInSubdir = path.join(__dirname, 'data', 'rewards.json');
const rewardsInRoot = path.join(__dirname, 'rewards.json');

try {
  if (fs.existsSync(questionsInSubdir)) {
    questions = JSON.parse(fs.readFileSync(questionsInSubdir, 'utf8'));
  } else if (fs.existsSync(questionsInRoot)) {
    questions = JSON.parse(fs.readFileSync(questionsInRoot, 'utf8'));
  } else {
    fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
    fs.writeFileSync(questionsInSubdir, JSON.stringify(defaultQuestions, null, 2), 'utf8');
  }
} catch (e) {
  console.warn('Fallback default questions:', e.message);
}

try {
  if (fs.existsSync(rewardsInSubdir)) {
    rewards = JSON.parse(fs.readFileSync(rewardsInSubdir, 'utf8'));
  } else if (fs.existsSync(rewardsInRoot)) {
    rewards = JSON.parse(fs.readFileSync(rewardsInRoot, 'utf8'));
  } else {
    fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
    fs.writeFileSync(rewardsInSubdir, JSON.stringify(defaultRewards, null, 2), 'utf8');
  }
} catch (e) {
  console.warn('Fallback default rewards:', e.message);
}

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const localIP = getLocalIP();

function createDefaultTeams() {
  const teams = [];
  for (let i = 1; i <= 7; i++) {
    teams.push({
      id: i,
      name: `Nhóm ${i}`,
      score: 0,
      inventory: [],
      buffs: {
        frozen: 0,
        x2: 0,
        shield: false,
        riskReward: false, // Only A or D allowed, correct = +10p, +10t
        delay3s: 0,        // Buttons delayed by 3s
        silenced: false    // Banned from buzzing this question
      }
    });
  }
  return teams;
}

// Game State
let gameState = {
  status: 'LOBBY',
  currentQuestionIndex: 0,
  teams: createDefaultTeams(),
  players: {},
  buzzerWinner: null,
  lockedTeamsForQuestion: [],
  isRound2: false,
  chestType: null,
  activeChests: [],
  activePenalty: null,
  activeWheel: null,
  speedMath: null,
  teamNameChallenge: null, // Bắn Tên Đồng Đội
  countdownNumber: 5,
  questionTimeRemaining: 30,
  qrCodeUrl: '',
  playUrl: process.env.PUBLIC_URL ? `${process.env.PUBLIC_URL}/play.html` : `http://${localIP}:${PORT}/play.html`,
  shopRewards: JSON.parse(JSON.stringify(rewards))
};

function updateQrCode(url) {
  QRCode.toDataURL(url, { width: 280, margin: 1 }, (err, dataUrl) => {
    if (!err) {
      gameState.qrCodeUrl = dataUrl;
      broadcastState();
    }
  });
}

updateQrCode(gameState.playUrl);

// Dynamic Host Detection Middleware (For Cloud, Render, Ngrok, Cloudflare Tunnel)
app.use((req, res, next) => {
  const forwardedProto = req.headers['x-forwarded-proto'];
  const proto = forwardedProto ? forwardedProto.split(',')[0].trim() : req.protocol;
  const host = req.get('host');

  if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
    const detectedUrl = `${proto}://${host}/play.html`;
    if (gameState.playUrl !== detectedUrl) {
      gameState.playUrl = detectedUrl;
      updateQrCode(detectedUrl);
    }
  }
  next();
});

app.use(express.static(path.join(__dirname, 'public')));
app.get('/api/info', (req, res) => {
  res.json({
    localIP,
    port: PORT,
    playUrl: gameState.playUrl,
    qrCodeUrl: gameState.qrCodeUrl
  });
});

function broadcastState() {
  io.emit('game:state_update', getPublicState());
}

function getPublicState() {
  const currentQ = questions[gameState.currentQuestionIndex] || null;
  const hasCorrectWinner = (gameState.buzzerWinner && gameState.buzzerWinner.isCorrect && gameState.buzzerWinner.verdictRevealed);
  const allTeamsFailed = (gameState.lockedTeamsForQuestion.length >= 7);
  const isTimeout = (gameState.status === 'QUESTION_TIMEOUT');

  const revealAnswer = (hasCorrectWinner || allTeamsFailed || isTimeout);

  return {
    status: gameState.status,
    currentQuestionIndex: gameState.currentQuestionIndex,
    totalQuestions: questions.length,
    currentQuestion: currentQ ? {
      id: currentQ.id,
      question: currentQ.question,
      options: currentQ.options,
      answer: revealAnswer ? currentQ.answer : null,
      explanation: revealAnswer ? currentQ.explanation : null
    } : null,
    teams: gameState.teams,
    playerCount: Object.keys(gameState.players).length,
    players: Object.values(gameState.players).map(p => ({
      id: p.id,
      name: p.name,
      teamId: p.teamId,
      score: p.score
    })),
    buzzerWinner: gameState.buzzerWinner,
    lockedTeamsForQuestion: gameState.lockedTeamsForQuestion,
    isRound2: !!gameState.isRound2,
    chestType: gameState.chestType,
    activeChests: gameState.activeChests.map(c => ({
      id: c.id,
      opened: c.opened,
      type: c.type,
      reward: c.opened ? c.reward : null
    })),
    activePenalty: gameState.activePenalty,
    activeWheel: gameState.activeWheel,
    speedMath: gameState.speedMath,
    teamNameChallenge: gameState.teamNameChallenge,
    countdownNumber: gameState.countdownNumber,
    questionTimeRemaining: gameState.questionTimeRemaining,
    playUrl: gameState.playUrl,
    qrCodeUrl: gameState.qrCodeUrl,
    shopRewards: gameState.shopRewards
  };
}

// 20 Chests Pool
function generateChests(isLucky) {
  const luckyPool = [
    { code: 'POINTS_8_2', title: 'Mưa Tiền Thưởng', desc: 'Cộng ngay: Nhóm +8 điểm, Cá nhân +2 điểm!', icon: '💰' },
    { code: 'TEAM_ALL_1', title: 'Rương Đoàn Kết', desc: 'Cộng ngay: Tất cả cá nhân trong nhóm +1 điểm!', icon: '🤝' },
    { code: 'TEAM_ALL_5', title: 'Hào Quang Tập Thể (Siêu May Mắn)', desc: 'Cộng ngay: Tất cả cá nhân trong nhóm +5 điểm!', icon: '✨' },
    { code: 'X2_BUFF', title: 'Vé Nhân Đôi (X2)', desc: 'Kích hoạt ngay: Câu kế tiếp nếu nhóm đúng sẽ nhân đôi điểm!', icon: '⚡' },
    { code: 'ITEM_CHARITY', title: 'Tài Trợ Viện Trợ 20%', desc: 'Kích hoạt ngay: Nhận thêm 20% số điểm từ 6 nhóm khác đóng góp!', icon: '🎁' },
    { code: 'POINTS_BOMB', title: 'Bom Điểm Số (Jackpot)', desc: 'Kích hoạt ngay: Nhóm bạn +15 điểm, và tặng 1 nhóm đối thủ +5 điểm!', icon: '💣' },
    { code: 'TEAM_LAST_AID', title: 'Cứu Trợ Kẻ Đội Sổ', desc: 'Kích hoạt ngay: Nhóm bạn +8 điểm, nhóm đang chót bảng tự động +6 điểm!', icon: '🕊️' },
    { code: 'MATH_CHALLENGE', title: 'Thử Thách Thần Tính', desc: 'Phép tính 2 chữ số 6 giây! Đọc to đáp án đúng để quay Jackpot!', icon: '🧠' },
    { code: 'TEAM_NAME_CHALLENGE', title: 'Bắn Tên Đồng Đội', desc: 'Đọc đúng họ tên tất cả thành viên trong nhóm mình -> Nhóm nhận +3 điểm!', icon: '📢' },
    { code: 'RANDOM_LUCKY_TEAM', title: 'Xổ Số May Mắn', desc: 'Cộng ngẫu nhiên từ +1 đến +15 điểm cho nhóm!', icon: '🎲' },
    { code: 'RANDOM_LUCKY_PERSONAL', title: 'Lì Xì Cá Nhân', desc: 'Cộng ngẫu nhiên từ +1 đến +8 điểm cho cá nhân mở rương!', icon: '🧧' },
    { code: 'RANDOM_LUCKY_COMBO', title: 'Đại Hỷ Song Toàn', desc: 'Cộng ngẫu nhiên (+1..8đ cá nhân) VÀ (+1..15đ nhóm)!', icon: '🌟' },
    { code: 'RANDOM_LUCKY_JACKPOT', title: 'Hũ Vàng Bất Ngờ', desc: 'Cộng ngẫu nhiên từ +8 đến +15 điểm cho nhóm!', icon: '🏺' },
    { code: 'ITEM_RISK_REWARD', title: 'Thẻ Liều Ăn Nhiều', desc: 'Lưu túi đồ: Câu sau chỉ được bấm A hoặc D (khóa B và C). Nếu đúng: +10đ cá nhân, +10đ nhóm!', icon: '🎯' },
    { code: 'ITEM_STEAL', title: 'Thẻ Siêu Đạo Tặc', desc: 'Lưu túi đồ: Chủ động chọn 1 nhóm & quay vòng cướp điểm!', icon: '🥷' },
    { code: 'ITEM_EQUALIZE', title: 'Thẻ Cào Bằng Thế Sự', desc: 'Lưu túi đồ: Chủ động kích hoạt tổng 7 đội chia đều cho 7!', icon: '⚖️' },
    { code: 'ITEM_SHIELD', title: 'Khiên Bảo Hộ', desc: 'Lưu túi đồ: Chủ động trang bị miễn trừ 1 lần phạt rương xui xẻo!', icon: '🛡️' },
    { code: 'ITEM_SILENCE', title: 'Thẻ Cấm Ngôn', desc: 'Lưu túi đồ: Khóa quyền bấm chuông 1 nhóm trong 1 câu!', icon: '🤐' },
    { code: 'ITEM_THANOS', title: 'Cú Búng Tay Của Thanos', desc: 'Lưu túi đồ: Xóa sạch toàn bộ điểm cá nhân của cả lớp về 0!', icon: '🧤' }
  ];

  const unluckyPool = [
    { code: 'MINUS_HALF', title: '☠️ RƯƠNG CỰC KỲ XUI XẺO', desc: 'Thảm họa 5%: Nhóm bạn lập tức bị mất thẳng 50% tổng số điểm hiện có!', icon: '☠️', isSuperUnlucky: true },
    { code: 'RANDOM_UNLUCKY_TEAM', title: 'Sấm Sét Rơi Trúng', desc: 'Trừ ngẫu nhiên từ -1 đến -15 điểm của nhóm!', icon: '⚡' },
    { code: 'RANDOM_UNLUCKY_PERSONAL', title: 'Thủng Lốp Xe', desc: 'Trừ ngẫu nhiên từ -1 đến -8 điểm của cá nhân mở rương!', icon: '🚲' },
    { code: 'RANDOM_UNLUCKY_COMBO', title: 'Bão Giông Kép', desc: 'Trừ ngẫu nhiên (-1..8đ cá nhân) VÀ (-1..15đ nhóm)!', icon: '🌪️' },
    { code: 'RANDOM_UNLUCKY_TAX', title: 'Thu Thuế Bất Ngờ', desc: 'Trừ ngẫu nhiên từ -3 đến -12 điểm của nhóm!', icon: '🧾' },
    { code: 'ACTION_CONFESSION', title: 'Lời Thú Tội Ngọt Ngào', desc: 'Phải khen ngợi 1 bạn ở nhóm đối thủ một câu chân thành! (Làm được: +2đ cá nhân)', icon: '💌', isAction: true },
    { code: 'ACTION_CATWALK', title: 'Người Mẫu Bất Đắc Dĩ', desc: 'Đi catwalk quanh bục giảng theo điệu nhạc! (Làm được: +2đ cá nhân)', icon: '👠', isAction: true, mediaType: 'youtube', mediaId: 'yycVNcishrE' },
    { code: 'ACTION_DANCE', title: 'Idol Giới Trẻ (Mew Ichi Ni San)', desc: 'Cover điệu nhảy theo video phát trên máy chiếu! (Làm được: +2đ cá nhân)', icon: '💃', isAction: true, mediaType: 'youtube', mediaId: 'fK9hLf2Q35w' },
    { code: 'ACTION_DANCE_2', title: 'Vũ Đạo Bắt Trend (Tóp Tóp)', desc: 'Cover điệu nhảy sôi động theo video phát trên máy chiếu! (Làm được: +2đ cá nhân)', icon: '🕺', isAction: true, mediaType: 'youtube', mediaId: '36RwRpM6PdM' },
    { code: 'ACTION_RAP', title: 'Rapper Học Đường', desc: 'Cover rap bài này trong 1 phút! (Làm được: +2đ cá nhân)', icon: '🎤', isAction: true, mediaType: 'youtube', mediaId: 'vDJmvbl-Ccc' },
    { code: 'ACTION_TIKTOK_GROUP', title: 'Vũ Điệu Tập Thể (Muốn Anh Đau)', desc: 'CẢ NHÓM PHẢI NHẢY COVER BÀI NÀY! Đúng tất cả thành viên được CỘNG +4 ĐIỂM!', icon: '🔥', isAction: true, isGroup: true, mediaType: 'tiktok', mediaId: '7559228650248260882' },
    { code: 'DELAY_3S', title: 'Lời Nguyền Delay 3 Giây', desc: 'Ở câu hỏi kế tiếp, câu hỏi và nút bấm của nhóm bạn sẽ bị hiển thị chậm 3 giây!', icon: '🐢' },
    { code: 'RANK_PENALTY', title: 'Rút Ruột Thứ Hạng', desc: 'Bị trừ số điểm bằng đúng Hạng hiện tại x 2!', icon: '📉' },
    { code: 'EMPTY_CHEST', title: 'Rương Rỗng (Cú Lừa Thế Kỷ)', desc: 'Không có gì cả! May mắn thoát nạn: Không được điểm và cũng không bị phạt!', icon: '💨' },
    { code: 'GIVE_CHARITY', title: 'Nhà Từ Thiện Bất Đắc Dĩ (Đại Xui)', desc: 'Trích 20% điểm nhóm chia đều cho 6 nhóm còn lại!', icon: '💸' },
    { code: 'FREEZE_1', title: 'Đóng Băng', desc: 'Nhóm bị khóa quyền bấm chuông trong 1 câu hỏi kế tiếp!', icon: '❄️' },
    { code: 'SLIP_MINUS', title: 'Hụt Chân', desc: 'Cá nhân -1 điểm, Nhóm -3 điểm!', icon: '🕳️' }
  ];

  const pool = isLucky ? luckyPool : unluckyPool;
  const chests = [];
  for (let i = 1; i <= 20; i++) {
    const reward = pool[Math.floor(Math.random() * pool.length)];
    chests.push({
      id: i,
      opened: false,
      type: isLucky ? 'LUCKY' : 'UNLUCKY',
      reward: { ...reward }
    });
  }
  return chests;
}

// TIMERS
let countdownInterval = null;
let question30sInterval = null;
let autoTimer = null;
let isTimerPaused = false;

function clearAllTimers() {
  if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null; }
  if (question30sInterval) { clearInterval(question30sInterval); question30sInterval = null; }
  if (autoTimer) { clearTimeout(autoTimer); autoTimer = null; }
}

function pauseQuestionTimer(reason) {
  isTimerPaused = true;
  io.emit('game:timer_pause', { paused: true, reason: reason || 'ĐANG KÍCH HOẠT VẬT PHẨM' });
}

function resumeQuestionTimer() {
  if (isTimerPaused) {
    isTimerPaused = false;
    io.emit('game:timer_pause', { paused: false });
  }
}

// START COUNTDOWN 5 4 3 2 1
function startCountdown() {
  clearAllTimers();
  // STOP ALL MEDIA
  io.emit('game:stop_all_media');

  gameState.status = 'COUNTDOWN';
  gameState.buzzerWinner = null;
  gameState.countdownNumber = 5;
  broadcastState();

  countdownInterval = setInterval(() => {
    gameState.countdownNumber--;
    if (gameState.countdownNumber > 0) {
      io.emit('game:countdown_tick', { count: gameState.countdownNumber });
    } else {
      clearInterval(countdownInterval);
      countdownInterval = null;
      gameState.status = 'QUESTION';
      startQuestion30sTimer();
      broadcastState();
    }
  }, 1000);
}

// START 30S QUESTION TIMER
function startQuestion30sTimer() {
  if (question30sInterval) clearInterval(question30sInterval);
  gameState.questionTimeRemaining = 30;
  isTimerPaused = false;

  question30sInterval = setInterval(() => {
    if (isTimerPaused) return;

    gameState.questionTimeRemaining--;
    if (gameState.questionTimeRemaining > 0) {
      io.emit('game:timer_tick', { remaining: gameState.questionTimeRemaining });
    } else {
      clearInterval(question30sInterval);
      question30sInterval = null;
      gameState.status = 'QUESTION_TIMEOUT';
      broadcastState();

      io.emit('game:announcement', {
        title: '⏰ ĐÃ HẾT 30 GIÂY!',
        desc: 'Không có ai trả lời câu hỏi này. Người điều hành hãy bấm [CÂU HỎI KẾ TIẾP].'
      });
    }
  }, 1000);
}

function proceedToNextQuestion() {
  clearAllTimers();
  // STOP MEDIA
  io.emit('game:stop_all_media');

  if (gameState.currentQuestionIndex < questions.length - 1) {
    gameState.currentQuestionIndex++;
    gameState.teams.forEach(t => {
      if (t.buffs.frozen > 0) t.buffs.frozen--;
      if (t.buffs.delay3s > 0) t.buffs.delay3s--;
      t.buffs.silenced = false;
    });
    gameState.lockedTeamsForQuestion = [];
    gameState.isRound2 = false;
    gameState.buzzerWinner = null;
    gameState.chestType = null;
    gameState.activeChests = [];
    gameState.activePenalty = null;
    gameState.activeWheel = null;
    gameState.speedMath = null;
    gameState.teamNameChallenge = null;
    startCountdown();
  } else {
    gameState.status = 'POST_GAME';
    broadcastState();
  }
}

function reopenQuestionForOthers() {
  clearAllTimers();
  // STOP MEDIA
  io.emit('game:stop_all_media');

  gameState.buzzerWinner = null;
  gameState.chestType = null;
  gameState.activeChests = [];
  gameState.activePenalty = null;
  gameState.teamNameChallenge = null;
  gameState.lockedTeamsForQuestion = []; // Tất cả các nhóm đều có quyền trả lời lại!

  gameState.status = 'QUESTION';
  gameState.isRound2 = true;
  startQuestion30sTimer();
  broadcastState();

  io.emit('game:announcement', {
    title: '🔔 ĐÃ MỞ LẠI CHUÔNG!',
    desc: 'Tất cả các nhóm (kể cả nhóm đã trả lời trước) đều có quyền bấm chuông trả lời lại!'
  });
}

// Socket handlers
io.on('connection', (socket) => {
  socket.emit('game:state_update', getPublicState());

  socket.on('player:join', ({ name, teamId }) => {
    if (!name || !teamId) return;
    const teamNum = parseInt(teamId, 10);
    if (teamNum < 1 || teamNum > 7) return;

    gameState.players[socket.id] = {
      id: socket.id,
      name: name.trim().substring(0, 25),
      teamId: teamNum,
      score: 0,
      inventory: []
    };
    broadcastState();
  });

  // Buzzer answer selection
  socket.on('player:buzz_answer', ({ optionIndex }) => {
    if (gameState.status !== 'QUESTION') return;
    const player = gameState.players[socket.id];
    if (!player) return;

    if (gameState.lockedTeamsForQuestion.includes(player.teamId)) {
      socket.emit('player:alert', { message: 'Nhóm bạn đã bị khóa ở câu này do trả lời sai!' });
      return;
    }
    const team = gameState.teams.find(t => t.id === player.teamId);
    if (team && (team.buffs.frozen > 0 || team.buffs.silenced)) {
      socket.emit('player:alert', { message: 'Nhóm bạn đang bị đóng băng hoặc cấm ngôn (khóa chuông) không thể bấm!' });
      return;
    }

    // CHECK RISK REWARD RESTRICTION: CAN ONLY CHOOSE A (0) OR D (3)
    if (team && team.buffs.riskReward) {
      if (optionIndex === 1 || optionIndex === 2) {
        socket.emit('player:alert', { message: 'Thẻ Liều Ăn Nhiều cấm bạn chọn đáp án B và C! Chỉ được chọn A hoặc D!' });
        return;
      }
    }

    const currentQ = questions[gameState.currentQuestionIndex];
    if (!currentQ) return;

    if (question30sInterval) {
      clearInterval(question30sInterval);
      question30sInterval = null;
    }

    const isCorrect = (optionIndex === currentQ.answer);

    gameState.status = 'BUZZED';
    gameState.buzzerWinner = {
      socketId: socket.id,
      playerId: player.id,
      playerName: player.name,
      teamId: player.teamId,
      teamName: `Nhóm ${player.teamId}`,
      selectedOption: optionIndex,
      optionText: currentQ.options[optionIndex],
      isCorrect: isCorrect,
      correctAnswerIndex: currentQ.answer,
      explanation: currentQ.explanation,
      verdictRevealed: false
    };

    broadcastState();

    // 3s Suspense before revealing verdict
    autoTimer = setTimeout(() => {
      if (gameState.status !== 'BUZZED' || !gameState.buzzerWinner) return;

      gameState.buzzerWinner.verdictRevealed = true;
      broadcastState();

      autoTimer = setTimeout(() => {
        processBuzzResult();
      }, 2000);
    }, 3000);
  });

  function processBuzzResult() {
    if (gameState.status !== 'BUZZED' || !gameState.buzzerWinner) return;

    const winner = gameState.buzzerWinner;
    const player = gameState.players[winner.socketId];
    const team = gameState.teams.find(t => t.id === winner.teamId);

    if (winner.isCorrect) {
      let teamPoints = 5;
      let playerPoints = 1;

      // RISK REWARD BONUS: IF CORRECT -> +10 PLAYER, +10 TEAM
      if (team && team.buffs.riskReward) {
        teamPoints = 10;
        playerPoints = 10;
        team.buffs.riskReward = false; // consume buff
        io.emit('game:announcement', {
          title: '🔥 LIỀU ĂN NHIỀU THÀNH CÔNG!',
          desc: `Nhóm ${team.id} đã dũng cảm chấp nhận rủi ro và trả lời ĐÚNG! Nhận ngay +10đ Nhóm và +10đ Cá nhân!`
        });
      }

      if (team && team.buffs.x2 > 0) {
        teamPoints *= 2;
        team.buffs.x2--;
      }
      if (team) team.score += teamPoints;
      if (player) player.score += playerPoints;

      gameState.chestType = 'LUCKY';
      gameState.activeChests = generateChests(true);
      gameState.status = 'CHEST_SELECTION';
    } else {
      if (team && team.buffs.riskReward) {
        team.buffs.riskReward = false; // consume buff
      }

      if (team && team.buffs.shield) {
        team.buffs.shield = false;
        io.emit('game:announcement', {
          title: '🛡️ KHIÊN BẢO HỘ KÍCH HOẠT!',
          desc: `${winner.teamName} đã dùng Khiên Bảo Hộ để chặn rương xui xẻo!`
        });
        gameState.status = 'CHEST_FINISHED';
      } else {
        gameState.chestType = 'UNLUCKY';
        gameState.activeChests = generateChests(false);
        gameState.status = 'CHEST_SELECTION';
      }
    }
    broadcastState();
  }

  // Pick chest
  socket.on('player:pick_chest', ({ chestId }) => {
    if (gameState.status !== 'CHEST_SELECTION') return;
    if (!gameState.buzzerWinner || gameState.buzzerWinner.socketId !== socket.id) return;

    const chest = gameState.activeChests.find(c => c.id === chestId);
    if (!chest || chest.opened) return;

    chest.opened = true;
    const reward = chest.reward;
    const winner = gameState.buzzerWinner;
    const player = gameState.players[winner.socketId];
    const team = gameState.teams.find(t => t.id === winner.teamId);

    if (chest.type === 'LUCKY') {
      handleLuckyReward(reward, player, team);
    } else {
      handleUnluckyReward(reward, player, team);
    }

    if (
      gameState.status !== 'ACTION_PENALTY' &&
      gameState.status !== 'SPEED_MATH' &&
      gameState.status !== 'TEAM_NAME_CHALLENGE' &&
      gameState.status !== 'WHEEL_SPIN'
    ) {
      gameState.status = 'CHEST_FINISHED';
    }

    broadcastState();
  });

  function handleLuckyReward(reward, player, team) {
    switch (reward.code) {
      case 'POINTS_8_2':
        if (team) team.score += 8;
        if (player) player.score += 2;
        break;
      case 'TEAM_ALL_1':
        Object.values(gameState.players).forEach(p => {
          if (p.teamId === team.id) p.score += 1;
        });
        break;
      case 'TEAM_ALL_5':
        Object.values(gameState.players).forEach(p => {
          if (p.teamId === team.id) p.score += 5;
        });
        break;
      case 'X2_BUFF':
        if (team) team.buffs.x2 = (team.buffs.x2 || 0) + 1;
        break;
      case 'ITEM_CHARITY':
        if (team) {
          const currentPts = Math.max(5, team.score);
          const bonusPts = Math.max(2, Math.round(currentPts * 0.2));
          team.score += bonusPts;
          const deductEach = Math.max(1, Math.round(bonusPts / 6));
          gameState.teams.forEach(t => {
            if (t.id !== team.id) t.score = Math.max(0, t.score - deductEach);
          });
          reward.desc = `Đã nhận ngay +${bonusPts} điểm tài trợ được trích từ 6 nhóm còn lại!`;
          io.emit('game:announcement', {
            title: '🎁 NHẬN TÀI TRỢ 20% ĐIỂM!',
            desc: `${winnerPlayerName(player)} (${team.name}) đã kích hoạt: Nhận ngay +${bonusPts} điểm tài trợ từ 6 nhóm còn lại!`
          });
        }
        break;
      case 'POINTS_BOMB':
        if (team) {
          team.score += 15;
          // Pick a random other team to give +5
          const otherTeams = gameState.teams.filter(t => t.id !== team.id);
          const luckyFriend = otherTeams[Math.floor(Math.random() * otherTeams.length)];
          if (luckyFriend) luckyFriend.score += 5;
          io.emit('game:announcement', {
            title: '💣 BOM ĐIỂM SỐ NỔ TUNG!',
            desc: `Nhóm ${team.id} nhận ngay +15 điểm! Và nhóm ${luckyFriend ? luckyFriend.name : ''} may mắn được hưởng ké +5 điểm!`
          });
        }
        break;
      case 'TEAM_LAST_AID':
        if (team) {
          team.score += 8;
          const otherTeams = gameState.teams.filter(t => t.id !== team.id);
          const allOtherAreZero = otherTeams.every(t => t.score === 0);

          if (allOtherAreZero) {
            // NẾU CÁC NHÓM KIA ĐỀU 0 ĐIỂM -> BẢN THÂN +8, TẤT CẢ CÁC NHÓM KIA ĐỀU +6
            otherTeams.forEach(t => t.score += 6);
            reward.desc = `Các nhóm khác đều đang 0đ: Nhóm bạn +8đ, và TẤT CẢ các nhóm còn lại đều được tiếp tế +6đ!`;
            io.emit('game:announcement', {
              title: '🕊️ CỨU TRỢ ĐỒNG LOẠT (TẤT CẢ CÒN 0 ĐIỂM)!',
              desc: `Do tất cả các nhóm khác đều đang 0 điểm, Nhóm ${team.id} nhận +8 điểm và TẤT CẢ các nhóm còn lại đều được tiếp tế +6 điểm!`
            });
          } else {
            const minScore = Math.min(...otherTeams.map(t => t.score));
            const lowestTeams = otherTeams.filter(t => t.score === minScore);
            lowestTeams.forEach(t => t.score += 6);
            const teamNames = lowestTeams.map(t => t.name).join(', ');
            reward.desc = `Nhóm bạn +8đ! Nhóm chót bảng (${teamNames}) được tiếp tế +6đ!`;
            io.emit('game:announcement', {
              title: '🕊️ CỨU TRỢ KẺ ĐỘI SỔ!',
              desc: `Nhóm ${team.id} nhận +8 điểm! Nhóm chót bảng (${teamNames}) được tiếp tế +6 điểm!`
            });
          }
        }
        break;
      case 'RANDOM_LUCKY_TEAM':
        if (team) {
          const pts = Math.floor(Math.random() * 15) + 1; // 1 -> 15
          team.score += pts;
          reward.desc = `Quay số may mắn: Nhóm ${team.id} nhận ngay +${pts} điểm!`;
          io.emit('game:announcement', {
            title: `🎲 XỔ SỐ MAY MẮN: +${pts} ĐIỂM!`,
            desc: `${winnerPlayerName(player)} đã quay trúng vận may: Nhóm ${team.id} được cộng ngẫu nhiên +${pts} điểm!`
          });
        }
        break;
      case 'RANDOM_LUCKY_PERSONAL':
        if (player) {
          const pts = Math.floor(Math.random() * 8) + 1; // 1 -> 8
          player.score += pts;
          reward.desc = `Lì xì cá nhân: ${winnerPlayerName(player)} nhận ngay +${pts} điểm cá nhân!`;
          io.emit('game:announcement', {
            title: `🧧 LÌ XÌ CÁ NHÂN: +${pts} ĐIỂM!`,
            desc: `Chúc mừng ${winnerPlayerName(player)} (${team ? team.name : ''}) nhận được bao lì xì may mắn +${pts} điểm cá nhân!`
          });
        }
        break;
      case 'RANDOM_LUCKY_COMBO':
        {
          const pPts = Math.floor(Math.random() * 8) + 1; // 1 -> 8
          const tPts = Math.floor(Math.random() * 15) + 1; // 1 -> 15
          if (player) player.score += pPts;
          if (team) team.score += tPts;
          reward.desc = `Đại hỷ song toàn: Cá nhân +${pPts} điểm, Nhóm +${tPts} điểm!`;
          io.emit('game:announcement', {
            title: `🌟 ĐẠI HỶ SONG TOÀN: +${pPts}Đ CÁ NHÂN & +${tPts}Đ NHÓM!`,
            desc: `Cực kỳ may mắn! ${winnerPlayerName(player)} được cộng +${pPts} điểm cá nhân và Nhóm ${team ? team.id : ''} được cộng +${tPts} điểm nhóm!`
          });
        }
        break;
      case 'RANDOM_LUCKY_JACKPOT':
        if (team) {
          const pts = Math.floor(Math.random() * 8) + 8; // 8 -> 15
          team.score += pts;
          reward.desc = `Hũ vàng bộc phá: Nhóm ${team.id} nhận ngay +${pts} điểm!`;
          io.emit('game:announcement', {
            title: `🏺 HŨ VÀNG BỘC PHÁ: +${pts} ĐIỂM!`,
            desc: `Đào trúng hũ vàng! Nhóm ${team.id} rinh ngay +${pts} điểm nhóm!`
          });
        }
        break;
      case 'MATH_CHALLENGE':
        initSpeedMath(player, team);
        return;
      case 'TEAM_NAME_CHALLENGE':
        initTeamNameChallenge(player, team);
        return;
      case 'ITEM_RISK_REWARD':
      case 'ITEM_STEAL':
      case 'ITEM_EQUALIZE':
      case 'ITEM_SHIELD':
      case 'ITEM_SILENCE':
      case 'ITEM_THANOS':
        const itemObj = {
          id: Date.now() + Math.random(),
          code: reward.code,
          name: reward.title,
          desc: reward.desc,
          icon: reward.icon
        };
        if (team) team.inventory.push(itemObj);
        if (player) player.inventory.push(itemObj);
        break;
    }
  }

  function winnerPlayerName(p) {
    return p ? p.name : 'Người chơi';
  }

  function handleUnluckyReward(reward, player, team) {
    if (reward.isAction) {
      let vidId = null;
      if (reward.youtubeIds && reward.youtubeIds.length > 0) {
        vidId = reward.youtubeIds[Math.floor(Math.random() * reward.youtubeIds.length)];
      } else if (reward.mediaId) {
        vidId = reward.mediaId;
      }

      gameState.status = 'ACTION_PENALTY';
      gameState.activePenalty = {
        type: reward.code,
        title: reward.title,
        desc: reward.desc,
        icon: reward.icon,
        mediaType: reward.mediaType || 'youtube',
        mediaId: vidId,
        isGroup: !!reward.isGroup,
        isPerforming: false,
        playerId: player.id,
        playerName: player.name,
        teamId: team.id,
        teamName: `Nhóm ${team.id}`
      };
      return;
    }

    switch (reward.code) {
      case 'RANDOM_UNLUCKY_TEAM':
        if (team) {
          const minus = Math.floor(Math.random() * 15) + 1; // 1 -> 15
          team.score = Math.max(0, team.score - minus);
          reward.desc = `Sấm sét rơi trúng: Nhóm ${team.id} bị trừ ngẫu nhiên -${minus} điểm!`;
          io.emit('game:announcement', {
            title: `⚡ SẤM SÉT RƠI TRÚNG: -${minus} ĐIỂM!`,
            desc: `Họa giáng bất ngờ! Nhóm ${team.id} bị trừ ngẫu nhiên -${minus} điểm nhóm!`
          });
        }
        break;
      case 'RANDOM_UNLUCKY_PERSONAL':
        if (player) {
          const minus = Math.floor(Math.random() * 8) + 1; // 1 -> 8
          player.score = Math.max(0, player.score - minus);
          reward.desc = `Thủng lốp xe: ${winnerPlayerName(player)} bị trừ ngẫu nhiên -${minus} điểm cá nhân!`;
          io.emit('game:announcement', {
            title: `🚲 THỦNG LỐP XE: -${minus} ĐIỂM!`,
            desc: `Xui xẻo đường trường! ${winnerPlayerName(player)} bị trừ ngẫu nhiên -${minus} điểm cá nhân!`
          });
        }
        break;
      case 'RANDOM_UNLUCKY_COMBO':
        {
          const pMinus = Math.floor(Math.random() * 8) + 1; // 1 -> 8
          const tMinus = Math.floor(Math.random() * 15) + 1; // 1 -> 15
          if (player) player.score = Math.max(0, player.score - pMinus);
          if (team) team.score = Math.max(0, team.score - tMinus);
          reward.desc = `Bão giông càn quét: Cá nhân -${pMinus} điểm, Nhóm -${tMinus} điểm!`;
          io.emit('game:announcement', {
            title: `🌪️ BÃO GIÔNG KÉP: -${pMinus}Đ CÁ NHÂN & -${tMinus}Đ NHÓM!`,
            desc: `Thảm họa kép! ${winnerPlayerName(player)} bị trừ -${pMinus} điểm cá nhân và Nhóm ${team ? team.id : ''} bị trừ -${tMinus} điểm nhóm!`
          });
        }
        break;
      case 'RANDOM_UNLUCKY_TAX':
        if (team) {
          const minus = Math.floor(Math.random() * 10) + 3; // 3 -> 12
          team.score = Math.max(0, team.score - minus);
          reward.desc = `Thu thuế đột xuất: Nhóm ${team.id} bị thu thuế -${minus} điểm!`;
          io.emit('game:announcement', {
            title: `🧾 THU THUẾ ĐỘT XUẤT: -${minus} ĐIỂM!`,
            desc: `Đoàn thanh tra ập tới! Nhóm ${team.id} bị thu thuế -${minus} điểm nhóm!`
          });
        }
        break;
      case 'MINUS_HALF':
        if (team) {
          const lost = Math.floor(team.score / 2);
          team.score = Math.ceil(team.score / 2);
          reward.desc = `Họa vô đơn chí! Nhóm ${team.id} bị trừ 50% số điểm (mất -${lost}đ, hiện còn ${team.score}đ)!`;
          io.emit('game:announcement', {
            title: '☠️ RƯƠNG CỰC KỲ XUI XẺO KÍCH HOẠT!',
            desc: `Thảm họa ập xuống! ${winnerPlayerName(player)} đã mở trúng Rương Cực Kỳ Xui Xẻo! Nhóm ${team.id} lập tức bị trừ thẳng 50% tổng số điểm (mất -${lost}đ, hiện còn ${team.score}đ)!`
          });
        }
        break;
      case 'DELAY_3S':
        if (team) {
          team.buffs.delay3s = 2; // Active for next question (decrements to 1 when entering next question)
          io.emit('game:announcement', {
            title: '🐢 LỜI NGUYỀN DELAY 3 GIÂY!',
            desc: `Ở câu hỏi tiếp theo, các bạn trong Nhóm ${team.id} sẽ bị delay 3 giây mới hiển thị nút bấm!`
          });
        }
        break;
      case 'RANK_PENALTY':
        if (team) {
          const sorted = [...gameState.teams].sort((a, b) => b.score - a.score);
          const rank = sorted.findIndex(t => t.id === team.id) + 1;
          const penalty = rank * 2;
          team.score = Math.max(0, team.score - penalty);
          io.emit('game:announcement', {
            title: '📉 RÚT RUỘT THỨ HẠNG!',
            desc: `Nhóm ${team.id} đang ở Hạng ${rank} nên bị trừ thẳng ${penalty} điểm (${rank} x 2)!`
          });
        }
        break;
      case 'EMPTY_CHEST':
        io.emit('game:announcement', {
          title: '💨 RƯƠNG RỖNG - CÚ LỪA THẾ KỶ!',
          desc: `Hú hồn chim én! Mở ra một làn khói trắng, không bị trừ điểm nào cả!`
        });
        break;
      case 'GIVE_CHARITY':
        if (team && team.score > 0) {
          const giveAmount = Math.ceil(team.score * 0.2);
          team.score -= giveAmount;
          const shareEach = Math.max(1, Math.floor(giveAmount / 6));
          gameState.teams.forEach(t => {
            if (t.id !== team.id) t.score += shareEach;
          });
        }
        break;
      case 'FREEZE_1':
        if (team) team.buffs.frozen = 2; // Active for next question
        break;
      case 'SLIP_MINUS':
        if (player) player.score = Math.max(0, player.score - 1);
        if (team) team.score = Math.max(0, team.score - 3);
        break;
    }
  }

  // Speed Math 2-digit
  function initSpeedMath(player, team) {
    const num1 = Math.floor(Math.random() * 89) + 10;
    const num2 = Math.floor(Math.random() * 89) + 10;
    const answer = num1 + num2;

    gameState.status = 'SPEED_MATH';
    gameState.speedMath = {
      num1, num2,
      formula: `${num1} + ${num2}`,
      answer,
      timeRemaining: 4,
      playerId: player.id,
      playerName: player.name,
      teamId: team.id
    };
  }

  // Team Name Challenge (Bắn Tên Đồng Đội - 10 Giây)
  function initTeamNameChallenge(player, team) {
    const members = Object.values(gameState.players).filter(p => p.teamId === team.id);
    gameState.status = 'TEAM_NAME_CHALLENGE';
    gameState.teamNameChallenge = {
      playerId: player.id,
      playerName: player.name,
      teamId: team.id,
      teamName: `Nhóm ${team.id}`,
      members: members.map(m => m.name),
      timeRemaining: 10
    };
  }

  socket.on('host:team_name_result', ({ isCorrect }) => {
    if (gameState.status !== 'TEAM_NAME_CHALLENGE' || !gameState.teamNameChallenge) return;
    const challenge = gameState.teamNameChallenge;
    const team = gameState.teams.find(t => t.id === challenge.teamId);

    if (isCorrect) {
      if (team) team.score += 3;
      io.emit('game:announcement', {
        title: '🎉 BẮN TÊN THÀNH CÔNG RỰC RỠ!',
        desc: `${challenge.playerName} đã đọc chính xác tất cả họ tên thành viên! Nhóm ${challenge.teamId} được cộng ngay +3 điểm!`
      });
    } else {
      io.emit('game:announcement', {
        title: '❌ CHƯA CHÍNH XÁC!',
        desc: `Rất tiếc chưa đọc đủ hoặc sai tên đồng đội! Cơ hội đã trôi qua.`
      });
    }

    gameState.teamNameChallenge = null;
    gameState.status = 'CHEST_FINISHED';
    broadcastState();
  });

  socket.on('host:speed_math_result', ({ isCorrect }) => {
    if (gameState.status !== 'SPEED_MATH' || !gameState.speedMath) return;

    if (isCorrect) {
      const mathSegments = [
        { label: 'Cá nhân +3đ | Nhóm +10đ', pScore: 3, tScore: 10 },
        { label: 'Cá nhân +5đ | Nhóm +15đ', pScore: 5, tScore: 15 },
        { label: 'Cá nhân +2đ | Nhóm +8đ', pScore: 2, tScore: 8 },
        { label: '🔥 JACKPOT: Cá nhân +10đ | Nhóm +25đ!', pScore: 10, tScore: 25 },
        { label: 'Nhóm +12đ + Tặng 1 Khiên Hộ Mệnh', pScore: 0, tScore: 12, shield: true }
      ];
      startWheelSpin({
        type: 'MATH_JACKPOT',
        title: '🎡 VÒNG QUAY SIÊU THƯỞNG TOÁN HỌC',
        segments: mathSegments,
        playerId: gameState.speedMath.playerId,
        teamId: gameState.speedMath.teamId
      });
    } else {
      io.emit('game:announcement', {
        title: 'HẾT GIỜ / TIẾC QUÁ!',
        desc: 'Rất tiếc câu trả lời chưa chính xác. Người điều hành hãy bấm Tiếp tục khi sẵn sàng!'
      });
      gameState.status = 'CHEST_FINISHED';
      broadcastState();
    }
  });

  socket.on('player:start_action_performance', () => {
    if (gameState.status !== 'ACTION_PENALTY' || !gameState.activePenalty) return;
    gameState.activePenalty.isPerforming = true;
    broadcastState();
  });

  // HOST 3-BUTTON ACTION JUDGMENT
  socket.on('host:judge_action', ({ result }) => {
    if (gameState.status !== 'ACTION_PENALTY' || !gameState.activePenalty) return;

    const penalty = gameState.activePenalty;
    const team = gameState.teams.find(t => t.id === penalty.teamId);
    const player = Object.values(gameState.players).find(p => p.id === penalty.playerId);

    if (result === 'SUCCESS') {
      // BONUS REWARD ON SUCCESSFUL PERFORMANCE:
      let bonusMsg = '';
      if (penalty.isGroup) {
        // GROUP PERFORMANCE (TIKTOK MUỐN ANH ĐAU): ALL MEMBERS +4 POINTS!
        Object.values(gameState.players).forEach(p => {
          if (p.teamId === penalty.teamId) p.score += 4;
        });
        bonusMsg = `Cả nhóm đã hoàn thành xuất sắc! TẤT CẢ THÀNH VIÊN TRONG NHÓM ĐƯỢC CỘNG +4 ĐIỂM!`;
      } else {
        // INDIVIDUAL ACTION: PLAYER +2 POINTS!
        if (player) player.score += 2;
        bonusMsg = `${penalty.playerName} đã dũng cảm biểu diễn thành công! Nhận ngay +2 ĐIỂM CÁ NHÂN!`;
      }

      io.emit('game:announcement', {
        title: '🎉 BIỂU DIỄN THÀNH CÔNG RỰC RỠ!',
        desc: bonusMsg
      });

      // STOP MEDIA
      io.emit('game:stop_all_media');
      gameState.activePenalty = null;
      gameState.status = 'CHEST_FINISHED';
      broadcastState();
    } else if (result === 'RETRY') {
      io.emit('game:announcement', {
        title: '🔄 CHƯA ĐẠT YÊU CẦU • LÀM LẠI!',
        desc: `${penalty.playerName} hãy tự tin làm lại lần nữa theo nhịp nhạc!`
      });
      io.emit('game:replay_video');
    } else if (result === 'PUNISH') {
      // STOP MEDIA
      io.emit('game:stop_all_media');

      const penaltySegments = [
        { label: 'Cá nhân -0đ | Nhóm -10đ', pMinus: 0, tMinus: 10 },
        { label: 'Cá nhân -5đ | Nhóm -10đ', pMinus: 5, tMinus: 10 },
        { label: 'Cá nhân -0đ | Nhóm -15đ', pMinus: 0, tMinus: 15 },
        { label: 'Cá nhân -10đ | Nhóm -20đ', pMinus: 10, tMinus: 20 },
        { label: 'Cá nhân -2đ | Nhóm -5đ', pMinus: 2, tMinus: 5 },
        { label: '✨ THOÁT NẠN! Trừ 0 điểm', pMinus: 0, tMinus: 0 }
      ];

      startWheelSpin({
        type: 'PENALTY_FORFEIT',
        title: '🎡 VÒNG QUAY CHUỘC TỘI (CHỊU PHẠT TRỪ ĐIỂM)',
        segments: penaltySegments,
        playerId: penalty.playerId,
        teamId: penalty.teamId
      });
    }
  });

  socket.on('player:forfeit_action_penalty', () => {
    if (gameState.status !== 'ACTION_PENALTY' || !gameState.activePenalty) return;
    io.emit('game:stop_all_media');

    const penaltySegments = [
      { label: 'Cá nhân -0đ | Nhóm -10đ', pMinus: 0, tMinus: 10 },
      { label: 'Cá nhân -5đ | Nhóm -10đ', pMinus: 5, tMinus: 10 },
      { label: 'Cá nhân -0đ | Nhóm -15đ', pMinus: 0, tMinus: 15 },
      { label: 'Cá nhân -10đ | Nhóm -20đ', pMinus: 10, tMinus: 20 },
      { label: 'Cá nhân -2đ | Nhóm -5đ', pMinus: 2, tMinus: 5 },
      { label: '✨ THOÁT NẠN! Trừ 0 điểm', pMinus: 0, tMinus: 0 }
    ];

    startWheelSpin({
      type: 'PENALTY_FORFEIT',
      title: '🎡 VÒNG QUAY CHUỘC TỘI (TRỪ ĐIỂM BỎ QUA)',
      segments: penaltySegments,
      playerId: gameState.activePenalty.playerId,
      teamId: gameState.activePenalty.teamId
    });
  });

  function startWheelSpin({ type, title, segments, playerId, teamId, targetTeamId }) {
    clearAllTimers();
    io.emit('game:stop_all_media');

    const selectedIndex = Math.floor(Math.random() * segments.length);
    gameState.status = 'WHEEL_SPIN';
    gameState.activeWheel = {
      type,
      title,
      segments,
      spinResultIndex: selectedIndex,
      playerId,
      teamId,
      targetTeamId: targetTeamId || null,
      isFinished: false,
      isSpinning: false
    };
    broadcastState();
  }

  socket.on('player:spin_wheel', () => {
    if (gameState.status !== 'WHEEL_SPIN' || !gameState.activeWheel) return;
    if (gameState.activeWheel.isSpinning) return;
    gameState.activeWheel.isSpinning = true;
    io.emit('game:wheel_start_spin', {
      spinResultIndex: gameState.activeWheel.spinResultIndex,
      duration: 5000
    });
  });

  socket.on('host:spin_wheel', () => {
    if (gameState.status !== 'WHEEL_SPIN' || !gameState.activeWheel) return;
    if (gameState.activeWheel.isSpinning) return;
    gameState.activeWheel.isSpinning = true;
    io.emit('game:wheel_start_spin', {
      spinResultIndex: gameState.activeWheel.spinResultIndex,
      duration: 5000
    });
  });

  socket.on('host:wheel_finished', () => {
    if (gameState.status !== 'WHEEL_SPIN' || !gameState.activeWheel) return;

    const wheel = gameState.activeWheel;
    const seg = wheel.segments[wheel.spinResultIndex];
    const team = gameState.teams.find(t => t.id === wheel.teamId);
    const player = Object.values(gameState.players).find(p => p.id === wheel.playerId);

    if (wheel.type === 'PENALTY_FORFEIT') {
      if (player) player.score = Math.max(0, player.score - (seg.pMinus || 0));
      if (team) team.score = Math.max(0, team.score - (seg.tMinus || 0));
    } else if (wheel.type === 'MATH_JACKPOT') {
      if (player) player.score += (seg.pScore || 0);
      if (team) {
        team.score += (seg.tScore || 0);
        if (seg.shield) team.buffs.shield = true;
      }
    } else if (wheel.type === 'STEAL_POINTS') {
      const targetTeam = gameState.teams.find(t => t.id === wheel.targetTeamId);
      const stealAmount = seg.amount || 0;
      if (targetTeam && team) {
        const actualSteal = Math.min(targetTeam.score, stealAmount);
        targetTeam.score -= actualSteal;
        team.score += actualSteal;
      }
    }

    wheel.isFinished = true;
    gameState.status = 'CHEST_FINISHED';
    broadcastState();
  });

  socket.on('player:inventory_opened', () => {
    if (gameState.status === 'QUESTION') {
      pauseQuestionTimer('CÓ NHÓM ĐANG XEM TÚI VẬT PHẨM');
    }
  });

  socket.on('player:inventory_closed', () => {
    if (gameState.status === 'QUESTION') {
      resumeQuestionTimer();
    }
  });

  // Use Item
  socket.on('player:use_item', ({ itemId, targetTeamId }) => {
    const player = gameState.players[socket.id];
    if (!player) return;
    const team = gameState.teams.find(t => t.id === player.teamId);
    if (!team) return;

    const itemIndex = team.inventory.findIndex(it => it.id == itemId);
    if (itemIndex === -1) return;

    const item = team.inventory[itemIndex];
    team.inventory.splice(itemIndex, 1);
    const pIndex = player.inventory.findIndex(it => it.id == itemId);
    if (pIndex !== -1) player.inventory.splice(pIndex, 1);

    pauseQuestionTimer(`KÍCH HOẠT: ${item.name}`);

    switch (item.code) {
      case 'ITEM_RISK_REWARD':
        team.buffs.riskReward = true;
        io.emit('game:announcement', {
          title: '🎯 THẺ LIỀU ĂN NHIỀU ĐÃ KÍCH HOẠT!',
          desc: `${player.name} (${team.name}) đã kích hoạt Thẻ Liều Ăn Nhiều: Ở câu sau chỉ được chọn A hoặc D! Đúng: +10đ cá nhân & +10đ nhóm!`,
          soundType: 'good',
          isGood: true
        });
        break;

      case 'ITEM_STEAL':
        const targetStealId = targetTeamId || ((team.id % 7) + 1);
        const stealSegments = [
          { label: 'Cướp 5 Điểm', amount: 5 },
          { label: 'Cướp 8 Điểm', amount: 8 },
          { label: 'Cướp 10 Điểm', amount: 10 },
          { label: 'Cướp 15 Điểm', amount: 15 },
          { label: '🔥 CƯỚP 20 ĐIỂM!', amount: 20 }
        ];
        startWheelSpin({
          type: 'STEAL_POINTS',
          title: `🥷 SIÊU ĐẠO TẶC CƯỚP ĐIỂM NHÓM ${targetStealId}`,
          segments: stealSegments,
          playerId: player.id,
          teamId: team.id,
          targetTeamId: targetStealId
        });
        io.emit('game:announcement', {
          title: '🥷 SIÊU ĐẠO TẶC RA TAY!',
          desc: `${player.name} (${team.name}) đã dùng Thẻ Siêu Đạo Tặc nhắm vào Nhóm ${targetStealId}! Hãy xoay vòng quay trên điện thoại!`,
          soundType: 'bad',
          isBad: true
        });
        return;

      case 'ITEM_EQUALIZE':
        const total = gameState.teams.reduce((sum, t) => sum + t.score, 0);
        const avg = Math.round(total / 7);
        gameState.teams.forEach(t => t.score = avg);
        io.emit('game:announcement', {
          title: '⚖️ CÀO BẰNG THẾ SỰ!',
          desc: `${player.name} (${team.name}) đã kích hoạt: Tổng ${total} điểm chia đều, tất cả 7 nhóm đồng giá ${avg} điểm!`,
          soundType: 'neutral'
        });
        break;

      case 'ITEM_SHIELD':
        team.buffs.shield = true;
        io.emit('game:announcement', {
          title: '🛡️ KHIÊN BẢO HỘ ĐƯỢC TRANG BỊ!',
          desc: `${player.name} (${team.name}) đã kích hoạt Khiên bảo hộ bảo vệ nhóm mình!`,
          soundType: 'good',
          isGood: true
        });
        break;

      case 'ITEM_SILENCE':
        const targetSilence = gameState.teams.find(t => t.id === targetTeamId);
        if (targetSilence) {
          targetSilence.buffs.frozen = 1;
          targetSilence.buffs.silenced = true;
          io.emit('game:announcement', {
            title: '🤐 CẤM NGÔN KHÓA CHUÔNG!',
            desc: `${player.name} (${team.name}) đã dùng Thẻ Cấm Ngôn KHÓA CHUÔNG của Nhóm ${targetTeamId}!`,
            soundType: 'bad',
            isBad: true
          });
        }
        break;

      case 'ITEM_THANOS':
        Object.values(gameState.players).forEach(p => { p.score = 0; });
        io.emit('game:thanos_snap', {
          title: '🧤 CÚ BÚNG TAY CỦA THANOS!',
          desc: `${player.name} (${team.name}) đã búng tay! Toàn bộ điểm cá nhân của cả lớp bay màu về 0!`,
          soundType: 'bad',
          isBad: true
        });
        break;
    }

    broadcastState();
  });

  socket.on('game:resume_timer', () => {
    resumeQuestionTimer();
  });

  // Shop Buy
  socket.on('player:buy_reward', ({ rewardId }) => {
    const player = gameState.players[socket.id];
    if (!player) return;
    const team = gameState.teams.find(t => t.id === player.teamId);
    if (!team) return;

    const rewardItem = gameState.shopRewards.find(r => r.id === rewardId);
    if (!rewardItem || rewardItem.stock <= 0) return;

    const teamTokens = team.score * 100;
    if (teamTokens < rewardItem.price) return;

    const scoreCost = Math.ceil(rewardItem.price / 100);
    team.score -= scoreCost;
    rewardItem.stock -= 1;

    io.emit('game:announcement', {
      title: '🎉 ĐỔI QUÀ THÀNH CÔNG!',
      desc: `Đại diện ${player.name} (Nhóm ${team.id}) đã đổi thành công món: ${rewardItem.icon} ${rewardItem.name}!`
    });
    broadcastState();
  });

  // Host manual controls
  socket.on('host:start_countdown', () => {
    startCountdown();
  });

  socket.on('host:next_question', () => {
    proceedToNextQuestion();
  });

  socket.on('host:reopen_question', () => {
    reopenQuestionForOthers();
  });

  socket.on('host:reset_game', () => {
    clearAllTimers();
    io.emit('game:stop_all_media');
    gameState.status = 'LOBBY';
    gameState.currentQuestionIndex = 0;
    gameState.teams = createDefaultTeams();
    gameState.buzzerWinner = null;
    gameState.lockedTeamsForQuestion = [];
    gameState.chestType = null;
    gameState.activeChests = [];
    gameState.activePenalty = null;
    gameState.activeWheel = null;
    gameState.speedMath = null;
    gameState.teamNameChallenge = null;
    gameState.countdownNumber = 5;
    gameState.questionTimeRemaining = 30;
    gameState.shopRewards = JSON.parse(JSON.stringify(rewards));
    Object.values(gameState.players).forEach(p => {
      p.score = 0;
      p.inventory = [];
    });
    broadcastState();
  });

  socket.on('disconnect', () => {
    delete gameState.players[socket.id];
    broadcastState();
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 CLASSROOM QUIZ GAME SERVER RUNNING!`);
  console.log(`🖥️  Host / Projector URL : http://localhost:${PORT}`);
  console.log(`📱 Mobile Player URL    : http://${localIP}:${PORT}/play.html\n`);
});
