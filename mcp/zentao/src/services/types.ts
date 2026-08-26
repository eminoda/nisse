export type ZenTaoConnection = {
  endpoint: string;
  account: string;
  password: string;
};

export type ZenTaoProject = {
  id: string | number;
  name?: string;
  [key: string]: unknown;
};

export type ZenTaoBug = {
  id: string | number;
  title?: string;
  assignedTo?: string;
  [key: string]: unknown;
};

export type ZenTaoTask = {
  id: string | number;
  name?: string;
  assignedTo?: string;
  status?: string;
  execution?: string | number;
  [key: string]: unknown;
};

export type ResolveBugInput = {
  resolution: "fixed" | "notrepro" | "bydesign" | "duplicate" | "external" | "postponed" | "willnotfix" | "tostory";
  resolvedDate?: string;
  resolvedBuild?: string;
  assignedTo?: string;
  comment?: string;
};

export type ZenTaoFetch = (input: string | URL, init?: RequestInit) => Promise<Response>;
