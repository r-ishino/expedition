export type HealthStatus = {
  status: "ok" | "error";
  timestamp: string;
  service: string;
};
