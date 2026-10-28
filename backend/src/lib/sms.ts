// SMS 발송 — Aligo.
//
// 키가 없으면 콘솔에 코드를 찍는 개발용 구현으로 떨어진다.
// 덕분에 Aligo 계약 전에도 가입 흐름을 끝까지 테스트할 수 있다.
//
// 문서: https://smartsms.aligo.in/admin/api/spec.html

export interface SmsSender {
  readonly kind: "aligo" | "console";
  send(to: string, text: string): Promise<void>;
}

class SmsError extends Error {}

function createAligoSender(userId: string, apiKey: string, sender: string): SmsSender {
  return {
    kind: "aligo",
    async send(to, text) {
      const form = new URLSearchParams({
        key: apiKey,
        user_id: userId,
        sender,
        receiver: to,
        msg: text,
        msg_type: "SMS",
        // 개발 중에는 실제 발송·과금 없이 응답만 받는다
        testmode_yn: process.env.ALIGO_TEST_MODE === "true" ? "Y" : "N",
      });

      const res = await fetch("https://apis.aligo.in/send/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form,
      });

      if (!res.ok) throw new SmsError(`Aligo HTTP ${res.status}`);

      // Aligo 는 실패해도 HTTP 200 을 주고 본문의 result_code 로 알린다
      const body = (await res.json()) as { result_code?: number | string; message?: string };
      const code = Number(body.result_code);
      if (code !== 1) {
        throw new SmsError(`Aligo 발송 실패 (${body.result_code}): ${body.message ?? "사유 미상"}`);
      }
    },
  };
}

function createConsoleSender(): SmsSender {
  return {
    kind: "console",
    async send(to, text) {
      console.log(`\n📱 [개발용 SMS] ${to}\n   ${text}\n`);
    },
  };
}

let cached: SmsSender | undefined;

export function getSmsSender(): SmsSender {
  if (cached) return cached;

  const userId = process.env.ALIGO_USER_ID;
  const apiKey = process.env.ALIGO_API_KEY;
  const sender = process.env.ALIGO_SENDER;

  if (userId && apiKey && sender) {
    cached = createAligoSender(userId, apiKey, sender);
  } else {
    console.warn(
      "⚠️  ALIGO_* 환경변수가 없어 SMS 를 콘솔에 출력합니다. 운영 배포 전 반드시 설정하세요.",
    );
    cached = createConsoleSender();
  }
  return cached;
}

export function resetSmsSender() {
  cached = undefined;
}
