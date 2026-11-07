// 問題文などの文字数。前後の空白を除いて、1文字ずつ（絵文字なども1文字）数える。
export const charCount = (s: string) => Array.from(s.trim()).length;
