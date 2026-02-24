import { useNavigate } from "react-router-dom";
import { Bike, Users, Navigation, Settings, Shield, Zap } from "lucide-react";

const roles = [
  {
    key: "customer",
    label: "Customer",
    description: "Book rides & track trips",
    icon: Users,
    color: "text-info",
    bgColor: "bg-info/10",
  },
  {
    key: "rider",
    label: "Rider",
    description: "Accept trips & earn",
    icon: Bike,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    key: "dispatcher",
    label: "Dispatcher",
    description: "Assign & manage",
    icon: Navigation,
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
  {
    key: "operator",
    label: "Operator",
    description: "Manage fleet",
    icon: Settings,
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
  {
    key: "admin",
    label: "Admin",
    description: "Governance & oversight",
    icon: Shield,
    color: "text-muted-foreground",
    bgColor: "bg-muted/50",
  },
];

export default function Index() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      {/* Logo & title */}
      <div className="mb-10 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Bike className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-foreground">Habal</h1>
        <p className="mt-1 text-muted-foreground">Iloilo Verified Rider Network</p>
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
          <Zap className="h-3 w-3" />
          DEMO MODE
        </div>
      </div>

      {/* Role cards grid */}
      <div className="w-full max-w-lg">
        <div className="grid grid-cols-2 gap-3">
          {roles.slice(0, 4).map((role) => (
            <button
              key={role.key}
              onClick={() => navigate("/auth")}
              className="group flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-6 text-center transition-all hover:border-primary/40 hover:bg-secondary"
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${role.bgColor}`}>
                <role.icon className={`h-6 w-6 ${role.color}`} />
              </div>
              <div>
                <p className="font-semibold text-foreground">{role.label}</p>
                <p className="text-xs text-muted-foreground">{role.description}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Admin - full width */}
        {(() => {
          const admin = roles[4];
          const AdminIcon = admin.icon;
          return (
            <button
              onClick={() => navigate("/auth")}
              className="mt-3 flex w-full items-center gap-4 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:bg-secondary"
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${admin.bgColor}`}>
                <AdminIcon className={`h-6 w-6 ${admin.color}`} />
              </div>
              <div className="text-left">
                <p className="font-semibold text-foreground">{admin.label}</p>
                <p className="text-xs text-muted-foreground">{admin.description}</p>
              </div>
            </button>
          );
        })()}
      </div>

      <p className="mt-8 max-w-xs text-center text-sm text-muted-foreground">
        Tap a role to explore the full platform. No account needed.
      </p>
    </div>
  );
}
