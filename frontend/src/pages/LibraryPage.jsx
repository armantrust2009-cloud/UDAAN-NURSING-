import { useEffect, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Pencil, Trash2, BookMarked, BookOpen, RotateCcw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const emptyBook = { title: "", author: "", isbn: "", category: "Nursing", publisher: "", edition: "", total_copies: 1, cover_url: "", description: "" };

function BooksTab({ canEdit, canDelete }) {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyBook);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/library/books", { params: q ? { q } : {} });
      setRows(data);
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const openCreate = () => { setEditing(null); setForm(emptyBook); setOpen(true); };
  const openEdit = (r) => { setEditing(r); setForm({ ...emptyBook, ...r }); setOpen(true); };

  const save = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, total_copies: parseInt(form.total_copies) || 1 };
      if (editing) await api.put(`/library/books/${editing.id}`, payload);
      else await api.post("/library/books", payload);
      toast.success(editing ? "Book updated" : "Book added");
      setOpen(false); load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this book?")) return;
    try { await api.delete(`/library/books/${id}`); toast.success("Deleted"); load(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  return (
    <div className="space-y-5" data-testid="library-books-tab">
      <Card className="p-5 bg-white border border-slate-200 rounded-lg shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <form onSubmit={(e) => { e.preventDefault(); load(); }} className="flex gap-2 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input data-testid="book-search-input" placeholder="Search title, author, ISBN, category..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
            </div>
            <Button type="submit" variant="outline">Search</Button>
          </form>
          {canEdit && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button onClick={openCreate} className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white" data-testid="add-book-button">
                  <Plus className="h-4 w-4 mr-1.5" /> Add Book
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl">
                <DialogHeader><DialogTitle className="font-display">{editing ? "Edit Book" : "Add Book"}</DialogTitle></DialogHeader>
                <form onSubmit={save} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2"><Label>Title *</Label><Input data-testid="book-title-input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                  <div><Label>Author *</Label><Input data-testid="book-author-input" required value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} /></div>
                  <div><Label>ISBN</Label><Input value={form.isbn} onChange={(e) => setForm({ ...form, isbn: e.target.value })} /></div>
                  <div><Label>Category</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
                  <div><Label>Publisher</Label><Input value={form.publisher} onChange={(e) => setForm({ ...form, publisher: e.target.value })} /></div>
                  <div><Label>Edition</Label><Input value={form.edition} onChange={(e) => setForm({ ...form, edition: e.target.value })} /></div>
                  <div><Label>Total Copies</Label><Input data-testid="book-copies-input" type="number" min="1" value={form.total_copies} onChange={(e) => setForm({ ...form, total_copies: e.target.value })} /></div>
                  <div className="md:col-span-2"><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                  <DialogFooter className="md:col-span-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button type="submit" className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white" data-testid="book-save-button">{editing ? "Save" : "Add Book"}</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-200">
                <TableHead>Title</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>ISBN</TableHead>
                <TableHead className="text-center">Available</TableHead>
                {canEdit && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center text-sm text-slate-500 py-8">Loading...</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={6}>
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="h-12 w-12 bg-amber-50 rounded-md flex items-center justify-center mb-3"><BookMarked className="h-5 w-5 text-amber-600" /></div>
                    <div className="font-display font-medium text-slate-900">No books in catalog</div>
                    <div className="text-sm text-slate-500 mt-1">Add your first book to start the library.</div>
                  </div>
                </TableCell></TableRow>
              ) : rows.map((r) => (
                <TableRow key={r.id} className="border-slate-100" data-testid={`book-row-${r.id}`}>
                  <TableCell className="font-medium text-slate-900">
                    <div>{r.title}</div>
                    {r.edition && <div className="text-xs text-slate-500">{r.edition} ed · {r.publisher}</div>}
                  </TableCell>
                  <TableCell className="text-slate-600">{r.author}</TableCell>
                  <TableCell><Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">{r.category}</Badge></TableCell>
                  <TableCell className="text-slate-500 font-mono text-xs">{r.isbn || "—"}</TableCell>
                  <TableCell className="text-center">
                    <span className={`text-sm font-medium ${r.available_copies > 0 ? "text-emerald-700" : "text-rose-600"}`}>
                      {r.available_copies} / {r.total_copies}
                    </span>
                  </TableCell>
                  {canEdit && (
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(r)} data-testid={`book-edit-${r.id}`}><Pencil className="h-3.5 w-3.5" /></Button>
                      {canDelete && <Button size="sm" variant="ghost" onClick={() => remove(r.id)} className="text-rose-600" data-testid={`book-delete-${r.id}`}><Trash2 className="h-3.5 w-3.5" /></Button>}
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

function IssuesTab({ canEdit }) {
  const [rows, setRows] = useState([]);
  const [books, setBooks] = useState([]);
  const [students, setStudents] = useState([]);
  const [filter, setFilter] = useState("issued");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const defaultDue = new Date(Date.now() + 14 * 86400 * 1000).toISOString().slice(0, 10);
  const [form, setForm] = useState({ student_id: "", book_id: "", due_date: defaultDue });

  const load = async () => {
    setLoading(true);
    try {
      const params = filter === "all" ? {} : { status_: filter };
      const [i, b, s] = await Promise.all([
        api.get("/library/issues", { params }),
        api.get("/library/books"),
        api.get("/students"),
      ]);
      setRows(i.data); setBooks(b.data); setStudents(s.data);
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  const issueBook = async (e) => {
    e.preventDefault();
    try {
      await api.post("/library/issues", form);
      toast.success("Book issued");
      setOpen(false);
      setForm({ student_id: "", book_id: "", due_date: defaultDue });
      load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  const returnBook = async (id) => {
    try {
      const { data } = await api.post(`/library/issues/${id}/return`);
      toast.success(data.fine > 0 ? `Returned · Fine ₹${data.fine}` : "Book returned");
      load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  const availableBooks = books.filter((b) => b.available_copies > 0);
  const stats = {
    issued: rows.filter((r) => r.status === "issued").length,
    overdue: rows.filter((r) => r.status === "issued" && r.overdue_days > 0).length,
    fines: rows.filter((r) => r.status === "issued").reduce((s, r) => s + (r.current_fine || 0), 0),
  };

  return (
    <div className="space-y-5" data-testid="library-issues-tab">
      {filter === "issued" && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4 bg-white border border-slate-200 rounded-lg shadow-none">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-500 font-medium">Currently Issued</div>
            <div className="text-2xl font-display font-semibold text-slate-900 mt-1">{stats.issued}</div>
          </Card>
          <Card className="p-4 bg-white border border-slate-200 rounded-lg shadow-none">
            <div className="text-xs uppercase tracking-[0.18em] text-amber-700 font-medium">Overdue</div>
            <div className="text-2xl font-display font-semibold text-slate-900 mt-1">{stats.overdue}</div>
          </Card>
          <Card className="p-4 bg-white border border-slate-200 rounded-lg shadow-none">
            <div className="text-xs uppercase tracking-[0.18em] text-rose-700 font-medium">Outstanding Fines</div>
            <div className="text-2xl font-display font-semibold text-slate-900 mt-1">₹{stats.fines.toLocaleString("en-IN")}</div>
          </Card>
        </div>
      )}

      <Card className="p-5 bg-white border border-slate-200 rounded-lg shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            {["issued", "returned", "all"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                data-testid={`issue-filter-${f}`}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${filter === f ? "bg-[#0F2C59] text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          {canEdit && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white" data-testid="issue-book-button">
                  <Plus className="h-4 w-4 mr-1.5" /> Issue Book
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle className="font-display">Issue Book to Student</DialogTitle></DialogHeader>
                <form onSubmit={issueBook} className="space-y-4">
                  <div>
                    <Label>Student *</Label>
                    <select data-testid="issue-student-select" required value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })} className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm">
                      <option value="">-- Select student --</option>
                      {students.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.admission_no})</option>)}
                    </select>
                  </div>
                  <div>
                    <Label>Book *</Label>
                    <select data-testid="issue-book-select" required value={form.book_id} onChange={(e) => setForm({ ...form, book_id: e.target.value })} className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm">
                      <option value="">-- Select book --</option>
                      {availableBooks.map((b) => <option key={b.id} value={b.id}>{b.title} — {b.author} ({b.available_copies} left)</option>)}
                    </select>
                    {availableBooks.length === 0 && <p className="text-xs text-amber-700 mt-1">No books currently available.</p>}
                  </div>
                  <div>
                    <Label>Due Date *</Label>
                    <Input data-testid="issue-due-input" type="date" required value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
                    <p className="text-xs text-slate-500 mt-1">Fine of ₹2/day applies after due date.</p>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button type="submit" className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white" data-testid="issue-save-button">Issue Book</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-200">
                <TableHead>Student</TableHead>
                <TableHead>Book</TableHead>
                <TableHead>Issued</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Fine</TableHead>
                {canEdit && <TableHead className="text-right">Action</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center text-sm text-slate-500 py-8">Loading...</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={7}>
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="h-12 w-12 bg-blue-50 rounded-md flex items-center justify-center mb-3"><BookOpen className="h-5 w-5 text-blue-600" /></div>
                    <div className="font-display font-medium text-slate-900">No issues to show</div>
                    <div className="text-sm text-slate-500 mt-1">Click "Issue Book" to lend a book to a student.</div>
                  </div>
                </TableCell></TableRow>
              ) : rows.map((r) => (
                <TableRow key={r.id} className="border-slate-100" data-testid={`issue-row-${r.id}`}>
                  <TableCell>
                    <div className="font-medium text-slate-900">{r.student_name || "—"}</div>
                    <div className="text-xs text-slate-500">{r.admission_no}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-slate-900">{r.book_title || "—"}</div>
                    <div className="text-xs text-slate-500">{r.book_author}</div>
                  </TableCell>
                  <TableCell className="text-slate-600 text-sm">{r.issue_date}</TableCell>
                  <TableCell className="text-slate-600 text-sm">
                    <div className="flex items-center gap-1.5">
                      {r.due_date}
                      {r.status === "issued" && r.overdue_days > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-xs text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                          <AlertTriangle className="h-3 w-3" /> {r.overdue_days}d
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {r.status === "returned" ? (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Returned</Badge>
                    ) : (
                      <Badge variant="outline" className={r.overdue_days > 0 ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-blue-50 text-blue-700 border-blue-200"}>
                        {r.overdue_days > 0 ? "Overdue" : "Issued"}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    {r.status === "returned"
                      ? (r.fine > 0 ? <span className="text-rose-600">₹{r.fine}</span> : <span className="text-slate-400">—</span>)
                      : (r.current_fine > 0 ? <span className="text-amber-700">₹{r.current_fine}</span> : <span className="text-slate-400">—</span>)
                    }
                  </TableCell>
                  {canEdit && (
                    <TableCell className="text-right">
                      {r.status === "issued" && (
                        <Button size="sm" variant="outline" onClick={() => returnBook(r.id)} className="border-emerald-200 text-emerald-700 hover:bg-emerald-50" data-testid={`return-${r.id}`}>
                          <RotateCcw className="h-3.5 w-3.5 mr-1" /> Return
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

export default function LibraryPage() {
  const { user } = useAuth();
  const canEdit = ["admin", "principal", "faculty"].includes(user.role);
  const canDelete = user.role === "admin";

  return (
    <div className="space-y-6" data-testid="library-page">
      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-blue-600 font-semibold">Library</div>
        <h2 className="font-display text-2xl sm:text-3xl tracking-tight font-medium text-slate-900 mt-1">Book Catalog & Issues</h2>
        <p className="text-sm text-slate-500 mt-1">Manage book inventory, issue/return, and overdue fines (₹2/day).</p>
      </div>

      <Tabs defaultValue="books" className="w-full">
        <TabsList className="grid grid-cols-2 w-full max-w-sm bg-slate-100 rounded-md">
          <TabsTrigger value="books" data-testid="tab-books"><BookMarked className="h-3.5 w-3.5 mr-1.5" />Books</TabsTrigger>
          <TabsTrigger value="issues" data-testid="tab-issues"><BookOpen className="h-3.5 w-3.5 mr-1.5" />Issues</TabsTrigger>
        </TabsList>
        <TabsContent value="books" className="mt-5"><BooksTab canEdit={canEdit} canDelete={canDelete} /></TabsContent>
        <TabsContent value="issues" className="mt-5"><IssuesTab canEdit={canEdit} /></TabsContent>
      </Tabs>
    </div>
  );
}
