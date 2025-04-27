"use client";
import { useSocket } from "@/hooks/useSocket";
import { useTerminal } from "@/hooks/useXterm";
import { useEffect, useRef, useState } from "react";

import { useXTerm } from "react-xtermjs";

import { Resizable, ResizableProps } from "react-resizable";

import "react-resizable/css/styles.css";

function XTerminal({ socketHook }: { socketHook: ReturnType<typeof useSocket> }) {
  const { isEnvReady, socket, wsData } = socketHook;

  const { instance, ref } = useXTerm();
  const charRef = useRef<HTMLDivElement>(null);
  const lastSizeRef = useRef({ cols: 0, rows: 0 });

  const { onResize } = useTerminal(instance, ref, socket, wsData);

  const [dimensions, setDimensions] = useState({ height: 280, width: 100 });

  //Resize Observer
  useEffect(() => {
    if (!ref.current || !charRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      onResize(lastSizeRef, isEnvReady);
    });

    resizeObserver.observe(ref.current);

    // Cleanup
    return () => {
      resizeObserver.disconnect();
    };
  }, [ref, charRef, instance, wsData, lastSizeRef, onResize, isEnvReady]);

  const customOnresize: ResizableProps["onResize"] = (_, { size }) => {
    setDimensions({ width: size.width, height: size.height });
  };

  return (
    <Resizable
      height={dimensions.height}
      width={dimensions.width}
      onResize={customOnresize}
      axis="y"
      resizeHandles={["n"]}
      minConstraints={[0, 280]}
      handle={<span className="absolute top-0 left-0 w-full h-2 cursor-n-resize z-10" />}
    >
      <div
        style={{
          height: dimensions.height,
        }}
        className="pb-12"
      >
        <div className="bg-zinc-800 text-white p-2 rounded-t">Terminal</div>
        <div
          ref={ref}
          className="flex flex-grow h-full min-h-0 bg-black rounded-b overflow-hidden text-base relative"
        />
        <div ref={charRef} className="invisible absolute top-0 left-0 whitespace-pre">
          M
        </div>
      </div>
    </Resizable>
  );
}

export default XTerminal;
