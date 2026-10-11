import { BrowserRouter, Route, Routes } from "react-router-dom";

import Home from "./pages/Home";
import ThemeSelection from "./pages/ThemeSelection";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import CreateProject from "./pages/CreateProject";
import ProjectDetails from "./pages/ProjectDetails";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public pages */}
        <Route path="/" element={<Home />} />
        <Route path="/theme" element={<ThemeSelection />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />

        {/* Protected pages */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/create-project" element={<CreateProject />} />
          <Route
            path="/projects/:projectId"
            element={<ProjectDetails />}
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;