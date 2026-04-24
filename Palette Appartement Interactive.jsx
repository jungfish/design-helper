import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sofa, ChefHat, DoorOpen, BedDouble, Baby, Music2, Warehouse, Palette, Bath, Briefcase } from "lucide-react";

const baseColors = {
  creme: { name: "Crème chaud", light: "#FAF6F0", hex: "#F4F1EA", medium: "#E8DFD3", dark: "#D8CEC1" },
  bleu: { name: "Bleu clair grisé", light: "#DCE8ED", hex: "#b8c9d0", medium: "#9fb7bf", dark: "#7f9ea8" },
  vert: { name: "Vert sauge", light: "#C8D1C4", hex: "#A8B5A2", medium: "#7A8F7A", dark: "#5F7463" },
  bois: { name: "Bois miel", light: "#DCC093", hex: "#CDAA73", medium: "#B88E57", dark: "#9C7447" },
};

const accents = {
  butter: { name: "Jaune beurre", hex: "#FCF8D5" },
  ocre: { name: "Ocre doux", hex: "#D8B16A" },
  olive: { name: "Olive doux", hex: "#B7C3A5" },
  sky: { name: "Bleu ciel très pâle", hex: "#DCE8ED" },
  lin: { name: "Lin sable", hex: "#E9DFC8" },
};

const roomPresets = {
  bureau: {
    label: "Bureau",
    icon: Briefcase,
    dominant: "bleu",
    secondary: "bois",
    defaultAccent: "olive",
    line: "Bureau calme et concentré : base claire, touches de bleu doux et bois chaleureux.",
    notes: [
      "Le bleu clair grisé aide à la concentration sans être froid.",
      "Le bois miel évite un rendu trop minimaliste.",
      "Accent olive ou beurre en petite touche pour la personnalité.",
    ],
    planBox: { left: 60, top: 55, width: 18, height: 15 },
  },
  sdb: {
    label: "Salle de bain",
    icon: Bath,
    dominant: "creme",
    secondary: "bleu",
    defaultAccent: "bois",
    line: "Salle de bain douce et lumineuse : base claire, détails rétro et matières naturelles.",
    notes: [
      "Le crème chaud évite un effet clinique.",
      "Le bleu très pâle fonctionne bien en carrelage ou meuble.",
      "Le bois miel apporte une touche vintage chaleureuse.",
    ],
    planBox: { left: 70, top: 65, width: 15, height: 12 },
  },
  salon: {
    label: "Salon / bibliothèque",
    icon: Sofa,
    dominant: "bleu",
    secondary: "creme",
    defaultAccent: "bois",
    line: "Salon nord : base claire, bibliothèque colorée, ambiance rétro lumineuse.",
    notes: [
      "Le bleu clair fonctionne mieux sur la bibliothèque que sur tous les murs.",
      "Le crème chaud garde la pièce lumineuse malgré l'orientation nord.",
      "Le bois miel et le jaune beurre réchauffent sans partir sur le rouge.",
    ],
    planBox: { left: 11, top: 10, width: 36, height: 32 },
  },
  cuisine: {
    label: "Cuisine",
    icon: ChefHat,
    dominant: "bleu",
    secondary: "bois",
    defaultAccent: "butter",
    line: "Cuisine rétro colorée : bleu clair grisé, bois miel, accents beurre ou olive.",
    notes: [
      "Le bleu clair grisé sur les meubles bas est très cohérent avec vos inspirations.",
      "Le bois miel sur les hauts et niches réchauffe immédiatement.",
      "Le jaune beurre est parfait en petite touche sur assise, luminaire ou détail.",
    ],
    planBox: { left: 2, top: 43, width: 18, height: 21 },
  },
  entree: {
    label: "Entrée",
    icon: DoorOpen,
    dominant: "vert",
    secondary: "bois",
    defaultAccent: "butter",
    line: "Entrée signature : plus enveloppante, architecturée, avec menuiserie et niche fortes.",
    notes: [
      "Le vert sauge donne du caractère sans durcir l'entrée.",
      "Le bois miel souligne très bien les arrondis et assises.",
      "Le jaune beurre peut venir sur un coussin, une applique ou une niche intérieure.",
    ],
    planBox: { left: 39, top: 46, width: 13, height: 10 },
  },
  parents: {
    label: "Chambre parents",
    icon: BedDouble,
    dominant: "vert",
    secondary: "creme",
    defaultAccent: "bois",
    line: "Chambre parent : calme, douce, colorée par touches structurées.",
    notes: [
      "Le vert ou le bleu peuvent rester sur la tête de lit ou la menuiserie.",
      "Le reste des murs gagne à rester crème chaud.",
      "Le bois miel et le lin sable sont de meilleurs accents que les tons rosés.",
    ],
    planBox: { left: 56, top: 18, width: 21, height: 17 },
  },
  enfant: {
    label: "Chambre enfant",
    icon: Baby,
    dominant: "vert",
    secondary: "bleu",
    defaultAccent: "butter",
    line: "Chambre enfant : plus joueuse, rétro et graphique, mais toujours lisible.",
    notes: [
      "Le fond crème calme le jeu si vous ajoutez du motif ou des rayures.",
      "Le bleu clair et le vert sauge marchent très bien ensemble dans une chambre au sud.",
      "Le jaune beurre est une bonne alternative douce aux accents rouges.",
    ],
    planBox: { left: 52, top: 35, width: 28, height: 21 },
  },
  vinyle: {
    label: "Coin vinyle",
    icon: Music2,
    dominant: "creme",
    secondary: "bois",
    defaultAccent: "olive",
    line: "Coin vinyle : plus simple, chaleureux, avec les objets et pochettes comme décor.",
    notes: [
      "Le crème chaud laisse respirer les vinyles et objets.",
      "Le bois miel donne tout de suite le côté vintage.",
      "Une seule touche d'olive ou de bleu suffit.",
    ],
    planBox: { left: 28, top: 20, width: 8, height: 10 },
  },
  cellier: {
    label: "Cellier",
    icon: Warehouse,
    dominant: "vert",
    secondary: "creme",
    defaultAccent: "butter",
    line: "Cellier : pièce parfaite pour un décor plus éditorial et des motifs discrets.",
    notes: [
      "Le vert sauge supporte très bien un papier peint ou carrelage décoratif.",
      "Le crème chaud évite de trop assombrir cette pièce plus technique.",
      "Le jaune beurre est très juste pour donner une lumière vintage.",
    ],
    planBox: { left: 20, top: 45, width: 8, height: 12 },
  },
};

