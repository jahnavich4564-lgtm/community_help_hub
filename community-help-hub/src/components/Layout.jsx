import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import Footer from "./Footer";
import FloatingAIAssistant from "./FloatingAIAssistant";

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gray-100">

      {/* Top Navbar */}
      <Navbar />

      {/* Main Layout */}
      <div className="flex">

        {/* Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>

      </div>

      {/* AI Assistant */}
      <FloatingAIAssistant />

      {/* Footer */}
      <Footer />

    </div>
  );
}