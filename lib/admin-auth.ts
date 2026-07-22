import { timingSafeEqual } from "node:crypto";

function safeEqual(left: string, right: string) {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  if (leftBytes.length !== rightBytes.length) return false;
  return timingSafeEqual(leftBytes, rightBytes);
}

export function requireAdmin(request: Request) {
  const configured = process.env.ADMIN_PANEL_PASSWORD;
  if (!configured) {
    return Response.json(
      { code: "ADMIN_NOT_CONFIGURED", message: "管理面板尚未配置密码" },
      { status: 503 },
    );
  }

  const supplied = request.headers.get("x-admin-password") ?? "";
  if (!safeEqual(supplied, configured)) {
    return Response.json(
      { code: "UNAUTHORIZED", message: "管理密码不正确" },
      { status: 401 },
    );
  }
  return null;
}
