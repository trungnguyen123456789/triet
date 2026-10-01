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

const defaultQuestions = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'questions.json'), 'utf8'));

const defaultRewards = [
  { id: 100, name: "Máy Bay Boeing 787-9 Dreamliner (Vietnam Airlines)", price: 23000000000, priceFormatted: "23.000.000.000đ", pointsCost: 23000000, pointsFormatted: "23.000.000 Điểm", stock: 1, icon: "✈️", image: "/img/maybay.png", desc: "Siêu máy bay thân rộng Boeing 787-9 Dreamliner của Hãng hàng không Quốc gia. Tiêu chuẩn 5 sao, bao trọn bầu trời!", isSpotlight: true, category: "spotlight" },
  { id: 101, name: "Bá Khí Vô Cùng", price: 50000, priceFormatted: "50.000đ", pointsCost: 50, pointsFormatted: "50 Điểm", stock: 99, icon: "🥶", image: "/img/bakhi.png", desc: "Kích hoạt thần thái băng giá cực ngầu. Nhận ngay 1 tràng pháo tay tán thưởng rực rỡ từ toàn thể lớp học!", isBaKhi: true, category: "real" },
  { id: 1, name: "Snack Swing Bò Bít Tết (105g)", price: 60000, priceFormatted: "60.000đ", pointsCost: 60, pointsFormatted: "60 Điểm", stock: 2, icon: "🥔", image: "/img/swing.png", desc: "Gói khoai tây chiên Swing vị bò bít tết New York 105g giòn rụm (60k/gói).", category: "real" },
  { id: 2, name: "Lon Sting Dâu Mát Lạnh", price: 50000, priceFormatted: "50.000đ", pointsCost: 50, pointsFormatted: "50 Điểm", stock: 1, icon: "🥤", image: "/img/sting.png", desc: "Độc bản duy nhất 1 lon Sting dâu mát lạnh ăn mừng chiến thắng (50k/lon)!", category: "real" },
  { id: 3, name: "Mì Hảo Hảo Tôm Chua Cay", price: 25000, priceFormatted: "25.000đ", pointsCost: 25, pointsFormatted: "25 Điểm", stock: 2, icon: "🍜", image: "/img/haohao.png", desc: "Gói mì tôm chua cay quốc dân huyền thoại, bóp vụn ăn liền cực dính (25k/gói).", category: "real" },
  { id: 4, name: "Kẹo Sữa Dừa Bến Tre Yến Hoàng", price: 5000, priceFormatted: "5.000đ", pointsCost: 5, pointsFormatted: "5 Điểm / viên", stock: 25, icon: "🍬", image: "/img/keodua.png", desc: "Kẹo sữa dừa nguyên chất Bến Tre dẻo thơm béo ngậy (5k/viên).", category: "real" },
  { id: 102, name: "Trái Chuối Nghệ Thuật (Comedian)", price: 10000000, priceFormatted: "10.000.000đ", pointsCost: 10000, pointsFormatted: "10.000 Điểm", stock: 1, icon: "🍌", image: "/img/chuoi.png", desc: "Chuối dán băng keo bạc nghệ thuật đương đại Comedian, biểu tượng siêu giàu có!", category: "luxury" },
  { id: 103, name: "Voi Bụi Cỏ Châu Phi Trưởng Thành", price: 10000000000, priceFormatted: "10.000.000.000đ", pointsCost: 10000000, pointsFormatted: "10.000.000 Điểm", stock: 1, icon: "🐘", image: "/img/convoi.png", desc: "Một chú voi bụi cỏ châu Phi trưởng thành nguyên con, bao ship tận cửa lớp học!", category: "luxury" },
  { id: 104, name: "Tàu Vũ Trụ Soyuz (Trạm ISS)", price: 10000000000000000, priceFormatted: "10.000.000.000.000.000đ", pointsCost: 10000000000000, pointsFormatted: "10 Triệu Tỷ Điểm", stock: 1, icon: "🚀", image: "/img/soyuz.png", desc: "Tàu vũ trụ đưa cả nhóm lên trạm không gian quốc tế ISS, bảo hành trọn đời vũ trụ!", category: "luxury" }
];

let baseQuestions = defaultQuestions;
let rewards = defaultRewards;

const questionsInSubdir = path.join(__dirname, 'data', 'questions.json');
const questionsInRoot = path.join(__dirname, 'questions.json');
const rewardsInSubdir = path.join(__dirname, 'data', 'rewards.json');
const rewardsInRoot = path.join(__dirname, 'rewards.json');

try {
  if (fs.existsSync(questionsInSubdir)) {
    baseQuestions = JSON.parse(fs.readFileSync(questionsInSubdir, 'utf8'));
  } else if (fs.existsSync(questionsInRoot)) {
    baseQuestions = JSON.parse(fs.readFileSync(questionsInRoot, 'utf8'));
  } else {
    fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
    fs.writeFileSync(questionsInSubdir, JSON.stringify(defaultQuestions, null, 2), 'utf8');
  }
} catch (e) {
  console.warn('Fallback default questions:', e.message);
}

// Fisher-Yates shuffle algorithm for truly random question ordering
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

let questions = shuffleArray(baseQuestions);

function randomizeQuestions() {
  questions = shuffleArray(baseQuestions);
  console.log(`[Quiz] 🎲 Đã xáo trộn ngẫu nhiên thứ tự ${questions.length} câu hỏi!`);
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
        silenced: false,   // Banned from buzzing this question
        nitroX3: false,    // Bốc đầu Nitro x3: đúng x3, sai -8đ
        failInsurance: false, // Bảo hiểm thất bại: miễn rương xui xẻo khi sai
        vampireTarget: null, // Mục tiêu bị hút máu
        vampireTurns: 0,   // Số câu còn lại hiệu lực hút máu
        hideTwoWrong: null, // Thẻ 50/50: mảng các đáp án sai bị ẩn
        confusion: 0,      // Lời nguyền mù màu / xáo trộn phím
        stuckBuzzer: 0,    // Chuông kẹt nút (bấm 5 lần)
        nationalDebt: false // Nợ công quốc gia
      }
    });
  }
  return teams;
}

// Persistent players storage (maintains scores & inventory across reconnects / browser refreshes)
let persistentPlayers = {};

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

