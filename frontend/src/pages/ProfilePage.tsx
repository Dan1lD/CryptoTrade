import Navbar from "@/components/Navbar";
import UserProfile from "@/components/UserProfile";
import { useAuth } from "@/lib/auth-context";

export default function ProfilePage() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-2">Profile</h1>
          <p className="text-muted-foreground">
            Your trading profile and statistics
          </p>
        </div>

        <div className="max-w-4xl">
          <UserProfile user={user} />
        </div>
      </main>
    </div>
  );
}
