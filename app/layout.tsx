import './globals.css';

export const metadata = {
  title: 'Web Insulation API',
  description: 'Secure API server for web-insulation with json.io integration',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}