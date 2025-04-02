export const CodeEditorFooter = () => {
	return (
		<>
			<button className="px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50">
				Run your code
			</button>
			<button className="px-6 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white font-medium rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50">
				Run and Store
			</button>
		</>
	);
};
