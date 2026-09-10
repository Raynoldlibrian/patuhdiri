import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  FileText, CheckCircle2, Clock, AlertCircle, ChevronRight, X,
  LayoutDashboard, ClipboardList, ShieldCheck, Link2, Trash2, Download,
  Check, Minus, Lock, Loader2,
} from "lucide-react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import { api } from "./api.js";

const TAHUN = 2026;

// Dokumen dengan jadwal triwulan (kode -> nomor triwulan). Sesuaikan kalau daftar
// dokumen dari Inspektorat berubah kodenya.
const TRIWULAN_MAP = {
  DOK04: 1, DOK05: 2, DOK06: 3, DOK07: 4,
  DOK17: 1, DOK18: 2, DOK19: 3, DOK20: 4,
};

// ============ HELPER JADWAL TRIWULAN ============
const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

function getTriwulanInfo(tw, tahun = TAHUN) {
  const startMonth = (tw - 1) * 3;
  const endMonth = startMonth + 2;
  const deadlineMonth = (endMonth + 1) % 12;
  const deadlineYear = endMonth === 11 ? tahun + 1 : tahun;
  return {
    label: `${BULAN[startMonth]} - ${BULAN[endMonth]} ${tahun}`,
    deadline: `Paling lambat tgl 10 ${BULAN[deadlineMonth]} ${deadlineYear}`,
    startDate: new Date(tahun, startMonth, 1),
  };
}

function isTriwulanUnlocked(tw, tahun = TAHUN) {
  const { startDate } = getTriwulanInfo(tw, tahun);
  return new Date() >= startDate;
}

// ============ STYLE TOKENS ============
const COLORS = {
  bg: "#F6F3EC",
  paper: "#FFFFFF",
  ink: "#1E2A38",
  navy: "#213A5C",
  navyDeep: "#152438",
  accent: "#4A90D9",
  wordmarkGold: "#D9A62E",
  accentSoft: "#DCEBFA",
  line: "#E4DFD1",
  green: "#3F6B4E",
  greenBg: "#EAF1EC",
  amber: "#A6752B",
  amberBg: "#FBF1E1",
  red: "#9C4632",
  redBg: "#F8EBE6",
  slate: "#8B8371",
};

// ============ SHARED SMALL COMPONENTS ============
function StatusBadge({ status }) {
  const map = {
    "Belum Submit": { color: COLORS.slate, bg: "#EFEBE0", icon: Clock, label: "Belum Submit" },
    "Menunggu Verifikasi": { color: COLORS.amber, bg: COLORS.amberBg, icon: Clock, label: "Menunggu Verifikasi" },
    "Sesuai": { color: COLORS.green, bg: COLORS.greenBg, icon: CheckCircle2, label: "Sesuai" },
    "Perlu Perbaikan": { color: COLORS.red, bg: COLORS.redBg, icon: AlertCircle, label: "Perlu Perbaikan" },
  };
  const s = map[status] || map["Belum Submit"];
  const Icon = s.icon;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "4px 10px", borderRadius: 20, fontSize: 12.5, fontWeight: 600,
      color: s.color, background: s.bg, whiteSpace: "nowrap",
    }}>
      <Icon size={13} strokeWidth={2.5} /> {s.label}
    </span>
  );
}

function Spinner({ label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "60px 20px", color: COLORS.slate }}>
      <Loader2 size={18} className="pd-spin" />
      <span style={{ fontSize: 13 }}>{label || "Memuat..."}</span>
    </div>
  );
}

function ErrorBox({ message, onRetry }) {
  return (
    <div style={{
      background: COLORS.redBg, color: COLORS.red, borderRadius: 10, padding: "14px 16px",
      fontSize: 13, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
      maxWidth: 780, margin: "20px auto",
    }}>
      <span>{message}</span>
      {onRetry && (
        <button onClick={onRetry} style={{
          background: "none", border: `1px solid ${COLORS.red}`, color: COLORS.red,
          borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer", fontWeight: 600,
        }}>Coba lagi</button>
      )}
    </div>
  );
}

function Modal({ children, onClose, title }) {
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(21,36,56,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 50,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: COLORS.paper, borderRadius: 14, padding: 24, width: "100%", maxWidth: 420,
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 }}>
          <div style={{ fontSize: 15.5, fontWeight: 700, color: COLORS.navy, paddingRight: 12 }}>{title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.slate, padding: 2 }}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div style={{ textAlign: "center", padding: "50px 20px", color: COLORS.slate, background: COLORS.paper, borderRadius: 12, border: `1px dashed ${COLORS.line}` }}>
      <CheckCircle2 size={28} color={COLORS.green} style={{ marginBottom: 10 }} />
      <div style={{ fontSize: 13.5 }}>{text}</div>
    </div>
  );
}

