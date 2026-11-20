// 服务器端验证 - Gist ID 仅在服务器端持有，前端页面不可见
const GIST_ID = process.env.GIST_ID || '52102f8d0c8808a733ce44513a4cedd9';

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }
  
  let body = "";
  for await (const chunk of req) {
    body += chunk;
  }
  
  let code;
  try {
    const parsed = JSON.parse(body);
    code = parsed.code;
  } catch {
    return res.status(400).json({ ok: false, message: "Invalid request body" });
  }
  
  if (!code) {
    return res.status(400).json({ ok: false, message: "Verification code is required" });
  }
  
  try {
    // 服务器端从 Gist 获取真实验证码（前端无法直接访问 Gist 链接）
    const gistUrl = `https://gist.githubusercontent.com/raw/${GIST_ID}/uly_config.json`;
    const response = await fetch(gistUrl, { 
      cache: 'no-cache',
      headers: { 'Accept': 'application/json' }
    });
    
    let realCode = process.env.ACCESS_CODE || 'ULY2024';
    
    if (response.ok) {
      const data = await response.json();
      if (data && data.code) {
        realCode = data.code;
      }
    }
    
    if (code === realCode) {
      res.setHeader("Set-Cookie", "uly_verified=1; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400");
      return res.status(200).json({ ok: true, message: "验证成功" });
    } else {
      return res.status(200).json({ ok: false, message: "验证码错误" });
    }
  } catch (error) {
    console.error('Verification error:', error);
    // Gist 获取失败时回退到环境变量验证
    const realCode = process.env.ACCESS_CODE || 'ULY2024';
    if (code === realCode) {
      res.setHeader("Set-Cookie", "uly_verified=1; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400");
      return res.status(200).json({ ok: true });
    }
    return res.status(200).json({ ok: false });
  }
}
