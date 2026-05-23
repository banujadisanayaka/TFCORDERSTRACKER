const admin = require("firebase-admin");

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(
        JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || "{}")
      ),
    });
  } catch (initErr) {
    console.error("push.js: Firebase Admin init failed:", initErr.message);
  }
}

const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Token TTL: delete tokens not updated in the last 45 days (FCM expires after ~60 days inactivity)
const TOKEN_TTL_MS = 45 * 24 * 60 * 60 * 1000;

async function sendWithRetry(messaging, message, attempt = 0) {
  try {
    return await messaging.sendEachForMulticast(message);
  } catch (err) {
    if (attempt < 2) {
      await new Promise(r => setTimeout(r, attempt === 0 ? 1500 : 4000));
      return sendWithRetry(messaging, message, attempt + 1);
    }
    throw err;
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: HEADERS, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers: HEADERS, body: "Method Not Allowed" };

  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.error("push.js: FIREBASE_SERVICE_ACCOUNT env var not set");
    return { statusCode: 500, headers: HEADERS, body: "FIREBASE_SERVICE_ACCOUNT not configured" };
  }
  if (!admin.apps.length) {
    return { statusCode: 500, headers: HEADERS, body: "Firebase Admin failed to initialize" };
  }

  try {
    const { targetRoles, payload, senderToken, senderEmail } = JSON.parse(event.body || "{}");
    if (!targetRoles?.length || !payload?.title) {
      return { statusCode: 400, headers: HEADERS, body: "Missing targetRoles or payload.title" };
    }

    const db   = admin.firestore();
    const now  = Date.now();
    const staleThreshold = now - TOKEN_TTL_MS;

    // Fetch tokens for all target roles in parallel
    const snaps = await Promise.all(
      targetRoles.map(r => db.collection("fcm_tokens").where("activeRole", "==", r).get())
    );

    // Deduplicate, exclude sender, exclude stale tokens
    const seen    = new Set();
    const valid   = [];
    const staleRefs = [];
    const perRoleCounts = {};

    snaps.forEach((snap, i) => {
      const r = targetRoles[i];
      perRoleCounts[r] = { found: snap.size, kept: 0 };
      for (const d of snap.docs) {
        const data = d.data();
        const { token, updatedAt, email } = data;
        if (!token) continue;
        // Sender exclusion: by token primarily, fall back to email when sender has no token yet
        if (senderToken && token === senderToken) continue;
        if (!senderToken && senderEmail && email === senderEmail) continue;
        if (seen.has(token)) continue;
        seen.add(token);
        if (updatedAt && updatedAt < staleThreshold) {
          staleRefs.push(d.ref);
        } else {
          valid.push(token);
          perRoleCounts[r].kept += 1;
        }
      }
    });

    // Opportunistically delete stale tokens (fire-and-forget, don't block response)
    if (staleRefs.length) {
      Promise.all(staleRefs.map(ref => ref.delete())).catch(() => {});
      console.log(`push.js: deleted ${staleRefs.length} stale token(s)`);
    }

    if (!valid.length) {
      console.log("push.js: no valid tokens — per-role:", JSON.stringify(perRoleCounts));
      return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify({ sent: 0, reason: "no_tokens", perRoleCounts }),
      };
    }

    console.log(`push.js: sending "${payload.title}" to ${valid.length} token(s) — per-role:`, JSON.stringify(perRoleCounts));

    const messaging = admin.messaging();
    // FCM max 500 tokens per multicast call
    const chunks = [];
    for (let i = 0; i < valid.length; i += 500) chunks.push(valid.slice(i, i + 500));

    let successCount = 0;
    const badTokens = [];

    for (const chunk of chunks) {
      let res;
      try {
        res = await sendWithRetry(messaging, {
          tokens: chunk,
          notification: { title: payload.title, body: payload.body || "" },
          // data fields let the service worker read title/body even if notification is absent
          data: {
            title: payload.title,
            body: payload.body || "",
            tag: payload.tag || "tfc",
          },
          webpush: {
            // Urgency:high wakes Android even in Doze/battery-saver mode;
            // TTL=86400 keeps the message queued for 24h if the device is offline.
            headers: { Urgency: "high", TTL: "86400" },
            notification: {
              title: payload.title,
              body: payload.body || "",
              icon: "/icon-192.png",
              badge: "/icon-192.png",
              tag: payload.tag || "tfc",
              requireInteraction: false,
              renotify: true,
              vibrate: [200, 100, 200],
            },
            fcmOptions: { link: "/" },
          },
        });
      } catch (chunkErr) {
        console.error("push.js: FCM multicast failed after retries:", chunkErr.message);
        continue; // don't crash — process remaining chunks
      }

      successCount += res.successCount;

      // Collect invalid/unregistered tokens to delete
      res.responses.forEach((r, i) => {
        if (!r.success) {
          const code = r.error?.code;
          console.warn("push.js: token failed:", code, "—", chunk[i].slice(-8));
          if (
            code === "messaging/invalid-registration-token" ||
            code === "messaging/registration-token-not-registered" ||
            code === "messaging/invalid-argument"
          ) {
            badTokens.push(chunk[i]);
          }
        }
      });
    }

    // Delete bad tokens in background
    if (badTokens.length) {
      Promise.all(
        badTokens.map(t =>
          db.collection("fcm_tokens").where("token", "==", t).get()
            .then(s => Promise.all(s.docs.map(d => d.ref.delete())))
        )
      ).catch(() => {});
      console.log(`push.js: queued deletion of ${badTokens.length} invalid token(s)`);
    }

    console.log(`push.js: delivered ${successCount}/${valid.length} push(es)`);
    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({ sent: successCount, total: valid.length, perRoleCounts }),
    };

  } catch (err) {
    console.error("push.js: unhandled error:", err.message, err.stack);
    return { statusCode: 500, headers: HEADERS, body: err.message };
  }
};
