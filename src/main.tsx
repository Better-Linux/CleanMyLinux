import ReactDOM from "react-dom/client";
import App from "./App";
import { ConfigProvider } from "./context/ConfigContext";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <ConfigProvider>
    <App />
  </ConfigProvider>
);
