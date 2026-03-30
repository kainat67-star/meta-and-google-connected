/** Parse OAuth redirect query (?code=&state=) on Supabase Edge (path-only req.url safe). */
export function getOAuthCallbackSearchParams(req: Request, supabaseUrl: string): URLSearchParams {
  const origin = supabaseUrl.trim().replace(/\/+$/, "");
  const raw = req.url ?? "";

  const candidates: URLSearchParams[] = [];

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    try {
      candidates.push(new URL(raw).searchParams);
    } catch {
      /* ignore */
    }
  }

  try {
    candidates.push(new URL(raw, `${origin}/`).searchParams);
  } catch {
    /* ignore */
  }

  const host = req.headers.get("host") ?? req.headers.get("x-forwarded-host") ?? "";
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  if (host) {
    try {
      candidates.push(new URL(raw, `${proto}://${host}/`).searchParams);
    } catch {
      /* ignore */
    }
  }

  const qIdx = raw.indexOf("?");
  if (qIdx !== -1) {
    const qs = raw.slice(qIdx + 1).split("#")[0] ?? "";
    if (qs) candidates.push(new URLSearchParams(qs));
  }

  const pick = (name: string): string | null => {
    for (const p of candidates) {
      const v = p.get(name);
      if (v != null && v.length > 0) return v;
    }
    return null;
  };

  const merged = new URLSearchParams();
  for (const name of ["code", "state", "error", "error_description"] as const) {
    const v = pick(name);
    if (v !== null) merged.set(name, v);
  }
  return merged;
}
