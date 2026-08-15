// Strictly gates WhatsApp sends to the numbers listed in
// WHATSAPP_TEST_RECIPIENTS. This is not optional/best-effort — Meta will
// reject sends to unverified numbers anyway while the account is
// unverified, but this stops the attempt (and any API error noise) before
// it happens, and remains the deliberate policy even after Business
// Verification until that's explicitly revisited.
function getAllowedRecipients() {
  return new Set(
    (process.env.WHATSAPP_TEST_RECIPIENTS || "")
      .split(",")
      .map((n) => normalizeNumber(n))
      .filter(Boolean)
  );
}

function normalizeNumber(raw) {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  // Store/compare on the last 10 digits so "8528797606", "918528797606",
  // and "+91 85287 97606" all match the same underlying number.
  return digits.slice(-10);
}

function isAllowedRecipient(mobile) {
  return getAllowedRecipients().has(normalizeNumber(mobile));
}

async function sendWhatsAppTemplate({ to, templateName, languageCode = "en_US", params = [] }) {
  if (!isAllowedRecipient(to)) {
    return { skipped: true, reason: "not_in_test_recipient_allowlist" };
  }

  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const digits = normalizeNumber(to);
  const toE164 = `91${digits}`; // all current test recipients are Indian numbers

  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: toE164,
      type: "template",
      template: {
        name: templateName,
        language: { code: languageCode },
        components: params.length
          ? [{ type: "body", parameters: params.map((text) => ({ type: "text", text: String(text) })) }]
          : undefined,
      },
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    return { skipped: false, ok: false, status: res.status, error: data.error };
  }
  return { skipped: false, ok: true, messageId: data.messages?.[0]?.id };
}

module.exports = { isAllowedRecipient, normalizeNumber, sendWhatsAppTemplate };
