/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from "react";
import { TAIWAN_DIVISIONS } from "./data/taiwanData";
import { 
  Search, 
  Sparkles, 
  MapPin, 
  Layers, 
  Wind, 
  Eye, 
  Download, 
  Droplets, 
  RotateCcw, 
  Palette, 
  Check, 
  ArrowRight, 
  Info, 
  BookOpen, 
  FileText, 
  Hand,
  Volume2,
  Heart,
  HelpCircle,
  TrendingUp,
  Sliders,
  ChevronRight
} from "lucide-react";

interface CropData {
  name: string;
  scientificName: string;
  introduction: string;
  suitability: string;
  process: string[];
  sensory: {
    visual: string;
    smell: string;
    taste: string;
    touch: string;
  };
  visualStyle: {
    backgroundColor: string;
    fiberColor: string;
    fiberDensity: number;
    fiberLength: string;
    textureType: string;
    flakyElements: string;
  };
}

// Famous Preset Papers for Quick Access
const PRESETS = [
  { county: "雲林縣", district: "虎尾鎮", label: "虎尾甘蔗渣紙", crop: "甘蔗渣", icon: "🎋" },
  { county: "南投縣", district: "埔里鎮", label: "埔里茭白筍殼紙", crop: "茭白筍殼", icon: "🌾" },
  { county: "台南市", district: "關廟區", label: "關廟鳳梨葉紙", crop: "鳳梨葉", icon: "🍍" },
  { county: "屏東縣", district: "恆春鎮", label: "恆春瓊麻紙", crop: "瓊麻", icon: "🌵" },
  { county: "高雄市", district: "美濃區", label: "美濃野蓮綠紙", crop: "野蓮 (水蓮)", icon: "🌿" },
  { county: "嘉義縣", district: "阿里山鄉", label: "阿里山檜木茶紙", crop: "檜木與茶梗", icon: "🌲" },
];

