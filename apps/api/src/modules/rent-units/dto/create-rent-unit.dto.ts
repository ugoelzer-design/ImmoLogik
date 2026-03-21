export class CreateRentUnitDto {
  objectId: string;
  unitLabel: string;
  tenant: string;
  sollMiete: number;
  istMiete?: number;
  zahlungsStatus?: string;
  faelligAm: string;
}
