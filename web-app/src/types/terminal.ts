import { useSocket } from "@/hooks/useSocket";

export type WsData = ReturnType<typeof useSocket>["wsData"];
export type Socket = ReturnType<typeof useSocket>["socket"];
