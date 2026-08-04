import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import Default from "./demo.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Default />
  </StrictMode>
);
