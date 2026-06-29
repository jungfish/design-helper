import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabaseClient";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";
const PINTEREST_CLIENT_ID = import.meta.env.VITE_PINTEREST_CLIENT_ID ?? "";

const ALL_ROOMS = ["salon","cuisine","entree","parents","enfant","bureau","sdb","sanitaires","vinyle","cellier"];
const WIZARD_ROOMS = ["salon","cuisine","entree","parents","enfant","bureau","sdb","sanitaires"];
const ROOM_LABELS = {
  salon:"Salon", cuisine:"Cuisine", entree:"Entrée", parents:"Chambre parents",
  enfant:"Chambre enfant", bureau:"Bureau", sdb:"Salle de bain", sanitaires:"Sanitaires",
  vinyle:"Coin vinyle", cellier:"Cellier",
};
const DEFAULT_SELECTED = ["salon","cuisine","entree","parents","sdb"];
const WIZARD_STORAGE_KEY = "renoom_onboarding_state";

const DECO_STYLES = [
  { key:"chaleureux", label:"Chaleureux & naturel", description:"Bois clair, lin, tons crème et terracotta.", swatches:["#FAF6F0","#D0AA6C","#E9DFC8"], globalAccent:"lin",    warmth:70 },
  { key:"frais",      label:"Frais & lumineux",     description:"Bleu grisé, blanc cassé, matières épurées.", swatches:["#DCE8ED","#FAF6F0","#B7C3A5"], globalAccent:"sky",    warmth:35 },
  { key:"vegetal",    label:"Végétal & texturé",    description:"Vert sauge, fibres naturelles, accents olive.", swatches:["#A8B5A2","#FAF6F0","#B7C3A5"], globalAccent:"olive", warmth:55 },
  { key:"retro",      label:"Rétro & graphique",    description:"Jaune beurre, noir, touches de motif.", swatches:["#FCF8D5","#FAF6F0","#D0AA6C"], globalAccent:"butter", warmth:60 },
];

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function OnboardingWizard({ user, session, onComplete, onJoinProject, onSkip, signOut }) {
  const isPinterestReturn = (() => {
    const p = new URLSearchParams(window.location.search);
    return !!(p.get("code") && p.get("state") === "pinterest_wizard");
  })();

  const [step, setStep] = useState(() => isPinterestReturn ? "inspo" : "welcome");
  const [direction, setDirection] = useState(1);

  // Create path state
  const [projectName, setProjectName] = useState("");
  const [selectedRooms, setSelectedRooms] = useState(DEFAULT_SELECTED);
  const [decoStyle, setDecoStyle] = useState(null);
  const [inspoFiles, setInspoFiles] = useState([]);
  const [inspoUrlInput, setInspoUrlInput] = useState("");
  const [inspoUrlAdded, setInspoUrlAdded] = useState([]);
  const [loadingMessage, setLoadingMessage] = useState("Création de votre projet…");

  // Pinterest state
  const [pinterestPhase, setPinterestPhase] = useState(isPinterestReturn ? "loading" : null);
  const [pinterestToken, setPinterestToken] = useState(null);
  const [pinterestBoards, setPinterestBoards] = useState([]);
  const [selectedBoardIds, setSelectedBoardIds] = useState([]);

  // Join path state
  const [joinCode, setJoinCode] = useState(() => {
    if (isPinterestReturn) return "";
    return new URLSearchParams(window.location.search).get("invite") || "";
  });
  const [joinError, setJoinError] = useState("");

  // Post-creation state
  const [createdProjectId, setCreatedProjectId] = useState(null);
  const [inviteLink, setInviteLink] = useState("");
  const [inviteSent, setInviteSent] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef(null);
  const joinCodeRef = useRef(joinCode);
  joinCodeRef.current = joinCode;
  const sessionRef = useRef(session);
  sessionRef.current = session;

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "vous";

  const goTo = (nextStep, dir = 1) => {
    setDirection(dir);
    setStep(nextStep);
  };

  // ── Pinterest OAuth ──────────────────────────────────────────────────────

  const exchangePinterestCode = async (code, redirectUri) => {
    try {
      const token = sessionRef.current?.access_token;
      const res = await fetch(`${API_BASE}/pinterest-oauth`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ code, redirectUri }),
      });
      if (!res.ok) throw new Error("Pinterest auth failed");
      const { accessToken, boards } = await res.json();
      setPinterestToken(accessToken);
      setPinterestBoards(boards || []);
      setPinterestPhase("selecting");
    } catch {
      setPinterestPhase(null);
    }
  };

  // Detect Pinterest return from OAuth redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    if (code && state === "pinterest_wizard") {
      const saved = JSON.parse(localStorage.getItem(WIZARD_STORAGE_KEY) || "{}");
      const origin = `${window.location.protocol}//${window.location.host}`;
      window.history.replaceState({}, "", "/");
      localStorage.removeItem(WIZARD_STORAGE_KEY);
      if (saved.pinterestReturn) {
        setProjectName(saved.projectName || "");
        setSelectedRooms(saved.selectedRooms || DEFAULT_SELECTED);
        setDecoStyle(saved.decoStyle || null);
        setInspoUrlAdded(saved.inspoUrlAdded || []);
        exchangePinterestCode(code, origin);
      } else {
        setPinterestPhase(null);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-join if invite code in URL on mount
  useEffect(() => {
    if (isPinterestReturn) return;
    const invite = new URLSearchParams(window.location.search).get("invite");
    if (invite) {
      setJoinCode(invite);
      goTo("join");
      doJoin(invite);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePinterestConnect = () => {
    if (!PINTEREST_CLIENT_ID) return;
    localStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify({
      pinterestReturn: true,
      projectName,
      selectedRooms,
      decoStyle,
      inspoUrlAdded,
    }));
    const redirectUri = window.location.origin;
    const url = `https://www.pinterest.com/oauth/?client_id=${PINTEREST_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=boards:read,pins:read&state=pinterest_wizard`;
    window.location.href = url;
  };

  // Progress bar
  const PROGRESS_STEPS = ["name","rooms","style","inspo"];
  const progressIdx = PROGRESS_STEPS.indexOf(step);
  const progressPct = progressIdx >= 0 ? ((progressIdx + 1) / PROGRESS_STEPS.length) * 100 : 0;

  // ── File handling ────────────────────────────────────────────────────────

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    const newEntries = files.map(file => ({ file, preview: URL.createObjectURL(file), name: file.name }));
    setInspoFiles(prev => [...prev, ...newEntries].slice(0, 6));
  };

  const removeFile = (idx) => {
    setInspoFiles(prev => {
      const next = [...prev];
      URL.revokeObjectURL(next[idx].preview);
      next.splice(idx, 1);
      return next;
    });
  };

  const addInspoUrl = () => {
    const url = inspoUrlInput.trim();
    if (!url) return;
    setInspoUrlAdded(prev => [...prev, url].slice(0, 3));
    setInspoUrlInput("");
  };

  // ── Create project ───────────────────────────────────────────────────────

  const handleCreate = async () => {
    goTo("loading");
    setIsSubmitting(true);

    try {
      const token = sessionRef.current?.access_token;
      const authHeader = token ? { Authorization: `Bearer ${token}` } : {};
      const selectedStyle = DECO_STYLES.find(s => s.key === decoStyle);
      const hiddenRooms = ALL_ROOMS.filter(r => !selectedRooms.includes(r));
      const activeRoom = selectedRooms[0] || "salon";
      const generalContext = `${projectName || "Appartement"}, style ${selectedStyle?.label || "moderne"}, pièces : ${selectedRooms.map(r => ROOM_LABELS[r]).join(", ")}.`;

      // 1. Import Pinterest boards server-side (returns Supabase Storage URLs)
      const pinterestUrls = [];
      if (selectedBoardIds.length > 0 && pinterestToken) {
        setLoadingMessage("Import des photos Pinterest…");
        try {
          const pinRes = await fetch(`${API_BASE}/pinterest-import`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeader },
            body: JSON.stringify({ accessToken: pinterestToken, boardIds: selectedBoardIds }),
          });
          if (pinRes.ok) {
            const { urls } = await pinRes.json();
            pinterestUrls.push(...(urls || []));
          }
        } catch {}
      }

      // 2. Upload local inspiration files
      const uploadedImages = {};
      if (inspoFiles.length > 0) {
        setLoadingMessage("Upload des inspirations…");
        for (let i = 0; i < inspoFiles.length; i++) {
          try {
            const dataUrl = await fileToDataUrl(inspoFiles[i].file);
            const res = await fetch(`${API_BASE}/upload-image`, {
              method: "POST",
              headers: { "Content-Type": "application/json", ...authHeader },
              body: JSON.stringify({ dataUrl, filename: inspoFiles[i].name }),
            });
            if (res.ok) {
              const { url } = await res.json();
              uploadedImages[`${activeRoom}-${i}`] = url;
            }
          } catch {}
        }
      }

      // Merge Pinterest URLs into uploadedImages
      pinterestUrls.forEach((url, i) => {
        uploadedImages[`${activeRoom}-pin-${i}`] = url;
      });

      // URL-based inspirations
      const inspirationLinks = {};
      inspoUrlAdded.forEach((url, i) => {
        inspirationLinks[`${activeRoom}-url-${i}`] = { src: url, label: "" };
      });

      setLoadingMessage("Création de votre projet…");

      const state = {
        version: 1,
        savedAt: new Date().toISOString(),
        room: activeRoom,
        globalAccent: selectedStyle?.globalAccent || "butter",
        warmth: selectedStyle?.warmth ?? 60,
        customRooms: [],
        hiddenRooms,
        roomOrder: null,
        generalContext,
        generalResources: [],
        uploadedImages,
        inspirationLinks,
        aiInspirations: {},
        instagramItems: {},
        imageAnalysis: {},
        deletedImages: {},
        materialUploads: {},
        materialLinks: {},
        extraMaterialImages: {},
        extraMaterialMeta: {},
        planUploads: {},
        planLinks: {},
        extraPlanImages: {},
        roomNuances: {},
        roomNotes: {},
        roomLists: {},
        roomDocuments: {},
        chatHistory: {},
      };

      const res = await fetch(`${API_BASE}/save-project`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ state, name: projectName.trim() || undefined }),
      });
      if (!res.ok) throw new Error("save-project failed");
      const { id } = await res.json();

      setLoadingMessage("Finalisation…");

      await Promise.allSettled([
        supabase.from("room_items").insert({
          id: `todo-starter-${Date.now()}`,
          project_id: id,
          room_key: activeRoom,
          list_key: "todos",
          text: `Explorer les magasins de déco${selectedStyle ? ` — ${selectedStyle.label.toLowerCase()}` : ""}`,
          done: false,
          position: 0,
        }),
        supabase.from("chat_messages").insert({
          id: `msg-welcome-${Date.now()}`,
          project_id: id,
          room_key: activeRoom,
          role: "assistant",
          content: `Bienvenue dans votre ${ROOM_LABELS[activeRoom] || activeRoom} ! Je suis prêt à vous aider à créer l'ambiance ${selectedStyle?.label.toLowerCase() || "idéale"} que vous imaginez. Commencez par ajouter des inspirations ou posez-moi une question sur les couleurs et matières.`,
          created_at: new Date().toISOString(),
        }),
        supabase.from("change_log").insert({
          project_id: id,
          user_id: user.id,
          action: "onboarding_completed",
          details: {
            rooms: selectedRooms,
            style: decoStyle,
            hasInspo: inspoFiles.length > 0 || inspoUrlAdded.length > 0 || pinterestUrls.length > 0,
            inspoCount: inspoFiles.length + inspoUrlAdded.length + pinterestUrls.length,
            pinterest: selectedBoardIds.length > 0,
            invited: false,
          },
        }),
      ]);

      const { data: proj } = await supabase
        .from("projects")
        .select("invite_code")
        .eq("id", id)
        .single();
      if (proj?.invite_code) {
        setInviteLink(`${window.location.origin}?invite=${proj.invite_code}`);
      }

      setCreatedProjectId(id);
      goTo("invite");
    } catch {
      setIsSubmitting(false);
      goTo("style", -1);
    }
  };

  // ── Join project ─────────────────────────────────────────────────────────

  const doJoin = async (code) => {
    setIsSubmitting(true);
    setJoinError("");
    try {
      const result = await onJoinProject((code || joinCodeRef.current).trim().toLowerCase());
      if (!result?.ok) {
        setJoinError(result?.error || "Code invalide ou expiré.");
        setIsSubmitting(false);
      } else if (result.projectId) {
        onComplete(result.projectId);
      }
    } catch {
      setJoinError("Une erreur est survenue, veuillez réessayer.");
      setIsSubmitting(false);
    }
  };

  // ── Invite actions ───────────────────────────────────────────────────────

  const handleCopyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopySuccess(true);
      setInviteSent(true);
      setTimeout(() => setCopySuccess(false), 2000);
      if (createdProjectId) {
        supabase.from("change_log").insert({
          project_id: createdProjectId,
          user_id: user.id,
          action: "first_invite_sent",
          details: { method: "link" },
        }).then(() => {});
      }
    } catch {}
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(`Je t'invite à rejoindre mon projet déco sur Renoom : ${inviteLink}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
    setInviteSent(true);
    if (createdProjectId) {
      supabase.from("change_log").insert({
        project_id: createdProjectId,
        user_id: user.id,
        action: "first_invite_sent",
        details: { method: "whatsapp" },
      }).then(() => {});
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  const animClass = direction > 0
    ? "animate-[slideInRight_0.22s_ease-out]"
    : "animate-[slideInLeft_0.22s_ease-out]";

  return (
    <div className="min-h-screen bg-[#FAF6F0] flex flex-col">
      {progressIdx >= 0 && (
        <div className="w-full h-0.5 bg-black/8">
          <div className="h-0.5 bg-slate-800 transition-all duration-500" style={{ width: `${progressPct}%` }} />
        </div>
      )}

      <div key={step} className={`flex-1 flex flex-col items-center justify-center px-5 py-10 ${animClass}`}>
        <div className="w-full max-w-sm">

          {step === "welcome" && (
            <StepWelcome
              firstName={firstName}
              onStart={() => goTo("path")}
              onHaveCode={() => goTo("join")}
              signOut={signOut}
            />
          )}

          {step === "path" && (
            <StepPath
              onCreate={() => goTo("name")}
              onJoin={() => goTo("join")}
              onBack={() => goTo("welcome", -1)}
            />
          )}

          {step === "name" && (
            <StepName
              value={projectName}
              onChange={setProjectName}
              onNext={() => goTo("rooms")}
              onBack={() => goTo("path", -1)}
            />
          )}

          {step === "rooms" && (
            <StepRooms
              selectedRooms={selectedRooms}
              setSelectedRooms={setSelectedRooms}
              onNext={() => goTo("style")}
              onBack={() => goTo("name", -1)}
            />
          )}

          {step === "style" && (
            <StepStyle
              decoStyle={decoStyle}
              setDecoStyle={setDecoStyle}
              onNext={() => goTo("inspo")}
              onBack={() => goTo("rooms", -1)}
            />
          )}

          {step === "inspo" && (
            <StepInspo
              inspoFiles={inspoFiles}
              inspoUrlAdded={inspoUrlAdded}
              inspoUrlInput={inspoUrlInput}
              setInspoUrlInput={setInspoUrlInput}
              onFileChange={handleFileChange}
              onRemoveFile={removeFile}
              onAddUrl={addInspoUrl}
              onRemoveUrl={(i) => setInspoUrlAdded(prev => prev.filter((_, idx) => idx !== i))}
              fileInputRef={fileInputRef}
              onNext={handleCreate}
              onBack={() => {
                if (pinterestPhase === "selecting") {
                  setPinterestPhase(null);
                  setPinterestBoards([]);
                  setPinterestToken(null);
                  setSelectedBoardIds([]);
                } else {
                  goTo("style", -1);
                }
              }}
              pinterestEnabled={!!PINTEREST_CLIENT_ID}
              pinterestPhase={pinterestPhase}
              pinterestBoards={pinterestBoards}
              selectedBoardIds={selectedBoardIds}
              setSelectedBoardIds={setSelectedBoardIds}
              onPinterestConnect={handlePinterestConnect}
            />
          )}

          {step === "loading" && <StepLoading message={loadingMessage} />}

          {step === "invite" && (
            <StepInvite
              inviteLink={inviteLink}
              inviteSent={inviteSent}
              copySuccess={copySuccess}
              onCopy={handleCopyInvite}
              onWhatsApp={handleWhatsApp}
              onEnter={() => onComplete(createdProjectId)}
            />
          )}

          {step === "join" && (
            <StepJoin
              joinCode={joinCode}
              setJoinCode={setJoinCode}
              joinError={joinError}
              isSubmitting={isSubmitting}
              onJoin={() => doJoin()}
              onBack={() => goTo("path", -1)}
            />
          )}

        </div>
      </div>
    </div>
  );
}

// ── Step sub-components ────────────────────────────────────────────────────

function BackLink({ onClick }) {
  return (
    <button onClick={onClick} className="text-xs text-slate-400 hover:text-slate-600 mb-4 flex items-center gap-1 transition-colors">
      ← Retour
    </button>
  );
}

function PrimaryBtn({ onClick, disabled, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full bg-slate-900 text-white text-sm font-medium rounded-xl py-3 hover:bg-slate-800 active:bg-slate-700 transition-colors disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function StepWelcome({ firstName, onStart, onHaveCode, signOut }) {
  return (
    <div className="flex flex-col items-center text-center gap-6">
      <div className="flex items-center gap-2 mb-1">
        <svg width="28" height="28" viewBox="0 0 34 34" fill="none">
          <rect x="0" y="0" width="15" height="15" rx="3" fill="#b8c9d0"/>
          <rect x="19" y="0" width="15" height="15" rx="3" fill="#A8B5A2"/>
          <rect x="0" y="19" width="15" height="15" rx="3" fill="#D0AA6C"/>
          <rect x="19" y="19" width="15" height="15" rx="3" fill="#FAF6F0" stroke="rgba(0,0,0,0.12)" strokeWidth="1"/>
        </svg>
        <span className="font-['Sora'] font-semibold text-base text-slate-800">Renoom</span>
      </div>

      <div>
        <h1 className="font-['Sora'] text-2xl font-semibold text-slate-800 mb-2">
          Bienvenue, {firstName}&nbsp;!
        </h1>
        <p className="text-sm text-slate-500">
          Configurons votre premier projet déco en 2&nbsp;minutes.
        </p>
      </div>

      <PrimaryBtn onClick={onStart}>Commencer</PrimaryBtn>

      <button onClick={onHaveCode} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
        J'ai un code d'invitation
      </button>

      <button onClick={signOut} className="text-xs text-slate-300 hover:text-slate-500 transition-colors mt-1">
        Se déconnecter
      </button>
    </div>
  );
}

function StepPath({ onCreate, onJoin, onBack }) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <BackLink onClick={onBack} />
        <h2 className="font-['Sora'] text-xl font-semibold text-slate-800">Que voulez-vous faire ?</h2>
      </div>

      {[
        { emoji:"🏠", title:"Créer mon appartement", sub:"Je pars de zéro et configure mon projet.", onClick:onCreate },
        { emoji:"🔗", title:"Rejoindre un projet existant", sub:"J'ai reçu un lien ou un code d'invitation.", onClick:onJoin },
      ].map(card => (
        <button
          key={card.title}
          onClick={card.onClick}
          className="w-full text-left rounded-2xl border border-black/10 bg-white p-5 hover:border-slate-400 hover:shadow-sm transition-all flex items-start gap-4"
        >
          <span className="text-2xl mt-0.5">{card.emoji}</span>
          <div className="flex-1">
            <div className="font-semibold text-sm text-slate-800 mb-1">{card.title}</div>
            <div className="text-xs text-slate-500">{card.sub}</div>
          </div>
          <span className="text-slate-400 text-lg mt-0.5">›</span>
        </button>
      ))}
    </div>
  );
}

function StepName({ value, onChange, onNext, onBack }) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <BackLink onClick={onBack} />
        <h2 className="font-['Sora'] text-xl font-semibold text-slate-800 mb-1">
          Comment s'appelle votre appartement ?
        </h2>
        <p className="text-xs text-slate-500">Vous pourrez toujours le renommer plus tard.</p>
      </div>

      <input
        autoFocus
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => e.key === "Enter" && onNext()}
        placeholder="Mon appartement, Rue Lepic…"
        maxLength={60}
        className="w-full rounded-xl border border-black/12 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-300/60"
      />

      <PrimaryBtn onClick={onNext}>Suivant</PrimaryBtn>

      {!value && (
        <button onClick={onNext} className="text-xs text-slate-400 hover:text-slate-600 text-center transition-colors">
          Passer cette étape
        </button>
      )}
    </div>
  );
}

function StepRooms({ selectedRooms, setSelectedRooms, onNext, onBack }) {
  const toggle = (key) => {
    setSelectedRooms(prev => prev.includes(key) ? prev.filter(r => r !== key) : [...prev, key]);
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <BackLink onClick={onBack} />
        <h2 className="font-['Sora'] text-xl font-semibold text-slate-800 mb-1">
          Quelles pièces contient votre appartement ?
        </h2>
        <p className="text-xs text-slate-500">Sélectionnez les pièces que vous voulez décorer.</p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {WIZARD_ROOMS.map(key => {
          const sel = selectedRooms.includes(key);
          return (
            <button
              key={key}
              onClick={() => toggle(key)}
              className={`rounded-xl border py-2.5 px-3 text-xs font-medium text-left transition-all ${
                sel ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-black/10 hover:border-slate-400"
              }`}
            >
              {ROOM_LABELS[key]}
            </button>
          );
        })}
      </div>

      <PrimaryBtn onClick={onNext} disabled={selectedRooms.length === 0}>Suivant</PrimaryBtn>
    </div>
  );
}

function StepStyle({ decoStyle, setDecoStyle, onNext, onBack }) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <BackLink onClick={onBack} />
        <h2 className="font-['Sora'] text-xl font-semibold text-slate-800 mb-1">
          Quelle ambiance vous correspond ?
        </h2>
        <p className="text-xs text-slate-500">Un point de départ — tout est ajustable ensuite.</p>
      </div>

      <div className="flex flex-col gap-2">
        {DECO_STYLES.map(s => {
          const sel = decoStyle === s.key;
          return (
            <button
              key={s.key}
              onClick={() => setDecoStyle(s.key)}
              className={`w-full text-left rounded-xl border p-4 transition-all ${
                sel ? "border-slate-900 bg-white ring-1 ring-slate-900/10" : "border-black/10 bg-white hover:border-slate-400"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-slate-800">{s.label}</span>
                <div className="flex gap-1">
                  {s.swatches.map((c, i) => (
                    <div key={i} className="h-4 w-4 rounded-full border border-black/10" style={{ background: c }} />
                  ))}
                </div>
              </div>
              <p className="text-xs text-slate-500">{s.description}</p>
            </button>
          );
        })}
      </div>

      <PrimaryBtn onClick={onNext}>{decoStyle ? "Suivant" : "Continuer sans choisir"}</PrimaryBtn>
    </div>
  );
}

