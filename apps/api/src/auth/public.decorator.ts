import { SetMetadata } from '@nestjs/common';

/**
 * Markiert einen Endpunkt als öffentlich zugänglich.
 * Öffentliche Routen werden vom globalen AuthGuard übersprungen.
 */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
