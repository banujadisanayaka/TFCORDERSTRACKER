const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(
      JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || "{}")
    ),
  });
}

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: "Method Not Allowed" };
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) return { statusCode: 500, headers, body: "FIREBASE_SERVICE_ACCOUNT not configured" };

  try {
    const { targetRoles, payload, senderToken } = JSON.parse(event.body || "{}");
    if (!targetRoles?.length || !payload?.title) return { statusCode: 400, headers, body: "Missing fields" };

    const db = admin.firestore();

    // Query tokens for all target roles in parallel
    const snaps = await Promise.all(
      targetRoles.map(r => db.collection("fcm_tokens").where("activeRole", "==", r).get())
    );

    const tokens = [...new Set(
      snaps.flatMap(s => s.docs.map(d => d.data().token))
    )].filter(t => t && t !== senderToken);

    if (!tokens.length) return { statusCode: 200, headers, body: JSON.stringify({ sent: 0 }) };

    // Firebase FCM limit is 500 tokens per multicast call
    const chunks = [];
    for (let i = 0; i < tokens.length; i += 500) chunks.push(tokens.slice(i, i + 500));

    let successCount = 0;
    const messaging = admin.messaging();

    for (const chunk of chunks) {
      const res = await messaging.sendEachForMulticast({
        tokens: chunk,
        notification: { title: payload.title, body: payload.body || "" },
        webpush: {
          notification: {
            icon: "/icon-192.png",
            badge: "/icon-192.png",
            tag: payload.tag || "tfc",
            requireInteraction: false,
          },
          fcmOptions: { link: "/" },
        },
      });
      successCount += res.successCount;

      // Remove invalid/expired tokens
      res.responses.forEach((r, i) => {
        if (!r.success && (r.error?.code === "messaging/invalid-registration-token" || r.error?.code === "messaging/registration-token-not-registered")) {
          const badToken = chunk[i];
          db.collection("fcm_tokens").where("token", "==", badToken).get()
            .then(s => s.forEach(d => d.ref.delete()))
            .catch(() => {});
        }
      });
    }

    return { statusCode: 200, headers, body: JSON.stringify({ sent: successCount }) };
  } catch (err) {
    console.error("Push error:", err);
    return { statusCode: 500, headers, body: err.message };
  }
};
