import { Route, Routes } from "react-router-dom";
import Tracker from "./scenes/Tracker/Tracker";
import Welcome from "./scenes/Welcome";

function App() {
  return (
    <div className="App">
      <Routes>
        {/* <Route path="" element={<Navigate to="/tracker" />} /> */}
        <Route path="" element={<Welcome />} />
        <Route path="/tracker" element={<Tracker />} />
      </Routes>
    </div>
  );
}

export default App;
