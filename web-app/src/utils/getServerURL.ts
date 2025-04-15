import { API_LOCAL_DOMAIN, API_PROD_DOMAIN } from "@/constants/api";

export const getServerURL = (method: "http" | "ws") => {
  const env = process.env.NODE_ENV;

  let protocol: typeof method | "https" = method;

  if (env === "production" && method === "http") protocol = "https";

  const domain = env === "production" ? API_PROD_DOMAIN : API_LOCAL_DOMAIN;

  return `${protocol}${domain}`;
};
