import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/Home";
import Lunches from "@/pages/Lunches";
import Admin from "@/pages/Admin";
import Prevadzka from "@/pages/Prevadzka";
import NotFound from "@/pages/not-found";
import { DeviceLock } from "@/components/DeviceLock";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/lunches" component={Lunches} />
      <Route path="/admin" component={Admin} />
      <Route path="/prevadzka" component={Prevadzka} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <DeviceLock>
          <Toaster />
          <Router />
        </DeviceLock>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
