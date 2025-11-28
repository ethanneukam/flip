export async function shipEngine(path: string, body?: any) {
  const res = await fetch(`https://api.shipengine.com/v1/${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      "API-Key": process.env.SHIPENGINE_API_KEY!,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  return res.json();
}
