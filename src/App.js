import { Route, Routes } from "react-router-dom";

import Editor from "./scenes/Editor/Editor";
import Layout from "./scenes/Layout";
import TrackerChecks from "./scenes/TrackerChecks";
import TrackerLayout from "./scenes/TrackerLayout";
import Welcome from "./scenes/Welcome";

function App() {
  return (
    <div className="App">
      <Routes>
        {/* <Route path="" element={<Navigate to="/tracker" />} /> */}
        <Route path="" element={<Welcome />} />
        <Route path="/tracker" element={<TrackerLayout />} />
        <Route path="/tracker/checks" element={<TrackerChecks />} />
        <Route path="/layout" element={<Layout />} />
        <Route path="/editor" element={<Editor />} />
      </Routes>
    </div>
  );
}

export default App;
