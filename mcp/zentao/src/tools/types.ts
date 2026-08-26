export type TextToolResult = {
  content: [{ type: "text"; text: string }];
};

export type BugsQuery = {
  projectId?: string | number;
  status?: "all" | "unresolved";
  pageSize?: number;
};
