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
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

const empty = { name: "", email: "", phone: "", department: "Nursing", designation: "Lecturer", qualification: "", join_date: "", salary: 0, status: "active" };

export default function FacultyPage() {
  const { user } = useAuth();
  const canEdit = ["admin", "principal"].includes(user.role);
  const canDelete = user.role === "admin";

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/faculty");
      setRows(data);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (r) => { setEditing(r); setForm({ ...empty, ...r }); setOpen(true); };

  const save = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, salary: parseFloat(form.salary) || 0 };
      if (editing) await api.put(`/faculty/${editing.id}`, payload);
      else await api.post("/faculty", payload);
      toast.success(editing ? "Faculty updated" : "Faculty added");
      setOpen(false); load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this faculty member?")) return;
    try { await api.delete(`/faculty/${id}`); toast.success("Deleted"); load(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  return (
    <div className="space-y-6" data-testid="faculty-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-blue-600 font-semibold">Faculty & Staff</div>
          <h2 className="font-display text-2xl sm:text-3xl tracking-tight font-medium text-slate-900 mt-1">Faculty</h2>
          <p className="text-sm text-slate-500 mt-1">Manage faculty profiles, departments and assignments.</p>
        </div>
        {canEdit && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate} className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white" data-testid="add-faculty-button">
                <Plus className="h-4 w-4 mr-1.5" /> Add Faculty
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader><DialogTitle className="font-display">{editing ? "Edit Faculty" : "Add Faculty"}</DialogTitle></DialogHeader>
              <form onSubmit={save} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>Name *</Label><Input data-testid="faculty-name-input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>Email *</Label><Input data-testid="faculty-email-input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div><Label>Department</Label><Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></div>
                <div><Label>Designation</Label><Input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} /></div>
                <div><Label>Qualification</Label><Input value={form.qualification} onChange={(e) => setForm({ ...form, qualification: e.target.value })} /></div>
                <div><Label>Join Date</Label><Input type="date" value={form.join_date} onChange={(e) => setForm({ ...form, join_date: e.target.value })} /></div>
                <div><Label>Salary (₹)</Label><Input type="number" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} /></div>
                <DialogFooter className="md:col-span-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white" data-testid="faculty-save-button">{editing ? "Save" : "Add Faculty"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="p-5 bg-white border border-slate-200 rounded-lg shadow-none">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-200">
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Status</TableHead>
                {canEdit && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center text-sm text-slate-500 py-8">Loading...</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={6}>
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="h-12 w-12 bg-indigo-50 rounded-md flex items-center justify-center mb-3"><Users className="h-5 w-5 text-indigo-600" /></div>
                    <div className="font-display font-medium text-slate-900">No faculty added</div>
                    <div className="text-sm text-slate-500 mt-1">Add faculty members to assign to courses.</div>
                  </div>
                </TableCell></TableRow>
              ) : rows.map((r) => (
                <TableRow key={r.id} className="border-slate-100" data-testid={`faculty-row-${r.id}`}>
                  <TableCell className="font-medium text-slate-900">{r.name}</TableCell>
                  <TableCell className="text-slate-600">{r.email}</TableCell>
                  <TableCell>{r.department}</TableCell>
                  <TableCell>{r.designation}</TableCell>
                  <TableCell><Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">{r.status}</Badge></TableCell>
                  {canEdit && (
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(r)} data-testid={`faculty-edit-${r.id}`}><Pencil className="h-3.5 w-3.5" /></Button>
                      {canDelete && <Button size="sm" variant="ghost" onClick={() => remove(r.id)} className="text-rose-600" data-testid={`faculty-delete-${r.id}`}><Trash2 className="h-3.5 w-3.5" /></Button>}
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
