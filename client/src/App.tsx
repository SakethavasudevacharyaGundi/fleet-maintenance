import { RouterProvider } from "react-router";
import { router } from "./routes";
import { StripedTransitionProvider } from "./components/StripedTransition";

export default function App() {
  return (
    <StripedTransitionProvider>
      <RouterProvider router={router} />
    </StripedTransitionProvider>
  );
}
