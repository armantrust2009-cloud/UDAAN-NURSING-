import { useEffect, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Wallet, CheckCircle2, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function FeesPage() {
  const { user } = useAuth();
  const canEdit = ["admin", "principal"].includes(user.role);
  const canDelete = user.role === "admin";

  const [rows, setRows] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ student_id: "", amount: 0, description: "Tuition Fee", due_date: "", academic_year: "2025-26" });
  const [filter, setFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    try {
      const params = filter === "all" ? {} : { status_: filter };
      const [f, s] = await Promise.all([api.get("/fees", { params }), api.get("/students")]);
      setRows(f.data); setStudents(s.data);
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  const create = async (e) => {
    e.preventDefault();
    try {
      await api.post("/fees", { ...form, amount: parseFloat(form.amount) || 0 });
      toast.success("Fee created");
      setOpen(false); setForm({ student_id: "", amount: 0, description: "Tuition Fee", due_date: "", academic_year: "2025-26" });
      load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  const pay = async (id) => {
    try {
      await api.post(`/fees/${id}/pay`, { method: "cash", note: "Marked paid by admin" });
      toast.success("Payment recorded");
      load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this fee entry permanently?")) return;
    try {
      await api.delete(`/fees/${id}`);
      toast.success("Fee entry deleted");
      load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  const total = rows.reduce((s, r) => s + (r.amount || 0), 0);
  const paid = rows.filter((r) => r.status === "paid").reduce((s, r) => s + r.amount, 0);
  const pending = rows.filter((r) => r.status === "pending").reduce((s, r) => s + r.amount, 0);
  const fmt = (n) => `₹${(n || 0).toLocaleString("en-IN")}`;

  return (
    <div className="space-y-6" data-testid="fees-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-blue-600 font-semibold">Finance</div>
          <h2 className="font-display text-2xl sm:text-3xl tracking-tight font-medium text-slate-900 mt-1">Fees & Payments</h2>
          <p className="text-sm text-slate-500 mt-1">Generate invoices, record payments and track receivables.</p>
        </div>
        {canEdit && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white" data-testid="add-fee-button">
                <Plus className="h-4 w-4 mr-1.5" /> New Invoice
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-display">Create Fee Invoice</DialogTitle></DialogHeader>
              <form onSubmit={create} className="space-y-4">
                <div>
                  <Label>Student *</Label>
                  <select data-testid="fee-student-select" required value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })} className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm">
                    <option value="">-- Select student --</option>
                    {students.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.admission_no})</option>)}
                  </select>
                </div>
                <div><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Amount (₹) *</Label><Input data-testid="fee-amount-input" type="number" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
                  <div><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
                </div>
                <div><Label>Academic Year</Label><Input value={form.academic_year} onChange={(e) => setForm({ ...form, academic_year: e.target.value })} /></div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white" data-testid="fee-save-button">Create Invoice</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 bg-white border border-slate-200 rounded-lg shadow-none" data-testid="fee-stat-total">
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500 font-medium">Total Invoiced</div>
          <div className="text-2xl font-display font-semibold text-slate-900 mt-1">{fmt(total)}</div>
        </Card>
        <Card className="p-5 bg-white border border-slate-200 rounded-lg shadow-none" data-testid="fee-stat-paid">
          <div className="text-xs uppercase tracking-[0.18em] text-emerald-700 font-medium">Collected</div>
          <div className="text-2xl font-display font-semibold text-slate-900 mt-1">{fmt(paid)}</div>
        </Card>
        <Card className="p-5 bg-white border border-slate-200 rounded-lg shadow-none" data-testid="fee-stat-pending">
          <div className="text-xs uppercase tracking-[0.18em] text-amber-700 font-medium">Outstanding</div>
          <div className="text-2xl font-display font-semibold text-slate-900 mt-1">{fmt(pending)}</div>
        </Card>
      </div>

      <Card className="p-5 bg-white border border-slate-200 rounded-lg shadow-none">
        <div className="flex items-center gap-2 mb-4">
          {["all", "pending", "paid"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              data-testid={`fee-filter-${f}`}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${filter === f ? "bg-[#0F2C59] text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-200">
                <TableHead>Student</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Receipt</TableHead>
                {canEdit && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center text-sm text-slate-500 py-8">Loading...</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={7}>
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="h-12 w-12 bg-emerald-50 rounded-md flex items-center justify-center mb-3"><Wallet className="h-5 w-5 text-emerald-600" /></div>
                    <div className="font-display font-medium text-slate-900">No fee invoices</div>
                    <div className="text-sm text-slate-500 mt-1">Create your first fee invoice for a student.</div>
                  </div>
                </TableCell></TableRow>
              ) : rows.map((r) => (
                <TableRow key={r.id} className="border-slate-100" data-testid={`fee-row-${r.id}`}>
                  <TableCell>
                    <div className="font-medium text-slate-900">{r.student_name || "—"}</div>
                    <div className="text-xs text-slate-500">{r.admission_no}</div>
                  </TableCell>
                  <TableCell className="text-slate-600">{r.description}</TableCell>
                  <TableCell className="font-medium text-slate-900">{fmt(r.amount)}</TableCell>
                  <TableCell className="text-slate-600 text-sm">{r.due_date || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={r.status === "paid" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}>
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-slate-500 font-mono">{r.receipt_no || "—"}</TableCell>
                  {canEdit && (
                    <TableCell className="text-right">
                      {r.status === "pending" && (
                        <Button size="sm" variant="outline" onClick={() => pay(r.id)} className="text-emerald-700 border-emerald-200 hover:bg-emerald-50 mr-1" data-testid={`fee-pay-${r.id}`}>
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Mark Paid
                        </Button>
                      )}
                      {canDelete && (
                        <Button size="sm" variant="ghost" onClick={() => remove(r.id)} className="text-rose-600 hover:text-rose-700 hover:bg-rose-50" title="Delete entry" data-testid={`fee-delete-${r.id}`}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