function StatCard({ label, value, color, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => onClick && setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: COLORS.paper, border: `1px solid ${hover ? COLORS.accent : COLORS.line}`, borderRadius: 12, padding: "16px 18px",
        cursor: onClick ? "pointer" : "default", position: "relative",
        transform: hover ? "translateY(-3px)" : "translateY(0)",
        boxShadow: hover ? "0 10px 20px rgba(30,42,56,0.12)" : "0 1px 2px rgba(30,42,56,0.02)",
        transition: "transform .18s ease, box-shadow .18s ease, border-color .18s ease",
      }}
    >
      <div style={{ fontSize: 11.5, color: COLORS.slate, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontFamily: "Georgia, serif", fontSize: 24, fontWeight: 700, color }}>{value}</div>
      {onClick && (
        <div style={{
          position: "absolute", top: 14, right: 14, fontSize: 10.5, color: COLORS.slate,
          display: "flex", alignItems: "center", gap: 3,
          transform: hover ? "translateX(2px)" : "translateX(0)",
          transition: "transform .18s ease",
        }}>
          <ChevronRight size={13} />
        </div>
      )}
    </div>
  );
}

// ============ HEADER ============
function Header({ tab, setTab }) {
  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "input", label: "Input OPD", icon: ClipboardList },
    { id: "verifikasi", label: "Verifikasi", icon: ShieldCheck },
    { id: "apip", label: "APIP", icon: Download },
  ];
  return (
    <div style={{ background: COLORS.navyDeep, color: "#F6F3EC" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "20px 24px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
          <img src="/logo-header.png" alt="Patuhdiri" style={{ height: 40, width: "auto", display: "block" }} />
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <div style={{ fontFamily: "Georgia, serif", fontSize: 19, fontWeight: 700, letterSpacing: 0.3, color: COLORS.wordmarkGold }}>
                Patuhdiri
              </div>
            </div>
            <div style={{ fontSize: 11, color: "#8FA0B3" }}>
                Panel Tracking Unggahan Dokumen Kinerja Instansi
            </div>
            <div style={{ fontSize: 11.5, color: "#B9C2CE", letterSpacing: 0.4 }}>
              Bagian Organisasi Sekretariat Daerah Kabupaten Indragiri Hulu
            </div>
          </div>
          <div style={{ marginLeft: "auto", fontSize: 12.5, color: "#B9C2CE", border: "1px solid #3A4E64", borderRadius: 20, padding: "5px 12px" }}>
            Tahun Pelaporan {TAHUN}
          </div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {tabs.map(t => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "10px 16px", border: "none", cursor: "pointer",
                background: active ? COLORS.bg : "transparent",
                color: active ? COLORS.navyDeep : "#B9C2CE",
                borderRadius: "10px 10px 0 0", fontSize: 13.5, fontWeight: 600,
                fontFamily: "inherit",
              }}>
                <Icon size={15} /> {t.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============ TAB: INPUT OPD ============
function InputOPD({ opdList, dokumenList }) {
  const [selectedOpd, setSelectedOpd] = useState(null);
  const [pin, setPin] = useState("");
  const [loginError, setLoginError] = useState("");
  const [unlocked, setUnlocked] = useState(false);

  const [checklist, setChecklist] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [modalDoc, setModalDoc] = useState(null);
  const [linkInput, setLinkInput] = useState("");
  const [catatanOpdInput, setCatatanOpdInput] = useState("");
  const [saving, setSaving] = useState(false);

  const loadChecklist = useCallback(() => {
    if (!selectedOpd) return;
    setLoading(true);
    setError("");
    api.getChecklist(selectedOpd.id_opd, TAHUN)
      .then(setChecklist)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [selectedOpd]);

  useEffect(() => {
    if (unlocked) loadChecklist();
  }, [unlocked, loadChecklist]);

  const login = () => {
    if (String(selectedOpd.kode_akses) !== pin) {
      setLoginError("Kode akses salah.");
      return;
    }
    setLoginError("");
    setUnlocked(true);
  };

  const grouped = useMemo(() => {
    if (!checklist) return {};
    const g = {};
    checklist.forEach(d => {
      if (!g[d.katagori]) g[d.katagori] = [];
      g[d.katagori].push(d);
    });
    return g;
  }, [checklist]);

  const openModal = (doc) => {
    setModalDoc(doc);
    setLinkInput(doc.link_gdrive || "");
    setCatatanOpdInput(doc.catatan_opd || "");
  };

  const saveLink = () => {
    if (!linkInput.trim()) return;
    setSaving(true);
    api.submitDokumen({
      opdId: selectedOpd.id_opd, tahun: TAHUN, kodeDokumen: modalDoc.kode_dokumen,
      link: linkInput.trim(), catatanOpd: catatanOpdInput.trim(),
    })
      .then(() => { setModalDoc(null); loadChecklist(); })
      .catch(err => setError(err.message))
      .finally(() => setSaving(false));
  };

  const batalSubmit = () => {
    setSaving(true);
    api.cancelDokumen({ opdId: selectedOpd.id_opd, tahun: TAHUN, kodeDokumen: modalDoc.kode_dokumen })
      .then(() => { setModalDoc(null); loadChecklist(); })
      .catch(err => setError(err.message))
      .finally(() => setSaving(false));
  };

  if (!selectedOpd || !unlocked) {
    return (
      <div style={{ maxWidth: 420, margin: "60px auto", padding: "0 24px" }}>
        <div style={{ background: COLORS.paper, borderRadius: 14, padding: 28, border: `1px solid ${COLORS.line}` }}>
          <div style={{ fontFamily: "Georgia, serif", fontSize: 20, fontWeight: 700, color: COLORS.navy, marginBottom: 4 }}>
            Masuk sebagai OPD
          </div>
          <div style={{ fontSize: 13, color: COLORS.slate, marginBottom: 20 }}>
            Pilih instansi Anda, lalu masukkan kode akses.
          </div>
          <select
            value={selectedOpd?.id_opd || ""}
            onChange={(e) => { setSelectedOpd(opdList.find(o => o.id_opd === e.target.value)); setUnlocked(false); setPin(""); setLoginError(""); }}
            style={{ width: "100%", padding: "11px 12px", borderRadius: 8, border: `1px solid ${COLORS.line}`, fontSize: 14, marginBottom: 12, background: COLORS.bg }}
          >
            <option value="">— Pilih OPD —</option>
            {opdList.map(o => <option key={o.id_opd} value={o.id_opd}>{o.nama_opd}</option>)}
          </select>
          <input
            type="password" maxLength={4} placeholder="Kode akses"
            value={pin} onChange={(e) => { setPin(e.target.value.replace(/\D/g, "")); setLoginError(""); }}
            style={{ width: "100%", padding: "11px 12px", borderRadius: 8, border: `1px solid ${COLORS.line}`, fontSize: 14, marginBottom: 8, letterSpacing: 4, boxSizing: "border-box" }}
          />
          {loginError && <div style={{ fontSize: 12, color: COLORS.red, marginBottom: 8 }}>{loginError}</div>}
          <button
            disabled={!selectedOpd || pin.length !== 4}
            onClick={login}
            style={{
              width: "100%", padding: "12px", borderRadius: 8, border: "none", marginTop: 8,
              background: (!selectedOpd || pin.length !== 4) ? "#D8D2C2" : COLORS.navy,
              color: "#fff", fontWeight: 600, fontSize: 14, cursor: "pointer",
            }}
          >
            Masuk
          </button>
        </div>
      </div>
    );
  }

  if (loading && !checklist) return <Spinner label="Memuat checklist dokumen..." />;
  if (error && !checklist) return <ErrorBox message={error} onRetry={loadChecklist} />;
  if (!checklist) return null;

  const total = dokumenList.length;
  const submitted = checklist.filter(d => d.status_verifikasi !== "Belum Submit").length;

  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "28px 24px 60px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
        <div>
          <div style={{ fontFamily: "Georgia, serif", fontSize: 21, fontWeight: 700, color: COLORS.navy }}>
            {selectedOpd.nama_opd}
          </div>
          <div style={{ fontSize: 12.5, color: COLORS.slate }}>{submitted} dari {total} dokumen telah diinput</div>
        </div>
        <button onClick={() => { setSelectedOpd(null); setUnlocked(false); setChecklist(null); }} style={{
          fontSize: 12.5, color: COLORS.navy, background: "none", border: `1px solid ${COLORS.line}`,
          borderRadius: 8, padding: "7px 12px", cursor: "pointer",
        }}>Ganti OPD</button>
      </div>

      {error && <ErrorBox message={error} onRetry={loadChecklist} />}

      <div style={{ height: 6, background: COLORS.line, borderRadius: 4, marginBottom: 28, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${(submitted / total) * 100}%`, background: COLORS.accent, transition: "width .3s" }} />
      </div>

      {Object.entries(grouped).map(([katagori, docs]) => (
        <div key={katagori} style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.accent, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>
            {katagori}
          </div>
          <div style={{ background: COLORS.paper, borderRadius: 12, border: `1px solid ${COLORS.line}`, overflow: "hidden" }}>
            {docs.map((doc, i) => {
              const tw = TRIWULAN_MAP[doc.kode_dokumen];
              const twInfo = tw ? getTriwulanInfo(tw) : null;
              const unlockedDoc = tw ? isTriwulanUnlocked(tw) : true;
              return (
                <div key={doc.kode_dokumen} onClick={() => unlockedDoc && openModal(doc)} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "13px 16px",
                  cursor: unlockedDoc ? "pointer" : "not-allowed",
                  borderTop: i > 0 ? `1px solid ${COLORS.line}` : "none",
                  opacity: unlockedDoc ? 1 : 0.55,
                }}>
                  <FileText size={16} color={COLORS.slate} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, color: COLORS.ink }}>{doc.nama_dokumen}</div>
                    {twInfo && (
                      <div style={{ fontSize: 11, color: COLORS.slate, marginTop: 2 }}>
                        {twInfo.label} · {twInfo.deadline}
                      </div>
                    )}
                  </div>
                  {unlockedDoc ? (
                    <>
                      <StatusBadge status={doc.status_verifikasi} />
                      <ChevronRight size={16} color={COLORS.slate} />
                    </>
                  ) : (
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "4px 10px", borderRadius: 20, fontSize: 12.5, fontWeight: 600,
                      color: COLORS.slate, background: "#EFEBE0", whiteSpace: "nowrap",
                    }}>
                      <Lock size={12} strokeWidth={2.5} /> Belum Dibuka
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {modalDoc && (
        <Modal onClose={() => !saving && setModalDoc(null)} title={modalDoc.nama_dokumen}>
          {modalDoc.status_verifikasi === "Perlu Perbaikan" && modalDoc.catatan && (
            <div style={{ background: COLORS.redBg, color: COLORS.red, fontSize: 12.5, padding: "10px 12px", borderRadius: 8, marginBottom: 14 }}>
              <strong>Catatan Bagian Organisasi:</strong> {modalDoc.catatan}
            </div>
          )}
          <label style={{ fontSize: 12.5, color: COLORS.slate, display: "block", marginBottom: 6 }}>Link Google Drive</label>
          <div style={{ display: "flex", alignItems: "center", gap: 8, border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: "10px 12px", marginBottom: 14 }}>
            <Link2 size={14} color={COLORS.slate} />
            <input
              value={linkInput} onChange={(e) => setLinkInput(e.target.value)}
              placeholder="https://drive.google.com/..."
              style={{ border: "none", outline: "none", fontSize: 13.5, flex: 1, background: "transparent" }}
            />
          </div>

          <label style={{ fontSize: 12.5, color: COLORS.slate, display: "block", marginBottom: 6 }}>Catatan OPD (opsional)</label>
          <textarea
            value={catatanOpdInput} onChange={(e) => setCatatanOpdInput(e.target.value)}
            rows={2} placeholder="Jelaskan dokumen yang disubmit, mis. versi revisi ke-2..."
            style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${COLORS.line}`, fontSize: 13, marginBottom: 18, boxSizing: "border-box", resize: "vertical", fontFamily: "inherit" }}
          />

          <div style={{ display: "flex", gap: 10 }}>
            {modalDoc.status_verifikasi !== "Belum Submit" && (
              <button disabled={saving} onClick={batalSubmit} style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                padding: "12px 16px", borderRadius: 8, border: `1px solid ${COLORS.red}`,
                background: "#fff", color: COLORS.red, fontWeight: 600, fontSize: 13.5, cursor: saving ? "default" : "pointer",
                opacity: saving ? 0.6 : 1,
              }}>
                <Trash2 size={14} /> Batal
              </button>
            )}
            <button disabled={saving} onClick={saveLink} style={{
              flex: 1, padding: "12px", borderRadius: 8, border: "none",
              background: COLORS.navy, color: "#fff", fontWeight: 600, fontSize: 14, cursor: saving ? "default" : "pointer",
              opacity: saving ? 0.7 : 1,
            }}>
              {saving ? "Menyimpan..." : "Simpan Link"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ============ TAB: VERIFIKASI ============
function Verifikasi({ verifikatorList }) {
  const [verifikator, setVerifikator] = useState(null);
  const [namaInput, setNamaInput] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [loginError, setLoginError] = useState("");

  const [pendingList, setPendingList] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [modal, setModal] = useState(null);
  const [catatan, setCatatan] = useState("");
  const [saving, setSaving] = useState(false);

  const loadPending = useCallback(() => {
    setLoading(true);
    setError("");
    api.getPending(TAHUN)
      .then(setPendingList)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (verifikator) loadPending();
  }, [verifikator, loadPending]);

  const login = () => {
    const found = verifikatorList.find(v => v.nama === namaInput && String(v.pin) === pinInput);
    if (!found) {
      setLoginError("Nama atau PIN salah.");
      return;
    }
    setLoginError("");
    setVerifikator(found);
  };

  const verify = (status) => {
    setSaving(true);
    api.submitVerifikasi({
      opdId: modal.opd_id, tahun: TAHUN, kodeDokumen: modal.kode_dokumen,
      status, catatan: status === "Perlu Perbaikan" ? catatan : "", verifikator: verifikator.nama,
    })
      .then(() => { setModal(null); setCatatan(""); loadPending(); })
      .catch(err => setError(err.message))
      .finally(() => setSaving(false));
  };

  if (!verifikator) {
    return (
      <div style={{ maxWidth: 420, margin: "60px auto", padding: "0 24px" }}>
        <div style={{ background: COLORS.paper, borderRadius: 14, padding: 28, border: `1px solid ${COLORS.line}` }}>
          <div style={{ fontFamily: "Georgia, serif", fontSize: 20, fontWeight: 700, color: COLORS.navy, marginBottom: 4 }}>
            Masuk sebagai Verifikator
          </div>
          <div style={{ fontSize: 13, color: COLORS.slate, marginBottom: 20 }}>
            Hanya verifikator terdaftar (Bagian Organisasi) yang bisa melakukan verifikasi.
          </div>
          <select
            value={namaInput} onChange={(e) => { setNamaInput(e.target.value); setLoginError(""); }}
            style={{ width: "100%", padding: "11px 12px", borderRadius: 8, border: `1px solid ${COLORS.line}`, fontSize: 14, marginBottom: 12, background: COLORS.bg }}
          >
            <option value="">— Pilih Nama Verifikator —</option>
            {verifikatorList.map(v => <option key={v.nama} value={v.nama}>{v.nama}</option>)}
          </select>
          <input
            type="password" maxLength={4} placeholder="Kode akses (4 digit)"
            value={pinInput} onChange={(e) => { setPinInput(e.target.value.replace(/\D/g, "")); setLoginError(""); }}
            style={{ width: "100%", padding: "11px 12px", borderRadius: 8, border: `1px solid ${COLORS.line}`, fontSize: 14, marginBottom: 8, letterSpacing: 4, boxSizing: "border-box" }}
          />
          {loginError && <div style={{ fontSize: 12, color: COLORS.red, marginBottom: 8 }}>{loginError}</div>}
          <button
            disabled={!namaInput || pinInput.length !== 4}
            onClick={login}
            style={{
              width: "100%", padding: "12px", borderRadius: 8, border: "none", marginTop: 8,
              background: (!namaInput || pinInput.length !== 4) ? "#D8D2C2" : COLORS.navy,
              color: "#fff", fontWeight: 600, fontSize: 14, cursor: "pointer",
            }}
          >
            Masuk
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "28px 24px 60px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <div style={{ fontFamily: "Georgia, serif", fontSize: 21, fontWeight: 700, color: COLORS.navy }}>
          Verifikasi Dokumen
        </div>
        <button onClick={() => { setVerifikator(null); setPendingList(null); }} style={{
          fontSize: 12.5, color: COLORS.navy, background: "none", border: `1px solid ${COLORS.line}`,
          borderRadius: 8, padding: "7px 12px", cursor: "pointer",
        }}>Keluar</button>
      </div>
      <div style={{ fontSize: 12.5, color: COLORS.slate, marginBottom: 20 }}>
        Masuk sebagai <strong>{verifikator.nama}</strong>
        {pendingList ? ` · ${pendingList.length} dokumen menunggu verifikasi` : ""}
      </div>

      {error && <ErrorBox message={error} onRetry={loadPending} />}
      {loading && !pendingList && <Spinner label="Memuat daftar verifikasi..." />}

      {pendingList && (
        pendingList.length === 0 ? (
          <EmptyState text="Tidak ada dokumen yang menunggu verifikasi saat ini." />
        ) : (
          <div style={{ background: COLORS.paper, borderRadius: 12, border: `1px solid ${COLORS.line}`, overflow: "hidden" }}>
            {pendingList.map((p, i) => (
              <div key={p.opd_id + p.kode_dokumen} onClick={() => setModal(p)} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", cursor: "pointer",
                borderTop: i > 0 ? `1px solid ${COLORS.line}` : "none",
              }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 8, background: COLORS.amberBg,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <Clock size={16} color={COLORS.amber} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, color: COLORS.ink, fontWeight: 600 }}>{p.nama_dokumen}</div>
                  <div style={{ fontSize: 12, color: COLORS.slate }}>{p.nama_opd}</div>
                </div>
                <ChevronRight size={16} color={COLORS.slate} />
              </div>
            ))}
          </div>
        )
      )}

      {modal && (
        <Modal onClose={() => !saving && setModal(null)} title={modal.nama_dokumen}>
          <div style={{ fontSize: 12.5, color: COLORS.slate, marginBottom: 4 }}>OPD Pengirim</div>
          <div style={{ fontSize: 14, color: COLORS.ink, fontWeight: 600, marginBottom: 14 }}>{modal.nama_opd}</div>

          <div style={{ fontSize: 12.5, color: COLORS.slate, marginBottom: 4 }}>Link Bukti Dukung</div>
          <a href={modal.link_gdrive} target="_blank" rel="noreferrer" style={{
            display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: COLORS.navy,
            border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: "10px 12px", marginBottom: 14,
            textDecoration: "none", wordBreak: "break-all",
          }}>
            <Link2 size={14} /> {modal.link_gdrive}
          </a>

          {modal.catatan_opd && (
            <div style={{ fontSize: 12.5, color: COLORS.ink, background: COLORS.bg, borderRadius: 8, padding: "8px 10px", marginBottom: 14 }}>
              <span style={{ color: COLORS.slate }}>Catatan OPD: </span>{modal.catatan_opd}
            </div>
          )}

          <label style={{ fontSize: 12.5, color: COLORS.slate, display: "block", marginBottom: 6 }}>Catatan (wajib jika Perlu Perbaikan)</label>
          <textarea
            value={catatan} onChange={(e) => setCatatan(e.target.value)}
            rows={2} placeholder="Tulis catatan perbaikan..."
            style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${COLORS.line}`, fontSize: 13, marginBottom: 16, boxSizing: "border-box", resize: "vertical", fontFamily: "inherit" }}
          />

          <div style={{ display: "flex", gap: 10 }}>
            <button disabled={saving} onClick={() => verify("Perlu Perbaikan")} style={{
              flex: 1, padding: "12px", borderRadius: 8, border: `1px solid ${COLORS.red}`,
              background: "#fff", color: COLORS.red, fontWeight: 600, fontSize: 13.5, cursor: saving ? "default" : "pointer",
              opacity: saving ? 0.6 : 1,
            }}>Perlu Perbaikan</button>
            <button disabled={saving} onClick={() => verify("Sesuai")} style={{
              flex: 1, padding: "12px", borderRadius: 8, border: "none",
              background: COLORS.green, color: "#fff", fontWeight: 600, fontSize: 13.5, cursor: saving ? "default" : "pointer",
              opacity: saving ? 0.6 : 1,
            }}>Sesuai</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ============ TAB: DASHBOARD ============
function DocChecklistDetail({ opd }) {
  const [subs, setSubs] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setSubs(null);
    setError("");
    api.getChecklist(opd.id_opd, TAHUN).then(setSubs).catch(err => setError(err.message));
  }, [opd]);

  if (error) return <ErrorBox message={error} />;
  if (!subs) return <Spinner label="Memuat checklist..." />;

  return (
    <div style={{ background: COLORS.paper, borderRadius: 12, border: `1px solid ${COLORS.line}`, overflow: "hidden" }}>
      <div style={{ padding: "14px 16px", borderBottom: `1px solid ${COLORS.line}`, fontSize: 13.5, fontWeight: 700, color: COLORS.navy }}>
        Checklist Dokumen — {opd.nama_opd}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 90px 90px", padding: "10px 16px", fontSize: 11, fontWeight: 700, color: COLORS.slate, textTransform: "uppercase", letterSpacing: 0.4, borderBottom: `1px solid ${COLORS.line}`, background: COLORS.bg }}>
        <div>Dokumen</div>
        <div style={{ textAlign: "center" }}>Submitted</div>
        <div style={{ textAlign: "center" }}>Sesuai</div>
        <div style={{ textAlign: "center" }}>Revisi</div>
      </div>
      {subs.map((doc, i) => {
        const submitted = doc.status_verifikasi !== "Belum Submit";
        const sesuai = doc.status_verifikasi === "Sesuai";
        const revisi = doc.status_verifikasi === "Perlu Perbaikan";
        return (
          <div key={doc.kode_dokumen} style={{ display: "grid", gridTemplateColumns: "1fr 90px 90px 90px", alignItems: "center", padding: "10px 16px", borderTop: i > 0 ? `1px solid ${COLORS.line}` : "none" }}>
            <div style={{ fontSize: 13, color: COLORS.ink }}>{doc.nama_dokumen}</div>
            <CheckDot ok={submitted} />
            <CheckDot ok={sesuai} />
            <CheckDot ok={revisi} />
          </div>
        );
      })}
    </div>
  );
}

function CheckDot({ ok }) {
  return (
    <div style={{
      width: 20, height: 20, borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center",
      background: ok ? COLORS.greenBg : "#F1EEE3", margin: "0 auto",
    }}>
      {ok ? <Check size={13} color={COLORS.green} strokeWidth={3} /> : <Minus size={12} color={COLORS.slate} />}
    </div>
  );
}

function MasterDokumenModal({ dokumenList, onClose }) {
  const grouped = useMemo(() => {
    const g = {};
    dokumenList.forEach(d => {
      if (!g[d.katagori]) g[d.katagori] = [];
      g[d.katagori].push(d);
    });
    return g;
  }, [dokumenList]);

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(21,36,56,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 50,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: COLORS.paper, borderRadius: 14, padding: 24, width: "100%", maxWidth: 560,
        maxHeight: "80vh", display: "flex", flexDirection: "column",
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4 }}>
          <div style={{ fontFamily: "Georgia, serif", fontSize: 18, fontWeight: 700, color: COLORS.navy }}>
            Master Dokumen SAKIP
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.slate, padding: 2 }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ fontSize: 12.5, color: COLORS.slate, marginBottom: 16 }}>
          {dokumenList.length} jenis dokumen yang dipersyaratkan setiap tahun
        </div>

        <div style={{ overflowY: "auto", paddingRight: 4 }}>
          {Object.entries(grouped).map(([katagori, docs]) => (
            <div key={katagori} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: COLORS.accent, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 }}>
                {katagori}
              </div>
              <div style={{ border: `1px solid ${COLORS.line}`, borderRadius: 10, overflow: "hidden" }}>
                {docs.map((doc, i) => (
                  <div key={doc.kode_dokumen} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
                    borderTop: i > 0 ? `1px solid ${COLORS.line}` : "none",
                  }}>
                    <span style={{ fontSize: 11, color: COLORS.slate, fontFamily: "monospace", minWidth: 44 }}>{doc.kode_dokumen}</span>
                    <span style={{ fontSize: 13, color: COLORS.ink }}>{doc.nama_dokumen}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Dashboard({ opdList, dokumenList }) {
  const [selectedOpdId, setSelectedOpdId] = useState("");
  const [showMasterDokumen, setShowMasterDokumen] = useState(false);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");

  const loadSummary = useCallback(() => {
    setError("");
    api.getDashboard(TAHUN).then(setSummary).catch(err => setError(err.message));
  }, []);

  useEffect(() => { loadSummary(); }, [loadSummary]);

  if (error) return <ErrorBox message={error} onRetry={loadSummary} />;
  if (!summary) return <Spinner label="Memuat ringkasan dashboard..." />;

  const rows = selectedOpdId ? summary.filter(r => r.opd_id === selectedOpdId) : summary;
  const totalSesuai = summary.reduce((a, r) => a + r.sesuai, 0);
  const totalMenunggu = summary.reduce((a, r) => a + (r.submitted - r.sesuai - r.perlu_perbaikan), 0);
  const totalRevisi = summary.reduce((a, r) => a + r.perlu_perbaikan, 0);
  const totalDok = opdList.length * dokumenList.length;
  const totalBelum = totalDok - (totalSesuai + totalMenunggu + totalRevisi);

  const pieData = [
    { name: "Sesuai", value: totalSesuai, color: COLORS.green },
    { name: "Menunggu Verifikasi", value: totalMenunggu, color: COLORS.amber },
    { name: "Perlu Perbaikan", value: totalRevisi, color: COLORS.red },
    { name: "Belum Submit", value: totalBelum, color: COLORS.line },
  ].filter(d => d.value > 0);

  const barData = summary.map(r => ({ name: r.singkatan, Sesuai: r.sesuai, Sisa: r.total_dokumen - r.sesuai }));
  const selectedOpd = selectedOpdId ? opdList.find(o => o.id_opd === selectedOpdId) : null;

  return (
    <div style={{ maxWidth: 940, margin: "0 auto", padding: "28px 24px 60px" }}>
      <div style={{ fontFamily: "Georgia, serif", fontSize: 21, fontWeight: 700, color: COLORS.navy, marginBottom: 20 }}>
        Rekapitulasi Kelengkapan Dokumen
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
        <StatCard label="Total Dokumen Sesuai" value={`${totalSesuai} / ${totalDok}`} color={COLORS.green} />
        <StatCard label="OPD Terlibat" value={opdList.length} color={COLORS.navy} />
        <StatCard label="Jenis Dokumen" value={dokumenList.length} color={COLORS.accent} onClick={() => setShowMasterDokumen(true)} />
      </div>

      <select
        value={selectedOpdId} onChange={(e) => setSelectedOpdId(e.target.value)}
        style={{
          padding: "9px 12px", borderRadius: 8, border: `1px solid ${COLORS.line}`, fontSize: 13,
          marginBottom: 20, maxWidth: 320, width: "100%", background: COLORS.paper, color: COLORS.ink,
        }}
      >
        <option value="">Semua OPD</option>
        {opdList.map(o => <option key={o.id_opd} value={o.id_opd}>{o.nama_opd}</option>)}
      </select>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 14, marginBottom: 24 }}>
        <div style={{ background: COLORS.paper, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.slate, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Sebaran Status Dokumen</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
                {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", marginTop: 4 }}>
            {pieData.map(d => (
              <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: COLORS.slate }}>
                <span style={{ width: 8, height: 8, borderRadius: 8, background: d.color, display: "inline-block" }} />
                {d.name}
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: COLORS.paper, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.slate, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Dokumen Sesuai per OPD</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData} margin={{ left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.line} vertical={false} />
              <XAxis dataKey="name" fontSize={10} stroke={COLORS.slate} />
              <YAxis fontSize={10} stroke={COLORS.slate} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="Sesuai" stackId="a" fill={COLORS.green} radius={[0, 0, 0, 0]} />
              <Bar dataKey="Sisa" stackId="a" fill={COLORS.line} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ background: COLORS.paper, borderRadius: 12, border: `1px solid ${COLORS.line}`, overflow: "hidden", marginBottom: selectedOpdId ? 24 : 0 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 90px 90px 140px", padding: "10px 16px", fontSize: 11.5, fontWeight: 700, color: COLORS.slate, textTransform: "uppercase", letterSpacing: 0.5, borderBottom: `1px solid ${COLORS.line}` }}>
          <div>OPD</div><div>Sesuai</div><div>Menunggu</div><div>Revisi</div><div>Progres</div>
        </div>
        {rows.map((r, i) => (
          <div key={r.opd_id} style={{ display: "grid", gridTemplateColumns: "1fr 90px 90px 90px 140px", alignItems: "center", padding: "12px 16px", borderTop: i > 0 ? `1px solid ${COLORS.line}` : "none" }}>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.ink }}>{r.singkatan}</div>
              <div style={{ fontSize: 11.5, color: COLORS.slate }}>{r.nama_opd}</div>
            </div>
            <div style={{ fontSize: 13, color: COLORS.green, fontWeight: 600 }}>{r.sesuai}</div>
            <div style={{ fontSize: 13, color: COLORS.amber, fontWeight: 600 }}>{r.submitted - r.sesuai - r.perlu_perbaikan}</div>
            <div style={{ fontSize: 13, color: COLORS.red, fontWeight: 600 }}>{r.perlu_perbaikan}</div>
            <div>
              <div style={{ height: 6, background: COLORS.line, borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(r.sesuai / r.total_dokumen) * 100}%`, background: COLORS.green }} />
              </div>
              <div style={{ fontSize: 10.5, color: COLORS.slate, marginTop: 3 }}>{r.sesuai} / {r.total_dokumen} dokumen</div>
            </div>
          </div>
        ))}
      </div>

      {selectedOpd && <DocChecklistDetail opd={selectedOpd} />}

      {showMasterDokumen && <MasterDokumenModal dokumenList={dokumenList} onClose={() => setShowMasterDokumen(false)} />}
    </div>
  );
}

