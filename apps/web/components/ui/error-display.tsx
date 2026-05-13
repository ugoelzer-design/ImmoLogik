'use client';

interface ErrorDisplayProps {
  title?: string;
  message?: string;
  reset?: () => void;
}

export function ErrorDisplay({
  title = 'Fehler aufgetreten',
  message = 'Beim Laden der Daten ist ein Fehler aufgetreten.',
  reset,
}: ErrorDisplayProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center">
      <div className="mb-4 text-4xl">⚠️</div>
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      <p className="text-muted-foreground mb-6 max-w-md">{message}</p>
      {reset && (
        <button
          onClick={reset}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity"
        >
          Erneut versuchen
        </button>
      )}
    </div>
  );
}
