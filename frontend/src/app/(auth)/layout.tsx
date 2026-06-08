export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface p-4">
      {/* Fondo decorativo pastel AWS */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-aws-orange/8 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-aws-orange/5 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-aws-orange-soft/20 blur-2xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-aws-dark shadow-lg">
            <span className="text-3xl">📡</span>
          </div>
          <h1 className="text-2xl font-bold text-aws-dark">
            Real-Time Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500">Bartik Ingeniería</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-white p-8 shadow-xl ring-1 ring-surface-border">
          {/* AWS orange top stripe */}
          <div className="absolute inset-x-8 -top-0.5 h-0.5 rounded-full bg-aws-orange" />
          {children}
        </div>
      </div>
    </div>
  );
}