export default function App() {
  // 1. County and District Selection State
  const [selectedCounty, setSelectedCounty] = useState<string>("南投縣");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("埔里鎮");

  // Filter districts based on selected county
  const availableDistricts = useMemo(() => {
    const found = TAIWAN_DIVISIONS.find((c) => c.name === selectedCounty);
    return found ? found.districts : [];
  }, [selectedCounty]);

  // Sync district when county changes
  useEffect(() => {
    if (availableDistricts.length > 0) {
      if (!availableDistricts.includes(selectedDistrict)) {
        setSelectedDistrict(availableDistricts[0]);
      }
    }
  }, [selectedCounty, availableDistricts]);

  // 2. Main Data State
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [cropResult, setCropResult] = useState<CropData | null>(null);
  const [apiSource, setApiSource] = useState<string>("local_presets");

  // 3. Workshop Customization States
  const [paperWeight, setPaperWeight] = useState<number>(120); // GSM
  const [fiberDensity, setFiberDensity] = useState<number>(20); // Percent
  const [fiberThickness, setFiberThickness] = useState<number>(1.5); // px
  const [hasDeckleEdge, setHasDeckleEdge] = useState<boolean>(true);
  const [pulpColor, setPulpColor] = useState<string>(""); // Override default
  const [customCalligraphy, setCustomCalligraphy] = useState<string>("歲月溫存 手作印記");
  const [fontStyle, setFontStyle] = useState<string>("cursive"); // serif, cursive, mono, sans
  const [fiberSeed, setFiberSeed] = useState<number>(42); // Seed to regenerate random fibers
  const [isStirring, setIsStirring] = useState<boolean>(false); // Animation trigger for pulp stirring
  const [pulpBeatingStage, setPulpBeatingStage] = useState<number>(0); // 0: raw, 1: beating, 2: ready
  const [activeStepTab, setActiveStepTab] = useState<number>(0); // Active craft guide step

  // Extra details toggle
  const [activeSensoryTab, setActiveSensoryTab] = useState<string>("all");

    // Format the paper name to: 可用造紙纖維原料紙
  const formatPaperName = (name: string) => {
    if (!name) return "";
    let clean = name;
    
    // Remove county and district names from the start of the name to extract pure raw material
    const countyClean = selectedCounty.replace(/[縣市]/g, "");
    const districtClean = selectedDistrict.replace(/[鄉鎮市區]/g, "");
    
    const prefixesToRemove = [
      selectedCounty,
      countyClean,
      selectedDistrict,
      districtClean,
      "八斗子", // Specific scenic prefix for Keelung Badouzi
      "貓空",   // Specific scenic prefix for Taipei Maokong
    ];

    // Sort by length descending
    prefixesToRemove.sort((a, b) => b.length - a.length);

    for (const prefix of prefixesToRemove) {
      if (prefix && clean.startsWith(prefix)) {
        // Exception for famous crops starting with district names, e.g. 三星蔥
        if (prefix === "三星" && clean.startsWith("三星蔥")) {
          continue;
        }
        if (prefix === "大甲" && clean.startsWith("大甲藺")) {
          continue;
        }
        clean = clean.substring(prefix.length);
      }
    }

    // Remove any trailing variations of "紙" or "手抄紙" or "手工紙"
    clean = clean.replace(/(手抄紙|手工紙|特製紙|手作紙|綠紙|紙張|紙)$/, "");

    // Clean any leading/trailing symbols or punctuation or whitespace
    clean = clean.trim().replace(/^[\s、，,&\/與\\+＋]+|[\s、，,&\/與\\+＋]+$/g, "").trim();

    // If empty after cleaning, use the original without "紙" at the end
    if (!clean) {
      clean = name.replace(/(手抄紙|手工紙|特製紙|手作紙|綠紙|紙張|紙)$/, "");
    }

    return `${clean}紙`;
  };

  // Fetch Paper Information from Backend
  const handleExplore = async (county: string = selectedCounty, district: string = selectedDistrict) => {
    setLoading(true);
    setError(null);
    setPulpBeatingStage(1); // Set to beating pulp animation

    try {
      const response = await fetch("/api/analyze-paper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ county, district }),
      });

      if (!response.ok) {
        throw new Error("伺服器分析失敗，請稍後再試。");
      }

      const data = await response.json();
      if (data.crops && data.crops.length > 0) {
        const crop = data.crops[0];
        setCropResult(crop);
        setApiSource(data.source || "gemini");
        
        // Sync customization parameters from natural properties
        setPulpColor(crop.visualStyle?.backgroundColor || "#f5f0e6");
        setFiberDensity(Math.round((crop.visualStyle?.fiberDensity || 0.15) * 100));
        setFiberSeed(Math.floor(Math.random() * 1000));
        setPulpBeatingStage(2); // Pulp ready
      } else {
        throw new Error("無法辨識此地區的造紙物產。");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "發生未知錯誤。");
      setPulpBeatingStage(0);
    } finally {
      setLoading(false);
    }
  };

  // Run initial explore on load to display South Nantou Puli as beautiful initial screen
  useEffect(() => {
    handleExplore("南投縣", "埔里鎮");
  }, []);

  // Quick preset click handler
  const handlePresetClick = (preset: typeof PRESETS[0]) => {
    setSelectedCounty(preset.county);
    setSelectedDistrict(preset.district);
    handleExplore(preset.county, preset.district);
  };

  // Re-scoop the pulp (regenerate fibers layout)
  const handleRescoop = () => {
    setIsStirring(true);
    setFiberSeed(Math.floor(Math.random() * 1000));
    setTimeout(() => {
      setIsStirring(false);
    }, 800);
  };

  // Render randomized fibers on SVG based on seed
  const renderedFibers = useMemo(() => {
    if (!cropResult) return [];
    
    // Create deterministic random sequence based on seed
    const pseudoRandom = (index: number) => {
      const x = Math.sin(fiberSeed + index) * 10000;
      return x - Math.floor(x);
    };

    const count = Math.max(10, Math.floor((fiberDensity / 100) * 120));
    const fibers = [];

    // Base properties from plant characteristics
    const lenType = cropResult.visualStyle?.fiberLength || "中等長度";
    let baseLength = 40;
    if (lenType.includes("長") || lenType.includes("粗")) baseLength = 70;
    if (lenType.includes("細") || lenType.includes("碎")) baseLength = 20;

    for (let i = 0; i < count; i++) {
      const startX = pseudoRandom(i * 3) * 100; // percent width
      const startY = pseudoRandom(i * 3 + 1) * 100; // percent height
      const length = baseLength * (0.4 + pseudoRandom(i * 7) * 0.8);
      const angle = pseudoRandom(i * 11) * Math.PI * 2;
      
      // Control points for organic curves
      const cpX1 = startX + Math.cos(angle) * (length / 3) + (pseudoRandom(i * 4) - 0.5) * 20;
      const cpY1 = startY + Math.sin(angle) * (length / 3) + (pseudoRandom(i * 5) - 0.5) * 20;
      const cpX2 = startX + Math.cos(angle) * (2 * length / 3) + (pseudoRandom(i * 6) - 0.5) * 20;
      const cpY2 = startY + Math.sin(angle) * (2 * length / 3) + (pseudoRandom(i * 7) - 0.5) * 20;
      const endX = startX + Math.cos(angle) * length;
      const endY = startY + Math.sin(angle) * length;

      // Wrap-around bounds or clip
      fibers.push({
        startX, startY, cpX1, cpY1, cpX2, cpY2, endX, endY,
        d: `M ${startX} ${startY} C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${endX} ${endY}`,
        opacity: 0.15 + pseudoRandom(i * 13) * 0.4,
        id: `fiber-${i}`
      });
    }
    return fibers;
  }, [cropResult, fiberDensity, fiberSeed]);

  // Handle high-resolution paper image download
  const handleDownloadImage = () => {
    // Create canvas
    const canvas = document.createElement("canvas");
    canvas.width = 760;
    canvas.height = 960;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    // 1. Draw paper shape / clip
    if (hasDeckleEdge) {
      ctx.beginPath();
      ctx.moveTo(8, 8);
      // Top edge
      for (let x = 8; x <= canvas.width - 8; x += 12) {
        const yOffset = Math.sin(x * 0.05) * 4 + Math.cos(x * 0.12) * 2.5 + (Math.random() - 0.5) * 2;
        ctx.lineTo(x, 8 + yOffset);
      }
      // Right edge
      for (let y = 8; y <= canvas.height - 8; y += 12) {
        const xOffset = Math.sin(y * 0.05) * 4 + Math.cos(y * 0.12) * 2.5 + (Math.random() - 0.5) * 2;
        ctx.lineTo(canvas.width - 8 + xOffset, y);
      }
      // Bottom edge
      for (let x = canvas.width - 8; x >= 8; x -= 12) {
        const yOffset = Math.sin(x * 0.05) * 4 + Math.cos(x * 0.12) * 2.5 + (Math.random() - 0.5) * 2;
        ctx.lineTo(x, canvas.height - 8 + yOffset);
      }
      // Left edge
      for (let y = canvas.height - 8; y >= 8; y -= 12) {
        const xOffset = Math.sin(y * 0.05) * 4 + Math.cos(y * 0.12) * 2.5 + (Math.random() - 0.5) * 2;
        ctx.lineTo(8 + xOffset, y);
      }
      ctx.closePath();
      ctx.clip();
    } else {
      ctx.beginPath();
      const radius = 32;
      ctx.moveTo(radius, 0);
      ctx.lineTo(canvas.width - radius, 0);
      ctx.quadraticCurveTo(canvas.width, 0, canvas.width, radius);
      ctx.lineTo(canvas.width, canvas.height - radius);
      ctx.quadraticCurveTo(canvas.width, canvas.height, canvas.width - radius, canvas.height);
      ctx.lineTo(radius, canvas.height);
      ctx.quadraticCurveTo(0, canvas.height, 0, canvas.height - radius);
      ctx.lineTo(0, radius);
      ctx.quadraticCurveTo(0, 0, radius, 0);
      ctx.closePath();
      ctx.clip();
    }

    // 2. Fill bamboo screen underlay (visible when paper is thin/translucent)
    ctx.fillStyle = "#c2b59b";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw vertical bamboo screen line pattern
    ctx.strokeStyle = "rgba(82, 64, 36, 0.14)";
    ctx.lineWidth = 1.5;
    for (let x = 0; x < canvas.width; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    // Draw horizontal binding thread pattern
    ctx.strokeStyle = "rgba(82, 64, 36, 0.07)";
    ctx.lineWidth = 1.5;
    for (let y = 0; y < canvas.height; y += 96) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Now fill paper pulp color on top with weight-based opacity
    const paperOpacityVal = 0.45 + ((paperWeight - 30) / 220) * 0.55;
    ctx.save();
    ctx.globalAlpha = paperOpacityVal;
    ctx.fillStyle = pulpColor || cropResult?.visualStyle?.backgroundColor || "#f5f0e6";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    // 3. Draw paper grid/linen texture
    ctx.save();
    // Texture is more pronounced on heavier paper
    ctx.globalAlpha = 0.04 + ((paperWeight - 30) / 220) * 0.12;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
    ctx.lineWidth = 1;
    for (let y = 0; y < canvas.height; y += 16) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
    for (let x = 0; x < canvas.width; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    ctx.restore();

    // Vignette / shading gradient
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "rgba(255, 255, 255, 0.08)");
    gradient.addColorStop(0.5, "rgba(0, 0, 0, 0)");
    gradient.addColorStop(1, "rgba(60, 42, 16, 0.05)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 4. Draw fibers
    renderedFibers.forEach((fib) => {
      ctx.save();
      ctx.strokeStyle = cropResult?.visualStyle?.fiberColor || "#cfc5b0";
      ctx.lineWidth = fiberThickness * 2;
      ctx.lineCap = "round";
      // Fibers are visually sharper/more visible on thin paper and more buried/subtle on thick paper
      const fiberWeightAlpha = fib.opacity * (1.3 - (paperWeight / 250) * 0.5);
      ctx.globalAlpha = Math.min(1, Math.max(0, fiberWeightAlpha));
      
      ctx.beginPath();
      ctx.moveTo(fib.startX * 2, fib.startY * 2);
      ctx.bezierCurveTo(
        fib.cpX1 * 2, fib.cpY1 * 2,
        fib.cpX2 * 2, fib.cpY2 * 2,
        fib.endX * 2, fib.endY * 2
      );
      ctx.stroke();
      ctx.restore();
    });

    // 5. Draw flakes
    renderedFlakes.forEach((flk) => {
      ctx.save();
      ctx.fillStyle = cropResult?.visualStyle?.fiberColor || "#bc9f71";
      // Flakes are also more sharp on thin paper and more buried/subtle on thick paper
      const flakeWeightAlpha = flk.opacity * (1.2 - (paperWeight / 250) * 0.4);
      ctx.globalAlpha = Math.min(1, Math.max(0, flakeWeightAlpha));
      
      const xPixel = (flk.cx / 100) * canvas.width;
      const yPixel = (flk.cy / 100) * canvas.height;
      const rPixel = flk.r * 2;

      ctx.beginPath();
      ctx.arc(xPixel, yPixel, rPixel, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // 6. Draw watermarks (Top-Left)
    ctx.save();
    ctx.strokeStyle = "rgba(120, 53, 4, 0.3)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(48, 48);
    ctx.lineTo(48, 104);
    ctx.stroke();

    ctx.fillStyle = "rgba(120, 53, 4, 0.45)";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.font = "bold 900 20px system-ui, -apple-system, sans-serif";
    ctx.fillText("TAIWANESE ARTISANAL", 64, 48);

    ctx.fillStyle = "rgba(69, 26, 3, 0.45)";
    ctx.font = "600 22px system-ui, -apple-system, sans-serif";
    ctx.fillText(`${selectedCounty}${selectedDistrict}`, 64, 76);
    ctx.restore();

    // 7. Draw watermarks (Bottom-Right)
    ctx.save();
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    
    ctx.fillStyle = "rgba(120, 53, 4, 0.35)";
    ctx.font = "bold 20px system-ui, -apple-system, sans-serif";
    ctx.fillText(`ORIGIN: ${cropResult?.name || ''}`, canvas.width - 48, canvas.height - 76);

    ctx.fillStyle = "rgba(69, 26, 3, 0.35)";
    ctx.font = "italic 20px Georgia, serif";
    ctx.fillText(cropResult?.scientificName || '', canvas.width - 48, canvas.height - 48);
    ctx.restore();

    // 8. Draw center labels
    ctx.save();
    ctx.textAlign = "center";
    
    ctx.fillStyle = "rgba(120, 53, 4, 0.6)";
    ctx.font = "bold 24px Georgia, serif";
    ctx.fillText("── 故鄉手抄特製 ──", canvas.width / 2, 180);

    ctx.strokeStyle = "rgba(120, 53, 4, 0.2)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(180, 215);
    ctx.lineTo(580, 215);
    ctx.moveTo(180, 305);
    ctx.lineTo(580, 305);
    ctx.stroke();

    ctx.fillStyle = "#23201a";
    ctx.font = "900 52px Georgia, serif";
    ctx.fillText(formatPaperName(cropResult?.name || ''), canvas.width / 2, 275);

    ctx.fillStyle = "rgba(120, 53, 4, 0.7)";
    ctx.font = "italic 24px Georgia, serif";
    ctx.fillText(cropResult?.scientificName || '', canvas.width / 2, 340);
    ctx.restore();

    // 9. Draw calligraphy
    if (customCalligraphy) {
      let fontSize = 36;
      let fontFam = "Georgia, serif";
      let isItalic = false;
      let isBold = true;
      
      if (fontStyle === "cursive") {
        fontFam = "Georgia, serif";
        isItalic = true;
      } else if (fontStyle === "serif") {
        fontFam = "Georgia, serif";
        isBold = true;
      } else if (fontStyle === "mono") {
        fontFam = "'Courier New', monospace";
        isBold = true;
        fontSize = 32;
      } else {
        fontFam = "system-ui, -apple-system, sans-serif";
        isBold = true;
        fontSize = 32;
      }
      
      ctx.save();
      ctx.font = `${isItalic ? "italic " : ""}${isBold ? "bold " : ""}${fontSize}px ${fontFam}`;
      ctx.fillStyle = "rgba(69, 26, 3, 0.95)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      
      const lines = customCalligraphy.split("\n");
      let currentY = 540 - ((lines.length - 1) * 25);
      for (const line of lines) {
        ctx.fillText(line, canvas.width / 2, currentY);
        currentY += 50;
      }
      ctx.restore();
    }

    ctx.restore();

    // 10. Trigger Download
    const link = document.createElement("a");
    const filename = `${selectedCounty}${selectedDistrict}_${formatPaperName(cropResult?.name || '').replace(/[「」]/g, "")}.png`;
    link.download = filename;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  // Render flaky plant particles (e.g. green onion leaves, wood flakes, grape skin dots)
  const renderedFlakes = useMemo(() => {
    if (!cropResult) return [];
    
    const pseudoRandom = (index: number) => {
      const x = Math.sin(fiberSeed + index * 1.5) * 10000;
      return x - Math.floor(x);
    };

    const count = Math.max(5, Math.floor((fiberDensity / 100) * 45));
    const flakes = [];

    for (let i = 0; i < count; i++) {
      const cx = pseudoRandom(i * 4) * 100;
      const cy = pseudoRandom(i * 4 + 1) * 100;
      const r = 1 + pseudoRandom(i * 4 + 2) * 5; // radius/size
      const rot = pseudoRandom(i * 4 + 3) * 360; // rotation
      
      flakes.push({
        cx, cy, r, rot,
        opacity: 0.2 + pseudoRandom(i * 9) * 0.55,
        id: `flake-${i}`
      });
    }
    return flakes;
  }, [cropResult, fiberDensity, fiberSeed]);

  // Colors mapping for natural dyes
  const colorPresets = [
    { name: "原色素宣 (米白)", color: "#fbf9f4", fiberColor: "#ded2bd", desc: "原始無漂白之質樸本色" },
    { name: "古法茶染 (琥珀)", color: "#ebdcb9", fiberColor: "#bc9f71", desc: "天然茶單寧浸潤染色" },
    { name: "竹青翠綠 (淡綠)", color: "#e6ede2", fiberColor: "#8fa382", desc: "嫩竹與水蓮青綠嫩色" },
    { name: "落葉秋褐 (紅褐)", color: "#ebdcd0", fiberColor: "#9c7772", desc: "葡萄藤皮與秋日橡木色" },
    { name: "恆春麻灰 (卡其)", color: "#ebdcc4", fiberColor: "#9c7c59", desc: "瓊麻與野生構樹皮厚色" },
    { name: "胭脂粉黛 (緋色)", color: "#f7ebd3", fiberColor: "#e6a195", desc: "天然花瓣與果實微粉" }
  ];

  return (
    <div className="min-h-screen bg-[#f3f0e8] text-[#2c2a27] font-sans antialiased transition-all duration-300">
      {/* Upper Subtle Border Decor */}
      <div className="h-2 bg-amber-800 w-full"></div>

      {/* Hero Header Area */}
      <header className="max-w-7xl mx-auto px-4 pt-12 pb-8 text-center md:text-left relative">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 border-b border-[#dfdacd] pb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-900 rounded-full text-xs font-semibold tracking-wider uppercase mb-3 border border-amber-200 shadow-sm">
              <Sparkles className="w-3.5 h-3.5" />
              <span>手作紙。風土美學圖鑑</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-serif font-extrabold text-[#1a1917] tracking-tight leading-tight">
              台灣手作紙物產圖鑑
            </h1>
            <p className="mt-2 text-md text-[#666056] max-w-2xl font-serif italic">
              「尋找故鄉的植物纖維，凝聚風土印記，塑一紙歲月溫存。」
              <br />
              輸入台灣各縣市與鄉鎮，發掘能製作成手工紙的植物與農產廢棄物。
            </p>
          </div>

          {/* Quick Stats / Info badge */}
          <div className="flex flex-wrap justify-center md:justify-end gap-3">
            <div className="bg-[#e8e2d4] px-4 py-3 rounded-xl border border-[#d5cebf] shadow-sm flex items-center gap-3">
              <span className="text-2xl">🌱</span>
              <div className="text-left">
                <p className="text-xs text-[#7c7569]">生態工藝</p>
                <p className="text-sm font-bold">100% 農業廢棄物轉化</p>
              </div>
            </div>
            <div className="bg-[#e8e2d4] px-4 py-3 rounded-xl border border-[#d5cebf] shadow-sm flex items-center gap-3">
              <span className="text-2xl">🏮</span>
              <div className="text-left">
                <p className="text-xs text-[#7c7569]">紙文化傳承</p>
                <p className="text-sm font-bold">造紙職人協作</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 pb-20">
        
        {/* Preset Towns Horizontal Bar */}
        <div className="mb-10">
          <h2 className="text-sm font-bold text-[#7c7569] uppercase tracking-wider mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-700" />
            <span>台灣經典手工紙物產預設（點擊快速探訪）</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {PRESETS.map((preset, idx) => {
              const isActive = selectedCounty === preset.county && selectedDistrict === preset.district;
              return (
                <button
                  key={idx}
                  onClick={() => handlePresetClick(preset)}
                  id={`preset-${idx}`}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left group ${
                    isActive 
                    ? "bg-amber-900 border-amber-950 text-amber-50 shadow-md transform scale-[1.02]" 
                    : "bg-[#e8e3d5] border-[#d8d1c2] hover:bg-[#ded7c7] text-[#3c3831] hover:border-[#c8bfae] shadow-sm"
                  }`}
                >
                  <span className="text-2xl bg-white/10 p-1.5 rounded-lg group-hover:scale-110 transition-transform">
                    {preset.icon}
                  </span>
                  <div>
                    <p className={`text-xs ${isActive ? "text-amber-200" : "text-[#7c7569]"}`}>
                      {preset.county} {preset.district}
                    </p>
                    <p className="text-sm font-bold font-serif leading-tight">{preset.crop}紙</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Workspace Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Control Panel & Workshop Settings (5 cols) */}
          <section className="lg:col-span-5 space-y-6">
            
            {/* Form Card */}
            <div className="bg-[#ede7da] rounded-2xl p-6 border border-[#dfdacd] shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full -mr-6 -mt-6"></div>
              
              <h3 className="text-lg font-serif font-bold text-[#1a1917] mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-amber-800" />
                <span>故鄉風土探索</span>
              </h3>

              <div className="space-y-4">
                <div>
                  <label htmlFor="county-select" className="block text-xs font-bold text-[#5c564c] mb-1">
                    選擇縣市 (County / City)
                  </label>
                  <select
                    id="county-select"
                    value={selectedCounty}
                    onChange={(e) => setSelectedCounty(e.target.value)}
                    className="w-full bg-[#f6f2e9] border border-[#dcd6c7] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-800 focus:border-amber-800 transition-all font-medium text-[#2c2a27]"
                  >
                    {TAIWAN_DIVISIONS.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="district-select" className="block text-xs font-bold text-[#5c564c] mb-1">
                    選擇鄉鎮市區 (Township / District)
                  </label>
                  <select
                    id="district-select"
                    value={selectedDistrict}
                    onChange={(e) => setSelectedDistrict(e.target.value)}
                    className="w-full bg-[#f6f2e9] border border-[#dcd6c7] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-800 focus:border-amber-800 transition-all font-medium text-[#2c2a27]"
                  >
                    {availableDistricts.map((d, idx) => (
                      <option key={`${d}-${idx}`} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => handleExplore()}
                  id="explore-btn"
                  disabled={loading}
                  className="w-full mt-2 bg-amber-900 hover:bg-amber-950 text-amber-50 font-bold py-3.5 px-6 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 hover:shadow-lg active:scale-95 disabled:opacity-75 disabled:cursor-wait"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-amber-100 border-t-transparent rounded-full animate-spin"></div>
                      <span>正在提煉在地物產纖維...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      <span>開始探尋在地纖維</span>
                    </>
                  )}
                </button>
              </div>

              {/* Status Banner */}
              {cropResult && (
                <div className="mt-4 pt-3 border-t border-[#dfdacd] flex items-center justify-between text-xs text-[#7c7569]">
                  <span className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-700" />
                    <span>成功調用：</span>
                    <strong className="text-[#3c3831] font-semibold">
                      {apiSource === "gemini" ? "Gemini AI 智能大腦" : "在地職人知識庫"}
                    </strong>
                  </span>
                  <span>100% 匹配</span>
                </div>
              )}
            </div>

            {/* Paper customizer Workshop Settings */}
            {cropResult && (
              <div className="bg-[#ede7da] rounded-2xl p-6 border border-[#dfdacd] shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-[#dfdacd] pb-3">
                  <h3 className="text-lg font-serif font-bold text-[#1a1917] flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-amber-800" />
                    <span>手抄紙工坊 (自訂屬性)</span>
                  </h3>
                  <button
                    onClick={() => {
                      setPaperWeight(120);
                      setFiberDensity(Math.round((cropResult?.visualStyle?.fiberDensity || 0.15) * 100));
                      setFiberThickness(1.5);
                      setHasDeckleEdge(true);
                      setPulpColor(cropResult?.visualStyle?.backgroundColor || "#f5f0e6");
                      setCustomCalligraphy("歲月溫存 手作印記");
                    }}
                    title="重設參數"
                    className="text-xs text-amber-800 hover:text-amber-950 font-medium flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>重設</span>
                  </button>
                </div>

                {/* Color Tint Chooser */}
                <div>
                  <label className="block text-xs font-bold text-[#5c564c] mb-2 flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-amber-800" />
                    <span>紙漿天然染色 (Plant-based Tint)</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {colorPresets.map((preset, index) => (
                      <button
                        key={index}
                        onClick={() => setPulpColor(preset.color)}
                        className={`p-2 rounded-xl border text-left transition-all ${
                          pulpColor.toLowerCase() === preset.color.toLowerCase()
                            ? "bg-[#faf8f5] border-amber-800 ring-2 ring-amber-800/10"
                            : "bg-[#f6f2e9] border-[#dcd6c7] hover:bg-[#eeeae0]"
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-4.5 h-4.5 rounded-full border border-black/10 shrink-0 shadow-inner"
                            style={{ backgroundColor: preset.color }}
                          ></span>
                          <span className="text-xs font-bold truncate text-[#2c2a27]">
                            {preset.name.split(" ")[0]}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Slider: Density */}
                <div>
                  <div className="flex justify-between text-xs font-bold text-[#5c564c] mb-1">
                    <span>植物纖維密度 (Fiber Density)</span>
                    <span className="text-amber-800 font-serif">{fiberDensity}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    step="1"
                    value={fiberDensity}
                    onChange={(e) => setFiberDensity(parseInt(e.target.value))}
                    className="w-full accent-amber-900 bg-amber-200 h-2 rounded-lg cursor-pointer"
                  />
                  <p className="text-[10px] text-[#8c8577] mt-1">
                    纖維密度高會產生更粗獷的紋理；密度低則透光性與均勻度更佳。
                  </p>
                </div>

                {/* Slider: Thickness */}
                <div>
                  <div className="flex justify-between text-xs font-bold text-[#5c564c] mb-1">
                    <span>纖維絲度粗細 (Fiber Caliber)</span>
                    <span className="text-amber-800 font-serif">{fiberThickness} px</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="4"
                    step="0.5"
                    value={fiberThickness}
                    onChange={(e) => setFiberThickness(parseFloat(e.target.value))}
                    className="w-full accent-amber-900 bg-amber-200 h-2 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Slider: Weight */}
                <div>
                  <div className="flex justify-between text-xs font-bold text-[#5c564c] mb-1">
                    <span>紙張重量/厚度 (Paper Weight)</span>
                    <span className="text-amber-800 font-serif">{paperWeight} GSM</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="250"
                    step="10"
                    value={paperWeight}
                    onChange={(e) => setPaperWeight(parseInt(e.target.value))}
                    className="w-full accent-amber-900 bg-amber-200 h-2 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-[#8c8577] mt-1">
                    <span>30g 蟬翼薄宣 (半透明)</span>
                    <span>120g 中厚抄紙</span>
                    <span>250g 厚重紙板</span>
                  </div>
                  <p className="text-[10px] text-amber-800/80 mt-1">
                    💡 提示：調低厚度（如 30g - 60g）紙張會呈現優雅的半透明感，透出後方傳統抄紙「竹簾竹紋」；調高則厚實不透光，且紙張陰影更加立體。
                  </p>
                </div>

                {/* Toggles */}
                <div className="flex items-center justify-between bg-[#f5efe4] p-3 rounded-xl border border-[#dfdacd]">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-[#2c2a27]">保留手工毛邊 (Deckle Edge)</span>
                    <span className="text-[10px] text-[#8c8577]">紙簾抄出天然不規則的撕裂紙邊</span>
                  </div>
                  <button
                    onClick={() => setHasDeckleEdge(!hasDeckleEdge)}
                    className={`w-11 h-6 rounded-full transition-all relative ${
                      hasDeckleEdge ? "bg-amber-950" : "bg-amber-300"
                    }`}
                  >
                    <span
                      className={`absolute top-1 left-1 w-4 h-4 bg-[#fbfbf9] rounded-full transition-all transform ${
                        hasDeckleEdge ? "translate-x-5" : ""
                      }`}
                    ></span>
                  </button>
                </div>

                {/* Handwriting/Calligraphy Input */}
                <div className="space-y-2">
                  <label htmlFor="calligraphy-input" className="block text-xs font-bold text-[#5c564c]">
                    於手作紙提字印記 (Calligraphy Print)
                  </label>
                  <input
                    id="calligraphy-input"
                    type="text"
                    maxLength={24}
                    value={customCalligraphy}
                    onChange={(e) => setCustomCalligraphy(e.target.value)}
                    placeholder="輸入想印製的提字，如：春、福、茶..."
                    className="w-full px-3 py-2 text-xs bg-[#fdfdfc] border border-[#dcd6c7] rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-900 focus:border-amber-900"
                  />
                </div>

                {/* Font Style Options */}
                <div className="space-y-1.5">
                  <span className="block text-[11px] font-bold text-[#7c7569]">提字字體風雅</span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { key: "cursive", name: "流暢行書", style: "font-serif italic" },
                      { key: "serif", name: "古雅明體", style: "font-serif font-bold" },
                      { key: "mono", name: "現代工整", style: "font-mono" },
                      { key: "sans", name: "簡約現代", style: "font-sans font-bold" }
                    ].map((f) => (
                      <button
                        key={f.key}
                        type="button"
                        onClick={() => setFontStyle(f.key)}
                        className={`py-1.5 text-[11px] rounded-lg border transition-all active:scale-95 ${
                          fontStyle === f.key
                            ? "bg-amber-950 text-amber-50 border-amber-950"
                            : "bg-[#f6f2e9] border-[#dcd6c7] text-[#5c564c] hover:bg-[#eeeae0]"
                        }`}
                      >
                        <span className={f.style}>{f.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            )}

          </section>

          {/* Right Column: Interactive Paper Canvas & Sensory details (7 cols) */}
          <section className="lg:col-span-7 space-y-6">
            
            {/* Display Error if any */}
            {error && (
              <div className="bg-red-50 text-red-900 border border-red-200 rounded-2xl p-4 text-sm flex gap-2 items-start shadow-sm">
                <span className="text-lg">⚠️</span>
                <div>
                  <p className="font-bold">探索發生異常</p>
                  <p className="text-xs opacity-90">{error}</p>
                  <button 
                    onClick={() => handleExplore()}
                    className="mt-2 text-xs bg-red-100 hover:bg-red-200 text-red-900 font-semibold px-3 py-1.5 rounded-lg transition-all"
                  >
                    重試看看
                  </button>
                </div>
              </div>
            )}

            {cropResult ? (
              <div className="space-y-6">
                
                {/* Paper Simulator Sandbox */}
                <div className="bg-[#ede7da] rounded-2xl p-6 border border-[#dfdacd] shadow-sm flex flex-col items-center">
                  
                  {/* Action buttons on top of simulator */}
                  <div className="w-full flex items-center justify-between mb-4">
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-amber-900" />
                      <span className="text-xs font-bold text-[#5c564c]">
                        手工紙模擬印樣：
                        <strong className="text-amber-900 font-serif text-sm">
                          {formatPaperName(cropResult.name)}
                        </strong>
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={handleDownloadImage}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 active:scale-95 shadow-sm"
                      >
                        <Download className="w-3 h-3" />
                        <span>另存圖檔 (Save Image)</span>
                      </button>
                      <button
                        onClick={handleRescoop}
                        className="px-3 py-1.5 bg-amber-900 hover:bg-amber-950 text-amber-50 rounded-lg text-xs font-bold transition-all flex items-center gap-1 active:scale-95"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>重新抄紙 (Re-scoop)</span>
                      </button>
                    </div>
                  </div>

                  {/* 3D Hand-made Paper Canvas Container */}
                  <div className="w-full flex justify-center py-6 bg-[#ded7c8] rounded-xl border border-black/5 shadow-inner relative overflow-hidden">
                    
                    {/* Ripple/Swirl stir overlay if active */}
                    {isStirring && (
                      <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] z-20 flex items-center justify-center transition-all duration-300">
                        <div className="text-center">
                          <div className="w-12 h-12 border-4 border-amber-900 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                          <p className="text-xs font-serif font-bold text-amber-950 animate-pulse">
                            在水槽中撈取、搖晃纖維...
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Bamboo Screen Underlay (visible when paper is thin/translucent) */}
                    <div 
                      className={`absolute w-[320px] sm:w-[380px] h-[480px] pointer-events-none select-none transition-all duration-500 ${
                        hasDeckleEdge ? "rounded-none" : "rounded-lg"
                      }`}
                      style={{
                        backgroundImage: `
                          linear-gradient(90deg, rgba(82, 64, 36, 0.15) 1px, transparent 1px),
                          linear-gradient(0deg, rgba(82, 64, 36, 0.08) 1px, transparent 1px)
                        `,
                        backgroundSize: "8px 100%, 100% 48px",
                        backgroundColor: "#c2b59b",
                        boxShadow: "inset 0 0 20px rgba(0,0,0,0.12)"
                      }}
                    />

                    {/* The Paper Sheet Object */}
                    <div 
                      className={`relative w-[320px] sm:w-[380px] h-[480px] transition-all duration-500 overflow-hidden group ${
                        hasDeckleEdge ? "rounded-none" : "rounded-lg"
                      }`}
                      style={{
                        backgroundColor: pulpColor || cropResult.visualStyle?.backgroundColor || "#f5f0e6",
                        // Dynamic opacity based on paper thickness (GSM) - 30 GSM is highly translucent, 250 GSM is fully opaque
                        opacity: 0.45 + ((paperWeight - 30) / 220) * 0.55,
                        // Dynamic 3D depth shadow based on paper thickness (GSM)
                        boxShadow: paperWeight <= 60 
                          ? "0 6px 18px -4px rgba(40, 30, 15, 0.18), inset 0 0 20px rgba(0, 0, 0, 0.02)" 
                          : paperWeight <= 150 
                            ? "0 18px 40px -10px rgba(40, 30, 15, 0.28), inset 0 0 30px rgba(0, 0, 0, 0.03)" 
                            : "0 30px 65px -14px rgba(40, 30, 15, 0.42), 0 6px 18px -4px rgba(40, 30, 15, 0.22), inset 0 0 40px rgba(0, 0, 0, 0.04)"
                      }}
                    >
                      {/* Torn Edge (Deckle Edge) Vector overlay using SVGs if true */}
                      {hasDeckleEdge && (
                        <>
                          {/* Torn left border */}
                          <div className="absolute top-0 bottom-0 left-0 w-2 pointer-events-none select-none z-10 opacity-70">
                            <svg className="w-full h-full" viewBox="0 0 10 100" preserveAspectRatio="none">
                              <path d="M 10 0 Q 3 15, 6 25 Q 2 40, 8 50 Q 1 65, 7 75 Q 3 90, 10 100" fill="#ded7c8" stroke="none" />
                            </svg>
                          </div>
                          {/* Torn right border */}
                          <div className="absolute top-0 bottom-0 right-0 w-2 pointer-events-none select-none z-10 opacity-70">
                            <svg className="w-full h-full" viewBox="0 0 10 100" preserveAspectRatio="none">
                              <path d="M 0 0 Q 7 15, 4 25 Q 8 40, 2 50 Q 9 65, 3 75 Q 7 90, 0 100" fill="#ded7c8" stroke="none" />
                            </svg>
                          </div>
                          {/* Torn top border */}
                          <div className="absolute top-0 left-0 right-0 h-2 pointer-events-none select-none z-10 opacity-70">
                            <svg className="w-full h-full" viewBox="0 0 100 10" preserveAspectRatio="none">
                              <path d="M 0 10 Q 15 3, 25 6 Q 40 2, 50 8 Q 65 1, 75 7 Q 90 3, 100 10" fill="#ded7c8" stroke="none" />
                            </svg>
                          </div>
                          {/* Torn bottom border */}
                          <div className="absolute bottom-0 left-0 right-0 h-2 pointer-events-none select-none z-10 opacity-70">
                            <svg className="w-full h-full" viewBox="0 0 100 10" preserveAspectRatio="none">
                              <path d="M 0 0 Q 15 7, 25 4 Q 40 8, 50 2 Q 65 9, 75 3 Q 90 7, 100 0" fill="#ded7c8" stroke="none" />
                            </svg>
                          </div>
                        </>
                      )}

                      {/* Organic Paper Shading/Linen Pattern overlay */}
                      <div 
                        className="absolute inset-0 bg-[radial-gradient(#ffffff_15%,_transparent_16%)] [background-size:12px_12px] pointer-events-none"
                        style={{ opacity: 0.04 + ((paperWeight - 30) / 220) * 0.12 }}
                      ></div>
                      <div className="absolute inset-0 bg-gradient-to-tr from-[#3c2a10]/5 via-transparent to-white/10 pointer-events-none"></div>

                      {/* Dynamic Plant Fiber Vectors */}
                      <svg className="absolute inset-0 w-full h-full pointer-events-none select-none">
                        {renderedFibers.map((fib) => (
                          <path
                            key={fib.id}
                            d={fib.d}
                            fill="none"
                            stroke={cropResult.visualStyle?.fiberColor || "#cfc5b0"}
                            strokeWidth={fiberThickness}
                            strokeLinecap="round"
                            opacity={Math.min(1, Math.max(0, fib.opacity * (1.3 - (paperWeight / 250) * 0.5)))}
                          />
                        ))}
                      </svg>

                      {/* Dynamic Crop Debris & Flakes */}
                      <svg className="absolute inset-0 w-full h-full pointer-events-none select-none">
                        {renderedFlakes.map((flk) => (
                          <circle
                            key={flk.id}
                            cx={`${flk.cx}%`}
                            cy={`${flk.cy}%`}
                            r={flk.r}
                            fill={cropResult.visualStyle?.fiberColor || "#bc9f71"}
                            opacity={Math.min(1, Math.max(0, flk.opacity * (1.2 - (paperWeight / 250) * 0.4)))}
                            transform={`rotate(${flk.rot} ${flk.cx} ${flk.cy})`}
                          />
                        ))}
                      </svg>

                      {/* Vertical Watermark Title on Paper */}
                      <div className="absolute top-6 left-6 select-none opacity-40 mix-blend-multiply font-serif text-left border-l-2 border-amber-900/40 pl-2">
                        <p className="text-[10px] font-bold tracking-widest text-amber-900">TAIWANESE ARTISANAL</p>
                        <p className="text-[11px] font-semibold text-amber-950 uppercase">{selectedCounty}{selectedDistrict}</p>
                      </div>

                      {/* Plant Botanical Watermark Badge */}
                      <div className="absolute bottom-6 right-6 text-right select-none opacity-30 mix-blend-multiply font-serif">
                        <p className="text-[10px] uppercase font-bold text-amber-900">ORIGIN: {cropResult.name}</p>
                        <p className="text-[10px] italic text-amber-950">{cropResult.scientificName}</p>
                      </div>

                      {/* Center Content Group (Authentic Layout) */}
                      <div className="absolute inset-0 flex flex-col items-center justify-between py-16 px-8 z-10">
                        
                        {/* 1. Main dynamic Label: "物產名稱 + 紙" */}
                        <div className="text-center space-y-2 mt-4 select-none">
                          <p className="text-xs tracking-[0.25em] font-serif text-amber-900/60 uppercase font-bold">
                            ── 故鄉手抄特製 ──
                          </p>
                          <h2 className="text-3xl font-serif font-extrabold tracking-widest text-[#23201a] py-2 border-y border-amber-900/20 px-6 inline-block bg-[#ffffff]/10 backdrop-blur-[1px] rounded-lg">
                            {formatPaperName(cropResult.name)}
                          </h2>
                          <p className="text-xs font-serif italic text-amber-900/70">
                            {cropResult.scientificName}
                          </p>
                        </div>

                        {/* 2. Custom Handwritten Calligraphy Overlay */}
                        {customCalligraphy && (
                          <div className="text-center w-full max-w-[80%] my-auto">
                            <p 
                              className={`text-xl leading-relaxed text-amber-950 drop-shadow-sm transition-all py-3 ${
                                fontStyle === "cursive" ? "font-serif italic tracking-widest" :
                                fontStyle === "serif" ? "font-serif font-bold tracking-wide" :
                                fontStyle === "mono" ? "font-mono font-semibold tracking-normal" :
                                "font-sans font-bold tracking-wider"
                              }`}
                              style={{ 
                                mixBlendMode: "multiply",
                                textShadow: "1px 1px 0px rgba(255,255,255,0.4)"
                              }}
                            >
                              {customCalligraphy}
                            </p>
                          </div>
                        )}

                        {/* 3. Aesthetic Specifications stamp */}
                        <div className="text-center select-none bg-black/5 rounded-full px-4 py-1 text-[10px] font-mono tracking-wider uppercase text-amber-900/75">
                          {paperWeight} GSM • {fiberDensity}% Density • {cropResult.visualStyle?.fiberLength || "長纖"}
                        </div>

                      </div>

                    </div>

                  </div>

                  {/* Aesthetic Credit footer */}
                  <div className="w-full text-center mt-3 text-xs text-[#7c7569] italic flex items-center justify-center gap-1.5">
                    <span>紙張紋理經由</span>
                    <strong className="text-[#3c3831] font-semibold">{cropResult.name}</strong>
                    <span>微觀特質演算渲染</span>
                  </div>

                </div>

                {/* Local Crop Profile & Story */}
                <div className="bg-[#ede7da] rounded-2xl p-6 border border-[#dfdacd] shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#dfdacd] pb-3 gap-2">
                    <div>
                      <h3 className="text-xl font-serif font-bold text-[#1a1917] flex items-center gap-2">
                        <FileText className="w-5 h-5 text-amber-800" />
                        <span>在地物產檔案：{cropResult.name}</span>
                      </h3>
                      <p className="text-xs text-amber-900 font-serif font-semibold">
                        學名：<span className="italic">{cropResult.scientificName}</span>
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-amber-100 border border-amber-200 text-amber-900 text-xs font-bold rounded-full text-center">
                      產地：{selectedCounty} {selectedDistrict}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="bg-[#faf8f4] p-4 rounded-xl border border-black/5 shadow-inner">
                      <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <span>●</span> 物產故事與文化契機
                      </h4>
                      <p className="text-sm text-[#44403a] leading-relaxed font-serif">
                        {cropResult.introduction}
                      </p>
                    </div>

                    <div className="bg-[#faf8f4] p-4 rounded-xl border border-black/5 shadow-inner">
                      <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <span>●</span> 造紙適合性 (植物纖維科學)
                      </h4>
                      <p className="text-sm text-[#44403a] leading-relaxed font-serif">
                        {cropResult.suitability}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Sensory Dimensions Explanation (Poetic details in UI) */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-[#dfdacd] pb-2">
                    <h3 className="text-lg font-serif font-bold text-[#1a1917] flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-amber-800" />
                      <span>手作紙三感與觸覺特寫</span>
                    </h3>
                    <div className="flex bg-[#e8e2d4] p-1 rounded-lg text-xs font-medium">
                      <button
                        onClick={() => setActiveSensoryTab("all")}
                        className={`px-2.5 py-1 rounded-md transition-all ${
                          activeSensoryTab === "all" ? "bg-amber-950 text-amber-50" : "text-[#5c564c]"
                        }`}
                      >
                        全部
                      </button>
                      <button
                        onClick={() => setActiveSensoryTab("visual")}
                        className={`px-2.5 py-1 rounded-md transition-all ${
                          activeSensoryTab === "visual" ? "bg-amber-950 text-amber-50" : "text-[#5c564c]"
                        }`}
                      >
                        視覺
                      </button>
                      <button
                        onClick={() => setActiveSensoryTab("smell")}
                        className={`px-2.5 py-1 rounded-md transition-all ${
                          activeSensoryTab === "smell" ? "bg-amber-950 text-amber-50" : "text-[#5c564c]"
                        }`}
                      >
                        嗅覺
                      </button>
                      <button
                        onClick={() => setActiveSensoryTab("taste")}
                        className={`px-2.5 py-1 rounded-md transition-all ${
                          activeSensoryTab === "taste" ? "bg-amber-950 text-amber-50" : "text-[#5c564c]"
                        }`}
                      >
                        味覺
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Visual Card */}
                    {(activeSensoryTab === "all" || activeSensoryTab === "visual") && (
                      <div className="bg-[#ede7da] rounded-xl p-5 border border-[#dfdacd] relative group hover:shadow-md transition-all">
                        <div className="absolute top-4 right-4 text-2xl opacity-20 group-hover:opacity-40 transition-opacity">👁️</div>
                        <h4 className="text-sm font-bold text-amber-900 flex items-center gap-1.5 mb-2">
                          <Eye className="w-4 h-4 text-amber-800" />
                          <span>視覺 (Visual Impression)</span>
                        </h4>
                        <p className="text-xs text-[#4c4841] leading-relaxed font-serif">
                          {cropResult.sensory.visual}
                        </p>
                      </div>
                    )}

                    {/* Smell Card */}
                    {(activeSensoryTab === "all" || activeSensoryTab === "smell") && (
                      <div className="bg-[#ede7da] rounded-xl p-5 border border-[#dfdacd] relative group hover:shadow-md transition-all">
                        <div className="absolute top-4 right-4 text-2xl opacity-20 group-hover:opacity-40 transition-opacity">🍃</div>
                        <h4 className="text-sm font-bold text-amber-900 flex items-center gap-1.5 mb-2">
                          <Wind className="w-4 h-4 text-amber-800" />
                          <span>嗅覺 (Scent Atmosphere)</span>
                        </h4>
                        <p className="text-xs text-[#4c4841] leading-relaxed font-serif">
                          {cropResult.sensory.smell}
                        </p>
                      </div>
                    )}

                    {/* Taste Card */}
                    {(activeSensoryTab === "all" || activeSensoryTab === "taste") && (
                      <div className="bg-[#ede7da] rounded-xl p-5 border border-[#dfdacd] relative group hover:shadow-md transition-all">
                        <div className="absolute top-4 right-4 text-2xl opacity-20 group-hover:opacity-40 transition-opacity">☕</div>
                        <h4 className="text-sm font-bold text-amber-900 flex items-center gap-1.5 mb-2">
                          <Volume2 className="w-4 h-4 text-amber-800" />
                          <span>味覺聯覺 (Taste Reverie)</span>
                        </h4>
                        <p className="text-xs text-[#4c4841] leading-relaxed font-serif">
                          {cropResult.sensory.taste}
                        </p>
                      </div>
                    )}

                    {/* Touch Card */}
                    {activeSensoryTab === "all" && (
                      <div className="bg-[#ede7da] rounded-xl p-5 border border-[#dfdacd] relative group hover:shadow-md transition-all md:col-span-2">
                        <div className="absolute top-4 right-4 text-2xl opacity-20 group-hover:opacity-40 transition-opacity">✋</div>
                        <h4 className="text-sm font-bold text-amber-900 flex items-center gap-1.5 mb-2">
                          <Hand className="w-4 h-4 text-amber-800" />
                          <span>觸覺手感 (Tactile Texture)</span>
                        </h4>
                        <p className="text-xs text-[#4c4841] leading-relaxed font-serif">
                          {cropResult.sensory.touch}
                        </p>
                      </div>
                    )}

                  </div>
                </div>

                {/* 5 Steps of Traditional Craft Flow */}
                {cropResult.process && cropResult.process.length > 0 && (
                  <div className="bg-[#ede7da] rounded-2xl p-6 border border-[#dfdacd] shadow-sm space-y-4">
                    <div className="border-b border-[#dfdacd] pb-3">
                      <h3 className="text-lg font-serif font-bold text-[#1a1917] flex items-center gap-2">
                        <Layers className="w-5 h-5 text-amber-800" />
                        <span>傳統手工紙造紙工藝（五步驟）</span>
                      </h3>
                      <p className="text-xs text-[#7c7569] mt-0.5">
                        親手將 {selectedDistrict} 的 {cropResult.name} 提煉成紙的過程
                      </p>
                    </div>

                    {/* Process Tabs */}
                    <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-thin">
                      {cropResult.process.map((step, idx) => {
                        const stepNum = idx + 1;
                        const isTabActive = activeStepTab === idx;
                        return (
                          <button
                            key={idx}
                            onClick={() => setActiveStepTab(idx)}
                            className={`flex-1 min-w-[90px] text-left p-2.5 rounded-xl border transition-all text-xs font-semibold ${
                              isTabActive
                                ? "bg-amber-900 text-amber-50 border-amber-950 shadow-sm"
                                : "bg-[#f5efe4] border-[#d8d1c2] hover:bg-[#e8e2d4] text-[#5c564c]"
                            }`}
                          >
                            <div className="text-[10px] uppercase opacity-70">Step 0{stepNum}</div>
                            <div className="truncate font-serif text-sm mt-0.5">
                              {step.split("：")[0] || `步驟 ${stepNum}`}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Process step content detail */}
                    <div className="bg-[#faf8f4] p-5 rounded-xl border border-black/5 relative overflow-hidden transition-all duration-300">
                      <div className="absolute right-4 bottom-2 text-7xl font-serif text-amber-900/5 select-none font-bold">
                        0{activeStepTab + 1}
                      </div>

                      <div className="flex items-center gap-2.5 mb-2">
                        <span className="w-6 h-6 rounded-full bg-amber-900 text-amber-50 flex items-center justify-center text-xs font-serif font-bold">
                          {activeStepTab + 1}
                        </span>
                        <h4 className="text-base font-serif font-bold text-[#1a1917]">
                          {cropResult.process[activeStepTab]?.split("：")[0]}
                        </h4>
                      </div>

                      <p className="text-sm text-[#4c4841] leading-relaxed font-serif pl-8 relative z-10">
                        {cropResult.process[activeStepTab]?.split("：")[1] || cropResult.process[activeStepTab]}
                      </p>

                      {/* Educational Tip based on active step */}
                      <div className="mt-4 pt-3 border-t border-[#dfdacd] pl-8 text-xs text-amber-800 flex items-start gap-1.5 relative z-10 italic">
                        <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <span>
                          {activeStepTab === 0 && "小撇步：在曝曬原料時必須維持乾燥，防止葉片纖維發霉發黑，才能抄出乾淨的色澤。"}
                          {activeStepTab === 1 && "小撇步：蒸煮時加入適當碳酸鈉（小蘇打）可以軟化果膠，若植物本身含有草酸，可有效中和。"}
                          {activeStepTab === 2 && "小撇步：洗滌時使用流動泉水反覆揉捏，此時可將沒有打碎的木質、老皮碎屑用鑷子挑出。"}
                          {activeStepTab === 3 && "小撇步：打漿搥打越均勻，植物纖維越細。若想做出粗獷有顆粒的手工紙，可縮短搥打時間。"}
                          {activeStepTab === 4 && "小撇步：抄紙撈網撈起紙漿時，需在水中前後左右微微晃動，使植物長短纖維縱橫交織。"}
                        </span>
                      </div>
                    </div>

                  </div>
                )}

                {/* Educational guide about Taiwan papermaking */}
                <div className="bg-[#ede7da] p-6 rounded-2xl border border-[#dfdacd] shadow-sm space-y-3">
                  <h3 className="text-lg font-serif font-bold text-[#1a1917] flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-amber-800" />
                    <span>台灣植物造紙小常識</span>
                  </h3>
                  <p className="text-xs text-[#5c564c] leading-relaxed font-serif">
                    手工造紙的靈魂在於<strong>植物纖維</strong>。台灣常見的「野葛」、「構樹（楮皮）」、「月桃」、「水稻」和各種特產，皆有其獨特化學與物理特質。例如：
                  </p>
                  <ul className="text-xs text-[#5c564c] space-y-1.5 list-disc pl-4 leading-relaxed font-serif">
                    <li><strong className="text-[#3c3831]">構樹皮 (褚皮)</strong>：纖維極長，拉力強勁，是手工宣紙的最佳支撐骨架。</li>
                    <li><strong className="text-[#3c3831]">禾稈稻草</strong>：纖維較短，含有較多二氧化矽，紙張容易產生暖調、鬆軟且不透明。</li>
                    <li><strong className="text-[#3c3831]">蔥葉/秋葵黏液</strong>：富有天然多醣體，在抄紙池中能防止纖維結團，形成極佳的分散。</li>
                  </ul>
                </div>

              </div>
            ) : (
              /* Skeleton Loader */
              <div className="bg-[#ede7da] rounded-2xl p-12 border border-[#dfdacd] shadow-sm text-center space-y-4">
                <div className="w-16 h-16 border-4 border-amber-900 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <h3 className="text-lg font-serif font-bold">正在研磨在地植物纖維與古法造紙數據...</h3>
                <p className="text-xs text-[#7c7569]">這需要約數秒時間，我們正在整合台灣各鄉鎮市區物產大數據。</p>
              </div>
            )}

          </section>

        </div>

      </main>

      {/* Footer info banner */}
      <footer className="bg-[#2c2a27] text-[#e8e2d4] py-12 border-t border-black/20 text-center">
        <div className="max-w-7xl mx-auto px-4 space-y-6">
          <div className="flex items-center justify-center gap-2">
            <span className="text-3xl">🏮</span>
            <span className="text-xl font-serif font-extrabold tracking-widest text-amber-100">
              台灣手作紙物產圖鑑
            </span>
          </div>
          <p className="text-xs max-w-xl mx-auto text-[#a1998d] leading-relaxed font-serif">
            本系統融合傳統「抄紙」與「植物染」技藝，透過使用者輸入之台灣故鄉風土數據，尋覓與探查在地植物廢棄殘渣與特產之造紙可能性。讓我們一同守護生態工藝、延續大地溫柔。
          </p>
          <div className="pt-4 border-t border-[#3e3b37] flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#8c8577] gap-3">
            <p>© 國立臺灣師範大學設計學系 • 圖文傳播學系</p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-amber-100 transition-colors">植物纖維科學</a>
              <span>•</span>
              <a href="#" className="hover:text-amber-100 transition-colors">手工造紙史</a>
              <span>•</span>
              <a href="#" className="hover:text-amber-100 transition-colors">農業永續廢棄物</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
