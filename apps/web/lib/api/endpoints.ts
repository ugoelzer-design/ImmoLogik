export const apiEndpoints = {
  objects: {
    list: "/objects",
    detail: (id: string) => `/objects/${id}`,
  },
  documents: {
    list: "/documents",
    detail: (id: string) => `/documents/${id}`,
  },
  tenants: {
    list: "/tenants",
    detail: (id: string) => `/tenants/${id}`,
  },
  contracts: {
    list: "/contracts",
    detail: (id: string) => `/contracts/${id}`,
  },
};
