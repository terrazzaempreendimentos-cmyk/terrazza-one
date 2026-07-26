const DEFAULT_DASHBOARD_PATH = "/dashboard";

export function safeDashboardRedirect(value: unknown) {
  const candidate = typeof value === "string" ? value.trim() : "";

  if (
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.includes("\\")
  ) {
    return DEFAULT_DASHBOARD_PATH;
  }

  try {
    const url = new URL(candidate, "https://terrazza.internal");
    const isDashboardPath =
      url.pathname === DEFAULT_DASHBOARD_PATH ||
      url.pathname.startsWith(`${DEFAULT_DASHBOARD_PATH}/`);

    if (url.origin !== "https://terrazza.internal" || !isDashboardPath) {
      return DEFAULT_DASHBOARD_PATH;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return DEFAULT_DASHBOARD_PATH;
  }
}
