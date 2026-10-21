import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import Demo from "./pages/Demo";
import CreateProject from "./pages/CreateProject";
import Projects from "./pages/Projects";
import Templates from "./pages/Templates";
import Account from "./pages/Account";
import Subscription from "./pages/Subscription";
import Payment from "./pages/Payment";
import Settings from "./pages/Settings";
import About from "./pages/About";
import Generation from "./pages/Generation";
import Result from "./pages/Result";
import Editor from "./pages/Editor";
import FinalOutput from "./pages/FinalOutput";

function ProtectedRoute({ children }) {
  const location = useLocation();
  const token = localStorage.getItem("easycut-token");

  if (!token) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname,
          message: "Please log in to continue.",
        }}
      />
    );
  }

  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public pages */}
        <Route path="/" element={<Home />} />
        <Route path="/demo" element={<Demo />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/forgot-password"
          element={<ForgotPassword />}
        />
        <Route path="/about" element={<About />} />

        {/* Protected pages */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/create-project"
          element={
            <ProtectedRoute>
              <CreateProject />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects"
          element={
            <ProtectedRoute>
              <Projects />
            </ProtectedRoute>
          }
        />
        <Route
          path="/templates"
          element={
            <ProtectedRoute>
              <Templates />
            </ProtectedRoute>
          }
        />
        <Route
          path="/account"
          element={
            <ProtectedRoute>
              <Account />
            </ProtectedRoute>
          }
        />
        <Route
          path="/subscription"
          element={
            <ProtectedRoute>
              <Subscription />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payment"
          element={
            <ProtectedRoute>
              <Payment />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/generation"
          element={
            <ProtectedRoute>
              <Generation />
            </ProtectedRoute>
          }
        />
        <Route
          path="/result"
          element={
            <ProtectedRoute>
              <Result />
            </ProtectedRoute>
          }
        />
        <Route
          path="/editor/:projectId?"
          element={
            <ProtectedRoute>
              <Editor />
            </ProtectedRoute>
          }
        />
        <Route
          path="/final-output"
          element={
            <ProtectedRoute>
              <FinalOutput />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
