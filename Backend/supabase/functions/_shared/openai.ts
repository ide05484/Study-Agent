// Edge Function 공용 OpenAI 클라이언트. `_`로 시작하는 폴더는 함수로 배포되지 않는다.
import OpenAI from "npm:openai@^7";

export const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") });

// 분석·답변 모두 이 모델 하나를 쓴다(2026-11-13 사용자 결정)
export const MODEL = "gpt-5.6";
