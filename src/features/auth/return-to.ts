export function safeReturnTo(value: string | null | undefined, fallback = "/tai-khoan") {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /[\u0000-\u001f]/.test(value)
  )
    return fallback;
  return value;
}
