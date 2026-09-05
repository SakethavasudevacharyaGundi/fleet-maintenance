import { createBrowserRouter } from "react-router";
import Root from "./layouts/Root";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import VehicleList from "./pages/VehicleList";
import ServiceList from "./pages/ServiceList";
import ServiceDetail from "./pages/ServiceDetail";
import Alerts from "./pages/Alerts";
import BulkUpload from "./pages/BulkUpload";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Login,
  },
  {
    path: "/",
    Component: Root,
    children: [
      { path: "dashboard", Component: Dashboard },
      { path: "vehicles", Component: VehicleList },
      { path: "records", Component: ServiceList },
      { path: "records/:id", Component: ServiceDetail },
      { path: "alerts", Component: Alerts },
      { path: "bulk-upload", Component: BulkUpload },
    ],
  },
]);
