// DB enum `public.subject`와 값이 일치해야 한다
export const SUBJECT_LABELS = {
  korean: "국어",
  english: "영어",
  public_health: "공중보건",
  health_admin: "보건행정",
} as const;

export type Subject = keyof typeof SUBJECT_LABELS;
