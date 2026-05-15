export default function HomePage() {
  return (
    <main style={{ fontFamily: "monospace", padding: 24 }}>
      <h1>LaudoUSG API</h1>
      <p>Backend para o app mobile. Sem UI pública.</p>
      <ul>
        <li>GET /api/health</li>
        <li>POST /api/generate (SSE)</li>
        <li>POST /api/transcribe</li>
        <li>GET/POST /api/admin/blocks</li>
      </ul>
    </main>
  );
}
