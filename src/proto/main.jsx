import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Proto from "./Proto.jsx";

createRoot(document.getElementById("proto")).render(
  <StrictMode>
    <Proto />
  </StrictMode>
);
