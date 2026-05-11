import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { HeartPulse, ShieldCheck, Stethoscope, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [loginEmail, setLoginEmail] = useState("admin@nursingcollege.edu");
  const [loginPassword, setLoginPassword] = useState("admin123");

  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regRole, setRegRole] = useState("student");

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const res = await login(loginEmail, loginPassword);
    setLoading(false);
    if (res.ok) {
      toast.success("Welcome back!");
      navigate("/dashboard");
    } else {
      toast.error(res.error || "Login failed");
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    const res = await register({ name: regName, email: regEmail, password: regPassword, role: regRole });
    setLoading(false);
    if (res.ok) {
      toast.success("Account created!");
      navigate("/dashboard");
    } else {
      toast.error(res.error || "Registration failed");
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row" data-testid="login-page">
      {/* Left: Hero */}
      <div className="relative lg:w-1/2 min-h-[280px] lg:min-h-screen overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1617246610501-d11b4829436b?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2OTV8MHwxfHNlYXJjaHwxfHxtZWRpY2FsJTIwY29sbGVnZSUyMGNhbXB1c3xlbnwwfHx8fDE3Nzg0OTk4NDN8MA&ixlib=rb-4.1.0&q=85"
          alt="Nursing campus"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-[#0F2C59]/80" />
        <div className="relative z-10 h-full flex flex-col justify-between p-8 lg:p-14 text-white">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-md bg-white/15 backdrop-blur flex items-center justify-center">
              <HeartPulse className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-white/70 font-display">Nursing College</div>
              <div className="font-display text-lg font-medium">Management ERP</div>
            </div>
          </div>

          <div className="hidden lg:block max-w-md mt-12">
            <h1 className="font-display text-4xl xl:text-5xl tracking-tight leading-none font-medium">
              Empower your nursing institute with one unified platform.
            </h1>
            <p className="mt-6 text-base text-white/80 leading-relaxed">
              Manage admissions, clinical training, faculty, fees, and academic analytics —
              all from a single, clinical-grade dashboard.
            </p>

            <div className="mt-10 grid grid-cols-1 gap-3 max-w-sm">
              {[
                { icon: ShieldCheck, label: "Role-based access for Admin, Faculty, Student & Parent" },
                { icon: Stethoscope, label: "Clinical attendance & internship tracking" },
                { icon: Sparkles, label: "Real-time analytics & compliance reports" },
              ].map((f) => (
                <div key={f.label} className="flex items-center gap-3 text-sm text-white/90">
                  <f.icon className="h-4 w-4 text-blue-300 flex-shrink-0" />
                  <span>{f.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="text-xs text-white/60 tracking-wide">© 2026 Nursing College ERP</div>
        </div>
      </div>

      {/* Right: Auth form */}
      <div className="lg:w-1/2 flex items-center justify-center p-6 lg:p-12 bg-[#F4F7F9]">
        <Card className="w-full max-w-md p-8 border-slate-200 shadow-sm rounded-lg bg-white" data-testid="auth-card">
          <div className="mb-6">
            <div className="text-xs uppercase tracking-[0.2em] font-semibold text-blue-600">Welcome</div>
            <h2 className="font-display text-2xl sm:text-3xl tracking-tight leading-none font-medium mt-2 text-slate-900">
              Sign in to continue
            </h2>
            <p className="text-sm text-slate-500 mt-2">Access your role-specific dashboard.</p>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid grid-cols-2 w-full bg-slate-100 rounded-md">
              <TabsTrigger value="login" data-testid="tab-login">Sign in</TabsTrigger>
              <TabsTrigger value="register" data-testid="tab-register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-6">
              <form onSubmit={handleLogin} className="space-y-4" data-testid="login-form">
                <div>
                  <Label htmlFor="login-email" className="text-sm font-medium text-slate-700 mb-1.5 block">Email</Label>
                  <Input
                    id="login-email"
                    data-testid="login-email-input"
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="you@nursingcollege.edu"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="login-password" className="text-sm font-medium text-slate-700 mb-1.5 block">Password</Label>
                  <Input
                    id="login-password"
                    data-testid="login-password-input"
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Your password"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white py-2.5 rounded-md font-medium"
                  data-testid="login-submit-button"
                >
                  {loading ? "Signing in..." : "Sign in"}
                </Button>

                <div className="text-xs text-slate-500 leading-relaxed pt-2 border-t border-slate-100">
                  <div className="font-medium text-slate-700 mb-1.5">Demo accounts</div>
                  <div>admin@nursingcollege.edu / admin123</div>
                  <div>principal@nursingcollege.edu / principal123</div>
                  <div>faculty@nursingcollege.edu / faculty123</div>
                  <div>student@nursingcollege.edu / student123</div>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="register" className="mt-6">
              <form onSubmit={handleRegister} className="space-y-4" data-testid="register-form">
                <div>
                  <Label htmlFor="reg-name" className="text-sm font-medium text-slate-700 mb-1.5 block">Full Name</Label>
                  <Input id="reg-name" data-testid="register-name-input" value={regName} onChange={(e) => setRegName(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="reg-email" className="text-sm font-medium text-slate-700 mb-1.5 block">Email</Label>
                  <Input id="reg-email" data-testid="register-email-input" type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="reg-password" className="text-sm font-medium text-slate-700 mb-1.5 block">Password</Label>
                  <Input id="reg-password" data-testid="register-password-input" type="password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="reg-role" className="text-sm font-medium text-slate-700 mb-1.5 block">Role</Label>
                  <select
                    id="reg-role"
                    data-testid="register-role-select"
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  >
                    <option value="student">Student</option>
                    <option value="parent">Parent</option>
                    <option value="faculty">Faculty</option>
                    <option value="principal">Principal</option>
                  </select>
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white py-2.5 rounded-md font-medium" data-testid="register-submit-button">
                  {loading ? "Creating account..." : "Create account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
