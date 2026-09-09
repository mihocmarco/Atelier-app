import React, { useState, useEffect, useRef } from "react";
import {
  Cpu, Plus, X, Trash2, Camera, Code2, Save, Pencil,
  ChevronLeft, Search, ImageOff, Copy, Check, CircuitBoard,
  LogOut, Video, Film,
} from "lucide-react";
import { auth, db } from "./firebase.js";
import {
  onAuthStateChanged, signInWithEmailAndPassword, signOut,
} from "firebase/auth";
import {
  collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, orderBy,
} from "firebase/firestore";
import { uploadToCloudinary } from "./cloudinary.js";

const STATUS = [
  { id: "idee", label: "Idee", color: "var(--amber)" },
  { id: "lucru", label: "În lucru", color: "var(--copper-bright)" },
  { id: "gata", label: "Finalizat", color: "var(--green)" },
  { id: "arhiva", label: "Arhivat", color: "var(--text-muted)" },
];

function resizeImageToBlob(file, maxDim = 1100, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Nu am putut citi fișierul"));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Nu am putut încărca imaginea"));
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// ---------------- Login screen ----------------
function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleLogin() {
    setBusy(true);
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (e) {
      setError("Autentificare eșuată. Verifică email-ul și parola.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="brand"><CircuitBoard size={22} /> Atelier</div>
        <p className="hint">autentificare</p>
        {error && <div className="error-msg">{error}</div>}
        <div className="field">
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label>Parolă</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          />
        </div>
        <button className="primary-btn" style={{ width: "100%", justifyContent: "center" }} disabled={busy} onClick={handleLogin}>
          {busy ? "se conectează..." : "Intră"}
        </button>
      </div>
    </div>
  );
}

// ---------------- Main app ----------------
export default function App() {
  const [user, setUser] = useState(undefined); // undefined = loading, null = logged out
  const [projects, setProjects] = useState([]);
  const [view, setView] = useState("list");
  const [selectedId, setSelectedId] = useState(null);
  const [query_, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("toate");
  const [draft, setDraft] = useState(null);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const photoInputRef = useRef(null);
  const videoInputRef = useRef(null);

  useEffect(() => onAuthStateChanged(auth, (u) => setUser(u)), []);

  useEffect(() => {
    if (!user) { setProjects([]); return; }
    const q = query(
      collection(db, "projects"),
      where("ownerId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setProjects(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, () => setError("Nu am putut încărca proiectele."));
    return unsub;
  }, [user]);

  function openNew() {
    setDraft({
      id: null,
      title: "",
      status: "idee",
      tags: "",
      description: "",
      code: "",
      photos: [],
      videos: [],
    });
    setView("edit");
  }

  function openEdit(p) { setDraft({ ...p }); setView("edit"); }
  function openDetail(id) { setSelectedId(id); setView("detail"); }

  async function handlePhotoFiles(fileList) {
    const files = Array.from(fileList).slice(0, 6);
    setUploading(true);
    setError("");
    try {
      const results = [];
      for (const f of files) {
        const blob = await resizeImageToBlob(f);
        const { url, publicId } = await uploadToCloudinary(blob, "image");
        results.push({ url, publicId });
      }
      setDraft((d) => ({ ...d, photos: [...d.photos, ...results] }));
    } catch (e) {
      setError("Încărcarea pozei a eșuat. Verifică upload preset-ul din Cloudinary și încearcă din nou.");
    } finally {
      setUploading(false);
    }
  }

  async function handleVideoFiles(fileList) {
    const files = Array.from(fileList).slice(0, 3);
    setUploading(true);
    setError("");
    try {
      const items = [];
      for (const f of files) {
        if (f.size > 80 * 1024 * 1024) {
          setError(`"${f.name}" e prea mare (peste 80MB) — comprimă-l înainte de încărcare.`);
          continue;
        }
        const { url, publicId } = await uploadToCloudinary(f, "video");
        items.push({ url, publicId, name: f.name });
      }
      setDraft((d) => ({ ...d, videos: [...d.videos, ...items] }));
    } catch (e) {
      setError("Încărcarea videoclipului a eșuat. Verifică upload preset-ul din Cloudinary și încearcă din nou.");
    } finally {
      setUploading(false);
    }
  }

  function removePhoto(idx) {
    setDraft((d) => ({ ...d, photos: d.photos.filter((_, i) => i !== idx) }));
  }
  function removeVideo(idx) {
    setDraft((d) => ({ ...d, videos: d.videos.filter((_, i) => i !== idx) }));
  }

  async function saveDraft() {
    if (!draft.title.trim()) return;
    setSaving(true);
    setError("");
    try {
      if (draft.id) {
        const { id, ...rest } = draft;
        await updateDoc(doc(db, "projects", id), rest);
        setSelectedId(id);
      } else {
        const { id, ...rest } = draft;
        const docRef = await addDoc(collection(db, "projects"), {
          ...rest, ownerId: user.uid, createdAt: serverTimestamp(),
        });
        setSelectedId(docRef.id);
      }
      setView("detail");
    } catch (e) {
      setError("Nu am putut salva proiectul. Verifică regulile Firestore și conexiunea.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteProject(p) {
    setSaving(true);
    try {
      // Notă: fișierele rămân în Cloudinary (ștergerea lor necesită o cheie secretă,
      // nesigură de expus într-o aplicație client). Le poți curăța manual din
      // Cloudinary Media Library dacă vrei să eliberezi spațiu.
      await deleteDoc(doc(db, "projects", p.id));
      setView("list");
    } catch (e) {
      setError("Nu am putut șterge proiectul.");
    } finally {
      setSaving(false);
    }
  }

  function copyCode(code) {
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  if (user === undefined) {
    return <div className="app"><div className="center-loading">se încarcă...</div></div>;
  }
  if (user === null) return <LoginScreen />;

  const filtered = projects.filter((p) => {
    const q = query_.trim().toLowerCase();
    const matchQ = !q || p.title.toLowerCase().includes(q) ||
      (p.tags || "").toLowerCase().includes(q) ||
      (p.description || "").toLowerCase().includes(q);
    const matchS = statusFilter === "toate" || p.status === statusFilter;
    return matchQ && matchS;
  });

  const selected = projects.find((p) => p.id === selectedId);
  const statusMeta = (id) => STATUS.find((s) => s.id === id) || STATUS[0];

  return (
    <div className="app">
      {view === "list" && (
        <>
          <div className="header">
            <div>
              <div className="brand"><CircuitBoard size={22} /> Atelier</div>
              <div className="subtitle">proiecte electronică &amp; arduino</div>
            </div>
            <button className="logout-btn" onClick={() => signOut(auth)}>
              <LogOut size={13} /> ieșire
            </button>
          </div>

          {error && <div className="error-msg">{error}</div>}

          <div className="toolbar">
            <div className="search-box">
              <Search size={15} color="var(--text-muted)" />
              <input placeholder="Caută după titlu, etichetă..." value={query_} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <select className="status-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="toate">Toate</option>
              {STATUS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            <button className="add-btn" onClick={openNew}><Plus size={16} /> Proiect</button>
          </div>

          {projects.length === 0 && (
            <div className="empty"><Cpu size={34} /><p>Niciun proiect încă.</p><p>Adaugă primul tău proiect de electronică.</p></div>
          )}
          {projects.length > 0 && filtered.length === 0 && (
            <div className="empty"><ImageOff size={30} /><p>Niciun rezultat pentru filtrul curent.</p></div>
          )}

          <div className="grid">
            {filtered.map((p) => {
              const s = statusMeta(p.status);
              return (
                <div className="card" key={p.id} onClick={() => openDetail(p.id)}>
                  <div className="card-photo">
                    <div className="status-dot" style={{ background: s.color, color: s.color }} />
                    {p.photos && p.photos[0] ? (
                      <img src={p.photos[0].url} alt={p.title} />
                    ) : p.videos && p.videos[0] ? (
                      <Film size={24} className="placeholder" />
                    ) : (
                      <Cpu size={26} className="placeholder" />
                    )}
                  </div>
                  <div className="card-body">
                    <p className="card-title">{p.title}</p>
                    <p className="card-tags">{p.tags || s.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {view === "detail" && selected && (
        <>
          <div className="topbar">
            <button className="back-btn" onClick={() => setView("list")}><ChevronLeft size={16} /> proiecte</button>
            <div className="btn-row">
              <button className="icon-btn" onClick={() => openEdit(selected)}><Pencil size={16} /></button>
            </div>
          </div>

          <h1 className="detail-title">{selected.title}</h1>
          {(() => {
            const s = statusMeta(selected.status);
            return <div className="badge" style={{ color: s.color }}><span className="dot" style={{ background: s.color }} /> {s.label}</div>;
          })()}

          {selected.photos?.length > 0 && (
            <div className="photo-strip">
              {selected.photos.map((ph, i) => <img src={ph.url} key={i} alt={`${selected.title} ${i + 1}`} />)}
            </div>
          )}

          {selected.videos?.length > 0 && (
            <div className="video-list">
              {selected.videos.map((v, i) => (
                <video key={i} controls src={v.url} playsInline />
              ))}
            </div>
          )}

          {selected.tags && <p className="mono" style={{ fontSize: 12, color: "var(--text-muted)" }}>{selected.tags}</p>}

          {selected.description && (
            <><div className="section-label"><Cpu size={13} /> detalii</div><p className="description">{selected.description}</p></>
          )}

          {selected.code && (
            <>
              <div className="section-label"><Code2 size={13} /> cod</div>
              <div className="code-block">
                <button className="copy-btn" onClick={() => copyCode(selected.code)}>
                  {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? "copiat" : "copiază"}
                </button>
                <pre>{selected.code}</pre>
              </div>
            </>
          )}

          <button className="danger-btn" disabled={saving} onClick={() => deleteProject(selected)}>
            <Trash2 size={14} /> șterge proiectul
          </button>
        </>
      )}

      {view === "edit" && draft && (
        <>
          <div className="topbar">
            <button className="back-btn" onClick={() => setView(draft.id ? "detail" : "list")}>
              <X size={16} /> anulează
            </button>
          </div>

          {error && <div className="error-msg">{error}</div>}

          <div className="field">
            <label>Titlu</label>
            <input placeholder="ex: Stație meteo cu ESP32" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          </div>

          <div className="field">
            <label>Status</label>
            <div className="status-picker">
              {STATUS.map((s) => (
                <div key={s.id} className={"status-chip" + (draft.status === s.id ? " active" : "")}
                  style={draft.status === s.id ? { color: s.color } : {}}
                  onClick={() => setDraft({ ...draft, status: s.id })}>
                  <span className="dot" style={{ background: s.color }} /> {s.label}
                </div>
              ))}
            </div>
          </div>

          <div className="field">
            <label>Etichete (separate prin virgulă)</label>
            <input placeholder="ex: esp32, senzori, wifi" value={draft.tags} onChange={(e) => setDraft({ ...draft, tags: e.target.value })} />
          </div>

          <div className="field">
            <label>Poze</label>
            <div className="photo-upload-row">
              {draft.photos.map((ph, i) => (
                <div className="photo-thumb" key={i}>
                  <img src={ph.url} alt={`poza ${i + 1}`} />
                  <button onClick={() => removePhoto(i)}><X size={11} /></button>
                </div>
              ))}
              <div className={"upload-tile" + (uploading ? " uploading" : "")} onClick={() => photoInputRef.current?.click()}>
                <Camera size={18} />
              </div>
              <input ref={photoInputRef} type="file" accept="image/*" multiple style={{ display: "none" }}
                onChange={(e) => e.target.files && handlePhotoFiles(e.target.files)} />
            </div>
          </div>

          <div className="field">
            <label>Video</label>
            <div className="video-upload-list">
              {draft.videos.map((v, i) => (
                <div className="video-thumb" key={i}>
                  <Video size={14} />
                  <span>{v.name || `video ${i + 1}`}</span>
                  <button onClick={() => removeVideo(i)}><X size={13} /></button>
                </div>
              ))}
              <div className={"upload-tile" + (uploading ? " uploading" : "")} style={{ width: "100%", height: 44, flexDirection: "row", gap: 6 }}
                onClick={() => videoInputRef.current?.click()}>
                <Video size={16} /> adaugă video
              </div>
              <input ref={videoInputRef} type="file" accept="video/*" multiple style={{ display: "none" }}
                onChange={(e) => e.target.files && handleVideoFiles(e.target.files)} />
            </div>
            {uploading && <p className="upload-progress">se încarcă...</p>}
          </div>

          <div className="field">
            <label>Detalii proiect</label>
            <textarea rows={5} placeholder="Componente folosite, cum funcționează, ce ai învățat, ce mai ai de făcut..."
              value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </div>

          <div className="field">
            <label>Cod</label>
            <textarea className="code-input" rows={8} placeholder="// codul tău Arduino/C++ aici"
              value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} />
          </div>

          <button className="save-btn" disabled={!draft.title.trim() || saving || uploading} onClick={saveDraft}>
            <Save size={16} /> {saving ? "se salvează..." : "Salvează proiectul"}
          </button>
        </>
      )}
    </div>
  );
}
