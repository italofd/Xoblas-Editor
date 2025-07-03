"use client";
import { useSocket } from "@/hooks/useSocket";
import { useEffect, useRef, useState } from "react";

import { useXTerm } from "react-xtermjs";

import { Resizable, ResizableProps } from "react-resizable";

import "react-resizable/css/styles.css";

function XTerminal({ socketHook }: { socketHook: ReturnType<typeof useSocket> }) {
  const { isEnvReady, wsData } = socketHook;

  const charRef = useRef<HTMLDivElement>(null);
  const lastSizeRef = useRef({ cols: 0, rows: 0 });
  const [dimensions, setDimensions] = useState({ height: 280, width: 100 });

  const { instance, ref } = useXTerm();

  //Resize Observer
  useEffect(() => {
    if (!ref.current || !charRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      // onResize(lastSizeRef, isEnvReady);
    });

    resizeObserver.observe(ref.current);

    // Cleanup
    return () => {
      resizeObserver.disconnect();
    };
  }, [ref, charRef, instance, wsData, lastSizeRef, isEnvReady]);

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
        className="flex flex-col"
        style={{
          height: dimensions.height,
        }}
      >
        <div className="h-9 bg-zinc-800 text-white p-2 rounded-t">Terminal</div>
        <div
          ref={ref}
          className="flex flex-grow flex-1 bg-black rounded-b overflow-hidden text-base relative"
        />
        <div ref={charRef} className="invisible absolute top-0 left-0 whitespace-pre">
          M
        </div>
      </div>
    </Resizable>
  );
}

export default XTerminal;
