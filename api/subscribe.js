// Fonction Vercel : ajoute l'email dans Systeme.io (la clé API reste secrète côté serveur)
module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();

  const email = String((req.body && req.body.email) || "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Email invalide" });
  }

  const headers = {
    "X-API-Key": process.env.SYSTEME_API_KEY,
    "Content-Type": "application/json",
  };

  const r = await fetch("https://api.systeme.io/api/contacts", {
    method: "POST",
    headers,
    body: JSON.stringify({ email, locale: "fr" }),
  });
  if (!r.ok) return res.status(502).json({ error: "Systeme.io " + r.status });

  // Ajoute l'étiquette qui déclenche l'envoi du guide (règle d'automatisation Systeme.io)
  const contact = await r.json();
  if (process.env.SYSTEME_TAG_ID) {
    await fetch(`https://api.systeme.io/api/contacts/${contact.id}/tags`, {
      method: "POST",
      headers,
      body: JSON.stringify({ tagId: Number(process.env.SYSTEME_TAG_ID) }),
    });
  }
  return res.status(200).json({ ok: true });
};
