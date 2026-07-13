import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { CartProvider } from "./contexts/CartContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import Layout from "./components/gbs/Layout";
import Home from "./pages/Home";
import HomePage from "./pages/gbs/HomePage";
import ShopPage from "./pages/gbs/ShopPage";
import ProductPage from "./pages/gbs/ProductPage";
import JimmyPage from "./pages/gbs/JimmyPage";
import CartPage from "./pages/gbs/CartPage";
import PalletDealsPage from "./pages/gbs/PalletDealsPage";
import AccountPage from "./pages/gbs/AccountPage";
import CalculatorsPage from "./pages/gbs/CalculatorsPage";
import AdvertisePage from "./pages/gbs/AdvertisePage";

/** Start each page at the top when navigating (SPA keeps scroll otherwise). */
function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);
  return null;
}

function Router() {
  return (
    <Switch>
      {/* Legacy voice widget (embedded on the old homepage hero) */}
      <Route path={"/voice"} component={Home} />

      {/* GBS website */}
      <Route path={"/"}>
        <Layout><HomePage /></Layout>
      </Route>
      <Route path={"/shop"}>
        <Layout><ShopPage /></Layout>
      </Route>
      <Route path={"/product/:id"}>
        <Layout><ProductPage /></Layout>
      </Route>
      <Route path={"/jimmy"}>
        <Layout><JimmyPage /></Layout>
      </Route>
      <Route path={"/cart"}>
        <Layout><CartPage /></Layout>
      </Route>
      <Route path={"/pallet-deals"}>
        <Layout><PalletDealsPage /></Layout>
      </Route>
      <Route path={"/calculators"}>
        <Layout><CalculatorsPage /></Layout>
      </Route>
      <Route path={"/advertise"}>
        <Layout><AdvertisePage /></Layout>
      </Route>
      <Route path={"/account"}>
        <Layout><AccountPage /></Layout>
      </Route>

      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <CartProvider>
            <Toaster />
            <ScrollToTop />
            <Router />
          </CartProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
