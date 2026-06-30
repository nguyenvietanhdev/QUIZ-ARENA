// Hardcoded question bank for the MVP. In a later week this moves to Postgres so
// hosts can pick a quiz set. `correctIndex` lives ONLY on the server and is never
// sent to clients until the reveal phase (server-authoritative grading).

export interface Question {
  text: string;
  choices: string[];
  correctIndex: number;
}

export const QUESTIONS: Question[] = [
  {
    text: "Giao thức nào dùng cho kết nối real-time hai chiều giữa client và server?",
    choices: ["HTTP polling", "WebSocket", "FTP", "SMTP"],
    correctIndex: 1,
  },
  {
    text: "Trong kiến trúc 'server-authoritative', ai là nguồn chân lý về điểm số?",
    choices: ["Client", "Server", "Trình duyệt", "CDN"],
    correctIndex: 1,
  },
  {
    text: "Redis thường được dùng để làm gì trong app real-time nhiều instance?",
    choices: ["Biên dịch CSS", "Pub/Sub & lưu state", "Gửi email", "Render ảnh"],
    correctIndex: 1,
  },
  {
    text: "Socket.io nhóm các client vào cùng một phòng bằng khái niệm nào?",
    choices: ["Channel", "Room", "Bucket", "Topic"],
    correctIndex: 1,
  },
  {
    text: "Vì sao mỗi event real-time nên mang theo số 'version/round'?",
    choices: [
      "Để mã hoá dữ liệu",
      "Để client bỏ qua event đến trễ (chống desync)",
      "Để tăng tốc CPU",
      "Không có lý do gì",
    ],
    correctIndex: 1,
  },
];

export const QUESTION_COUNT = QUESTIONS.length;
