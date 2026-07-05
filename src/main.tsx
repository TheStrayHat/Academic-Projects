
  // @ts-ignore: suppress missing type declarations for react-dom/client
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  // removed unused import of ./app_result which had no type declarations
  // @ts-ignore: allow importing CSS as side-effect in TS project
  import "./styles/index.css";
  // @ts-ignore: allow importing CSS from node_modules
  import "reactflow/dist/style.css";

  createRoot(document.getElementById("root")!).render(<App />);
  