"use client";
import { useSocket } from "@/hooks/useSocket";
import { useTerminal } from "@/hooks/useXterm";
import { useEffect, useRef } from "react";

import { useXTerm } from "react-xtermjs";

export const XTerminal = () => {
  const { instance, ref } = useXTerm();
  const { socket, wsData } = useSocket();
  const charRef = useRef<HTMLDivElement>(null);
  const lastSizeRef = useRef({ cols: 0, rows: 0 });

  const { onResize } = useTerminal(instance, ref, socket, wsData);

  useEffect(() => {
    if (!ref.current || !charRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      onResize(lastSizeRef);
    });

    resizeObserver.observe(ref.current);

    // Cleanup
    return () => {
      resizeObserver.disconnect();
    };
  }, [ref, charRef, instance, wsData]);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="bg-zinc-800 text-white p-2 rounded-t">Terminal</div>
      <div
        ref={ref}
        className="flex-grow bg-black rounded-b overflow-hidden text-base relative"
        style={{ minHeight: "100px", maxHeight: "230px" }}
      />
      <div ref={charRef} className="invisible absolute top-0 left-0 whitespace-pre">
        M
      </div>
    </div>
  );
};
