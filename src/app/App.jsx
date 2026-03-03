import { RouterProvider } from "react-router-dom";
import router from "@/app/router";
import { useEffect } from "react";
import { useThemeStore } from "@/store/theme.store";
import { Toaster } from "@/components/ui/toaster";

function App() {
  useEffect(() => {
    useThemeStore.getState().initTheme();
  }, []);

  return (
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>
  );
}

export default App;
