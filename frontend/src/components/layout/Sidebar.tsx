"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/profile", label: "Mi perfil", icon: "👤" },
];

const adminItems = [{ href: "/users", label: "Usuarios", icon: "👥" }];

export function Sidebar() {
  const [drawerOpen, setDrawerOpen] = useState(false);
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

  const renderLinks = (onNavigate?: () => void) => (
    <>
      <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-white/30">
        Navegación
      </p>
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={linkClass(item.href)}
          onClick={onNavigate}
        >
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
              onClick={onNavigate}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </>
      )}
    </>
  );

  const renderUser = () => (
    <div className="mt-auto">
      <div className="mb-4 h-0.5 w-full rounded-full bg-white/10" />
      {user && (
        <div className="mb-3 px-2">
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-aws-orange text-sm font-bold text-white">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{user.name}</p>
              <p className="truncate text-xs text-white/40">{user.email}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1 px-1">
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
  );

  return (
    <>
      {/* ── Desktop sidebar (lg+) ─────────────────────────────── */}
      <aside className="hidden h-screen w-56 flex-col bg-aws-dark px-3 py-4 shadow-xl lg:flex">
        <div className="mb-8 px-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">📡</span>
            <div>
              <h1 className="text-sm font-bold leading-tight text-white">
                Real-Time Dashboard
              </h1>
              <p className="text-xs text-white/40">Ing. Alfredo Dominguez</p>
            </div>
          </div>
          <div className="mt-4 h-0.5 w-full rounded-full bg-aws-orange/30" />
        </div>
        <nav className="flex flex-1 flex-col gap-1">{renderLinks()}</nav>
        {renderUser()}
      </aside>

      {/* ── Mobile top bar (< lg) ─────────────────────────────── */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between bg-aws-dark px-4 shadow-md lg:hidden">
        <div className="flex items-center gap-2">
          <span className="text-lg">📡</span>
          <span className="text-sm font-bold text-white">Real-Time Dashboard</span>
        </div>
        <button
          onClick={() => setDrawerOpen(true)}
          className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white"
          aria-label="Abrir menú"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </header>

      {/* ── Backdrop ──────────────────────────────────────────── */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          drawerOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setDrawerOpen(false)}
      />

      {/* ── Mobile drawer ─────────────────────────────────────── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-aws-dark px-3 py-4 shadow-2xl transition-transform duration-300 lg:hidden ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-2 flex justify-end">
          <button
            onClick={() => setDrawerOpen(false)}
            className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
            aria-label="Cerrar menú"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-6 px-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">📡</span>
            <div>
              <h1 className="text-sm font-bold leading-tight text-white">
                Real-Time Dashboard
              </h1>
              <p className="text-xs text-white/40">Ing. Alfredo Dominguez</p>
            </div>
          </div>
          <div className="mt-4 h-0.5 w-full rounded-full bg-aws-orange/30" />
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {renderLinks(() => setDrawerOpen(false))}
        </nav>
        {renderUser()}
      </aside>
    </>
  );
}
