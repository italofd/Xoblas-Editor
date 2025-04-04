import { ReactNode } from "react";
import { Loader } from "../Loader";

export const OutputLayout = ({
  children,
  isExecLoading,
}: {
  children: ReactNode;
  isExecLoading: boolean;
}) => {
  return (
    <div className="flex flex-col max-w-[30%] min-w-[30%] bg-zinc-800 border border-zinc-700 rounded-lg p-4">
      <h2 className="text-lg font-semibold mb-2">Output</h2>
      <div className="h-full overflow-auto scrollbar-track:bg-slate-400 bg-zinc-950 p-4 rounded-md font-mono text-lg text-green-400 whitespace-pre-wrap">
        {/*[TO-DO]: Consider a regex to separate each line into a paragraph for better control over UI manipulation */}
        {isExecLoading ? <Loader /> : children}
      </div>
    </div>
  );
};
