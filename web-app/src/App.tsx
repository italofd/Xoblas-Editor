import "./App.css";
import { CodeEditor } from "./editor";

function App() {
	return (
		<>
			<div className="h-full w-full">
				<h1 className="text-4xl py-16 text-center">AQ-Home-Test</h1>
				<div className="h-full justify-items-center">
					<CodeEditor />
				</div>
			</div>
		</>
	);
}

export default App;
