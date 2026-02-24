import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Bike, MapPin, Clock, Star, LogOut } from "lucide-react";

export default function Dashboard() {
  const { user, roles, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Bike className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Habal</h1>
            <p className="text-xs text-muted-foreground">{roles.join(", ") || "customer"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{user?.email}</span>
          <Button variant="ghost" size="icon" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-4xl p-6">
        <h2 className="mb-6 text-2xl font-bold text-foreground">Dashboard</h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="border-border bg-card">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <MapPin className="h-5 w-5 text-primary" />
              <CardTitle className="text-sm font-medium">Total Rides</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">0</p>
              <p className="text-xs text-muted-foreground">No rides yet</p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <Clock className="h-5 w-5 text-warning" />
              <CardTitle className="text-sm font-medium">Active</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">0</p>
              <p className="text-xs text-muted-foreground">No active rides</p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <Star className="h-5 w-5 text-accent" />
              <CardTitle className="text-sm font-medium">Rating</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">—</p>
              <p className="text-xs text-muted-foreground">No ratings yet</p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
          <Card className="border-border bg-card p-8 text-center">
            <p className="text-muted-foreground">
              🚀 Your dashboard is ready! More features coming soon — ride booking, trip tracking, and more.
            </p>
          </Card>
        </div>
      </main>
    </div>
  );
}
