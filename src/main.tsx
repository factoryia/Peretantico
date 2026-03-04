import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { BrowserRouter } from "react-router";
import { Toaster } from "sonner";
import { ConvexClientProvider } from "./components/ConvexClientProvider";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <ConvexClientProvider>
      <App />
    </ConvexClientProvider>
    <Toaster richColors position="top-center" />
  </BrowserRouter>
);
