import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  HandHelping,
  HeartHandshake,
  Newspaper,
  MessageCircle,
  Bell,
  User,
  History,
  CreditCard,
  Building2,
  ShieldCheck,
} from "lucide-react";

const menuItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    path: "/community-dashboard",
  },
  {
    title: "Communities",
    icon: Users,
    path: "/communities",
  },
  {
    title: "Request Help",
    icon: HandHelping,
    path: "/request-help",
  },
  {
    title: "Offer Help",
    icon: HeartHandshake,
    path: "/offer-help",
  },
  {
    title: "Community Feed",
    icon: Newspaper,
    path: "/community-feed",
  },
  {
    title: "Chat",
    icon: MessageCircle,
    path: "/chat",
  },
  {
    title: "Notifications",
    icon: Bell,
    path: "/notifications",
  },
  {
    title: "Profile",
    icon: User,
    path: "/profile",
  },
  {
    title: "History",
    icon: History,
    path: "/history",
  },
  {
    title: "Payments",
    icon: CreditCard,
    path: "/payment",
  },
  {
    title: "Community Hubs",
    icon: Building2,
    path: "/communities", // ✅ fixed
  },
  {
    title: "Admin",
    icon: ShieldCheck,
    path: "/admin-dashboard", // ✅ fixed
  },
];

export default function Sidebar() {
  return (
    <aside className="w-72 bg-white border-r shadow-lg min-h-screen">
      <div className="p-6 border-b">
        <h1 className="text-2xl font-bold text-blue-700">
          🤝 HelpHub AI
        </h1>

        <p className="text-gray-500 text-sm mt-2">
          Community Help Platform
        </p>
      </div>

      <nav className="p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 p-3 rounded-xl transition ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "hover:bg-gray-100 text-gray-700"
                }`
              }
            >
              <Icon size={20} />
              <span>{item.title}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}