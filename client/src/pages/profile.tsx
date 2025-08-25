import Header from "@/components/header";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

export default function Profile() {
  const { user, dbUser, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Profile" description="Your account information" />

      <main className="max-w-4xl mx-auto p-6">
        <div className="bg-white shadow-sm rounded-lg p-6 space-y-6">
          <section>
            <h2 className="text-lg font-semibold mb-2">Basic</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500">Display name</div>
                <div className="font-medium">{user?.displayName ?? "—"}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Email</div>
                <div className="font-medium">{user?.email ?? dbUser?.email ?? "—"}</div>
              </div>
            </div>
          </section>

          {dbUser && (
            <section>
              <h2 className="text-lg font-semibold mb-2">Organization</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500">Role</div>
                  <div className="font-medium capitalize">{dbUser.role}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">User ID</div>
                  <div className="font-mono text-sm">{dbUser.id}</div>
                </div>
              </div>
            </section>
          )}

          <div className="pt-2">
            <Button variant="outline" onClick={logout}>Log out</Button>
          </div>
        </div>
      </main>
    </div>
  );
}
