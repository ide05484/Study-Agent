// chat 응답 본문. OpenAI·Supabase를 import하지 않는 순수 모듈이다.
// 형식은 Frontend/src/interfaces/chat.ts의 `ChatResponse`를 따른다.

export interface ChatResultFlags {
  logged: boolean;
  planChanged: boolean;
  replanFailed: boolean;
  superseded: boolean;
}

export interface ChatResult<M> extends ChatResultFlags {
  messages: M[];
}

// 넘기지 않은 플래그는 모두 false다
export function chatResult<M>(
  messages: M[],
  flags: Partial<ChatResultFlags> = {},
): ChatResult<M> {
  return {
    messages,
    logged: flags.logged ?? false,
    planChanged: flags.planChanged ?? false,
    replanFailed: flags.replanFailed ?? false,
    superseded: flags.superseded ?? false,
  };
}
