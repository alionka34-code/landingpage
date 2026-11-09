// Fonction Vercel : ajoute le contact dans Systeme.io, avec un prénom déduit de l'email
const GENERIQUES = new Set(["contact","info","infos","admin","hello","bonjour","mail","email","support","service","commercial","compta","webmaster","noreply","accueil","secretariat","direction","test","user","nutrition","sante"]);

function deviner(email) {
  const local = email.split("@")[0].toLowerCase();
  const mot = local.split(/[._\-+0-9]+/).filter(Boolean)[0] || "";
  if (!/^[a-zà-ÿ]{3,20}$/.test(mot) || GENERIQUES.has(mot)) return "";
  return mot.charAt(0).toUpperCase() + mot.slice(1);
}

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

  const body = { email, locale: "fr" };
  const prenom = deviner(email);
  if (prenom) body.fields = [{ slug: "first_name", value: prenom }];

  const r = await fetch("https://api.systeme.io/api/contacts", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!r.ok) return res.status(502).json({ error: "Systeme.io " + r.status });

  if (process.env.SYSTEME_TAG_ID) {
    const contact = await r.json();
    await fetch(`https://api.systeme.io/api/contacts/${contact.id}/tags`, {
      method: "POST",
      headers,
      body: JSON.stringify({ tagId: Number(process.env.SYSTEME_TAG_ID) }),
    });
  }
  return res.status(200).json({ ok: true });
};
