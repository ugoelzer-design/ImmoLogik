'use client';

import { ErrorDisplay } from '@/components/ui/error-display';
import { DEFAULT_ERROR_MESSAGE, getSectionErrorTitle } from '@/lib/constants/error-display';

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorDisplay
      title={getSectionErrorTitle('Verträge')}
      message={DEFAULT_ERROR_MESSAGE}
      reset={reset}
    />
  );
}
