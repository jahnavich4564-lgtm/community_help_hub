import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";

// Pages
import Home from "./pages/Home";
import Auth from "./pages/Auth";

import Communities from "./pages/Communities";
import CommunityDashboard from "./pages/CommunityDashboard";
import CommunityFeed from "./pages/CommunityFeed";
import CommunityDetails from "./pages/CommunityDetails";
import CreateCommunity from "./pages/CreateCommunity";

import RequestHelp from "./pages/RequestHelp";
import OfferHelp from "./pages/OfferHelp";


import Chat from "./pages/Chat";
import Notifications from "./pages/Notifications";

import Profile from "./pages/Profile";
import History from "./pages/History";

import FreeServices from "./pages/FreeServices";
import PaidServices from "./pages/PaidServices";

import Booking from "./pages/Booking";
import Payment from "./pages/Payment";

import AdminDashboard from "./pages/AdminDashboard";

function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
      <Routes>

        {/* HOME */}
        <Route path="/" element={<Home />} />

        {/* AUTH */}
        <Route path="/auth" element={<Auth />} />

        {/* COMMUNITY */}
        <Route path="/communities" element={<Communities />} />
        <Route path="/community/:id" element={<CommunityDetails />} />
        <Route path="/create-community" element={<CreateCommunity />} />
        <Route path="/community-dashboard" element={<CommunityDashboard />} />

        {/* Dashboard Alias */}
        <Route path="/dashboard" element={<CommunityDashboard />} />

        <Route path="/community-feed" element={<CommunityFeed />} />

        {/* HELP */}
        <Route path="/request-help" element={<RequestHelp />} />
        <Route path="/offer-help" element={<OfferHelp />} />

        {/* AI MATCH */}
        <Route path="/ai-match" element={<Navigate to="/request-help" replace />} />

        {/* CHAT */}
        <Route path="/chat" element={<Chat />} />

        {/* NOTIFICATIONS */}
        <Route path="/notifications" element={<Notifications />} />

        {/* PROFILE */}
        <Route path="/profile" element={<Profile />} />

        {/* HISTORY */}
        <Route path="/history" element={<History />} />

        {/* SERVICES */}
        <Route path="/free-services" element={<FreeServices />} />
        <Route path="/paid-services" element={<PaidServices />} />

        {/* BOOKING */}
        <Route path="/booking" element={<Booking />} />

        {/* PAYMENT */}
        <Route path="/payment" element={<Payment />} />

        {/* ADMIN */}
        <Route path="/admin-dashboard" element={<AdminDashboard />} />

        {/* 404 */}
        <Route
          path="*"
          element={
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
              <div className="text-center">
                <h1 className="text-7xl font-bold text-red-600">404</h1>
                <p className="text-2xl text-gray-600 mt-4">
                  Page Not Found
                </p>
              </div>
            </div>
          }
        />

      </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;