# 🎮 CLASSROOM QUIZ SHOW - TRÒ CHƠI LỚP HỌC REALTIME

Trò chơi tương tác thực tế giữa **Màn hình Máy Chiếu (Host)** và **Điện Thoại Người Chơi (Mobile Players)** với cơ chế bấm chuông cướp quyền, 20 rương bí ẩn, mini-game tính nhẩm 6 giây, vòng quay chuộc tội, và cửa hàng đổi quà cuối game.

---

## 🚀 ĐƯỜNG DẪN TRUY CẬP (SERVER ĐANG CHẠY)

- 🖥️ **Màn hình Máy Chiếu (Host/Admin):**  
  👉 [http://localhost:3000](http://localhost:3000)

- 📱 **Điện thoại Người chơi (Học sinh/Sinh viên):**  
  👉 Quét **Mã QR** hiển thị trực tiếp trên màn hình máy chiếu hoặc vào đường dẫn:  
  👉 `http://[IP-MÁY-BẠN]:3000/play.html` (Ví dụ hiện tại: `http://192.168.89.89:3000/play.html`)

---

## 📜 LUẬT CHƠI & CƠ CHẾ ĐÃ ĐƯỢC LẬP TRÌNH

### 1. Phân chia 7 Nhóm & Tham gia
- Học sinh quét mã QR, nhập **Họ và Tên**, chọn **Nhóm (1 đến 7)**.
- Giao diện máy chiếu chia tỉ lệ chuẩn **4/5 (Sân khấu chính)** và **1/5 (Bảng xếp hạng 7 nhóm Realtime + Huy hiệu Buff/Debuff)**.
- Có nút **[📖 Hướng Dẫn Luật Chơi]** sinh động trước khi bắt đầu.

### 2. Tranh quyền trả lời (Buzzer)
- Đếm ngược `5 - 4 - 3 - 2 - 1` phát âm thanh hồi hộp.
- Câu hỏi và 4 đáp án A, B, C, D hiện to rõ trên cả máy chiếu và điện thoại.
- Ai bấm trước sẽ **khóa ngay** các máy còn lại:
  - Màn hình hiện: **`[Tên] (Nhóm X) đã chọn đáp án [C]: "..."`**
  - **Nếu ĐÚNG:** Nhóm nhận **+5 điểm**, Cá nhân nhận **+1 điểm** và được chọn **1 trong 20 Rương May Mắn**.
  - **Nếu SAI:** Bị phạt bốc **1 trong 20 Rương Xui Xẻo**. Nhóm đó bị khóa ở câu này, máy chiếu đếm ngược để **mở lại chuông cho các nhóm còn lại tiếp tục trả lời**.

### 3. Hệ Thống 20 Rương May Mắn & Xui Xẻo
- **Rương May Mắn:**
  - 🤝 **Rương Đoàn Kết:** Tất cả cá nhân trong nhóm +1 điểm.
  - ✨ **Hào Quang Tập Thể (Siêu May Mắn):** Tất cả cá nhân trong nhóm +5 điểm.
  - 💰 **Mưa Tiền Thưởng:** Nhóm +8 điểm, người mở +2 điểm.
  - ⚡ **Vé Nhân Đôi (X2):** Câu tiếp theo nếu nhóm đúng được nhân đôi điểm.
  - 🥷 **Thẻ Siêu Đạo Tặc:** Kích hoạt Vòng Quay cướp điểm nhóm chỉ định (5, 8, 10, 15, 20 điểm).
  - ⚖️ **Thẻ Cào Bằng Thế Sự:** Tổng điểm 7 đội chia đều cho 7.
  - 🎁 **Thẻ Nhận Viện Trợ:** Nhận thêm 20% điểm của mình do các nhóm khác đóng góp.
  - 🛡️ **Khiên Bảo Hộ:** Miễn trừ 1 lần phạt rương xui nếu trả lời sai.
  - 🤐 **Thẻ Cấm Ngôn:** Khóa quyền bấm chuông 1 nhóm trong 1 câu.
  - ⚡ **Thử Thách Thần Tính (Toán Học 6s):** Hiện phép tính 3 số ngẫu nhiên. Người chơi **phải hô to đáp án bằng miệng** trong 6 giây. Hết 6s khựng lại 3s ("Đáp Án là..."), hiện kết quả. Host bấm [Chính Xác] $\rightarrow$ Mở **Vòng Quay Jackpot Siêu Thưởng** (Điểm khủng + Khiên).
  - 🧤 **Cú Búng Tay Của Thanos:** Xóa sạch toàn bộ điểm cá nhân của cả lớp về 0!

- **Rương Xui Xẻo:**
  - 💃 **3 Hình Phạt Hành Động:**
    1. *Idol Giới Trẻ* (Nhảy vũ đạo ngắn)
    2. *Người Mẫu Bất Đắc Dĩ* (Đi catwalk quanh bục giảng)
    3. *Lời Thú Tội Ngọt Ngào* (Khen 1 bạn nhóm đối thủ)
    - ➡️ **Cơ chế Bỏ Qua:** Trên điện thoại có nút **[Bỏ qua (Quay trừ điểm)]** $\rightarrow$ Mở **Vòng Quay Chuộc Tội** để trừ điểm (Cá nhân 0đ/Nhóm 10đ, Cá nhân 5đ/Nhóm 10đ, Cá nhân 0đ/Nhóm 15đ, Cá nhân 10đ/Nhóm 20đ, Cá nhân 2đ/Nhóm 5đ, Thoát nạn 0đ).
  - ☠️ **Cực Kỳ Xui Xẻo:** Mất 50% tổng số điểm nhóm hiện có (làm tròn lên).
  - 💸 **Nhà Từ Thiện Bất Đắc Dĩ (Đại Xui):** Trích 20% điểm nhóm chia đều cho 6 nhóm còn lại.
  - ❄️ **Đóng Băng:** Nhóm bị khóa quyền bấm chuông trong 1 câu hỏi kế tiếp.
  - 🕳️ **Hụt Chân:** Cá nhân -1 điểm, Nhóm -3 điểm.

### 4. Nút 🎒 Túi Vật Phẩm trên Điện Thoại
- Luôn cố định phía trên phần câu hỏi.
- Chạm vào để xem danh sách thẻ bài nhóm đang có và bấm **[KÍCH HOẠT DÙNG]**.

### 5. Tổng Kết & Cửa Hàng Đổi Quà (Shop)
- **Tab 1: Bảng Vinh Danh:** Bục Top 3 Nhóm (Quán quân, Á quân, Hạng 3) + Top 3 Cá nhân MVP.
- **Tab 2: Cửa Hàng Đổi Quà:** Điểm nhóm quy đổi sang Xu (`Điểm * 100`). Chỉ **cá nhân có điểm cao nhất của từng tổ** mới được đại diện bấm đổi quà trên điện thoại cho đến khi hết quà.

---

## 🛠️ CÁCH TÙY BIẾN CÂU HỎI & QUÀ TẶNG

- **Thay đổi bộ câu hỏi:** Mở file `data/questions.json` để thêm hoặc sửa câu hỏi, đáp án, giải thích.
- **Thay đổi quà trong shop:** Mở file `data/rewards.json` để chỉnh sửa tên món quà, giá xu, số lượng.
- **Khởi động lại server thủ công khi cần:**
  ```powershell
  cd C:\Users\ADMIN\.gemini\antigravity\scratch\classroom-quiz-game
  node server.js
  ```