app.get('/api/rewards', (req, res) => {
  res.json(gameState.shopRewards);
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

// ACTION COVER PENALTIES DEFINITION & PACING CONTROL
const ACTION_PENALTY_POOL = [
  { code: 'ACTION_CONFESSION', title: 'Lời Thú Tội Ngọt Ngào', desc: 'Phải khen ngợi 1 bạn ở nhóm đối thủ một câu chân thành! (Không cộng điểm, chỉ để thoát phạt)', icon: '💌', isAction: true },
  { code: 'ACTION_CATWALK', title: 'Người Mẫu Bất Đắc Dĩ', desc: 'Đi catwalk quanh bục giảng theo điệu nhạc! (Làm được: +2đ cá nhân)', icon: '👠', isAction: true, mediaType: 'youtube', mediaId: 'yycVNcishrE' },
  { code: 'ACTION_DANCE', title: 'Idol Giới Trẻ (Mew Ichi Ni San)', desc: 'Cover điệu nhảy theo video phát trên máy chiếu! (Làm được: +2đ cá nhân)', icon: '💃', isAction: true, mediaType: 'youtube', mediaId: 'fK9hLf2Q35w' },
  { code: 'ACTION_DANCE_2', title: 'Vũ Đạo Bắt Trend (Tóp Tóp)', desc: 'Cover điệu nhảy sôi động theo video phát trên máy chiếu! (Làm được: +2đ cá nhân)', icon: '🕺', isAction: true, mediaType: 'youtube', mediaId: '36RwRpM6PdM' },
  { code: 'ACTION_RAP', title: 'Rapper Học Đường', desc: 'Cover rap bài này trong 1 phút! (Làm được: +2đ cá nhân)', icon: '🎤', isAction: true, mediaType: 'youtube', mediaId: 'vDJmvbl-Ccc' },
  { code: 'ACTION_TIKTOK_GROUP', title: 'Vũ Điệu Tập Thể (Muốn Anh Đau)', desc: 'CẢ NHÓM PHẢI NHẢY COVER BÀI NÀY! Đúng tất cả thành viên được CỘNG +4 ĐIỂM!', icon: '🔥', isAction: true, isGroup: true, mediaType: 'tiktok', mediaId: '7559228650248260882' }
];

let pendingActionQueue = [];
let unluckyTurnsSinceLastAction = 2; // Bắt đầu ở 2 để có thể xuất hiện khi thích hợp mà không trùng liên tiếp

function initActionQueue() {
  const rapAction = ACTION_PENALTY_POOL.find(a => a.code === 'ACTION_RAP');
  const tiktokAction = ACTION_PENALTY_POOL.find(a => a.code === 'ACTION_TIKTOK_GROUP');
  const otherActions = ACTION_PENALTY_POOL.filter(a => a.code !== 'ACTION_RAP' && a.code !== 'ACTION_TIKTOK_GROUP');

  // Randomly shuffle remaining actions (Ichi Ni San, Tiramisu Tóp Tóp, Catwalk, Lời Thú Tội)
  const shuffledOthers = shuffleArray(otherActions);

  // 1st is always Rap Học Đường, 2nd is always Muốn Em Đau (TikTok nhóm), then random
  pendingActionQueue = [rapAction, tiktokAction, ...shuffledOthers].filter(Boolean);
  unluckyTurnsSinceLastAction = 2;
  console.log('[Quiz] 🎬 Hàng đợi hình phạt hành động:', pendingActionQueue.map(a => a.title));
}
initActionQueue();

// 20 Chests Pool (Expanded with diverse lucky and unlucky rewards)
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
  { code: 'LUCKY_TRIPLE_7', title: 'Bát Quái 777 (Đại Lộc)', desc: 'Cực kỳ may mắn! Cá nhân +7 điểm, Nhóm nhận ngay +7 điểm!', icon: '🎰' },
  { code: 'LUCKY_RANK_BOOST', title: 'Cú Hích Thăng Hạng', desc: 'Bứt phá bảng xếp hạng! Nhóm được cộng số điểm = [Hạng hiện tại x 3] điểm!', icon: '🚀' },
  { code: 'LUCKY_CHEER_CLASS', title: 'Cả Lớp Cùng Vui', desc: 'Đại hỷ toàn phòng! Nhóm bạn nhận +10 điểm, tất cả 6 nhóm còn lại được ké +2 điểm!', icon: '🎉' },
  { code: 'LUCKY_GOLD_VAULT', title: 'Hầm Vàng Kho Báu', desc: 'Đào trúng hầm vàng! Nhóm được cộng ngẫu nhiên từ +12 đến +18 điểm nhóm!', icon: '💎' },
  { code: 'LUCKY_MVP_BLESSING', title: 'Vương Miện Thủ Lĩnh', desc: 'Phần thưởng đoàn kết: Tất cả thành viên trong nhóm +2 điểm cá nhân, Nhóm +6 điểm!', icon: '👑' },
  { code: 'LUCKY_SPONSOR_GIFT', title: 'Nhà Tài Trợ Vàng', desc: 'Được nhà tài trợ rót vốn! Nhóm nhận ngay +12 điểm nhóm!', icon: '🏆' },
  { code: 'LUCKY_STREAK_BONUS', title: 'Chiến Binh Bất Bại', desc: 'Khí thế ngút trời! Cá nhân +3 điểm, Nhóm nhận ngay +9 điểm!', icon: '🔥' },
  { code: 'LUCKY_ANCIENT_SCROLL', title: 'Bí Kíp Triết Học', desc: 'Khai sáng chân lý! Nhóm nhận ngay +11 điểm nhóm!', icon: '📜' },
  { code: 'ITEM_RISK_REWARD', title: 'Thẻ Liều Ăn Nhiều', desc: 'Lưu túi đồ: Câu sau chỉ được bấm A hoặc D (khóa B và C). Nếu đúng: +10đ cá nhân, +10đ nhóm!', icon: '🎯' },
  { code: 'ITEM_STEAL', title: 'Thẻ Siêu Đạo Tặc', desc: 'Lưu túi đồ: Chủ động chọn 1 nhóm & quay vòng cướp điểm!', icon: '🥷' },
  { code: 'ITEM_EQUALIZE', title: 'Thẻ Cào Bằng Thế Sự', desc: 'Lưu túi đồ: Chủ động kích hoạt tổng 7 đội chia đều cho 7!', icon: '⚖️' },
  { code: 'ITEM_SHIELD', title: 'Khiên Bảo Hộ', desc: 'Lưu túi đồ: Chủ động trang bị miễn trừ 1 lần phạt rương xui xẻo!', icon: '🛡️' },
  { code: 'ITEM_SILENCE', title: 'Thẻ Cấm Ngôn', desc: 'Lưu túi đồ: Khóa quyền bấm chuông 1 nhóm trong 1 câu!', icon: '🤐' },
  { code: 'ITEM_THANOS', title: 'Cú Búng Tay Của Thanos', desc: 'Lưu túi đồ: Xóa sạch toàn bộ điểm cá nhân của cả lớp về 0!', icon: '🧤' },
  { code: 'ITEM_SKIP_PENALTY', title: 'Thẻ Bỏ Qua Lượt (Miễn Hình Phạt)', desc: 'Lưu túi đồ: Dùng khi nhóm dính hình phạt nhảy cover để được miễn trừ biểu diễn mà không bị trừ điểm!', icon: '⏭️' },
  { code: 'ITEM_REFLECT', title: 'Thẻ "Gậy Ông Đập Lưng Ông"', desc: 'Lưu túi đồ: Tự động phản đòn 100% khi bị nhóm khác dùng Thẻ Cấm Ngôn, Cướp Điểm hoặc Ép Phạt!', icon: '🪞' },
  { code: 'ITEM_50_50', title: 'Thẻ "Nhìn Trộm Đề" (50/50)', desc: 'Lưu túi đồ: Loại bỏ ngay 2 đáp án sai trong câu hỏi, chỉ còn 2 lựa chọn (tỉ lệ trúng 50%)!', icon: '🔍' },
  { code: 'ITEM_PASS_PENALTY', title: 'Thẻ "Gắp Lửa Bỏ Tay Người"', desc: 'Lưu túi đồ: Khi dính hình phạt nhảy cover, được phép chỉ định 1 nhóm khác cử người lên nhảy thay!', icon: '🔄' },
  { code: 'ITEM_NITRO_X3', title: 'Thẻ "Bốc Đầu Nitro x3"', desc: 'Lưu túi đồ: Kích hoạt trước câu hỏi: Nếu đúng được x3 điểm, nhưng nếu trả lời sai sẽ bị trừ -8 điểm!', icon: '🚀' },
  { code: 'ITEM_VAMPIRE', title: 'Thẻ "Ký Sinh Trùng / Hút Máu"', desc: 'Lưu túi đồ: Đặt bùa lên 1 nhóm: Trong 2 câu tới, mỗi khi nhóm đó bị trừ điểm, nhóm mình hút trọn số điểm đó!', icon: '🧛' },
  { code: 'ITEM_FAIL_INSURANCE', title: 'Thẻ "Bảo Hiểm Thất Bại"', desc: 'Lưu túi đồ: Nếu bấm chuông mà trả lời sai, nhóm được MIỄN TOÀN BỘ RƯƠNG XUI XẺO và nhận +3 điểm an ủi!', icon: '📜' },
  { code: 'LUCKY_VIETLOTT', title: 'Xổ Số Vietlott Lớp Học', desc: 'Quay số ngẫu nhiên 1-7: Nhóm có số trùng khớp trúng ngay giải Jackpot +15 điểm!', icon: '🎰' },
  { code: 'LUCKY_SCHOLARSHIP', title: 'Học Bổng Toàn Phần', desc: 'Cộng điểm theo quân số: Mỗi thành viên trong nhóm đem về +2 điểm nhóm!', icon: '🎓' },
  { code: 'LUCKY_RAIN_LIXI', title: 'Mưa Lì Xì Cả Lớp', desc: 'Nhóm bạn nhận +10 điểm, và tự động lì xì mỗi nhóm khác +1 điểm giao lưu!', icon: '🧧' }
];

const unluckyPool = [
  { code: 'MINUS_HALF', title: '☠️ RƯƠNG CỰC KỲ XUI XẺO', desc: 'Thảm họa 5%: Nhóm bạn lập tức bị mất thẳng 50% tổng số điểm hiện có!', icon: '☠️', isSuperUnlucky: true },
  { code: 'RANDOM_UNLUCKY_TEAM', title: 'Sấm Sét Rơi Trúng', desc: 'Trừ ngẫu nhiên từ -1 đến -15 điểm của nhóm!', icon: '⚡' },
  { code: 'RANDOM_UNLUCKY_PERSONAL', title: 'Thủng Lốp Xe', desc: 'Trừ ngẫu nhiên từ -1 đến -8 điểm của cá nhân mở rương!', icon: '🚲' },
  { code: 'RANDOM_UNLUCKY_COMBO', title: 'Bão Giông Kép', desc: 'Trừ ngẫu nhiên (-1..8đ cá nhân) VÀ (-1..15đ nhóm)!', icon: '🌪️' },
  { code: 'RANDOM_UNLUCKY_TAX', title: 'Thu Thuế Đột Xuất', desc: 'Đoàn thanh tra ập tới: Nhóm bị thu thuế từ -3 đến -12 điểm!', icon: '🧾' },
  { code: 'UNLUCKY_SPEED_TICKET', title: 'Phạt Nguội Quá Tốc Độ', desc: 'Bấm chuông quá nhanh nhưng sai đáp án: Nhóm bị phạt trừ thẳng -6 điểm!', icon: '🚨' },
  { code: 'UNLUCKY_FALLING_POT', title: 'Chậu Cây Rơi Trúng Đầu', desc: 'Họa vô đơn chí: Cá nhân mở rương -2 điểm, Nhóm bị trừ -5 điểm!', icon: '🪴' },
  { code: 'UNLUCKY_BLACK_CAT', title: 'Mèo Đen Qua Đường', desc: 'Vận xui ập đến: Nhóm bị trừ ngẫu nhiên từ -5 đến -10 điểm!', icon: '🐈‍⬛' },
  { code: 'UNLUCKY_FREE_LUNCH', title: 'Bữa Trưa Miễn Phí (Đãi Cả Lớp)', desc: 'Nhóm bạn khao cả lớp: Bị trừ -6 điểm nhóm và chia cho mỗi nhóm khác +1 điểm!', icon: '🍕' },
  { code: 'UNLUCKY_SLIPPER', title: 'Chiếc Dép Bay Lạc', desc: 'Bị chiếc dép bay trúng: Cá nhân người mở rương bị trừ -3 điểm cá nhân!', icon: '🩴' },
  { code: 'UNLUCKY_ELECTRIC_BILL', title: 'Hóa Đơn Tiền Điện Tăng Giá', desc: 'Dùng điều hòa quá đà: Nhóm bị phạt trừ thẳng -7 điểm nhóm!', icon: '⚡' },
  { code: 'UNLUCKY_RAIN_LEAK', title: 'Nhà Dột Mùa Mưa', desc: 'Thời tiết không ủng hộ: Nhóm bị trừ ngẫu nhiên từ -4 đến -8 điểm!', icon: '🌧️' },
  { code: 'UNLUCKY_LOW_BATTERY', title: 'Pin Yếu Sập Nguồn', desc: 'Quên sạc điện thoại: Cá nhân -2 điểm cá nhân, Nhóm -4 điểm nhóm!', icon: '🪫' },
  { code: 'UNLUCKY_PUNCTURE', title: 'Cán Đinh Thủng Lốp', desc: 'Dắt bộ cả buổi: Nhóm bị trừ thẳng -8 điểm nhóm!', icon: '🛵' },
  { code: 'DELAY_3S', title: 'Lời Nguyền Delay 3 Giây', desc: 'Ở câu hỏi kế tiếp, câu hỏi và nút bấm của nhóm bạn sẽ bị hiển thị chậm 3 giây!', icon: '🐢' },
  { code: 'RANK_PENALTY', title: 'Rút Ruột Thứ Hạng', desc: 'Bị trừ số điểm bằng đúng Hạng hiện tại x 2!', icon: '📉' },
  { code: 'EMPTY_CHEST', title: 'Rương Rỗng (Cú Lừa Thế Kỷ)', desc: 'Không có gì cả! May mắn thoát nạn: Không được điểm và cũng không bị phạt!', icon: '💨' },
  { code: 'GIVE_CHARITY', title: 'Nhà Từ Thiện Bất Đắc Dĩ (Đại Xui)', desc: 'Trích 20% điểm nhóm chia đều cho 6 nhóm còn lại!', icon: '💸' },
  { code: 'FREEZE_1', title: 'Đóng Băng', desc: 'Nhóm bị khóa quyền bấm chuông trong 1 câu hỏi kế tiếp!', icon: '❄️' },
  { code: 'SLIP_MINUS', title: 'Hụt Chân', desc: 'Cá nhân -1 điểm, Nhóm -3 điểm!', icon: '🕳️' },
  { code: 'UNLUCKY_CONFUSION', title: 'Lời Nguyền Mù Màu / Xáo Trộn Phím', desc: 'Ở câu hỏi kế tiếp, 4 nút đáp án A-B-C-D trên điện thoại nhóm bạn sẽ bị xáo trộn vị trí ngẫu nhiên!', icon: '🌀' },
  { code: 'UNLUCKY_STUCK_BUZZER', title: 'Chuông Kẹt Nút / Mạng Lag', desc: 'Ở câu hỏi kế tiếp, người chơi phải bấm nút chuông liên tục 5 lần mới phát được tín hiệu!', icon: '🐢' },
  { code: 'UNLUCKY_NATIONAL_DEBT', title: 'Nợ Công Quốc Gia (Đóng Băng Điểm)', desc: 'Nhóm bị ghi nợ: Câu hỏi kế tiếp nếu trả lời đúng, điểm thưởng sẽ dùng để trả nợ (không cộng vào tổng)!', icon: '🏦' },
  { code: 'UNLUCKY_POISON_APPLE', title: 'Quả Táo Độc (San Sẻ Nỗi Đau)', desc: 'Nhóm bị trừ -6 điểm, và 6 điểm này được chia đều cho 6 nhóm đối thủ (mỗi nhóm ké +1 điểm)!', icon: '🍎' },
  ...ACTION_PENALTY_POOL
];

function generateChests(isLucky) {
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
      if (t.buffs.confusion > 0) t.buffs.confusion--;
      if (t.buffs.stuckBuzzer > 0) t.buffs.stuckBuzzer--;
      if (t.buffs.vampireTurns > 0) {
        t.buffs.vampireTurns--;
        if (t.buffs.vampireTurns === 0) t.buffs.vampireTarget = null;
      }
      if (t.buffs.nitroX3) {
        deductTeamPoints(t, 8, 'Kích hoạt Nitro x3 nhưng không bấm chuông trả lời');
        t.buffs.nitroX3 = false;
        io.emit('game:announcement', {
          title: '🚀 NITRO X3: HẾT GIỜ KHÔNG BẤM ĐƯỢC!',
          desc: `${t.name} đã kích hoạt Nitro x3 nhưng không bấm chuông trả lời, bị trừ -8 điểm!`,
          soundType: 'bad'
        });
      }
      t.buffs.failInsurance = false;
      t.buffs.hideTwoWrong = null;
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
  gameState.isRound2 = true;

  // COUNTDOWN 5 4 3 2 1 INSTEAD OF SHOWING ANNOUNCEMENT POPUP
  gameState.status = 'COUNTDOWN';
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

// Socket handlers
io.on('connection', (socket) => {
  socket.isHostAuthorized = false;

  socket.on('host:authenticate', ({ pin }) => {
    if (pin === '4829') {
      socket.isHostAuthorized = true;
      socket.emit('host:auth_success');
    } else {
      socket.isHostAuthorized = false;
      socket.emit('host:auth_failed', { message: 'Mã PIN không chính xác' });
    }
  });

  socket.emit('game:state_update', getPublicState());

  socket.on('player:join', ({ playerId, name, teamId }) => {
    if (!name || !teamId) return;
    const teamNum = parseInt(teamId, 10);
    if (teamNum < 1 || teamNum > 7) return;

    const cleanName = name.trim().substring(0, 25);
    const persistentKey = playerId || `${cleanName.toLowerCase()}_team_${teamNum}`;

    if (!persistentPlayers[persistentKey]) {
      persistentPlayers[persistentKey] = {
        id: persistentKey,
        socketId: socket.id,
        persistentKey: persistentKey,
        name: cleanName,
        teamId: teamNum,
        score: 0,
        inventory: []
      };
    }

    const reg = persistentPlayers[persistentKey];
    reg.socketId = socket.id;
    reg.name = cleanName;
    reg.teamId = teamNum;

    // Clean up any stale sockets pointing to this player
    for (const [sId, p] of Object.entries(gameState.players)) {
      if (sId !== socket.id && (p.persistentKey === persistentKey || (p.name.toLowerCase() === cleanName.toLowerCase() && p.teamId === teamNum))) {
        delete gameState.players[sId];
      }
    }

    gameState.players[socket.id] = reg;

    // Re-link active state winner/penalty to new socket if it matches this player
    if (gameState.buzzerWinner && (gameState.buzzerWinner.playerId === persistentKey || (gameState.buzzerWinner.playerName.toLowerCase() === cleanName.toLowerCase() && gameState.buzzerWinner.teamId === teamNum))) {
      gameState.buzzerWinner.socketId = socket.id;
    }
    if (gameState.activePenalty && (gameState.activePenalty.playerId === persistentKey || (gameState.activePenalty.playerName.toLowerCase() === cleanName.toLowerCase() && gameState.activePenalty.teamId === teamNum))) {
      gameState.activePenalty.socketId = socket.id;
    }

    broadcastState();
  });

  // Buzzer answer selection
  socket.on('player:buzz_answer', ({ optionIndex, playerId, name, teamId }) => {
    if (gameState.status !== 'QUESTION') return;
    let player = gameState.players[socket.id];
    if (!player && (playerId || (name && teamId))) {
      const pKey = playerId || `${(name || '').trim().toLowerCase()}_team_${teamId}`;
      if (persistentPlayers[pKey]) {
        player = persistentPlayers[pKey];
        player.socketId = socket.id;
        gameState.players[socket.id] = player;
      }
    }
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
          desc: `Nhóm ${team.id} đã dũng cảm chấp nhận rủi ro và trả lời ĐÚNG! Nhận ngay +10đ Nhóm và +10đ Cá nhân!`,
          soundType: 'good'
        });
      }

      // NITRO X3 BONUS
      if (team && team.buffs.nitroX3) {
        teamPoints *= 3;
        playerPoints *= 3;
        team.buffs.nitroX3 = false;
        io.emit('game:announcement', {
          title: '🚀 BỐC ĐẦU NITRO X3 THÀNH CÔNG VANG DỘI!',
          desc: `${winner.teamName} đã bốc đầu chuẩn xác! Điểm thưởng nhân 3: +${teamPoints}đ Nhóm & +${playerPoints}đ Cá nhân!`,
          soundType: 'good'
        });
      }

      // NATIONAL DEBT CHECK
      if (team && team.buffs.nationalDebt) {
        team.buffs.nationalDebt = false;
        teamPoints = 0; // Trả nợ công quốc gia
        io.emit('game:announcement', {
          title: '🏦 TRẢ NỢ CÔNG QUỐC GIA THÀNH CÔNG!',
          desc: `${winner.teamName} trả lời đúng nhưng toàn bộ điểm câu này dùng để trả nợ công! Nhóm đã chính thức sạch nợ!`,
          soundType: 'good'
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

      // NITRO X3 PENALTY: SAI BỊ TRỪ -8 ĐIỂM
      if (team && team.buffs.nitroX3) {
        team.buffs.nitroX3 = false;
        deductTeamPoints(team, 8, 'Bốc đầu Nitro x3 thất bại');
        io.emit('game:announcement', {
          title: '💥 BỐC ĐẦU NITRO X3 THẤT BẠI!',
          desc: `${winner.teamName} liều lĩnh bốc đầu nhưng trả lời sai! Bị trừ thẳng -8 điểm nhóm!`,
          soundType: 'bad'
        });
      }

      // FAIL INSURANCE: MIỄN RƯƠNG XUI XẺO VÀ NHẬN +3Đ AN ỦI
      if (team && team.buffs.failInsurance) {
        team.buffs.failInsurance = false;
        team.score += 3;
        io.emit('game:announcement', {
          title: '📜 BẢO HIỂM THẤT BẠI ĐÃ ĐƯỢC KÍCH HOẠT!',
          desc: `${winner.teamName} trả lời sai nhưng có Bảo Hiểm Thất Bại: MIỄN TOÀN BỘ RƯƠNG XUI XẺO và được nhận thêm +3 điểm an ủi!`,
          soundType: 'good'
        });
        gameState.status = 'CHEST_FINISHED';
        broadcastState();
        return;
      }

      if (team && team.buffs.shield) {
        team.buffs.shield = false;
        io.emit('game:announcement', {
          title: '🛡️ KHIÊN BẢO HỘ KÍCH HOẠT!',
          desc: `${winner.teamName} đã dùng Khiên Bảo Hộ để chặn rương xui xẻo!`,
          soundType: 'good'
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
  socket.on('player:pick_chest', ({ chestId, playerId, name, teamId }) => {
    if (gameState.status !== 'CHEST_SELECTION') return;
    const winner = gameState.buzzerWinner;
    if (!winner) return;

    let player = gameState.players[socket.id];
    if (!player && (playerId || (name && teamId))) {
      const pKey = playerId || `${(name || '').trim().toLowerCase()}_team_${teamId}`;
      if (persistentPlayers[pKey]) {
        player = persistentPlayers[pKey];
        player.socketId = socket.id;
        gameState.players[socket.id] = player;
      }
    }

    const isWinner = (
      winner.socketId === socket.id ||
      winner.playerId === (player && player.id) ||
      winner.playerId === playerId ||
      (player && winner.playerName === player.name && winner.teamId === player.teamId) ||
      (name && winner.playerName === name && winner.teamId === parseInt(teamId, 10))
    );
    if (!isWinner) return;

    // Keep winner socketId fresh
    winner.socketId = socket.id;

    const chest = gameState.activeChests.find(c => c.id === chestId);
    if (!chest || chest.opened) return;

    chest.opened = true;
    let reward = chest.reward;
    const activePlayer = player || gameState.players[winner.socketId] || { name: winner.playerName, score: 0 };
    const team = gameState.teams.find(t => t.id === winner.teamId);

    // INTELLIGENT ACTION PENALTY PACING & ANTI-CONSECUTIVE CONTROL
    if (chest.type === 'UNLUCKY') {
      const isCooldown = (unluckyTurnsSinceLastAction < 2);

      if (isCooldown) {
        // Cooldown active: MUST NOT be an action penalty to prevent consecutive actions!
        unluckyTurnsSinceLastAction++;
        if (reward.isAction) {
          const nonActionPool = unluckyPool.filter(r => !r.isAction);
          reward = { ...nonActionPool[Math.floor(Math.random() * nonActionPool.length)] };
          chest.reward = reward;
        }
      } else {
        // Cooldown passed: Guarantee the next unplayed cover dance / action from queue!
        if (pendingActionQueue.length === 0) {
          initActionQueue();
        }
        const nextAction = pendingActionQueue.shift();
        reward = { ...nextAction };
        chest.reward = reward;
        unluckyTurnsSinceLastAction = 0; // Reset cooldown
      }
    }

    if (chest.type === 'LUCKY') {
      handleLuckyReward(reward, activePlayer, team);
    } else {
      handleUnluckyReward(reward, activePlayer, team);
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
      case 'LUCKY_TRIPLE_7':
        if (player) player.score += 7;
        if (team) team.score += 7;
        reward.desc = `Bát quái đại lộc: Cá nhân +7 điểm, Nhóm +7 điểm!`;
        io.emit('game:announcement', {
          title: '🎰 BÁT QUÁI 777: +7Đ CÁ NHÂN & +7Đ NHÓM!',
          desc: `Cực kỳ may mắn! ${winnerPlayerName(player)} và Nhóm ${team ? team.id : ''} đều nhận được +7 điểm lộc phát!`,
          soundType: 'good'
        });
        break;
      case 'LUCKY_RANK_BOOST':
        if (team) {
          const sorted = [...gameState.teams].sort((a, b) => b.score - a.score);
          const rank = sorted.findIndex(t => t.id === team.id) + 1;
          const boostPts = rank * 3;
          team.score += boostPts;
          reward.desc = `Đang ở Hạng ${rank}: Nhóm nhận +${boostPts} điểm (${rank} x 3) để bứt phá!`;
          io.emit('game:announcement', {
            title: `🚀 CÚ HÍCH THĂNG HẠNG: +${boostPts} ĐIỂM!`,
            desc: `Nhóm ${team.id} đang ở Hạng ${rank} nên được trợ lực +${boostPts} điểm để thăng hạng!`,
            soundType: 'good'
          });
        }
        break;
      case 'LUCKY_CHEER_CLASS':
        if (team) {
          team.score += 10;
          gameState.teams.forEach(t => {
            if (t.id !== team.id) t.score += 2;
          });
          reward.desc = `Nhóm bạn +10đ! Tất cả 6 nhóm còn lại đều được ké +2đ!`;
          io.emit('game:announcement', {
            title: '🎉 CẢ LỚP CÙNG VUI: NHÓM BẠN +10Đ & 6 NHÓM KIA +2Đ!',
            desc: `Nhóm ${team.id} nhận +10 điểm và tặng lộc cho cả 6 nhóm còn lại mỗi nhóm +2 điểm!`,
            soundType: 'good'
          });
        }
        break;
      case 'LUCKY_GOLD_VAULT':
        if (team) {
          const goldPts = Math.floor(Math.random() * 7) + 12; // 12 -> 18
          team.score += goldPts;
          reward.desc = `Hầm vàng kho báu: Nhóm ${team.id} nhận ngay +${goldPts} điểm!`;
          io.emit('game:announcement', {
            title: `💎 HẦM VÀNG KHO BÁU: +${goldPts} ĐIỂM!`,
            desc: `Đào trúng mỏ kim cương! Nhóm ${team.id} nhận ngay +${goldPts} điểm nhóm!`,
            soundType: 'good'
          });
        }
        break;
      case 'LUCKY_MVP_BLESSING':
        if (team) team.score += 6;
        Object.values(gameState.players).forEach(p => {
          if (p.teamId === (team ? team.id : null)) p.score += 2;
        });
        reward.desc = `Tất cả thành viên trong nhóm +2đ cá nhân, Nhóm +6đ!`;
        io.emit('game:announcement', {
          title: '👑 VƯƠNG MIỆN THỦ LĨNH: +2Đ TẤT CẢ THÀNH VIÊN & +6Đ NHÓM!',
          desc: `Hào quang lãnh đạo! Toàn bộ thành viên Nhóm ${team ? team.id : ''} được cộng +2 điểm và nhóm +6 điểm!`,
          soundType: 'good'
        });
        break;
      case 'LUCKY_SPONSOR_GIFT':
        if (team) {
          team.score += 12;
          reward.desc = `Nhà tài trợ rót vốn: Nhóm ${team.id} nhận ngay +12 điểm!`;
          io.emit('game:announcement', {
            title: '🏆 NHÀ TÀI TRỢ VÀNG: +12 ĐIỂM!',
            desc: `Nhóm ${team.id} được nhà tài trợ rót vốn +12 điểm nhóm!`,
            soundType: 'good'
          });
        }
        break;
      case 'LUCKY_STREAK_BONUS':
        if (player) player.score += 3;
        if (team) team.score += 9;
        reward.desc = `Cá nhân +3đ, Nhóm +9đ!`;
        io.emit('game:announcement', {
          title: '🔥 CHIẾN BINH BẤT BẠI: +3Đ CÁ NHÂN & +9Đ NHÓM!',
          desc: `${winnerPlayerName(player)} nhận +3 điểm cá nhân và Nhóm ${team ? team.id : ''} nhận +9 điểm nhóm!`,
          soundType: 'good'
        });
        break;
      case 'LUCKY_ANCIENT_SCROLL':
        if (team) {
          team.score += 11;
          reward.desc = `Bí kíp triết học: Nhóm ${team.id} nhận ngay +11 điểm!`;
          io.emit('game:announcement', {
            title: '📜 BÍ KÍP TRIẾT HỌC: +11 ĐIỂM!',
            desc: `Khai sáng chân lý! Nhóm ${team.id} lĩnh hội bí kíp và nhận +11 điểm nhóm!`,
            soundType: 'good'
          });
        }
        break;
      case 'MATH_CHALLENGE':
        initSpeedMath(player, team);
        return;
      case 'TEAM_NAME_CHALLENGE':
        initTeamNameChallenge(player, team);
        return;
      case 'LUCKY_VIETLOTT':
        {
          const luckyTeamId = Math.floor(Math.random() * 7) + 1;
          const luckyWinnerTeam = gameState.teams.find(t => t.id === luckyTeamId);
          if (luckyWinnerTeam) luckyWinnerTeam.score += 15;
          reward.desc = `Quay trúng số [${luckyTeamId}]! Nhóm ${luckyTeamId} nhận ngay giải Jackpot +15 điểm!`;
          io.emit('game:announcement', {
            title: '🎰 XỔ SỐ VIETLOTT LỚP HỌC TRÚNG JACKPOT!',
            desc: `Quả cầu may mắn dừng ở Số [${luckyTeamId}]! Xin chúc mừng ${luckyWinnerTeam ? luckyWinnerTeam.name : `Nhóm ${luckyTeamId}`} đã trúng giải Jackpot độc đắc +15 ĐIỂM!`,
            soundType: 'good'
          });
        }
        break;
      case 'LUCKY_SCHOLARSHIP':
        if (team) {
          const memberCount = Object.values(gameState.players).filter(p => p.teamId === team.id).length;
          const finalBonus = Math.max(6, memberCount * 2);
          team.score += finalBonus;
          reward.desc = `Học bổng theo quân số: ${memberCount} thành viên x 2 = +${finalBonus} điểm!`;
          io.emit('game:announcement', {
            title: '🎓 HỌC BỔNG TOÀN PHẦN RÓT VỐN!',
            desc: `Nhóm ${team.id} có ${memberCount} thành viên! Nhận ngay học bổng tài trợ: ${memberCount} x 2 = +${finalBonus} ĐIỂM NHÓM!`,
            soundType: 'good'
          });
        }
        break;
      case 'LUCKY_RAIN_LIXI':
        if (team) {
          team.score += 10;
          gameState.teams.forEach(t => {
            if (t.id !== team.id) t.score += 1;
          });
          reward.desc = `Mưa lì xì đại hỷ: Nhóm bạn +10 điểm, tất cả 6 nhóm khác được lì xì +1 điểm!`;
          io.emit('game:announcement', {
            title: '🧧 MƯA LÌ XÌ CẢ LỚP ĐẠI HỶ!',
            desc: `${winnerPlayerName(player)} mở trúng Mưa Lì Xì! Nhóm ${team.id} nhận +10 điểm, và lì xì hữu nghị mỗi nhóm khác +1 điểm giao lưu!`,
            soundType: 'good'
          });
        }
        break;
      case 'ITEM_RISK_REWARD':
      case 'ITEM_STEAL':
      case 'ITEM_EQUALIZE':
      case 'ITEM_SHIELD':
      case 'ITEM_SILENCE':
      case 'ITEM_THANOS':
      case 'ITEM_SKIP_PENALTY':
      case 'ITEM_REFLECT':
      case 'ITEM_50_50':
      case 'ITEM_PASS_PENALTY':
      case 'ITEM_NITRO_X3':
      case 'ITEM_VAMPIRE':
      case 'ITEM_FAIL_INSURANCE':
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

  function deductTeamPoints(targetTeam, points, reason) {
    if (!targetTeam || points <= 0) return 0;
    targetTeam.score = Math.max(0, targetTeam.score - points);

    // Check if any team has Vampire bùa on this targetTeam
    gameState.teams.forEach(vampireTeam => {
      if (vampireTeam.id !== targetTeam.id && vampireTeam.buffs && vampireTeam.buffs.vampireTarget === targetTeam.id && vampireTeam.buffs.vampireTurns > 0) {
        vampireTeam.score += points;
        io.emit('game:announcement', {
          title: '🧛 KÝ SINH TRÙNG HÚT MÁU!',
          desc: `${vampireTeam.name} đã hút trọn +${points} điểm vừa bị trừ của ${targetTeam.name}!`,
          soundType: 'good'
        });
      }
    });
    return points;
  }

  function removePlayerInventoryItem(teamId, code) {
    Object.values(gameState.players).forEach(p => {
      if (p.teamId === teamId && p.inventory) {
        const idx = p.inventory.findIndex(it => it.code === code);
        if (idx !== -1) p.inventory.splice(idx, 1);
      }
    });
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
        mediaType: reward.mediaType || (vidId ? 'youtube' : 'none'),
        mediaId: vidId || null,
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
      case 'UNLUCKY_SPEED_TICKET':
        if (team) {
          team.score = Math.max(0, team.score - 6);
          reward.desc = `Phạt nguội quá tốc độ: Nhóm ${team.id} bị phạt trừ -6 điểm!`;
          io.emit('game:announcement', {
            title: '🚨 PHẠT NGUỘI QUÁ TỐC ĐỘ: -6 ĐIỂM!',
            desc: `Bấm chuông quá nhanh nhưng sai đáp án! Nhóm ${team.id} bị phạt trừ -6 điểm nhóm!`,
            soundType: 'bad'
          });
        }
        break;
      case 'UNLUCKY_FALLING_POT':
        if (player) player.score = Math.max(0, player.score - 2);
        if (team) team.score = Math.max(0, team.score - 5);
        reward.desc = `Chậu cây rơi trúng đầu: Cá nhân -2 điểm, Nhóm -5 điểm!`;
        io.emit('game:announcement', {
          title: '🪴 CHẬU CÂY RƠI TRÚNG ĐẦU: -2Đ CÁ NHÂN & -5Đ NHÓM!',
          desc: `Họa vô đơn chí! ${winnerPlayerName(player)} bị trừ -2 điểm cá nhân và Nhóm ${team ? team.id : ''} bị trừ -5 điểm!`,
          soundType: 'bad'
        });
        break;
      case 'UNLUCKY_BLACK_CAT':
        if (team) {
          const minus = Math.floor(Math.random() * 6) + 5; // 5 -> 10
          team.score = Math.max(0, team.score - minus);
          reward.desc = `Mèo đen qua đường: Nhóm ${team.id} bị trừ ngẫu nhiên -${minus} điểm!`;
          io.emit('game:announcement', {
            title: `🐈‍⬛ MÈO ĐEN QUA ĐƯỜNG: -${minus} ĐIỂM!`,
            desc: `Vận xui ập đến! Nhóm ${team.id} bị trừ ngẫu nhiên -${minus} điểm nhóm!`,
            soundType: 'bad'
          });
        }
        break;
      case 'UNLUCKY_FREE_LUNCH':
        if (team) {
          team.score = Math.max(0, team.score - 6);
          gameState.teams.forEach(t => {
            if (t.id !== team.id) t.score += 1;
          });
          reward.desc = `Đãi cả lớp một chầu: Nhóm bạn -6 điểm, tặng mỗi nhóm khác +1 điểm!`;
          io.emit('game:announcement', {
            title: '🍕 BỮA TRƯA MIỄN PHÍ: NHÓM BẠN -6Đ & 6 NHÓM KHÁC +1Đ!',
            desc: `Nhóm ${team.id} khao cả lớp: Bị trừ -6 điểm nhóm và chia cho mỗi nhóm khác +1 điểm!`,
            soundType: 'bad'
          });
        }
        break;
      case 'UNLUCKY_SLIPPER':
        if (player) {
          player.score = Math.max(0, player.score - 3);
          reward.desc = `Chiếc dép bay lạc: ${winnerPlayerName(player)} bị trừ -3 điểm cá nhân!`;
          io.emit('game:announcement', {
            title: '🩴 CHIẾC DÉP BAY LẠC: -3 ĐIỂM CÁ NHÂN!',
            desc: `Bị chiếc dép bay trúng! ${winnerPlayerName(player)} bị trừ -3 điểm cá nhân!`,
            soundType: 'bad'
          });
        }
        break;
      case 'UNLUCKY_ELECTRIC_BILL':
        if (team) {
          team.score = Math.max(0, team.score - 7);
          reward.desc = `Hóa đơn điện tăng giá: Nhóm ${team.id} bị trừ -7 điểm!`;
          io.emit('game:announcement', {
            title: '⚡ HÓA ĐƠN TIỀN ĐIỆN TĂNG GIÁ: -7 ĐIỂM!',
            desc: `Dùng điều hòa quá đà! Nhóm ${team.id} bị phạt trừ thẳng -7 điểm nhóm!`,
            soundType: 'bad'
          });
        }
        break;
      case 'UNLUCKY_RAIN_LEAK':
        if (team) {
          const minus = Math.floor(Math.random() * 5) + 4; // 4 -> 8
          team.score = Math.max(0, team.score - minus);
          reward.desc = `Nhà dột mùa mưa: Nhóm ${team.id} bị trừ ngẫu nhiên -${minus} điểm!`;
          io.emit('game:announcement', {
            title: `🌧️ NHÀ DỘT MÙA MƯA: -${minus} ĐIỂM!`,
            desc: `Nước ngập tài sản! Nhóm ${team.id} bị cuốn trôi mất -${minus} điểm nhóm!`,
            soundType: 'bad'
          });
        }
        break;
      case 'UNLUCKY_LOW_BATTERY':
        if (player) player.score = Math.max(0, player.score - 2);
        if (team) team.score = Math.max(0, team.score - 4);
        reward.desc = `Pin yếu sập nguồn: Cá nhân -2 điểm, Nhóm -4 điểm!`;
        io.emit('game:announcement', {
          title: '🪫 PIN YẾU SẬP NGUỒN: -2Đ CÁ NHÂN & -4Đ NHÓM!',
          desc: `Quên sạc điện thoại! ${winnerPlayerName(player)} bị trừ -2 điểm cá nhân và Nhóm ${team ? team.id : ''} bị trừ -4 điểm!`,
          soundType: 'bad'
        });
        break;
      case 'UNLUCKY_PUNCTURE':
        if (team) {
          deductTeamPoints(team, 8, 'Cán đinh thủng lốp');
          reward.desc = `Cán đinh thủng lốp: Nhóm ${team.id} bị trừ -8 điểm!`;
          io.emit('game:announcement', {
            title: '🛵 CÁN ĐINH THỦNG LỐP: -8 ĐIỂM!',
            desc: `Dắt bộ cả buổi! Nhóm ${team.id} bị trừ -8 điểm nhóm!`,
            soundType: 'bad'
          });
        }
        break;
      case 'UNLUCKY_CONFUSION':
        if (team) {
          team.buffs.confusion = 1;
          reward.desc = `Ảo giác bao trùm: Ở câu hỏi kế tiếp, 4 nút đáp án A-B-C-D trên điện thoại của Nhóm ${team.id} sẽ bị xáo trộn vị trí ngẫu nhiên!`;
          io.emit('game:announcement', {
            title: '🌀 LỜI NGUYỀN MÙ MÀU & XÁO TRỘN PHÍM!',
            desc: `Ở câu hỏi kế tiếp, 4 nút đáp án A-B-C-D trên điện thoại của Nhóm ${team.id} sẽ bị xáo trộn vị trí ngẫu nhiên!`,
            soundType: 'bad'
          });
        }
        break;
      case 'UNLUCKY_STUCK_BUZZER':
        if (team) {
          team.buffs.stuckBuzzer = 1;
          reward.desc = `Đường truyền chập chờn: Ở câu hỏi tiếp theo, thành viên Nhóm ${team.id} phải bấm nút chuông liên tục 5 lần mới phát được tín hiệu!`;
          io.emit('game:announcement', {
            title: '🐢 CHUÔNG KẸT NÚT - MẠNG LAG!',
            desc: `Ở câu hỏi tiếp theo, thành viên Nhóm ${team.id} phải bấm nút chuông liên tục 5 lần mới phát được tín hiệu!`,
            soundType: 'bad'
          });
        }
        break;
      case 'UNLUCKY_NATIONAL_DEBT':
        if (team) {
          team.buffs.nationalDebt = true;
          reward.desc = `Bị ghi sổ nợ công! Câu hỏi sau nếu trả lời đúng, điểm thưởng sẽ dùng để trả nợ!`;
          io.emit('game:announcement', {
            title: '🏦 NỢ CÔNG QUỐC GIA ẬP TỚI!',
            desc: `Nhóm ${team.id} bị ghi sổ nợ công! Ở câu hỏi tiếp theo nếu trả lời đúng, điểm thưởng sẽ bị sung công để trả nợ!`,
            soundType: 'bad'
          });
        }
        break;
      case 'UNLUCKY_POISON_APPLE':
        if (team) {
          deductTeamPoints(team, 6, 'Quả Táo Độc');
          gameState.teams.forEach(t => {
            if (t.id !== team.id) t.score += 1;
          });
          reward.desc = `Cắn phải táo độc: Nhóm bạn -6 điểm, chia đều cho 6 nhóm đối thủ mỗi nhóm +1 điểm!`;
          io.emit('game:announcement', {
            title: '🍎 QUẢ TÁO ĐỘC - SAN SẺ NỖI ĐAU!',
            desc: `Nhóm ${team.id} cắn phải táo độc bị trừ -6 điểm! Số điểm này được chia đều cho 6 nhóm đối thủ (mỗi nhóm ké +1 điểm)!`,
            soundType: 'bad'
          });
        }
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
    if (!socket.isHostAuthorized) return;
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
    if (!socket.isHostAuthorized) return;
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
    io.emit('game:start_action_countdown');
    broadcastState();
  });

  socket.on('host:start_action_performance', () => {
    if (!socket.isHostAuthorized) return;
    if (gameState.status !== 'ACTION_PENALTY' || !gameState.activePenalty) return;
    gameState.activePenalty.isPerforming = true;
    io.emit('game:start_action_countdown');
    broadcastState();
  });

  // HOST 3-BUTTON ACTION JUDGMENT
  socket.on('host:judge_action', ({ result }) => {
    if (!socket.isHostAuthorized) return;
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
        // ONLY CATWALK AND DANCE/MUSIC COVER GET INDIVIDUAL POINTS (+2)
        const eligibleActionTypes = ['ACTION_CATWALK', 'ACTION_DANCE', 'ACTION_DANCE_2', 'ACTION_RAP'];
        if (eligibleActionTypes.includes(penalty.type)) {
          if (player) player.score += 2;
          bonusMsg = `${penalty.playerName} đã dũng cảm biểu diễn thành công! Nhận ngay +2 ĐIỂM CÁ NHÂN!`;
        } else {
          bonusMsg = `${penalty.playerName} đã hoàn thành lời khen đối thủ! Thoát khỏi vòng quay trừ điểm!`;
        }
      }

      io.emit('game:announcement', {
        title: '🎉 THỰC HIỆN THỬ THÁCH THÀNH CÔNG!',
        desc: bonusMsg,
        soundType: 'good'
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
        { label: '☠️ Cá nhân -5đ | Nhóm -10đ', pMinus: 5, tMinus: 10 },
        { label: '⚡ Cá nhân -6đ | Nhóm -12đ', pMinus: 6, tMinus: 12 },
        { label: '💥 Cá nhân -7đ | Nhóm -14đ', pMinus: 7, tMinus: 14 },
        { label: '🔥 Cá nhân -8đ | Nhóm -16đ', pMinus: 8, tMinus: 16 },
        { label: '💣 Cá nhân -9đ | Nhóm -18đ', pMinus: 9, tMinus: 18 },
        { label: '💀 Cá nhân -10đ | Nhóm -19đ', pMinus: 10, tMinus: 19 }
      ];

      startWheelSpin({
        type: 'PENALTY_FORFEIT',
        title: '🎡 VÒNG QUAY CHỊU PHẠT NẶNG (NÉ BIỂU DIỄN)',
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
      { label: '☠️ Cá nhân -5đ | Nhóm -10đ', pMinus: 5, tMinus: 10 },
      { label: '⚡ Cá nhân -6đ | Nhóm -12đ', pMinus: 6, tMinus: 12 },
      { label: '💥 Cá nhân -7đ | Nhóm -14đ', pMinus: 7, tMinus: 14 },
      { label: '🔥 Cá nhân -8đ | Nhóm -16đ', pMinus: 8, tMinus: 16 },
      { label: '💣 Cá nhân -9đ | Nhóm -18đ', pMinus: 9, tMinus: 18 },
      { label: '💀 Cá nhân -10đ | Nhóm -19đ', pMinus: 10, tMinus: 19 }
    ];

    startWheelSpin({
      type: 'PENALTY_FORFEIT',
      title: '🎡 VÒNG QUAY CHỊU PHẠT NẶNG (TỪ CHỐI BIỂU DIỄN)',
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
      if (team) deductTeamPoints(team, seg.tMinus || 0, 'Chịu phạt từ chối biểu diễn');
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
        deductTeamPoints(targetTeam, actualSteal, 'Bị cướp điểm');
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

    // RESTRICTION DURING ACTION PENALTY: ONLY SKIP ITEM OR PASS_PENALTY ALLOWED
    if (gameState.status === 'ACTION_PENALTY') {
      const isSkipItem = (item.code === 'ITEM_SKIP_PENALTY' || item.code === 'ITEM_SKIP');
      const isPassPenalty = (item.code === 'ITEM_PASS_PENALTY');

      if (!isSkipItem && !isPassPenalty) {
        socket.emit('player:alert', {
          message: '⚠️ Khi đang thực hiện hình phạt nhảy cover, chỉ có Thẻ Bỏ Qua Lượt hoặc Thẻ Gắp Lửa Bỏ Tay Người mới được phép sử dụng!'
        });
        return; // DO NOT CONSUME ITEM
      }

      if (gameState.activePenalty && gameState.activePenalty.teamId !== team.id) {
        socket.emit('player:alert', {
          message: '⚠️ Thẻ này chỉ có thể dùng cho nhóm đang trực tiếp dính hình phạt!'
        });
        return;
      }

      if (isSkipItem) {
        // Consume the skip item
        team.inventory.splice(itemIndex, 1);
        const pIndex = player.inventory.findIndex(it => it.id == itemId);
        if (pIndex !== -1) player.inventory.splice(pIndex, 1);

        io.emit('game:stop_all_media');
        io.emit('game:announcement', {
          title: '⏭️ THẺ BỎ QUA LƯỢT ĐÃ KÍCH HOẠT!',
          desc: `${player.name} (${team.name}) đã dùng Thẻ Bỏ Qua Lượt để miễn trừ hình phạt nhảy cover thành công mà không bị trừ điểm!`,
          soundType: 'good'
        });

        gameState.activePenalty = null;
        gameState.status = 'CHEST_FINISHED';
        broadcastState();
        return;
      }

      if (isPassPenalty) {
        const targetPassId = targetTeamId || ((team.id % 7) + 1);
        const targetPassTeam = gameState.teams.find(t => t.id === targetPassId);

        if (!targetPassTeam || targetPassTeam.id === team.id) {
          socket.emit('player:alert', { message: '⚠️ Vui lòng chọn 1 nhóm đối thủ hợp lệ để chuyển giao hình phạt!' });
          return;
        }

        // Consume the pass penalty item
        team.inventory.splice(itemIndex, 1);
        const pIndex = player.inventory.findIndex(it => it.id == itemId);
        if (pIndex !== -1) player.inventory.splice(pIndex, 1);

        // Check if target team has ITEM_REFLECT
        const reflectIdx = targetPassTeam.inventory.findIndex(it => it.code === 'ITEM_REFLECT');
        if (reflectIdx !== -1) {
          targetPassTeam.inventory.splice(reflectIdx, 1);
          io.emit('game:announcement', {
            title: '🪞 GẬY ÔNG ĐẬP LƯNG ÔNG PHẢN ĐÒN!',
            desc: `${targetPassTeam.name} sở hữu Thẻ Gậy Ông Đập Lưng Ông! Ý đồ chuyển giao hình phạt của ${team.name} bị DỘI NGƯỢC LẠI 100%! ${team.name} vẫn phải chấp hành hình phạt nhảy cover!`,
            soundType: 'bad',
            isBad: true
          });
          broadcastState();
          return;
        }

        // Assign to target team
        const targetPlayers = Object.values(gameState.players).filter(p => p.teamId === targetPassTeam.id);
        const targetPlayer = targetPlayers.length > 0 ? targetPlayers[Math.floor(Math.random() * targetPlayers.length)] : { id: null, name: targetPassTeam.name };

        gameState.activePenalty.teamId = targetPassTeam.id;
        gameState.activePenalty.teamName = targetPassTeam.name;
        gameState.activePenalty.playerId = targetPlayer.id;
        gameState.activePenalty.playerName = targetPlayer.name;

        io.emit('game:announcement', {
          title: '🔄 GẮP LỬA BỎ TAY NGƯỜI!',
          desc: `${player.name} (${team.name}) đã dùng Thẻ Gắp Lửa Bỏ Tay Người, chuyển toàn bộ hình phạt nhảy cover sang cho ${targetPassTeam.name}!`,
          soundType: 'bad',
          isBad: true
        });
        broadcastState();
        return;
      }
    }

    // If using skip or pass penalty card outside of ACTION_PENALTY:
    if (item.code === 'ITEM_SKIP_PENALTY' || item.code === 'ITEM_SKIP' || item.code === 'ITEM_PASS_PENALTY') {
      socket.emit('player:alert', {
        message: '⚠️ Thẻ này chỉ dùng khi nhóm bạn đang dính phải hình phạt nhảy cover!'
      });
      return;
    }

    // Passive items cannot be manually triggered
    if (item.code === 'ITEM_REFLECT') {
      socket.emit('player:alert', {
        message: '🪞 Thẻ Gậy Ông Đập Lưng Ông là trang bị BỊ ĐỘNG! Thẻ sẽ tự động kích hoạt phản đòn 100% khi nhóm bạn bị đối thủ tấn công (Cấm ngôn, cướp điểm, chuyển phạt).'
      });
      return;
    }

    // 50/50 restriction
    if (item.code === 'ITEM_50_50' && gameState.status !== 'QUESTION') {
      socket.emit('player:alert', {
        message: '⚠️ Thẻ Nhìn Trộm Đề (50/50) chỉ có thể kích hoạt khi đang trong câu hỏi!'
      });
      return;
    }

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

      case 'ITEM_50_50': {
        const currentQ = questions[gameState.currentQuestionIndex];
        if (currentQ) {
          const wrongIndices = [0, 1, 2, 3].filter(i => i !== currentQ.answer);
          const shuffled = wrongIndices.sort(() => 0.5 - Math.random());
          team.buffs.hideTwoWrong = shuffled.slice(0, 2);
          io.emit('game:announcement', {
            title: '🔍 NHÌN TRỘM ĐỀ (50/50)!',
            desc: `${player.name} (${team.name}) đã dùng Thẻ Nhìn Trộm Đề! 2 đáp án sai đã bị gạch bỏ trên màn hình của ${team.name}!`,
            soundType: 'good',
            isGood: true
          });
        }
        break;
      }

      case 'ITEM_NITRO_X3': {
        team.buffs.nitroX3 = true;
        io.emit('game:announcement', {
          title: '🚀 BỐC ĐẦU NITRO X3 ĐÃ KÍCH HOẠT!',
          desc: `${player.name} (${team.name}) đã kích hoạt Nitro x3: Nếu trả lời đúng nhận x3 điểm, trả lời sai hoặc không bấm được bị trừ -8 điểm!`,
          soundType: 'good',
          isGood: true
        });
        break;
      }

      case 'ITEM_VAMPIRE': {
        const targetVampireId = targetTeamId || ((team.id % 7) + 1);
        const targetVampireTeam = gameState.teams.find(t => t.id === targetVampireId);
        if (targetVampireTeam && targetVampireTeam.id !== team.id) {
          // Check reflect
          const reflectIdx = targetVampireTeam.inventory.findIndex(it => it.code === 'ITEM_REFLECT');
          if (reflectIdx !== -1) {
            targetVampireTeam.inventory.splice(reflectIdx, 1);
            team.buffs.vampireTarget = targetVampireTeam.id;
            team.buffs.vampireTurns = 2;
            io.emit('game:announcement', {
              title: '🪞 GẬY ÔNG ĐẬP LƯNG ÔNG PHẢN ĐÒN!',
              desc: `${targetVampireTeam.name} sở hữu Gậy Ông Đập Lưng Ông! Ký Sinh Trùng bị phản tác dụng, cắm ngược vào ${team.name}! ${targetVampireTeam.name} sẽ hút máu ${team.name} trong 2 câu!`,
              soundType: 'bad',
              isBad: true
            });
          } else {
            targetVampireTeam.buffs.vampireTarget = team.id;
            targetVampireTeam.buffs.vampireTurns = 2;
            io.emit('game:announcement', {
              title: '🧛 KÝ SINH TRÙNG / HÚT MÁU!',
              desc: `${player.name} (${team.name}) đã cắm Ký Sinh Trùng lên ${targetVampireTeam.name}! Trong 2 câu hỏi tiếp theo, điểm ${targetVampireTeam.name} bị trừ sẽ chuyển thẳng cho ${team.name}!`,
              soundType: 'bad',
              isBad: true
            });
          }
        }
        break;
      }

      case 'ITEM_FAIL_INSURANCE': {
        team.buffs.failInsurance = true;
        io.emit('game:announcement', {
          title: '📜 BẢO HIỂM THẤT BẠI ĐÃ KÍCH HOẠT!',
          desc: `${player.name} (${team.name}) đã kích hoạt Thẻ Bảo Hiểm Thất Bại: Nếu câu này trả lời sai sẽ KHÔNG phải mở Rương Xui Xẻo và nhận ngay +3 điểm an ủi!`,
          soundType: 'good',
          isGood: true
        });
        break;
      }

      case 'ITEM_STEAL': {
        const targetStealId = targetTeamId || ((team.id % 7) + 1);
        const targetStealTeam = gameState.teams.find(t => t.id === targetStealId);

        let reflectTriggered = false;
        if (targetStealTeam) {
          const reflectIdx = targetStealTeam.inventory.findIndex(it => it.code === 'ITEM_REFLECT');
          if (reflectIdx !== -1 && targetStealTeam.id !== team.id) {
            targetStealTeam.inventory.splice(reflectIdx, 1);
            reflectTriggered = true;
          }
        }

        const stealSegments = [
          { label: 'Cướp 5 Điểm', amount: 5 },
          { label: 'Cướp 8 Điểm', amount: 8 },
          { label: 'Cướp 10 Điểm', amount: 10 },
          { label: 'Cướp 15 Điểm', amount: 15 },
          { label: '🔥 CƯỚP 20 ĐIỂM!', amount: 20 }
        ];

        if (reflectTriggered) {
          startWheelSpin({
            type: 'STEAL_POINTS',
            title: `🪞 PHẢN ĐÒN: ${targetStealTeam.name} CƯỚP ĐIỂM CỦA ${team.name}!`,
            segments: stealSegments,
            playerId: player.id,
            teamId: targetStealTeam.id,
            targetTeamId: team.id
          });
          io.emit('game:announcement', {
            title: '🪞 GẬY ÔNG ĐẬP LƯNG ÔNG PHẢN ĐÒN!',
            desc: `${targetStealTeam.name} sở hữu Gậy Ông Đập Lưng Ông! Vụ cướp của ${team.name} bị dội ngược 100%, ${targetStealTeam.name} cướp ngược lại điểm của ${team.name}!`,
            soundType: 'bad',
            isBad: true
          });
        } else {
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
        }
        return;
      }

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

      case 'ITEM_SILENCE': {
        const targetSilence = gameState.teams.find(t => t.id === targetTeamId);
        if (targetSilence) {
          const reflectIdx = targetSilence.inventory.findIndex(it => it.code === 'ITEM_REFLECT');
          if (reflectIdx !== -1 && targetSilence.id !== team.id) {
            targetSilence.inventory.splice(reflectIdx, 1);
            team.buffs.frozen = 1;
            team.buffs.silenced = true;
            io.emit('game:announcement', {
              title: '🪞 GẬY ÔNG ĐẬP LƯNG ÔNG PHẢN ĐÒN!',
              desc: `${targetSilence.name} sở hữu Gậy Ông Đập Lưng Ông! Thẻ Cấm Ngôn bị phản pháo ngược lại, chính ${team.name} bị KHÓA CHUÔNG!`,
              soundType: 'bad',
              isBad: true
            });
          } else {
            targetSilence.buffs.frozen = 1;
            targetSilence.buffs.silenced = true;
            io.emit('game:announcement', {
              title: '🤐 CẤM NGÔN KHÓA CHUÔNG!',
              desc: `${player.name} (${team.name}) đã dùng Thẻ Cấm Ngôn KHÓA CHUÔNG của ${targetSilence.name}!`,
              soundType: 'bad',
              isBad: true
            });
          }
        }
        break;
      }

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

    const teamTokens = team.score * 1000;
    if (teamTokens < rewardItem.price) return;

    const scoreCost = Math.ceil(rewardItem.price / 1000);
    team.score -= scoreCost;
    rewardItem.stock -= 1;

    // Check if it's Bá Khí
    if (rewardItem.id === 101 || rewardItem.isBaKhi) {
      io.emit('game:bakhi_activated', {
        playerName: player.name,
        teamName: team.name,
        message: 'Chúc mừng nhóm bạn là nhóm bá khí nhất lớp. Nhóm bạn sẽ được thưởng 1 tràng vỗ tay'
      });
    }

    io.emit('game:announcement', {
      title: '🎉 ĐỔI QUÀ THÀNH CÔNG!',
      desc: `Đại diện ${player.name} (Nhóm ${team.id}) đã đổi thành công món: ${rewardItem.name} (${(rewardItem.priceFormatted || rewardItem.price.toLocaleString('vi-VN') + 'đ')})!`
    });
    broadcastState();
  });

  // Host manual stock management
  socket.on('host:sell_reward', ({ rewardId }) => {
    if (!socket.isHostAuthorized) return;
    const rewardItem = gameState.shopRewards.find(r => r.id === rewardId);
    if (!rewardItem) return;
    if (rewardItem.stock > 0) {
      rewardItem.stock -= 1;

      // Special comedic event for Bá Khí
      if (rewardItem.id === 101 || rewardItem.isBaKhi) {
        io.emit('game:bakhi_activated', {
          playerName: 'Người điều hành',
          teamName: 'Cả lớp',
          message: 'Chúc mừng nhóm bạn là nhóm bá khí nhất lớp. Nhóm bạn sẽ được thưởng 1 tràng vỗ tay'
        });
      }

      broadcastState();
    }
  });

  socket.on('host:restock_reward', ({ rewardId }) => {
    if (!socket.isHostAuthorized) return;
    const rewardItem = gameState.shopRewards.find(r => r.id === rewardId);
    if (!rewardItem) return;
    rewardItem.stock += 1;
    broadcastState();
  });

  socket.on('host:trigger_bakhi', (data) => {
    if (!socket.isHostAuthorized) return;
    io.emit('game:bakhi_activated', {
      playerName: (data && data.playerName) || 'Người điều hành',
      teamName: (data && data.teamName) || 'Nhóm Bá Khí',
      message: 'Chúc mừng nhóm bạn là nhóm bá khí nhất lớp. Nhóm bạn sẽ được thưởng 1 tràng vỗ tay'
    });
  });

  // Host manual controls
  socket.on('host:start_countdown', () => {
    if (!socket.isHostAuthorized) return;
    if (gameState.status === 'LOBBY') {
      randomizeQuestions();
      gameState.currentQuestionIndex = 0;
    }
    startCountdown();
  });

  socket.on('host:shuffle_questions', () => {
    if (!socket.isHostAuthorized) return;
    randomizeQuestions();
    gameState.currentQuestionIndex = 0;
    broadcastState();
  });

  socket.on('host:next_question', () => {
    if (!socket.isHostAuthorized) return;
    proceedToNextQuestion();
  });

  socket.on('host:reopen_question', () => {
    if (!socket.isHostAuthorized) return;
    reopenQuestionForOthers();
  });

  socket.on('host:reset_game', () => {
    if (!socket.isHostAuthorized) return;
    clearAllTimers();
    io.emit('game:stop_all_media');
    initActionQueue();
    randomizeQuestions();
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
    persistentPlayers = {};
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
