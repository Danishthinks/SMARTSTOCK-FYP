import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./Pages/Dashboard/login";
import Register from "./Pages/Dashboard/Register";
import Dashboard from "./Pages/Dashboard/Dashboard";
import AddProduct from "./Pages/Dashboard/AddProduct";
import InventoryList from "./Pages/Dashboard/InventoryList";
import ActivityLogs from "./Pages/Dashboard/ActivityLogs";
import ProtectedRoute from "./Components/ProtectedRoute";
import ChatbotWidget from "./Components/ui/ChatbotWidget";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/add-product"
          element={
            <ProtectedRoute>
              <AddProduct />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/inventory"
          element={
            <ProtectedRoute>
              <InventoryList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/logs"
          element={
            <ProtectedRoute>
              <ActivityLogs />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ChatbotWidget />
    </BrowserRouter>
  );
}

export default App;
