// Fonction serverless Vercel : POST /api/subscribe
// Crée (ou retrouve) le contact dans Systeme.io puis lui ajoute le tag
// qui déclenche l'envoi du guide offert.
//
// Variables d'environnement à définir dans Vercel (Settings > Environment Variables) :
//   SYSTEMEIO_API_KEY  → Systeme.io > Paramètres > Clé API publique
//   SYSTEMEIO_TAG_ID   → ID numérique du tag (ex. "book-nutrition-antifragile")
//   Les anciens noms SYSTEME_API_KEY / SYSTEME_TAG_ID sont aussi acceptés.
//
// La clé API reste côté serveur : elle n'apparaît jamais dans la page.

const API = "https://api.systeme.io/api";

async function sio(path, apiKey, options = {}) {
  const res = await fetch(API + path, {
    ...options,
    headers: {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(options.headers || {}),
    },
  });
  let body = null;
  try { body = await res.json(); } catch (_) { /* réponse vide */ }
  return { status: res.status, body };
}

async function findContactId(email, apiKey) {
  const r = await sio(`/contacts?email=${encodeURIComponent(email)}`, apiKey);
  const items = (r.body && (r.body.items || r.body["hydra:member"])) || [];
  const match = items.find(c => (c.email || "").toLowerCase() === email.toLowerCase());
  return match ? match.id : null;
}

const TAG_NAME = process.env.SYSTEMEIO_TAG_NAME || "book-nutrition-antifragile";

// Retrouve l'ID du tag à partir de son nom (évite de dépendre d'un ID copié à la main)
async function findTagId(name, apiKey) {
  const r = await sio(`/tags?query=${encodeURIComponent(name)}&limit=100`, apiKey);
  const items = (r.body && (r.body.items || r.body["hydra:member"])) || [];
  const match = items.find(t => (t.name || "").trim().toLowerCase() === name.toLowerCase());
  if (!match) console.error("Tag introuvable par son nom :", name, r.status, JSON.stringify(r.body).slice(0, 500));
  return match ? match.id : null;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  const apiKey = process.env.SYSTEMEIO_API_KEY || process.env.SYSTEME_API_KEY;
  const envTagId = Number(process.env.SYSTEMEIO_TAG_ID || process.env.SYSTEME_TAG_ID) || null;
  if (!apiKey) {
    console.error("SYSTEMEIO_API_KEY manquant");
    return res.status(500).json({ ok: false, error: "config" });
  }

  let data = req.body;
  if (typeof data === "string") { try { data = JSON.parse(data); } catch (_) { data = {}; } }
  const prenom = String((data && data.prenom) || "").trim().slice(0, 80);
  const email = String((data && data.email) || "").trim().toLowerCase().slice(0, 200);
  const honeypot = String((data && data.website) || "");

  // Robot détecté : on répond OK sans rien enregistrer.
  if (honeypot) return res.status(200).json({ ok: true });

  if (!prenom || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return res.status(400).json({ ok: false, error: "invalid_input" });
  }

  try {
    // 1. Créer le contact
    let contactId = null;
    const created = await sio("/contacts", apiKey, {
      method: "POST",
      body: JSON.stringify({
        email,
        locale: "fr",
        fields: [{ slug: "first_name", value: prenom }],
      }),
    });

    if (created.status === 201 && created.body) {
      contactId = created.body.id;
    } else if (created.status === 422) {
      // L'email existe déjà : on retrouve le contact existant
      contactId = await findContactId(email, apiKey);
    } else {
      console.error("Création contact Systeme.io :", created.status, created.body);
      return res.status(502).json({ ok: false, error: "systemeio_contact" });
    }

    if (!contactId) {
      console.error("Contact introuvable après 422 :", created.body);
      return res.status(502).json({ ok: false, error: "systemeio_lookup" });
    }

    // Tag : on cherche d'abord par son nom, sinon on prend l'ID des réglages Vercel
    const tagId = (await findTagId(TAG_NAME, apiKey)) || envTagId;
    if (!tagId) return res.status(502).json({ ok: false, error: "systemeio_tag_missing" });

    // 2. Ajouter le tag (déclenche la règle d'automatisation qui envoie le guide)
    const tagged = await sio(`/contacts/${contactId}/tags`, apiKey, {
      method: "POST",
      body: JSON.stringify({ tagId }),
    });
    console.log("Ajout du tag", tagId, "au contact", contactId, ":", tagged.status, JSON.stringify(tagged.body));
    // 422 ici = le contact a déjà le tag : ce n'est pas une erreur
    if (tagged.status >= 400 && tagged.status !== 422) {
      console.error("Ajout du tag Systeme.io :", tagged.status, tagged.body);
      return res.status(502).json({ ok: false, error: "systemeio_tag" });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Erreur Systeme.io :", err);
    return res.status(502).json({ ok: false, error: "network" });
  }
};
