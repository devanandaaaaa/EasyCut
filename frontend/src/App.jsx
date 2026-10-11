import { BrowserRouter, Route, Routes } from "react-router-dom";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import CreateProject from "./pages/CreateProject";
import Projects from "./pages/Projects";
import Templates from "./pages/Templates";
import Account from "./pages/Account";
import Subscription from "./pages/Subscription";
import Payment from "./pages/Payment";
import Settings from "./pages/Settings";
import About from "./pages/About";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/create-project" element={<CreateProject />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/templates" element={<Templates />} />
        <Route path="/account" element={<Account />} />
        <Route path="/subscription" element={<Subscription />} />
        <Route path="/payment" element={<Payment />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;