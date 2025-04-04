export const Loader = () => (
  <div className="flex h-full w-full justify-center">
    <div className="inset-0 flex items-center justify-center bg-zinc-950">
      <div className="flex flex-col items-center">
        <div className="flex space-x-2">
          <div className="w-4 h-4 bg-green-400 rounded-full animate-pulse"></div>
          <div className="w-4 h-4 bg-green-400 rounded-full animate-pulse delay-150"></div>
          <div className="w-4 h-4 bg-green-400 rounded-full animate-pulse delay-300"></div>
        </div>
        <div className="mt-2 text-green-400">Processing...</div>
      </div>
    </div>
  </div>
);
