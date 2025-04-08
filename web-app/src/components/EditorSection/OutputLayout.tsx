import { ReactNode } from "react";
import { Loader } from "../Loader";

export const CodeOutputComponent = ({
  children,
  isLoading,
}: {
  children: ReactNode;
  isLoading: boolean;
}) => {
  return (
    <div className="h-full min-h-20 max-h-60 overflow-auto lg:max-h-full scrollbar-track:bg-slate-400 bg-zinc-950 p-4 rounded-md font-mono text-lg whitespace-pre-wrap break-words">
      {isLoading ? <Loader /> : children}
    </div>
  );
};

export const OutputLayout = ({
  children,
  isLoading,
  showHeader = true,
}: {
  children: ReactNode;
  isLoading: boolean;
  showHeader?: boolean;
}) => {
  return (
    <>
      {showHeader && <h2 className="text-lg font-semibold">Output</h2>}
      <CodeOutputComponent isLoading={isLoading}>{children}</CodeOutputComponent>
    </>
  );
};
