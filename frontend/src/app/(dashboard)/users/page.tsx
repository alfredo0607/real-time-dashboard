"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { get, del } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import type { User, ApiResponse } from "@/types";

export default function UsersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isAdmin = user?.roles.includes("admin");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await get<ApiResponse<User[]>>("/api/users");
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar usuarios");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      router.push("/dashboard");
      return;
    }
    void loadUsers();
  }, [isAdmin, loadUsers, router]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar al usuario "${name}"?`)) return;
    setDeletingId(id);
    try {
      await del(`/api/users/${id}`);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al eliminar");
    } finally {
      setDeletingId(null);
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
          <p className="text-sm text-gray-500">Gestión de usuarios del sistema</p>
        </div>
        <Button onClick={() => void loadUsers()} variant="secondary" size="sm">
          🔄 Recargar
        </Button>
      </div>

      <div className="rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
        ) : error ? (
          <div className="p-6 text-center text-sm text-red-600">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-3">Nombre</th>
                  <th className="hidden px-4 py-3 sm:table-cell">Email</th>
                  <th className="hidden px-4 py-3 md:table-cell">Roles</th>
                  <th className="hidden px-4 py-3 md:table-cell">Estado</th>
                  <th className="hidden px-4 py-3 lg:table-cell">Creado</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <div>{u.name}</div>
                      <div className="mt-0.5 text-xs text-gray-400 sm:hidden">
                        {u.email}
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 text-gray-500 sm:table-cell">
                      {u.email}
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {u.roles.map((r) => (
                          <span
                            key={r}
                            className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700"
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          u.is_active
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {u.is_active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 text-gray-400 lg:table-cell">
                      {new Date(u.created_at).toLocaleDateString("es-MX")}
                    </td>
                    <td className="px-4 py-3">
                      {u.id !== user?.id && (
                        <Button
                          variant="danger"
                          size="sm"
                          loading={deletingId === u.id}
                          onClick={() => void handleDelete(u.id, u.name)}
                        >
                          Eliminar
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