// ============ TAB: APIP (read-only) ============
function ApipView() {
  const [selectedOpdId, setSelectedOpdId] = useState("");
  const [selectedKategori, setSelectedKategori] = useState("");
  const [allDocs, setAllDocs] = useState(null);
  const [error, setError] = useState("");

  const loadApip = useCallback(() => {
    setError("");
    api.getApip().then(setAllDocs).catch(err => setError(err.message));
  }, []);

  useEffect(() => { loadApip(); }, [loadApip]);

  const kategoriList = useMemo(() => {
    if (!allDocs) return [];
    return [...new Set(allDocs.map(d => d.katagori))];
  }, [allDocs]);

  const opdOptions = useMemo(() => {
    if (!allDocs) return [];
    const map = {};
    allDocs.forEach(d => { map[d.opd_id] = d.nama_opd; });
    return Object.entries(map).map(([id, nama]) => ({ id, nama }));
  }, [allDocs]);

  const rows = useMemo(() => {
    if (!allDocs) return [];
    return allDocs.filter(d =>
      (!selectedOpdId || d.opd_id === selectedOpdId) &&
      (!selectedKategori || d.katagori === selectedKategori)
    );
  }, [allDocs, selectedOpdId, selectedKategori]);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 24px 60px" }}>
      <div style={{ fontFamily: "Georgia, serif", fontSize: 21, fontWeight: 700, color: COLORS.navy, marginBottom: 4 }}>
        Akses APIP
      </div>
      <div style={{ fontSize: 12.5, color: COLORS.slate, marginBottom: 20 }}>
        Tampilan read-only seluruh dokumen yang sudah disubmit OPD, lengkap dengan catatan OPD — untuk keperluan penilaian
      </div>

      {error && <ErrorBox message={error} onRetry={loadApip} />}
      {!allDocs && !error && <Spinner label="Memuat data..." />}

      {allDocs && (
        <>
          <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
            <select value={selectedOpdId} onChange={(e) => setSelectedOpdId(e.target.value)} style={{
              padding: "9px 12px", borderRadius: 8, border: `1px solid ${COLORS.line}`, fontSize: 13, background: COLORS.paper, minWidth: 220,
            }}>
              <option value="">Semua OPD</option>
              {opdOptions.map(o => <option key={o.id} value={o.id}>{o.nama}</option>)}
            </select>
            <select value={selectedKategori} onChange={(e) => setSelectedKategori(e.target.value)} style={{
              padding: "9px 12px", borderRadius: 8, border: `1px solid ${COLORS.line}`, fontSize: 13, background: COLORS.paper, minWidth: 180,
            }}>
              <option value="">Semua Kategori</option>
              {kategoriList.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>

          {rows.length === 0 ? (
            <EmptyState text="Belum ada dokumen yang cocok dengan filter ini." />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {rows.map((r, i) => (
                <div key={r.opd_id + r.kode_dokumen + i} style={{ background: COLORS.paper, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: r.catatan_opd ? 8 : 0 }}>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: COLORS.ink }}>{r.nama_dokumen}</div>
                      <div style={{ fontSize: 11.5, color: COLORS.slate }}>{r.nama_opd} · {r.katagori}</div>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                  {r.catatan_opd && (
                    <div style={{ fontSize: 12, color: COLORS.ink, background: COLORS.bg, borderRadius: 8, padding: "8px 10px", marginBottom: 8 }}>
                      <span style={{ color: COLORS.slate }}>Catatan OPD: </span>{r.catatan_opd}
                    </div>
                  )}
                  <a href={r.link_gdrive} target="_blank" rel="noreferrer" style={{
                    display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: COLORS.navy,
                    fontWeight: 600, textDecoration: "none",
                  }}>
                    <Download size={13} /> Buka / Download Dokumen
                  </a>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============ APP ROOT ============
export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [opdList, setOpdList] = useState(null);
  const [dokumenList, setDokumenList] = useState(null);
  const [verifikatorList, setVerifikatorList] = useState(null);
  const [initError, setInitError] = useState("");

  const loadInitialData = useCallback(() => {
    setInitError("");
    Promise.all([api.getOpd(), api.getDokumen(), api.getVerifikator()])
      .then(([opd, dokumen, verifikator]) => {
        setOpdList(opd);
        setDokumenList(dokumen);
        setVerifikatorList(verifikator);
      })
      .catch(err => setInitError(err.message));
  }, []);

  useEffect(() => { loadInitialData(); }, [loadInitialData]);

  const ready = opdList && dokumenList && verifikatorList;

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: COLORS.ink }}>
      <Header tab={tab} setTab={setTab} />

      {initError && <ErrorBox message={`Gagal memuat data awal: ${initError}`} onRetry={loadInitialData} />}
      {!ready && !initError && <Spinner label="Memuat aplikasi Patuhdiri..." />}

      {ready && (
        <>
          {tab === "dashboard" && <Dashboard opdList={opdList} dokumenList={dokumenList} />}
          {tab === "input" && <InputOPD opdList={opdList} dokumenList={dokumenList} />}
          {tab === "verifikasi" && <Verifikasi verifikatorList={verifikatorList} />}
          {tab === "apip" && <ApipView />}
        </>
      )}
    </div>
  );
}
