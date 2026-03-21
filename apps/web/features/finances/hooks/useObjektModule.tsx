"use client";
import { useEffect, useState } from "react";
import { getObjects } from "../../objects/services/objects.service";
import { OBJECT_MODULE_STORAGE_KEYS, readStorageRecord } from "../utils/nebenkosten-storage";
import { createObjectReferencesFromService, normalizeDisplayId } from "../utils/nebenkosten-calc";
import type { LocalObjectReference, ObjectModuleApartment, ObjectModuleTenancy, ObjectModuleUtility } from "../utils/nebenkosten-calc";

type ApartmentsRecord = Record<string, ObjectModuleApartment[]>;
type TenanciesRecord = Record<string, ObjectModuleTenancy[]>;
type UtilitiesRecord = Record<string, ObjectModuleUtility[]>;

export function useObjektModule() {
  const [bekannteObjekte, setBekannteObjekte] = useState<LocalObjectReference[]>([]);
  const [objectApartmentsByStorageId, setObjectApartmentsByStorageId] = useState<ApartmentsRecord>({});
  const [objectTenanciesByStorageId, setObjectTenanciesByStorageId] = useState<TenanciesRecord>({});
  const [objectUtilitiesByStorageId, setObjectUtilitiesByStorageId] = useState<UtilitiesRecord>({});
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    setObjectApartmentsByStorageId(readStorageRecord<ObjectModuleApartment>(OBJECT_MODULE_STORAGE_KEYS.apartments));
    setObjectTenanciesByStorageId(readStorageRecord<ObjectModuleTenancy>(OBJECT_MODULE_STORAGE_KEYS.tenancies));
    setObjectUtilitiesByStorageId(readStorageRecord<ObjectModuleUtility>(OBJECT_MODULE_STORAGE_KEYS.utilities));
    setHasLoaded(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const objects = await getObjects();
        if (!cancelled) setBekannteObjekte(createObjectReferencesFromService(objects));
      } catch { if (!cancelled) setBekannteObjekte([]); }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  const objectStorageKeyByDisplayId = Object.fromEntries(
    bekannteObjekte.map((o) => [normalizeDisplayId(o.displayId), o.id]),
  );

  return {
    bekannteObjekte, setBekannteObjekte,
    objectApartmentsByStorageId,
    objectTenanciesByStorageId,
    objectUtilitiesByStorageId,
    objectStorageKeyByDisplayId,
    hasLoadedObjectModule: hasLoaded,
  };
}
