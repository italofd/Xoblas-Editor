const LoadingOverlay = ({ isLoading = true }) => {
  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-zinc-900/60 z-50 flex items-center justify-center">
      <div className="relative bg-zinc-800/80 backdrop-blur-md p-8 rounded-lg shadow-xl border border-zinc-600/50">
        <div className="flex flex-col items-center">
          {/* Animated gradient background */}
          <div className="absolute inset-0 rounded-lg overflow-hidden z-0">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 animate-pulse"></div>
          </div>

          {/* Loading spinner */}
          <div className="w-16 h-16 mb-4 relative z-10">
            <div className="absolute inset-0 border-t-4 border-blue-500 border-solid rounded-full animate-spin"></div>
            <div className="absolute inset-1 border-r-4 border-purple-500 border-solid rounded-full animate-spin animate-reverse"></div>
          </div>

          {/* Loading text */}
          <h3 className="text-xl font-medium text-white mb-2 relative z-10">Environment Loading</h3>
          <p className="text-zinc-300 relative z-10">Preparing your development environment</p>
        </div>
      </div>
    </div>
  );
};

export default LoadingOverlay;
