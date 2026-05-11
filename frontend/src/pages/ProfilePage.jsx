import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Mail, Shield, Calendar } from "lucide-react";

export default function ProfilePage() {
  const { user } = useAuth();
  const initials = (user.name || "U").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="space-y-6 max-w-3xl" data-testid="profile-page">
      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-blue-600 font-semibold">Account</div>
        <h2 className="font-display text-2xl sm:text-3xl tracking-tight font-medium text-slate-900 mt-1">My Profile</h2>
      </div>

      <Card className="p-0 overflow-hidden bg-white border border-slate-200 rounded-lg shadow-none">
        <div className="relative h-32 bg-gradient-to-br from-[#0F2C59] via-[#1e3a8a] to-[#2563EB]">
          <img
            src="https://images.unsplash.com/photo-1623854766464-c3645e6841d8?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxOTF8MHwxfHNlYXJjaHwxfHxkb2N0b3IlMjBudXJzZSUyMHBvcnRyYWl0fGVufDB8fHx8MTc3ODQ5OTg0M3ww&ixlib=rb-4.1.0&q=85"
            alt=""
            className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-30"
          />
        </div>
        <div className="px-6 sm:px-8 pb-8 -mt-12">
          <Avatar className="h-24 w-24 border-4 border-white shadow-md">
            <AvatarFallback className="bg-blue-50 text-blue-700 text-2xl font-display font-medium">{initials}</AvatarFallback>
          </Avatar>
          <div className="mt-4">
            <h3 className="font-display text-xl font-medium text-slate-900">{user.name}</h3>
            <div className="text-sm text-slate-500 capitalize mt-0.5">{user.role}</div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
            <div className="flex items-start gap-3 p-4 bg-slate-50 border border-slate-100 rounded-md">
              <Mail className="h-4 w-4 text-slate-500 mt-0.5" />
              <div>
                <div className="text-xs uppercase tracking-wider text-slate-500 font-medium">Email</div>
                <div className="text-sm text-slate-900 mt-0.5">{user.email}</div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-slate-50 border border-slate-100 rounded-md">
              <Shield className="h-4 w-4 text-slate-500 mt-0.5" />
              <div>
                <div className="text-xs uppercase tracking-wider text-slate-500 font-medium">Role</div>
                <div className="text-sm text-slate-900 mt-0.5 capitalize">{user.role}</div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-slate-50 border border-slate-100 rounded-md sm:col-span-2">
              <Calendar className="h-4 w-4 text-slate-500 mt-0.5" />
              <div>
                <div className="text-xs uppercase tracking-wider text-slate-500 font-medium">Member Since</div>
                <div className="text-sm text-slate-900 mt-0.5">{user.created_at ? new Date(user.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "—"}</div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
