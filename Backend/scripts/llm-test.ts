import OpenAI from "openai";

// console.log("LLM 테스트 파일 실행 성공!");
const client = new OpenAI();

const response = await client.responses.create({
  model: "gpt-5.6",

  instructions: `
    당신은 공무원 수험생의 학습 기록을 분석하는 AI입니다.
    사용자가 오늘 공부한 내용을 파악하세요.
  `,

  input: `
    오늘 보건행정 30~70페이지 공부했고
    기출 20문제 풀어서 5개 틀렸어.
  `,
});

console.log(response.output_text);