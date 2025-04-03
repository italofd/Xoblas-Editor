import { API_LOCAL_URL, API_PROD_URL } from "@/constants/api";

export const getServerURL = () => {
  const env = process.env.NODE_ENV;

  return env === "production" ? API_PROD_URL : API_LOCAL_URL;
};
