(() => {
  const retry = "Start a new sign-in from your private Pip Stats dashboard.";

  function describeReturn(url) {
    const params = url.searchParams;
    const invalid = ["Sign-in link is incomplete or invalid", retry];
    // TikTok Login Kit for Web returns these fields in the query string.
    const fields = ["code", "state", "scopes", "error", "error_description"];
    if (url.hash) return invalid;
    for (const key of params.keys()) {
      if (!fields.includes(key) || params.getAll(key).length !== 1) return invalid;
    }

    if (params.has("error") || params.has("error_description")) {
      if (params.has("code")) return invalid;
      if (params.get("error") === "access_denied") {
        return ["Permission declined", "If you meant to grant access, start a new sign-in from your private Pip Stats dashboard."];
      }
      return ["TikTok sign-in did not finish", retry];
    }

    if (!url.search) {
      return ["No sign-in response", "Open your private Pip Stats dashboard to start a sign-in or check an existing connection."];
    }
    if (!params.get("code")?.trim() || !params.get("state")?.trim()) return invalid;
    return ["Sign-in response received", "Only your private Pip Stats dashboard can confirm whether this account was connected. Check the status there."];
  }

  const url = new URL(window.location.href);
  const [heading, message] = describeReturn(url);
  if (url.search || url.hash) {
    url.search = "";
    url.hash = "";
    try {
      window.history.replaceState(null, "", url.href);
    } catch {
      // If history editing is blocked, reopen the clean page without replaying the return.
      window.location.replace(url.href);
      return;
    }
  }
  document.getElementById("heading").textContent = heading;
  document.getElementById("message").textContent = message;
})();
