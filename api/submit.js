export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // [방어코드 1] Vercel 환경에 따라 req.body가 문자열로 들어오는 버그 원천 차단
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch(e) {
        return res.status(400).json({ error: 'JSON 바디 파싱에 실패했습니다.' });
      }
    }
    
    if (!body) {
      return res.status(400).json({ error: '요청 데이터(body)가 텅 비어있습니다.' });
    }

    const { name, phone, carModel, accidentType } = body;

    // [방어코드 2] 어떤 환경변수가 누락되었는지 정확하게 추적
    const BOT_TOKEN = process.env.BOT_TOKEN;
    const CHAT_ID = process.env.CHAT_ID;
    const GOOGLE_SHEET_URL = process.env.GOOGLE_SHEET_URL;

    const missingEnv = [];
    if (!BOT_TOKEN) missingEnv.push('BOT_TOKEN');
    if (!CHAT_ID) missingEnv.push('CHAT_ID');
    if (!GOOGLE_SHEET_URL) missingEnv.push('GOOGLE_SHEET_URL');

    if (missingEnv.length > 0) {
      return res.status(500).json({ 
        error: `[환경변수 누락] Vercel 대시보드에 ${missingEnv.join(', ')} 설정이 없거나 오타가 있습니다. 등록 후 꼭 Redeploy 하세요!` 
      });
    }

    // 텔레그램 메시지 생성
    const text = `🚨 [사고대차 DB 실시간 접수] 🚨\n\n` +
                 `👤 신청자: ${name || '미입력'}\n` +
                 `📞 연락처: ${phone || '미입력'}\n` +
                 `🚗 피해차종: ${carModel || '미입력'}\n` +
                 `📝 과실유형: ${accidentType || '미입력'}\n\n` +
                 `⚡ 확인 후 즉시 배차 연락 바랍니다.`;

    // 두 개의 외부 API로 전송 준비
    const telegramPromise = fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text: text })
    });

    const sheetUrlWithParams = `${GOOGLE_SHEET_URL}?name=${encodeURIComponent(name || '')}&phone=${encodeURIComponent(phone || '')}&carModel=${encodeURIComponent(carModel || '')}&accidentType=${encodeURIComponent(accidentType || '')}`;
    const sheetPromise = fetch(sheetUrlWithParams, { method: 'POST' });

    // 동시에 쏘기
    const responses = await Promise.all([telegramPromise, sheetPromise]);
    
    // 외부 API 자체에서 에러가 났는지 검사
    if (!responses[0].ok) {
      const telErr = await responses[0].text();
      return res.status(500).json({ error: `텔레그램 전송 실패: ${telErr}` });
    }

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('서버리스 내부 에러:', error);
    return res.status(500).json({ error: `서버 내부 에러 발생: ${error.message}` });
  }
}
