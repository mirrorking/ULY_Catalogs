export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }
  let body = "";
  for await (const chunk of req) {
    body += chunk;
  }
  const { code } = JSON.parse(body);
  const realCode = process.env.ACCESS_CODE;

  if (code === realCode) {
    res.setHeader("Set-Cookie", "uly_verified=1; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400");
    return res.status(200).json({ ok: true });
  } else {
    return res.status(200).json({ ok: false });
  }
}
