'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="de">
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center">
          <div className="mb-4 text-5xl">🚨</div>
          <h1 className="text-2xl font-bold mb-2">Kritischer Fehler</h1>
          <p className="text-gray-500 mb-6 max-w-md">
            Die Anwendung ist auf einen unerwarteten Fehler gestoßen.
            {error.digest && (
              <span className="block mt-2 text-xs font-mono text-gray-400">
                Fehler-ID: {error.digest}
              </span>
            )}
          </p>
          <button
            onClick={reset}
            className="px-4 py-2 bg-black text-white rounded-md hover:opacity-80 transition-opacity"
          >
            Neu laden
          </button>
        </div>
      </body>
    </html>
  );
}
