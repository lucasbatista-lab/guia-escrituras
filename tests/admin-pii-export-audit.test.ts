import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { promises as fs } from "node:fs";

vi.mock("@/lib/auth", () => ({
  requireAdminUser: vi.fn(),
}));

vi.mock("@/lib/admin", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/admin")>("@/lib/admin");
  return {
    ...actual,
    exportAdminUsersCsv: vi.fn(),
    parseAdminUserListSearchParams: vi.fn((params: Record<string, string>) => ({
      ...params,
    })),
  };
});

vi.mock("@/lib/logging/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { requireAdminUser } from "@/lib/auth";
import { exportAdminUsersCsv } from "@/lib/admin";
import { logger } from "@/lib/logging/logger";
import { GET, POST } from "@/app/api/admin/usuarios/export/route";
import { logAdminUserDetailViewed } from "@/lib/admin/audit-log";
import { maskUserId } from "@/lib/admin/metrics";

const CSV_RESULT = {
  csv: "id,email\nu1,test@example.com\n",
  rowCount: 1,
  truncated: false,
  filename: "amem-chat-usuarios-2026-07-28.csv",
};

describe("admin CSV export hardening (POST-only, PII-safe)", () => {
  beforeEach(() => {
    vi.mocked(requireAdminUser).mockResolvedValue({
      userId: "admin-1",
      isAdmin: true,
    } as never);
    vi.mocked(exportAdminUsersCsv).mockResolvedValue(CSV_RESULT);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("rejects GET with 405 and an Allow: POST header", async () => {
    const res = await GET();
    expect(res.status).toBe(405);
    expect(res.headers.get("Allow")).toBe("POST");
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    const body = await res.json();
    expect(body.code).toBe("method_not_allowed");
  });

  it("allows POST for an admin and returns CSV with hardened headers", async () => {
    const res = await POST(
      new Request("http://localhost/api/admin/usuarios/export", {
        method: "POST",
        body: new URLSearchParams({ q: "test" }),
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/csv");
    expect(res.headers.get("Content-Disposition")).toContain("attachment");
    expect(res.headers.get("Content-Disposition")).toContain(
      CSV_RESULT.filename,
    );
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("rejects POST when requireAdminUser throws (non-admin)", async () => {
    vi.mocked(requireAdminUser).mockRejectedValue(
      Object.assign(new Error("forbidden"), { code: "forbidden", status: 403 }),
    );
    const res = await POST(
      new Request("http://localhost/api/admin/usuarios/export", {
        method: "POST",
        body: new URLSearchParams({}),
      }),
    );
    expect(res.status).not.toBe(200);
  });

  it("blocks cross-origin POSTs before touching admin data", async () => {
    const res = await POST(
      new Request("http://localhost/api/admin/usuarios/export", {
        method: "POST",
        body: new URLSearchParams({ q: "test" }),
        headers: { Origin: "https://evil.example.com" },
      }),
    );
    expect(res.status).toBe(403);
    expect(vi.mocked(exportAdminUsersCsv)).not.toHaveBeenCalled();
  });

  it("allows same-origin POSTs (matching Origin header)", async () => {
    const res = await POST(
      new Request("http://localhost/api/admin/usuarios/export", {
        method: "POST",
        body: new URLSearchParams({ q: "test" }),
        headers: { Origin: "http://localhost" },
      }),
    );
    expect(res.status).toBe(200);
  });

  it("logs export outcome without emails or CSV content", async () => {
    await POST(
      new Request("http://localhost/api/admin/usuarios/export", {
        method: "POST",
        body: new URLSearchParams({ q: "test" }),
      }),
    );
    const call = vi
      .mocked(logger.info)
      .mock.calls.find((c) => c[0] === "admin_users_csv_exported");
    expect(call).toBeTruthy();
    const fields = JSON.stringify(call?.[1] ?? {});
    expect(fields).not.toContain("@example.com");
    expect(fields).not.toContain("email");
    expect(fields).not.toContain(CSV_RESULT.csv);
  });

  it("route source rejects GET and requires admin + same-origin on POST", async () => {
    const source = await fs.readFile(
      "src/app/api/admin/usuarios/export/route.ts",
      "utf8",
    );
    expect(source).toContain("export async function GET()");
    expect(source).toContain("405");
    expect(source).toContain("export async function POST(");
    expect(source).toContain("requireAdminUser");
    expect(source).toContain("isSameOriginRequest");
    expect(source).toContain('"Cache-Control": "no-store"');
  });
});

describe("CSV export UI requires explicit confirmation before POST", () => {
  it("csv export form is a POST form with a confirm() gate", async () => {
    const source = await fs.readFile(
      "src/components/admin/csv-export-form.tsx",
      "utf8",
    );
    expect(source).toContain('method="post"');
    expect(source).toContain("window.confirm");
    expect(source).toContain("event.preventDefault()");
  });

  it("usuarios list page uses the confirmation form instead of a plain link", async () => {
    const source = await fs.readFile("src/app/admin/usuarios/page.tsx", "utf8");
    expect(source).toContain("CsvExportForm");
    expect(source).not.toMatch(/<a\s+href=\{csvHref\}/);
  });
});

describe("admin user detail view audit log (app logs, not a ledger)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("emits admin_user_detail_viewed with masked actor/target and no PII", () => {
    const actorId = "11111111-2222-3333-4444-555555555555";
    const targetId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    logAdminUserDetailViewed(actorId, targetId);

    const call = vi
      .mocked(logger.info)
      .mock.calls.find((c) => c[0] === "admin_user_detail_viewed");
    expect(call).toBeTruthy();
    const fields = call?.[1] as Record<string, unknown>;
    expect(fields.actorMask).toBe(maskUserId(actorId));
    expect(fields.targetMask).toBe(maskUserId(targetId));
    expect(fields.actorMask).not.toBe(actorId);
    expect(fields.targetMask).not.toBe(targetId);
    expect(fields.actorRole).toBeTruthy();
    expect(typeof fields.viewedAt).toBe("string");

    const serialized = JSON.stringify(fields);
    expect(serialized).not.toContain("@");
    expect(serialized).not.toContain(actorId);
    expect(serialized).not.toContain(targetId);
  });

  it("source documents this is app logs, not a persistent audit ledger", async () => {
    const source = await fs.readFile("src/lib/admin/audit-log.ts", "utf8");
    expect(source).toMatch(/not a persistent audit ledger/i);
    expect(source).toContain("cache(");
    expect(source).not.toMatch(/\.from\(["']audit/i);
  });

  it("getAdminUserDetail wires the audit log after resolving the target user", async () => {
    const source = await fs.readFile("src/lib/admin/users.ts", "utf8");
    expect(source).toContain("logAdminUserDetailViewed(actor.userId, userId)");
  });
});
