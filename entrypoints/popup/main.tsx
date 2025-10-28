import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import "@/app/globals.css";
import App from "./App.tsx";

// // Set dark mode on mount
// if (typeof document !== 'undefined') {
//   document.documentElement.classList.add('dark');
// }

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
