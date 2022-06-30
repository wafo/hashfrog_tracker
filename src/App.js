import { Route, Routes } from "react-router-dom";
import { TrackerProvider } from "./context/trackerContext";
import Checks from "./scenes/Checks/Checks";
import Combined from "./scenes/Combined";
import Tracker from "./scenes/Tracker/Tracker";
import Welcome from "./scenes/Welcome";

function App() {
  return (
    <div className="App">
      <Routes>
        {/* <Route path="" element={<Navigate to="/tracker" />} /> */}
        <Route path="" element={<Welcome />} />
        <Route path="/tracker" element={<Tracker />} />
        <Route
          path="/combo"
          element={
            <TrackerProvider>
              <Combined />
            </TrackerProvider>
          }
        />
        <Route
          path="/checks"
          element={
            <TrackerProvider>
              <Checks />
            </TrackerProvider>
          }
        />
      </Routes>
    </div>
  );
}

export default App;
