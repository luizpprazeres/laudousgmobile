const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Authorization, Content-Type, Accept, X-Requested-With",
  "Access-Control-Max-Age": "86400",
};

export function OPTIONS(): Response {
  return new Response(null, { status: 204, headers: HEADERS });
}