function StepInspo({
  inspoFiles, inspoUrlAdded, inspoUrlInput, setInspoUrlInput,
  onFileChange, onRemoveFile, onAddUrl, onRemoveUrl, fileInputRef,
  onNext, onBack,
  pinterestEnabled, pinterestPhase, pinterestBoards, selectedBoardIds, setSelectedBoardIds, onPinterestConnect,
}) {
  // Pinterest connecting spinner
  if (pinterestPhase === "loading") {
    return (
      <div className="flex flex-col gap-5">
        <BackLink onClick={onBack} />
        <div className="flex flex-col items-center gap-4 py-10">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[#e60023]" />
          <p className="text-sm text-slate-500">Connexion à Pinterest…</p>
        </div>
      </div>
    );
  }

  // Board selection view
  if (pinterestPhase === "selecting") {
    return (
      <StepPinterestBoards
        boards={pinterestBoards}
        selectedBoardIds={selectedBoardIds}
        setSelectedBoardIds={setSelectedBoardIds}
        onBack={onBack}
        onNext={onNext}
      />
    );
  }

  // Normal inspo view
  const hasContent = inspoFiles.length > 0 || inspoUrlAdded.length > 0 || selectedBoardIds.length > 0;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <BackLink onClick={onBack} />
        <h2 className="font-['Sora'] text-xl font-semibold text-slate-800 mb-1">
          Ajoutez vos premières inspirations
        </h2>
        <p className="text-xs text-slate-500">Photos, liens ou votre board Pinterest — tout ce qui vous inspire.</p>
      </div>

      {/* File upload */}
      <div>
        <input type="file" ref={fileInputRef} accept="image/*" multiple className="hidden" onChange={onFileChange} />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full rounded-xl border-2 border-dashed border-black/15 bg-white py-5 px-4 hover:border-slate-400 hover:text-slate-700 transition-all flex flex-col items-center gap-1.5 text-slate-500"
        >
          <span className="text-2xl">📷</span>
          <span className="text-sm font-medium">Ajouter des photos</span>
          <span className="text-xs text-slate-400">Depuis votre appareil</span>
        </button>

        {inspoFiles.length > 0 && (
          <div className="mt-2 flex gap-2 flex-wrap">
            {inspoFiles.map((f, i) => (
              <div key={i} className="relative h-16 w-16 rounded-lg overflow-hidden border border-black/10 shrink-0">
                <img src={f.preview} alt="" className="h-full w-full object-cover" />
                <button
                  onClick={() => onRemoveFile(i)}
                  className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-black/60 text-white text-xs flex items-center justify-center leading-none"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* URL input */}
      <div>
        <div className="flex gap-2">
          <input
            type="url"
            value={inspoUrlInput}
            onChange={e => setInspoUrlInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && onAddUrl()}
            placeholder="Coller un lien image…"
            className="flex-1 rounded-xl border border-black/12 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-400"
          />
          <button
            onClick={onAddUrl}
            disabled={!inspoUrlInput.trim()}
            className="rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-40 transition-colors shrink-0"
          >
            Ajouter
          </button>
        </div>
        {inspoUrlAdded.length > 0 && (
          <div className="mt-2 flex flex-col gap-1">
            {inspoUrlAdded.map((url, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
                <span className="flex-1 truncate">{url}</span>
                <button onClick={() => onRemoveUrl(i)} className="text-slate-400 hover:text-slate-700 shrink-0">×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pinterest button */}
      {pinterestEnabled && (
        <button
          onClick={onPinterestConnect}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-black/10 bg-white py-3 px-4 text-sm font-medium text-slate-700 hover:border-[#e60023]/40 hover:text-[#e60023] hover:bg-red-50/40 transition-all"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#e60023">
            <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/>
          </svg>
          Importer depuis Pinterest
        </button>
      )}

      {/* Selected boards indicator */}
      {selectedBoardIds.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-slate-500 bg-red-50 rounded-lg px-3 py-2 border border-red-100">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#e60023"><path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/></svg>
          <span>{selectedBoardIds.length} board{selectedBoardIds.length > 1 ? "s" : ""} Pinterest sélectionné{selectedBoardIds.length > 1 ? "s" : ""}</span>
          <button
            onClick={() => setSelectedBoardIds([])}
            className="ml-auto text-slate-400 hover:text-slate-600"
          >
            ×
          </button>
        </div>
      )}

      <PrimaryBtn onClick={onNext}>
        {hasContent ? "Créer mon appartement →" : "Créer mon appartement"}
      </PrimaryBtn>

      {!hasContent && (
        <p className="text-center text-xs text-slate-400">
          Vous pourrez en ajouter directement depuis l'app.
        </p>
      )}
    </div>
  );
}

function StepPinterestBoards({ boards, selectedBoardIds, setSelectedBoardIds, onBack, onNext }) {
  const toggle = (id) => {
    setSelectedBoardIds(prev =>
      prev.includes(id) ? prev.filter(b => b !== id) : prev.length < 3 ? [...prev, id] : prev
    );
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <BackLink onClick={onBack} />
        <h2 className="font-['Sora'] text-xl font-semibold text-slate-800 mb-1">
          Vos boards Pinterest
        </h2>
        <p className="text-xs text-slate-500">
          Sélectionnez jusqu'à 3 boards à importer dans votre galerie.
        </p>
      </div>

      <div className="flex flex-col gap-2 max-h-72 overflow-y-auto -mx-1 px-1">
        {boards.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-6">Aucun board trouvé sur votre compte.</p>
        )}
        {boards.map(board => {
          const sel = selectedBoardIds.includes(board.id);
          const disabled = !sel && selectedBoardIds.length >= 3;
          return (
            <button
              key={board.id}
              onClick={() => toggle(board.id)}
              disabled={disabled}
              className={`w-full text-left rounded-xl border p-3 transition-all flex items-center gap-3 ${
                sel
                  ? "border-slate-900 bg-white ring-1 ring-slate-900/10"
                  : disabled
                  ? "border-black/8 bg-white/50 opacity-40 cursor-not-allowed"
                  : "border-black/10 bg-white hover:border-slate-400"
              }`}
            >
              {board.coverUrl ? (
                <img src={board.coverUrl} alt="" className="h-10 w-10 rounded-lg object-cover shrink-0" />
              ) : (
                <div className="h-10 w-10 rounded-lg bg-slate-100 shrink-0 flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#e60023" opacity="0.5"><path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/></svg>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-800 truncate">{board.name}</div>
                <div className="text-xs text-slate-400">{board.pinCount} pins</div>
              </div>
              {sel && (
                <div className="h-5 w-5 rounded-full bg-slate-900 flex items-center justify-center shrink-0">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <PrimaryBtn onClick={onNext} disabled={selectedBoardIds.length === 0}>
        Importer {selectedBoardIds.length > 0
          ? `${selectedBoardIds.length} board${selectedBoardIds.length > 1 ? "s" : ""} →`
          : "…"}
      </PrimaryBtn>

      <button onClick={onNext} className="text-center text-xs text-slate-400 hover:text-slate-600 transition-colors">
        Continuer sans Pinterest
      </button>
    </div>
  );
}

function StepLoading({ message }) {
  return (
    <div className="flex flex-col items-center gap-4 py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-700" />
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}

function StepInvite({ inviteLink, inviteSent, copySuccess, onCopy, onWhatsApp, onEnter }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center text-center gap-3">
        <span className="text-4xl">🎉</span>
        <h2 className="font-['Sora'] text-xl font-semibold text-slate-800">
          Votre appartement est prêt !
        </h2>
        <p className="text-sm text-slate-500">
          Invitez votre partenaire ou architecte — ils verront les mêmes pièces et décisions en temps réel.
        </p>
      </div>

      {inviteLink && (
        <div className="rounded-xl border border-black/10 bg-white overflow-hidden">
          <div className="px-4 py-3 text-xs text-slate-400 font-mono truncate border-b border-black/8">
            {inviteLink}
          </div>
          <div className="flex">
            <button
              onClick={onCopy}
              className="flex-1 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors border-r border-black/8"
            >
              {copySuccess ? "✓ Copié !" : "Copier le lien"}
            </button>
            <button
              onClick={onWhatsApp}
              className="flex-1 py-2.5 text-xs font-medium text-green-700 hover:bg-green-50 transition-colors"
            >
              WhatsApp
            </button>
          </div>
        </div>
      )}

      <PrimaryBtn onClick={onEnter}>Entrer dans mon appartement →</PrimaryBtn>

      {!inviteSent && (
        <p className="text-center text-xs text-slate-400">
          Vous pourrez inviter plus tard depuis les paramètres.
        </p>
      )}
    </div>
  );
}

function StepJoin({ joinCode, setJoinCode, joinError, isSubmitting, onJoin, onBack }) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <BackLink onClick={onBack} />
        <h2 className="font-['Sora'] text-xl font-semibold text-slate-800 mb-1">
          Entrez votre code d'invitation
        </h2>
        <p className="text-xs text-slate-500">Votre partenaire vous a partagé un code ou un lien.</p>
      </div>

      <input
        autoFocus
        type="text"
        value={joinCode}
        onChange={e => setJoinCode(e.target.value.trim())}
        onKeyDown={e => e.key === "Enter" && !isSubmitting && onJoin()}
        placeholder="abc123def"
        className="w-full rounded-xl border border-black/12 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 font-mono"
      />

      {joinError && <p className="text-xs text-red-500">{joinError}</p>}

      <PrimaryBtn onClick={onJoin} disabled={!joinCode.trim() || isSubmitting}>
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Connexion…
          </span>
        ) : "Rejoindre le projet"}
      </PrimaryBtn>
    </div>
  );
}
