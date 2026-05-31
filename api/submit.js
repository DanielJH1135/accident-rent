export default async function handler(req, res) {
  // 1. POST 요청만 허용 (보안 및 데이터 제출 목적)
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // 2. 프론트엔드(HTML)에서 보낸 데이터 받기
    const data = req.body; 

    // 3. Vercel에 등록한 환경변수 불러오기
    const BOT_TOKEN = process.env.BOT_TOKEN;
    const GOOGLE_SHEET_URL = process.env.GOOGLE_SHEET_URL; // 구글 앱스 스크립트 웹앱 URL 등
    const CHAT_ID = process.env.CHAT_ID; // 텔레그램 등 봇 채팅방 ID (필요시)

    // 환경변수 누락 체크
    if (!BOT_TOKEN || !GOOGLE_SHEET_URL) {
      return res.status(500).json({ error: '서버 환경변수(Env) 세팅을 확인해주세요.' });
    }

    // 4. 구글 시트(웹앱)로 데이터 전송
    const sheetResponse = await fetch(GOOGLE_SHEET_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    // 5. 봇 토큰을 이용해 알림 발송 (예시: 텔레그램)
    if (CHAT_ID) {
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text: `🚨 [사고대차 알림] \n\n${JSON.stringify(data, null, 2)}`
        }),
      });
    }

    // 6. 프론트엔드로 성공 응답 반환
    return res.status(200).json({ success: true, message: '성공적으로 적재되었습니다.' });

  } catch (error) {
    // 에러 발생 시 로그 출력 및 프론트엔드에 에러 반환
    console.error('서버리스 함수 에러 발생:', error);
    return res.status(500).json({ error: error.message });
  }
}
