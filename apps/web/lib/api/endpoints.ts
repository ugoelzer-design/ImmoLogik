export const apiEndpoints = {
  objects: {
    list: "/objects",
    nextDisplayId: "/objects/next-display-id",
    detail: (id: string) => `/objects/${id}`,
  },
  documents: {
    list: "/documents",
    inventoryExport: "/documents/inventory/export",
    detail: (id: string) => `/documents/${id}`,
    upload: "/documents/upload",
    file: (id: string) => `/documents/${id}/file`,
    status: (id: string) => `/documents/${id}/status`,
    download: (id: string) => `/documents/${id}/download`,
  },
  utilityStatements: {
    list: "/utility-statements",
    workspace: "/utility-statements/workspace",
    approve: (id: string) => `/utility-statements/${id}/approve`,
    validation: (id: string) => `/utility-statements/${id}/validation`,
  },
  tenants: {
    list: "/tenants",
    detail: (id: string) => `/tenants/${id}`,
  },
  contracts: {
    list: "/contracts",
    detail: (id: string) => `/contracts/${id}`,
  },
  rentUnits: {
    list: "/rent-units",
    detail: (id: string) => `/rent-units/${id}`,
  },
  meterReadings: {
    meters: "/meter-readings/meters",
    campaigns: "/meter-readings/campaigns",
    access: (token: string) => `/meter-readings/access/${token}`,
    submit: (token: string) => `/meter-readings/access/${token}/readings`,
  },
};
