export default function Home() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Web Insulation API Server</h1>
      <p>Secure API server with json.io integration</p>
      <p>Check the API status at <a href="/api/status">/api/status</a></p>
      <p>Health check at <a href="/health">/health</a></p>
    </div>
  );
}