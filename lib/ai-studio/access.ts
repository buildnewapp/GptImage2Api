export function getAiDemoAccessRedirect(isAdminUser: boolean) {
  return isAdminUser ? null : "/403";
}
