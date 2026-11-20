export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }
  const body = await req.json();
  const inputCode = body.code;
  const realCode = process.env.ACCESS_CODE;

  if (inputCode === realCode) {
    return new Response(JSON.stringify({ok:true}), {
      status:200,
      headers:{
        "Content-Type":"application/json",
        "Set-Cookie":"uly_verified=1; Path=/; HttpOnly; SameSite=Lax"
      }
    })
  }else{
    return new Response(JSON.stringify({ok:false}), {status:200, headers:{"Content-Type":"application/json"}})
  }
}
