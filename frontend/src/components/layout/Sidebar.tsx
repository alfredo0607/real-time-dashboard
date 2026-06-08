"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/profile", label: "Mi perfil", icon: "👤" },
];

const adminItems = [
  { href: "/users", label: "Usuarios", icon: "👥" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const isAdmin = user?.roles.includes("admin");

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const linkClass = (href: string) =>
    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
      pathname === href
        ? "bg-aws-orange text-white shadow-sm"
        : "text-white/70 hover:bg-white/10 hover:text-white"
    }`;

  return (
    <aside className="flex h-screen w-56 flex-col bg-aws-dark px-3 py-4 shadow-xl">
      {/* Logo */}
      <div className="mb-8 px-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">📡</span>
          <div>
            <h1 className="text-sm font-bold text-white leading-tight">
              Real-Time Dashboard
            </h1>
            <p className="text-xs text-white/40">Bartik Ingeniería</p>
          </div>
        </div>
        {/* Orange accent line */}
        <div className="mt-4 h-0.5 w-full rounded-full bg-aws-orange/30" />
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-1">
        <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-white/30">
          Navegación
        </p>
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className={linkClass(item.href)}>
            <span className="text-base">{item.icon}</span>
            {item.label}
          </Link>
        ))}

        {isAdmin && (
          <>
            <p className="mt-5 mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-white/30">
              Administración
            </p>
            {adminItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={linkClass(item.href)}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </>
        )}
      </nav>

      {/* User info + Logout */}
      <div className="mt-auto">
        <div className="h-0.5 w-full rounded-full bg-white/10 mb-4" />
        {user && (
          <div className="mb-3 px-2">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-aws-orange text-white text-sm font-bold">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user.name}
                </p>
                <p className="text-xs text-white/40 truncate">{user.email}</p>
              </div>
            </div>
            <div className="flex gap-1 flex-wrap px-1">
              {user.roles.map((r) => (
                <span
                  key={r}
                  className="rounded-full bg-aws-orange/20 px-2 py-0.5 text-xs font-medium text-aws-orange"
                >
                  {r}
                </span>
              ))}
            </div>
          </div>
        )}
        <button
          onClick={() => void handleLogout()}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white/60 transition-all hover:bg-white/10 hover:text-white"
        >
          <span>🚪</span>
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
