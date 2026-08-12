import { useEffect, useState } from "react";

const inviteRequests = new Map();

function resolveInvite(token) {
  if (!inviteRequests.has(token)) {
    inviteRequests.set(token, fetch(`/api/movimento-rsvp?token=${encodeURIComponent(token)}`, {
      headers: { Accept: "application/json" },
    }).then(async (response) => {
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.invite) throw new Error(body.error || "Convite inválido ou expirado.");
      return body;
    }));
  }
  return inviteRequests.get(token);
}

export function useMovementInvite(token) {
  const [result, setResult] = useState(() => token
    ? { state: "loading", invite: null, currentRsvp: null, currentPartnerLead: null, error: "" }
    : { state: "ready", invite: null, currentRsvp: null, currentPartnerLead: null, error: "" });

  useEffect(() => {
    let active = true;
    if (!token) {
      setResult({ state: "ready", invite: null, currentRsvp: null, currentPartnerLead: null, error: "" });
      return () => { active = false; };
    }
    setResult({ state: "loading", invite: null, currentRsvp: null, currentPartnerLead: null, error: "" });
    resolveInvite(token)
      .then((body) => {
        if (!active) return;
        setResult({
          state: "ready",
          invite: body.invite,
          currentRsvp: body.currentRsvp || null,
          currentPartnerLead: body.currentPartnerLead || null,
          error: "",
        });
      })
      .catch((error) => {
        if (!active) return;
        setResult({ state: "error", invite: null, currentRsvp: null, currentPartnerLead: null, error: error.message || "Convite inválido ou expirado." });
      });
    return () => { active = false; };
  }, [token]);

  return result;
}
