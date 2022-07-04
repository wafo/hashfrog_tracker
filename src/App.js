import { Route, Routes } from "react-router-dom";
import Welcome from "./scenes/Welcome/Welcome";
import TrackerChecks from "./scenes/TrackerChecks";
import Layout from "./scenes/Layout/Layout";
import Editor from "./scenes/Editor/Editor";

function App() {
  return (
    <div className="App">
      <Routes>
        {/* <Route path="" element={<Navigate to="/tracker" />} /> */}
        <Route path="" element={<Welcome />} />
        <Route path="/tracker" element={<Layout />} />
        <Route path="/tracker/checks" element={<TrackerChecks />} />
        <Route path="/layout" element={<Layout />} />
        <Route path="/editor" element={<Editor />} />
      </Routes>
    </div>
  );
}

export default App;
