import { useSocket } from "@/hooks/useSocket";

//[TO-DO]: Move this to the right file, this is socket types
export type WsData = ReturnType<typeof useSocket>["wsData"];
export type Socket = ReturnType<typeof useSocket>["socket"];
export type Handlers = ReturnType<typeof useSocket>["handlers"];
