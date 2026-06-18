/**
 * Zentrale Zod-Validierungsschemas für alle Formulare in Immologik.
 *
 * Verwendung:
 *   import { objectSchema, tenantSchema, contractSchema } from "@/lib/validation/schemas";
 *
 *   const result = objectSchema.safeParse(formData);
 *   if (!result.success) {
 *     const errors = result.error.flatten().fieldErrors;
 *   }
 */
import { z } from "zod";

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────

const requiredString = (label: string) =>
  z.string().trim().min(1, { message: `${label} ist erforderlich.` });

const isoDateString = (label: string) =>
  z
    .string()
    .trim()
    .min(1, { message: `${label} ist erforderlich.` })
    .refine((val) => !Number.isNaN(Date.parse(val)), {
      message: `${label} muss ein gültiges Datum sein.`,
    });

// ─── Objekt-Formular ──────────────────────────────────────────────────────────

export const objectSchema = z.object({
  name: requiredString("Bezeichnung"),
  address: requiredString("Adresse"),
  units: z
    .number({ invalid_type_error: "Einheiten muss eine Zahl sein." })
    .int({ message: "Einheiten muss eine ganze Zahl sein." })
    .min(1, { message: "Mindestens 1 Einheit erforderlich." }),
});

export type ObjectFormValues = z.infer<typeof objectSchema>;

// ─── Mieter-Formular ──────────────────────────────────────────────────────────

export const tenantSchema = z.object({
  objectId: requiredString("Objekt"),
  rentUnitId: requiredString("Mieteinheit"),
  fullName: requiredString("Name"),
  email: z
    .string()
    .trim()
    .min(1, { message: "E-Mail ist erforderlich." })
    .email({ message: "Bitte eine gültige E-Mail-Adresse eingeben." }),
  phone: z.string().trim().optional().default(""),
  status: z.enum(["Aktiv", "Ausstehend", "Beendet"], {
    errorMap: () => ({ message: "Bitte einen gültigen Status auswählen." }),
  }),
});

export type TenantFormValues = z.infer<typeof tenantSchema>;

// ─── Vertrag-Formular ─────────────────────────────────────────────────────────

export const contractSchema = z
  .object({
    objectId: requiredString("Objekt"),
    tenantId: requiredString("Mieter"),
    rentUnitId: z.string().trim().optional().nullable(),
    title: requiredString("Bezeichnung"),
    startDate: isoDateString("Startdatum"),
    endDate: isoDateString("Enddatum"),
    status: z.enum(["Aktiv", "Läuft aus", "In Prüfung"], {
      errorMap: () => ({ message: "Bitte einen gültigen Status auswählen." }),
    }),
  })
  .refine(
    (data) => !data.endDate || !data.startDate || new Date(data.endDate) >= new Date(data.startDate),
    {
      message: "Enddatum darf nicht vor dem Startdatum liegen.",
      path: ["endDate"],
    },
  );

export type ContractFormValues = z.infer<typeof contractSchema>;

// ─── Dokument-Upload-Formular ─────────────────────────────────────────────────

const CATEGORIES_WITH_YEAR = ["Jahresreport WEG", "Jahresreport Wohnung", "Nebenkostenabrechnung"];

export const documentUploadSchema = z
  .object({
    title: requiredString("Titel"),
    category: requiredString("Kategorie"),
    objectId: z.string().trim().optional().nullable(),
    rentUnitId: z.string().trim().optional().nullable(),
    reportYear: z
      .string()
      .trim()
      .optional()
      .refine(
        (val) => !val || (/^\d{4}$/.test(val) && Number(val) >= 2000 && Number(val) <= 2100),
        { message: "Berichtsjahr muss eine vierstellige Jahreszahl (2000–2100) sein." },
      ),
  })
  .refine(
    (data) => {
      if (CATEGORIES_WITH_YEAR.includes(data.category)) {
        return !!data.reportYear;
      }
      return true;
    },
    {
      message: "Für diese Kategorie ist ein Berichtsjahr erforderlich.",
      path: ["reportYear"],
    },
  );

export type DocumentUploadFormValues = z.infer<typeof documentUploadSchema>;
