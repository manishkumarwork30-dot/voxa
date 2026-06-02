
export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* In a real implementation, this would check the user's role and redirect if not SUPER_ADMIN */}
      {/* For now, we're assuming the middleware handles role-based access */}
      
      <nav className="bg-black/40 border-b border-red-600/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <span className="text-white font-bold text-xl">Super Admin Dashboard</span>
            </div>
            <div className="flex items-center gap-4">
              {/* User info would be filled in by the client-side component */}
              <span className="text-gray-300" id="user-name">User Name</span>
              <span className="bg-red-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                Super Admin
              </span>
              <button
                onClick={() => {
                  // Handle logout
                  localStorage.removeItem('user');
                  localStorage.removeItem('token');
                  window.location.href = '/login';
                }}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="min-h-screen bg-black">
        {children}
      </main>
    </>
  );
}
