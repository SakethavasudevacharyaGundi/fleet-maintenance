import { createBrowserRouter } from "react-router";
import Root from "./layouts/Root";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import VehicleList from "./pages/VehicleList";
import ServiceList from "./pages/ServiceList";
import ServiceDetail from "./pages/ServiceDetail";
import Alerts from "./pages/Alerts";
import BulkUpload from "./pages/BulkUpload";
import Profile from "./pages/Profile";
import TechnicianProfile from "./pages/TechnicianProfile";
import { ProtectedRoute } from "./components/ProtectedRoute";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Login,
  },
  {
    path: "/",
    Component: Root,
    children: [
      {
        element: <ProtectedRoute />,
        children: [
          { path: "dashboard", Component: Dashboard },
          { path: "records", Component: ServiceList },
          { path: "records/:id", Component: ServiceDetail },
          { path: "profile", Component: Profile },
          { path: "profile/:id", Component: TechnicianProfile },
          {
            element: <ProtectedRoute requireManager={true} />,
            children: [
              { path: "vehicles", Component: VehicleList },
              { path: "alerts", Component: Alerts },
              { path: "bulk-upload", Component: BulkUpload },
            ]
          }
        ]
      }
    ],
  },
]);
