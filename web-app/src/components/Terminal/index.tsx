"use client";
import { useSocket } from "@/hooks/useSocket";
import { useTerminal } from "@/hooks/useXterm";

import { useXTerm } from "react-xtermjs";

export const XTerminal = () => {
  const { instance, ref } = useXTerm();
  const { socket, wsData } = useSocket();

  useTerminal(instance, ref, socket, wsData);

  return (
    <div className="w-full flex flex-col">
      <div className="bg-zinc-800 text-white p-2 rounded-t">Terminal</div>
      <div
        ref={ref}
        className="flex-grow bg-black rounded-b overflow-hidden"
        style={{ minHeight: "100px", maxHeight: "230px" }}
      />
    </div>
  );
};
