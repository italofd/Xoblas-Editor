import { ReactNode } from "react";

export const MainLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="w-full h-full min-w-[40%] flex bg-zinc-900 text-zinc-100">
      <div className="w-full mx-auto space-y-8">
        <div className="flex flex-col h-full bg-zinc-800 border border-zinc-700 overflow-hidden">
          <div className="flex flex-[1] overflow-auto">
            <div className="h-full  w-full p-4 rounded-md font-mono text-sm text-zinc-300 overflow-auto">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
