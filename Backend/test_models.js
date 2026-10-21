const https = require("https");

const options = {
  hostname: "api.groq.com",
  path: "/openai/v1/models",
  method: "GET",
  headers: {
    Authorization: `Bearer ${process.env.GROQ_API_KEY || ""}`,
    "User-Agent": "IntervuSetu-Test",
  },
};

const req = https.request(options, (res) => {
  let body = "";
  res.on("data", (chunk) => (body += chunk));
  res.on("end", () => {
    try {
      const data = JSON.parse(body);
      if (data.data) {
        console.log("AVAILABLE GROQ MODELS:");
        const ids = data.data.map((m) => m.id);
        console.log(ids.join("\n"));
      } else {
        console.log("Response:", body);
      }
    } catch (e) {
      console.error("Parse error:", e);
    }
  });
});

req.on("error", (e) => console.error("Request error:", e));
req.end();
