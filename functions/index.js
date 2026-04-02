import crypto from "node:crypto";
import { onRequest } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";

initializeApp();

const db = getFirestore();
const CODE_TTL_MINUTES = 15;
const COLLECTION_RECOVERY = "shieldRecoveryProfiles";
const COLLECTION_RESETS = "shieldResetCodes";

export const registerRecoveryProfile = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method not allowed");
    return;
  }

  try {
    const token = getBearerToken(req);
    const profile = await fetchGoogleProfile(token);
    const { recoveryId, recoveryVaultKey } = req.body || {};

    if (!recoveryId || !recoveryVaultKey) {
      res.status(400).send("Missing recovery payload");
      return;
    }

    await db.collection(COLLECTION_RECOVERY).doc(profile.email.toLowerCase()).set({
      email: profile.email.toLowerCase(),
      recoveryId,
      recoveryVaultKey,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });

    res.json({ ok: true });
  } catch (error) {
    console.error("registerRecoveryProfile failed:", error);
    res.status(401).send("Unauthorized or invalid recovery payload");
  }
});

export const requestPinReset = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method not allowed");
    return;
  }

  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    if (!email) {
      res.status(400).send("Missing email");
      return;
    }

    const recoveryDoc = await db.collection(COLLECTION_RECOVERY).doc(email).get();
    if (!recoveryDoc.exists) {
      res.status(404).send("No recovery profile found for this email");
      return;
    }

    const code = createResetCode();
    await db.collection(COLLECTION_RESETS).doc(email).set({
      email,
      codeHash: hashCode(code),
      expiresAt: Timestamp.fromDate(new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000)),
      createdAt: FieldValue.serverTimestamp()
    });

    await sendResetEmail(email, code);
    res.json({ ok: true, expiresInMinutes: CODE_TTL_MINUTES });
  } catch (error) {
    console.error("requestPinReset failed:", error);
    res.status(500).send("Failed to request reset code");
  }
});

export const consumePinReset = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method not allowed");
    return;
  }

  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const code = String(req.body?.code || "").trim();
    if (!email || !code) {
      res.status(400).send("Missing email or code");
      return;
    }

    const resetDoc = await db.collection(COLLECTION_RESETS).doc(email).get();
    const recoveryDoc = await db.collection(COLLECTION_RECOVERY).doc(email).get();

    if (!resetDoc.exists || !recoveryDoc.exists) {
      res.status(404).send("Reset record not found");
      return;
    }

    const resetData = resetDoc.data();
    const recoveryData = recoveryDoc.data();
    const expiresAt = resetData?.expiresAt?.toDate?.();

    if (!expiresAt || expiresAt.getTime() < Date.now()) {
      await resetDoc.ref.delete();
      res.status(410).send("Reset code expired");
      return;
    }

    if (hashCode(code) !== resetData.codeHash) {
      res.status(401).send("Invalid reset code");
      return;
    }

    await resetDoc.ref.delete();
    res.json({
      ok: true,
      recoveryId: recoveryData.recoveryId,
      recoveryVaultKey: recoveryData.recoveryVaultKey
    });
  } catch (error) {
    console.error("consumePinReset failed:", error);
    res.status(500).send("Failed to consume reset code");
  }
});

function getBearerToken(req) {
  const header = String(req.headers.authorization || "");
  if (!header.startsWith("Bearer ")) {
    throw new Error("Missing bearer token");
  }
  return header.slice("Bearer ".length);
}

async function fetchGoogleProfile(token) {
  const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error("Google token validation failed");
  }

  const profile = await response.json();
  if (!profile?.email) {
    throw new Error("Google profile missing email");
  }

  return profile;
}

function createResetCode() {
  return String(crypto.randomInt(100000, 999999));
}

function hashCode(code) {
  return crypto
    .createHash("sha256")
    .update(`${code}:${getResetPepper()}`)
    .digest("hex");
}

function getResetPepper() {
  return process.env.SHIELD_RESET_PEPPER || "replace-me";
}

async function sendResetEmail(email, code) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !fromEmail) {
    console.warn(`Reset code for ${email}: ${code}`);
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [email],
      subject: "Shield Gen PIN reset code",
      text: `Your Shield Gen reset code is ${code}. It expires in ${CODE_TTL_MINUTES} minutes.`
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Email provider error: ${body}`);
  }
}