const roomImages = {
  bureau: [],
  sdb: [],
  salon: [],
  cuisine: [],
  entree: [],
  parents: [],
  enfant: [],
  vinyle: [],
  cellier: [],
};

const planImage = null;

const shadeMap = { clair: "light", moyen: "hex", soutenu: "medium", fonce: "dark" };

function getShade(colorKey, level) {
  const color = baseColors[colorKey];
  if (!color) return "#ddd";
  const key = shadeMap[level] || "hex";
  return color[key] || color.hex;
}

function textColor(hex) {
  const c = hex.replace("#", "");
  const bigint = parseInt(c, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 165 ? "#24303a" : "#ffffff";
}

function Swatch({ title, hex, subtitle }) {
  return (
    <div className="rounded-2xl border border-black/5 overflow-hidden shadow-sm">
      <div className="h-24" style={{ backgroundColor: hex }} />
      <div className="p-3 bg-white">
        <div className="text-xs text-slate-500">{subtitle}</div>
        <div className="font-medium">{title}</div>
        <div className="text-xs font-mono mt-1 text-slate-500">{hex}</div>
      </div>
    </div>
  );
}

function moodStyle(key) {
  const map = {
    "bois-clair": { background: "linear-gradient(135deg, #ead7b2, #d9bf90)" },
    "bois-miel": { background: "linear-gradient(135deg, #d7b076, #b98d54)" },
    "bleu-creme": { background: "linear-gradient(135deg, #b8c9d0 0%, #b8c9d0 50%, #f4f1ea 50%, #f4f1ea 100%)" },
    "pierre-claire": { background: "linear-gradient(135deg, #e8e1d6, #d8cec1)" },
    "zellige-bleu": { background: "repeating-linear-gradient(45deg, #b8c9d0, #b8c9d0 14px, #c7d8df 14px, #c7d8df 28px)" },
    "zellige-beige": { background: "repeating-linear-gradient(45deg, #efe3cd, #efe3cd 14px, #f7eddd 14px, #f7eddd 28px)" },
    "ceramique": { background: "linear-gradient(135deg, #f8f6f1, #ddd7ce)" },
    "beton-clair": { background: "linear-gradient(135deg, #d9d5cf, #c8c4be)" },
    "damier-doux": { background: "conic-gradient(from 90deg, #f4f1ea 25%, #d8cec1 0 50%, #f4f1ea 0 75%, #d8cec1 0) 0 0/34px 34px" },
    "vert-bois": { background: "linear-gradient(135deg, #a8b5a2 0%, #a8b5a2 50%, #cdaa73 50%, #cdaa73 100%)" },
    "rayure-douce": { background: "repeating-linear-gradient(90deg, #f4f1ea, #f4f1ea 18px, #b8c9d0 18px, #b8c9d0 36px)" },
    "lin": { background: "linear-gradient(135deg, #f4f1ea, #e9dfc8)" },
    "motif-doux": { background: "radial-gradient(circle at 25% 25%, #fcf8d5 0 8%, transparent 9%), radial-gradient(circle at 75% 25%, #b8c9d0 0 8%, transparent 9%), radial-gradient(circle at 25% 75%, #a8b5a2 0 8%, transparent 9%), #f4f1ea", backgroundSize: "60px 60px" },
    "couleurs-jouees": { background: "linear-gradient(135deg, #b8c9d0 0 33%, #fcf8d5 33% 66%, #a8b5a2 66% 100%)" },
    "creme": { background: "#f4f1ea" },
  };
  return map[key] || { background: "#ece7df" };
}

function ImageSlider({ cards }) {
  const [index, setIndex] = useState(0);
  if (!cards?.length) return <div className="h-56 rounded-2xl bg-slate-100 grid place-items-center text-sm text-slate-500">Aucune inspiration</div>;
  const current = cards[index];
  return (
    <div className="space-y-3">
      <div className="rounded-[22px] overflow-hidden border border-black/5 bg-white">
        <div className="h-[320px] p-6 flex flex-col justify-end" style={moodStyle(current.mood || "creme")}>
          <div className="rounded-2xl bg-white/88 backdrop-blur-sm p-4 max-w-[85%] shadow-sm">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Inspiration</div>
            <div className="text-xl font-semibold mt-1">{current.title}</div>
            <div className="text-sm text-slate-600 mt-2">{current.note}</div>
          </div>
        </div>
      </div>
      <div className="flex gap-2 flex-wrap">
        {cards.map((card, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            className={`w-[92px] h-[72px] rounded-xl overflow-hidden border text-left ${i === index ? "border-slate-900" : "border-black/10"}`}
            style={moodStyle(card.mood || "creme")}
          >
            <div className="h-full w-full bg-white/30 p-2 flex items-end">
              <div className="text-[10px] leading-tight font-medium text-slate-800 bg-white/80 rounded-md px-1.5 py-1">{card.title}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function PlanPreview({ activeRoom }) {
  const rooms = {
    salon: { x: 6, y: 8, w: 28, h: 26, label: "Salon" },
    cuisine: { x: 6, y: 40, w: 16, h: 18, label: "Cuisine" },
    entree: { x: 24, y: 40, w: 12, h: 12, label: "Entrée" },
    vinyle: { x: 24, y: 26, w: 8, h: 10, label: "Vinyle" },
    parents: { x: 42, y: 10, w: 20, h: 16, label: "Ch. parents" },
    enfant: { x: 42, y: 30, w: 20, h: 16, label: "Ch. enfant" },
    bureau: { x: 64, y: 30, w: 16, h: 16, label: "Bureau" },
    sdb: { x: 64, y: 10, w: 14, h: 12, label: "SDB" },
    cellier: { x: 22, y: 54, w: 10, h: 10, label: "Cellier" },
  };

  return (
    <div className="rounded-[22px] overflow-hidden border border-black/5 bg-white">
      <div className="p-4 border-b bg-white">
        <div className="text-sm font-medium">Plan de la pièce</div>
        <div className="text-xs text-slate-500">Schéma d’orientation de l’appartement, avec la pièce active surlignée</div>
      </div>
      <div className="relative bg-[#f7f3ef] h-[340px] p-6">
        <div className="absolute inset-6 rounded-[28px] border-2 border-[#c8beb4] bg-[#efe7de]" />
        {Object.entries(rooms).map(([key, r]) => {
          const isActive = key === activeRoom;
          return (
            <div
              key={key}
              className={`absolute rounded-2xl border flex items-center justify-center text-center px-2 ${isActive ? "border-[#1f2937] border-[4px] shadow-md" : "border-[#c8beb4] border-2"}`}
              style={{
                left: `${r.x}%`,
                top: `${r.y}%`,
                width: `${r.w}%`,
                height: `${r.h}%`,
                backgroundColor: isActive ? "rgba(184, 201, 208, 0.45)" : "rgba(255,255,255,0.55)",
              }}
            >
              <span className={`text-xs md:text-sm font-medium ${isActive ? "text-slate-900" : "text-slate-600"}`}>{r.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const materialsByRoom = {
  bureau: [
    { label: "Sol", value: "Parquet clair", mood: "bois-clair" },
    { label: "Bureau", value: "Bois miel ou chêne", mood: "bois-miel" },
    { label: "Mur", value: "Crème + bleu en accent", mood: "bleu-creme" },
  ],
  sdb: [
    { label: "Sol", value: "Carrelage ou pierre claire", mood: "pierre-claire" },
    { label: "Crédence", value: "Zellige Lavanda Blue", mood: "zellige-bleu", link: "https://www.parquet-carrelage.com/carrelage-mural-zellige/3663-carrelage-aspect-zellige-la-riviera-lavanda-blue-brillant-132x132-cm-8435404940003.html", cta: "Voir le zellige" },
    { label: "Lavabo", value: "Céramique / vasque rétro", mood: "ceramique" },
  ],
  salon: [
    { label: "Sol", value: "Parquet bois clair", mood: "bois-clair" },
    { label: "Menuiserie", value: "Bois miel", mood: "bois-miel" },
    { label: "Textiles", value: "Lin / coton écru", mood: "lin" },
  ],
  cuisine: [
    { label: "Sol", value: "Carrelage ou béton clair", mood: "beton-clair" },
    { label: "Crédence", value: "Zellige beige Ivory brillant", mood: "zellige-beige", link: "https://www.parquet-carrelage.com/carrelage-mural-faience/2290-carrelage-mural-aspect-zellige-beige-ivory-brillant-8445583318005.html", cta: "Voir le zellige" },
    { label: "Plan de travail", value: "Bois miel ou pierre claire", mood: "bois-miel" },
  ],
  entree: [
    { label: "Sol", value: "Carrelage graphique", mood: "damier-doux" },
    { label: "Menuiserie", value: "Bois + peinture", mood: "vert-bois" },
    { label: "Assise", value: "Textile rayé ou uni", mood: "rayure-douce" },
  ],
  parents: [
    { label: "Sol", value: "Parquet bois clair", mood: "bois-clair" },
    { label: "Tête de lit", value: "Peinture ou tissu", mood: "bleu-creme" },
    { label: "Textiles", value: "Lin naturel", mood: "lin" },
  ],
  enfant: [
    { label: "Sol", value: "Parquet", mood: "bois-clair" },
    { label: "Mur", value: "Peinture + motifs", mood: "motif-doux" },
    { label: "Mobilier", value: "Bois + couleurs", mood: "couleurs-jouees" },
  ],
  vinyle: [
    { label: "Sol", value: "Parquet", mood: "bois-clair" },
    { label: "Meuble", value: "Bois vintage", mood: "bois-miel" },
    { label: "Mur", value: "Crème chaud", mood: "creme" },
  ],
  cellier: [
    { label: "Sol", value: "Carrelage", mood: "damier-doux" },
    { label: "Mur", value: "Peinture + motif", mood: "motif-doux" },
    { label: "Évier", value: "Céramique", mood: "ceramique" },
  ],
};

const roomInspirationCards = {
  salon: [
    { title: "Bibliothèque bleue", note: "Meuble coloré, murs crème, accents miel.", mood: "bleu-creme" },
    { title: "Salon nord lumineux", note: "Base claire, texture naturelle, contraste doux.", mood: "lin" },
    { title: "Niches rétro", note: "Arrondis, bibliothèques et menuiseries en vedette.", mood: "bois-miel" },
  ],
  cuisine: [
    { title: "Cuisine bleu clair", note: "Meubles bas bleu grisé, hauts bois miel.", mood: "bleu-creme" },
    { title: "Banquette rétro", note: "Assise intégrée, esprit convivial et chaleureux.", mood: "rayure-douce" },
    { title: "Zellige beige", note: "Texture brillante et irrégulière pour réchauffer.", mood: "zellige-beige" },
  ],
  entree: [
    { title: "Entrée signature", note: "Niche, banquette et couleur enveloppante.", mood: "vert-bois" },
    { title: "Menuiserie colorée", note: "Vert sauge ou ton plus dense avec bois.", mood: "vert-bois" },
    { title: "Assise intégrée", note: "Petit détail textile ou rayure douce.", mood: "rayure-douce" },
  ],
  parents: [
    { title: "Chambre calme", note: "Crème chaud, bleu ou vert en structure.", mood: "bleu-creme" },
    { title: "Tête de lit colorée", note: "Mur ou menuiserie plus soutenu.", mood: "vert-bois" },
    { title: "Textiles naturels", note: "Lin, coton, tons sable et miel.", mood: "lin" },
  ],
  enfant: [
    { title: "Graphique doux", note: "Motifs, rayures, couleurs joyeuses mais grisées.", mood: "motif-doux" },
    { title: "Mobilier coloré", note: "Bois + aplats bleu, vert et beurre.", mood: "couleurs-jouees" },
    { title: "Fond lisible", note: "Base crème pour éviter la surcharge.", mood: "creme" },
  ],
  bureau: [
    { title: "Bureau apaisé", note: "Bleu clair, bois miel, ambiance studieuse.", mood: "bleu-creme" },
    { title: "Rangements intégrés", note: "Sur-mesure ton sur ton ou bicolore.", mood: "bois-miel" },
    { title: "Accent olive", note: "Petite touche végétale ou textile.", mood: "vert-bois" },
  ],
  vinyle: [
    { title: "Coin vintage", note: "Bois, crème, pochettes visibles.", mood: "bois-miel" },
    { title: "Mur sobre", note: "Laisser respirer les objets et affiches.", mood: "creme" },
    { title: "Chaleur naturelle", note: "Pas besoin de trop de couleur ici.", mood: "lin" },
  ],
  cellier: [
    { title: "Petit décor éditorial", note: "Motif léger, vert sauge, céramique.", mood: "motif-doux" },
    { title: "Étagères utiles", note: "Fonctionnel mais charmant.", mood: "vert-bois" },
    { title: "Esprit rétro", note: "Papier peint ou carrelage décoratif discret.", mood: "damier-doux" },
  ],
  sdb: [
    { title: "Salle de bain douce", note: "Crème chaud, bleu pâle, bois miel.", mood: "bleu-creme" },
    { title: "Zellige bleu", note: "Texture brillante et vintage.", mood: "zellige-bleu" },
    { title: "Vasque rétro", note: "Céramique et détails chaleureux.", mood: "ceramique" },
  ],
};

function MaterialsSection({ room }) {
  const items = materialsByRoom[room] || [];
  return (
    <div className="grid md:grid-cols-3 gap-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-2xl border border-black/5 overflow-hidden bg-white shadow-sm">
          <div className="h-40 bg-slate-100">
            {<div className="w-full h-full" style={moodStyle(item.mood || "creme")} />}
          </div>
          <div className="p-4">
            <div className="text-xs text-slate-500">{item.label}</div>
            <div className="font-medium mt-1">{item.value}</div>
            {item.link ? (
              <a href={item.link} target="_blank" rel="noreferrer" className="inline-block mt-3 text-sm font-medium text-slate-900 underline underline-offset-4">
                {item.cta || "Voir le produit"}
              </a>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [room, setRoom] = useState("salon");
  const [globalAccent, setGlobalAccent] = useState("butter");
  const [warmth, setWarmth] = useState([60]);
  const [roomNuances, setRoomNuances] = useState({
    bureau: { dominant: "moyen", secondary: "moyen", accent: "olive" },
    sdb: { dominant: "clair", secondary: "clair", accent: "bois" },
    salon: { dominant: "moyen", secondary: "moyen", accent: "bois" },
    cuisine: { dominant: "moyen", secondary: "moyen", accent: "butter" },
    entree: { dominant: "moyen", secondary: "moyen", accent: "butter" },
    parents: { dominant: "soutenu", secondary: "moyen", accent: "bois" },
    enfant: { dominant: "moyen", secondary: "clair", accent: "butter" },
    vinyle: { dominant: "moyen", secondary: "moyen", accent: "olive" },
    cellier: { dominant: "soutenu", secondary: "moyen", accent: "butter" },
  });

  const preset = roomPresets[room];
  const Icon = preset.icon;
  const activeNuance = roomNuances[room];
  const dominantHex = getShade(preset.dominant, activeNuance.dominant);
  const secondaryHex = getShade(preset.secondary, activeNuance.secondary);
  const accentHex = activeNuance.accent === "bois" ? baseColors.bois.hex : accents[activeNuance.accent]?.hex || accents[globalAccent].hex;

  const warmthText = useMemo(() => {
    const v = warmth[0];
    if (v < 40) return "Ambiance plus fraîche : davantage de bleu et de contraste clair.";
    if (v > 70) return "Ambiance plus chaude : le bois miel et le jaune beurre prennent plus de place.";
    return "Ambiance équilibrée : probablement la plus polyvalente pour l'appartement.";
  }, [warmth]);

  const updateRoomNuance = (key, value) => {
    setRoomNuances((prev) => ({ ...prev, [room]: { ...prev[room], [key]: value } }));
  };

  return (
    <div className="min-h-screen bg-[#f5f0f3] text-slate-800">
      <div className="max-w-7xl mx-auto p-6 md:p-10 space-y-8">
        <div className="grid xl:grid-cols-[1.05fr_0.95fr] gap-6">
          <Card className="rounded-[28px] border-black/5 shadow-sm">
            <CardHeader className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white grid place-items-center">
                  <Palette className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Palette interactive</div>
                  <CardTitle className="text-3xl">Base couleur appartement</CardTitle>
                </div>
              </div>
              <p className="text-slate-600">
                On garde le module couleur, le nuancier par pièce et la ligne directrice, avec vos inspirations et le plan.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-2xl border border-black/5 bg-white p-4">
                <div className="text-sm font-medium mb-2">Niveau de chaleur globale</div>
                <div className="text-sm text-slate-500 mb-3">
                  Plus frais = plus de bleu. Plus chaud = plus de bois miel et de jaune beurre.
                </div>
                <Slider value={warmth} onValueChange={setWarmth} max={100} step={1} />
                <div className="text-sm text-slate-600 mt-3">{warmthText}</div>
              </div>

              <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
                <Swatch title="Crème chaud" subtitle="Base" hex={baseColors.creme.hex} />
                <Swatch title="Bleu clair grisé" subtitle="Pilier" hex={baseColors.bleu.hex} />
                <Swatch title="Vert sauge" subtitle="Pilier" hex={baseColors.vert.hex} />
                <Swatch title="Bois miel" subtitle="Fil conducteur" hex={baseColors.bois.hex} />
              </div>

              <div className="rounded-2xl border border-black/5 bg-white p-4">
                <div className="text-sm font-medium mb-3">Accents possibles</div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                  {Object.entries(accents).map(([key, value]) => (
                    <button
                      key={key}
                      onClick={() => setGlobalAccent(key)}
                      className={`rounded-2xl border text-left overflow-hidden ${globalAccent === key ? "border-slate-900" : "border-black/10"}`}
                    >
                      <div className="h-10" style={{ backgroundColor: value.hex }} />
                      <div className="p-2 text-xs">
                        <div className="font-medium">{value.name}</div>
                        <div className="font-mono text-slate-500">{value.hex}</div>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="text-sm text-slate-500">Accent global actuel : <span className="font-medium text-slate-700">{accents[globalAccent].name}</span></div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[28px] border-black/5 shadow-sm">
            <CardHeader>
              <CardTitle className="text-2xl">Déclinaison par pièce</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs value={room} onValueChange={setRoom}>
                <TabsList className="flex flex-wrap h-auto rounded-2xl p-2 bg-[#f3edf0] gap-2 justify-start">
                  {Object.entries(roomPresets).map(([key, val]) => {
                    const TabIcon = val.icon;
                    return (
                      <TabsTrigger key={key} value={key} className="rounded-xl px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <span className="flex items-center gap-2">
                          <TabIcon className="w-4 h-4" />
                          {val.label}
                        </span>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </Tabs>

              <div className="rounded-2xl border border-black/5 bg-white p-4">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-10 h-10 rounded-2xl bg-slate-100 grid place-items-center"><Icon className="w-5 h-5" /></div>
                  <div>
                    <div className="font-semibold">{preset.label}</div>
                    <div className="text-sm text-slate-500">Ligne directrice</div>
                  </div>
                </div>
                <div className="text-sm text-slate-700 mt-2">{preset.line}</div>
              </div>

              <div className="grid md:grid-cols-3 gap-3">
                <div className="rounded-2xl border border-black/5 bg-white p-4">
                  <div className="text-sm font-medium mb-2">Nuance dominante</div>
                  <Select value={activeNuance.dominant} onValueChange={(v) => updateRoomNuance("dominant", v)}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="clair">Clair</SelectItem>
                      <SelectItem value="moyen">Moyen</SelectItem>
                      <SelectItem value="soutenu">Soutenu</SelectItem>
                      <SelectItem value="fonce">Foncé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="rounded-2xl border border-black/5 bg-white p-4">
                  <div className="text-sm font-medium mb-2">Nuance secondaire</div>
                  <Select value={activeNuance.secondary} onValueChange={(v) => updateRoomNuance("secondary", v)}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="clair">Clair</SelectItem>
                      <SelectItem value="moyen">Moyen</SelectItem>
                      <SelectItem value="soutenu">Soutenu</SelectItem>
                      <SelectItem value="fonce">Foncé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="rounded-2xl border border-black/5 bg-white p-4">
                  <div className="text-sm font-medium mb-2">Accent de la pièce</div>
                  <Select value={activeNuance.accent} onValueChange={(v) => updateRoomNuance("accent", v)}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bois">Bois miel</SelectItem>
                      {Object.entries(accents).map(([key, value]) => (
                        <SelectItem key={key} value={key}>{value.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-3">
                <Swatch title={baseColors[preset.dominant].name} subtitle="Dominante de la pièce" hex={dominantHex} />
                <Swatch title={baseColors[preset.secondary].name} subtitle="Secondaire" hex={secondaryHex} />
                <Swatch title={activeNuance.accent === "bois" ? "Bois miel" : accents[activeNuance.accent].name} subtitle="Accent" hex={accentHex} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid xl:grid-cols-1 gap-6">
          <Card className="rounded-[28px] border-black/5 shadow-sm">
            <CardHeader>
              <CardTitle className="text-2xl">Plan & inspirations</CardTitle>
              <div className="text-sm text-slate-500">Dans l’onglet actif</div>
            </CardHeader>
            <CardContent className="grid lg:grid-cols-2 gap-6">
              <PlanPreview activeRoom={room} />
              <div>
                <div className="text-sm font-medium mb-2">Cartes d’ambiance</div>
                <ImageSlider cards={roomInspirationCards[room] || []} />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[28px] border-black/5 shadow-sm">
            <CardHeader>
              <CardTitle className="text-2xl">Matériaux de la pièce</CardTitle>
              <div className="text-sm text-slate-500">Sol, surfaces et éléments clés</div>
            </CardHeader>
            <CardContent>
              <MaterialsSection room={room} />
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-[28px] border-black/5 shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl">Aperçu simplifié</CardTitle>
            <div className="text-sm text-slate-500">Visualisation abstraite de la répartition couleur pour garder un cap cohérent.</div>
          </CardHeader>
          <CardContent>
            <div className="grid xl:grid-cols-[1.15fr_0.85fr] gap-6 items-start">
              <div className="rounded-[28px] overflow-hidden border border-black/5 bg-white">
                <div className="p-4 border-b bg-white flex items-center justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Aperçu simplifié</div>
                    <div className="text-2xl font-semibold">{preset.label}</div>
                  </div>
                  <Badge variant="secondary" className="rounded-full">55% / 30% / 15%</Badge>
                </div>
                <div className="p-4">
                  <div className="rounded-[24px] overflow-hidden border border-black/5">
                    <div className="h-8" style={{ backgroundColor: baseColors.creme.hex }} />
                    <div className="grid grid-cols-[1.2fr_0.9fr] min-h-[350px]">
                      <div className="relative" style={{ backgroundColor: secondaryHex }}>
                        <div className="absolute inset-x-0 top-0 h-[58%]" style={{ backgroundColor: baseColors.creme.hex }} />
                        <div className="absolute inset-x-0 bottom-0 h-[42%]" style={{ backgroundColor: "#d9c7ad" }} />
                        <div className="absolute left-[6%] bottom-[8%] w-[22%] h-[46%] rounded-[26px]" style={{ backgroundColor: dominantHex }} />
                        <div className="absolute left-[30%] bottom-[8%] w-[14%] h-[30%] rounded-[22px]" style={{ backgroundColor: baseColors.creme.hex }} />
                        <div className="absolute left-[46%] bottom-[8%] w-[8%] h-[22%] rounded-[20px]" style={{ backgroundColor: accentHex }} />
                      </div>
                      <div className="relative p-6" style={{ backgroundColor: dominantHex, color: textColor(dominantHex) }}>
                        <div className="grid grid-cols-3 gap-3 mb-4">
                          {Array.from({ length: 9 }).map((_, i) => (
                            <div key={i} className="aspect-square rounded-lg" style={{ backgroundColor: i % 3 === 0 ? accentHex : i % 2 === 0 ? baseColors.creme.hex : secondaryHex }} />
                          ))}
                        </div>
                        <div className="rounded-[24px] p-4 shadow-sm" style={{ backgroundColor: baseColors.creme.hex, color: "#27313c" }}>
                          <div className="text-sm opacity-70">Menuiserie / banquette / bibliothèque</div>
                          <div className="text-2xl font-semibold mt-2">Couleur dominante de la pièce</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <Card className="rounded-[24px] border-black/5 shadow-none">
                  <CardHeader><CardTitle className="text-xl">Nuancier recommandé</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <Swatch title={baseColors[preset.dominant].name} subtitle="Dominante" hex={dominantHex} />
                    <Swatch title={baseColors[preset.secondary].name} subtitle="Secondaire" hex={secondaryHex} />
                    <Swatch title={activeNuance.accent === "bois" ? "Bois miel" : accents[activeNuance.accent].name} subtitle="Accent" hex={accentHex} />
                  </CardContent>
                </Card>

                <Card className="rounded-[24px] border-black/5 shadow-none">
                  <CardHeader><CardTitle className="text-xl">Lignes directrices</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {preset.notes.map((note) => (
                      <div key={note} className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">{note}</div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
