import { createBrowserRouter } from "react-router";
import { RootLayout } from "./components/RootLayout";
import { DetectionPage } from "./pages/DetectionPage";
import { HistoryPage } from "./pages/HistoryPage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    children: [
      { index: true, Component: DetectionPage },
      { path: "history", Component: HistoryPage },
    ],
  },
]);
