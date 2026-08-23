// ============ API CLIENT — Patuhdiri ============
// Semua request ke Google Apps Script Web App (Google Sheet "Patuhdiri" sebagai database)

const API_URL = import.meta.env.VITE_API_URL;

async function apiGet(action, params = {}) {
  const query = new URLSearchParams({ action, ...params }).toString();
  const res = await fetch(`${API_URL}?${query}`);
  if (!res.ok) throw new Error(`Gagal memuat data (${res.status})`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Gagal memuat data");
  return json.data;
}

async function apiPost(action, body = {}) {
  const res = await fetch(API_URL, {
    method: "POST",
    // text/plain menghindari CORS preflight OPTIONS yang tidak didukung Apps Script Web App
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, ...body }),
  });
  if (!res.ok) throw new Error(`Gagal mengirim data (${res.status})`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Gagal mengirim data");
  return json;
}

export const api = {
  getOpd: () => apiGet("opd"),
  getDokumen: () => apiGet("dokumen"),
  getVerifikator: () => apiGet("verifikator"),
  getChecklist: (opdId, tahun) => apiGet("data", { opd_id: opdId, tahun }),
  getPending: (tahun) => apiGet("pending", { tahun }),
  getDashboard: (tahun) => apiGet("dashboard", { tahun }),
  getApip: () => apiGet("apip"),

  submitDokumen: ({ opdId, tahun, kodeDokumen, link, catatanOpd }) =>
    apiPost("submit", { opd_id: opdId, tahun, kode_dokumen: kodeDokumen, link_gdrive: link, catatan_opd: catatanOpd }),

  cancelDokumen: ({ opdId, tahun, kodeDokumen }) =>
    apiPost("cancel", { opd_id: opdId, tahun, kode_dokumen: kodeDokumen }),

  submitVerifikasi: ({ opdId, tahun, kodeDokumen, status, catatan, verifikator }) =>
    apiPost("verify", { opd_id: opdId, tahun, kode_dokumen: kodeDokumen, status, catatan, verifikator }),
};
