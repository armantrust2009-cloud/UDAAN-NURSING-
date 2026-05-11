import { useRef, forwardRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download, User } from "lucide-react";

const UDAAN_LOGO = "https://customer-assets.emergentagent.com/job_nursing-hub-24/artifacts/tlidreau_UDAAN%20INSTITUTE%20%284%29.png";

const IDCard = forwardRef(function IDCard({ student, course }, ref) {
  return (
    <div ref={ref} className="id-card-print bg-white" style={{ width: "340px", borderRadius: "12px", overflow: "hidden", border: "1px solid #E2E8F0", boxShadow: "0 4px 20px rgba(15, 44, 89, 0.08)" }}>
      {/* Top brand strip */}
      <div style={{ background: "linear-gradient(135deg, #0F2C59 0%, #1e3a8a 100%)", padding: "16px 18px", color: "white", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ height: "44px", width: "44px", borderRadius: "6px", background: "white", padding: "3px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <img src={UDAAN_LOGO} alt="Udaan" style={{ height: "100%", width: "100%", objectFit: "contain" }} />
          </div>
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ fontSize: "9px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.7)", fontFamily: "'Work Sans', sans-serif" }}>UDAAN INSTITUTE</div>
            <div style={{ fontSize: "13px", fontWeight: 600, fontFamily: "'Work Sans', sans-serif" }}>Nursing College</div>
          </div>
        </div>
        {/* red accent stripe (matches logo) */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "3px", background: "#DC2626" }} />
      </div>

      {/* Photo + name */}
      <div style={{ padding: "20px 18px 16px", display: "flex", flexDirection: "column", alignItems: "center", background: "#FAFBFC" }}>
        <div style={{ height: "108px", width: "108px", borderRadius: "8px", overflow: "hidden", border: "3px solid #fff", boxShadow: "0 2px 8px rgba(0,0,0,0.1)", background: "#E2E8F0", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {student.photo ? (
            <img src={student.photo} alt={student.name} style={{ height: "100%", width: "100%", objectFit: "cover" }} />
          ) : (
            <User style={{ height: "48px", width: "48px", color: "#94A3B8" }} />
          )}
        </div>
        <div style={{ marginTop: "12px", fontFamily: "'Work Sans', sans-serif", fontSize: "17px", fontWeight: 600, color: "#0F172A", textAlign: "center" }}>{student.name}</div>
        <div style={{ marginTop: "2px", fontSize: "11px", color: "#64748B", textTransform: "uppercase", letterSpacing: "0.1em" }}>Student ID Card</div>
      </div>

      {/* Details */}
      <div style={{ padding: "12px 18px 16px", background: "white" }}>
        <Row label="Admission #" value={student.admission_no || "—"} />
        <Row label="Course" value={course || "—"} />
        <Row label="Batch" value={student.batch_year || "—"} />
        <Row label="DOB" value={student.dob || "—"} />
        <Row label="Blood Group" value={student.blood_group || "—"} />
        <Row label="Phone" value={student.phone || "—"} />
        <Row label="Valid Until" value={student.valid_until || `${(parseInt(student.batch_year) || 2025) + 4}`} />
      </div>

      {/* Footer signature strip */}
      <div style={{ padding: "10px 18px", borderTop: "1px dashed #CBD5E1", background: "#F8FAFC", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: "9px", color: "#64748B" }}>If found, return to Udaan Institute Office.</div>
        <div style={{ fontSize: "9px", color: "#64748B", textAlign: "right", fontStyle: "italic" }}>Principal</div>
      </div>
    </div>
  );
});

function Row({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", borderBottom: "1px solid #F1F5F9", fontSize: "11.5px" }}>
      <span style={{ color: "#64748B", textTransform: "uppercase", letterSpacing: "0.04em", fontSize: "10px", fontWeight: 500 }}>{label}</span>
      <span style={{ color: "#0F172A", fontWeight: 500, fontFamily: "'IBM Plex Sans', sans-serif", maxWidth: "180px", textAlign: "right" }}>{value}</span>
    </div>
  );
}

export default function StudentIDCardModal({ open, onOpenChange, student, course }) {
  const cardRef = useRef(null);

  const handlePrint = () => {
    const printWin = window.open("", "PRINT", "height=720,width=480");
    if (!printWin) return;
    const html = cardRef.current?.outerHTML || "";
    printWin.document.write(`
      <!doctype html><html><head><title>Student ID Card</title>
      <link href="https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet">
      <style>
        body { margin: 0; padding: 24px; font-family: 'IBM Plex Sans', sans-serif; background: #F4F7F9; display: flex; justify-content: center; }
        @media print { body { background: white; padding: 0; } }
      </style>
      </head><body>${html}</body></html>
    `);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => { printWin.print(); printWin.close(); }, 600);
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;
    // simple approach — open in new tab for save-as
    handlePrint();
  };

  if (!student) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="id-card-dialog">
        <DialogHeader>
          <DialogTitle className="font-display">Student ID Card</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-2">
          <IDCard ref={cardRef} student={student} course={course} />
          <div className="flex gap-2 w-full">
            <Button onClick={handlePrint} className="flex-1 bg-[#2563EB] hover:bg-[#1D4ED8] text-white" data-testid="id-card-print">
              <Printer className="h-4 w-4 mr-1.5" /> Print ID Card
            </Button>
            <Button onClick={handleDownload} variant="outline" className="flex-1" data-testid="id-card-download">
              <Download className="h-4 w-4 mr-1.5" /> Save / PDF
            </Button>
          </div>
          <p className="text-xs text-slate-500 text-center">Use your browser's "Save as PDF" option in the print dialog to download.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
