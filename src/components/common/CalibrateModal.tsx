import React, { useState } from 'react';
import { RGB } from '../../types/aroma';
import { hslToRgb, rgbToHex } from '../../services/hardware/lightEngine';

interface CalibrateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLight: RGB;
  onApplyLight: (rgb: RGB) => void;
}

export const CalibrateModal: React.FC<CalibrateModalProps> = ({
  isOpen,
  onClose,
  currentLight,
  onApplyLight
}) => {
  const [hue, setHue] = useState(142); // Default emerald-green
  const [brightness, setBrightness] = useState(85);
  const [warmth, setWarmth] = useState(2400);

  if (!isOpen) return null;

  const handleDiscClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    let angle = Math.atan2(y, x) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;
    const rounded = Math.round(angle);
    setHue(rounded);

    const calculated = hslToRgb(rounded, 80, brightness / 2);
    onApplyLight(calculated);
  };

  const handleBrightnessChange = (val: number) => {
    setBrightness(val);
    const calculated = hslToRgb(hue, 80, val / 2);
    onApplyLight(calculated);
  };

  const handleApplyPreset = (presetHue: number, name: string) => {
    setHue(presetHue);
    const calculated = hslToRgb(presetHue, 80, brightness / 2);
    onApplyLight(calculated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="ios-glass-card w-full max-w-sm rounded-[32px] p-6 shadow-2xl flex flex-col items-center gap-5 text-[#1D1D1F] dark:text-[#F4F4F5]">
        {/* Top specular reflection rim */}
        <div className="glass-reflection-rim inset-x-8" />
        {/* Header */}
        <div className="w-full flex items-center justify-between pb-2 border-b border-black/[0.05] dark:border-white/10">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-amber-500">palette</span>
            <h2 className="text-[17px] font-semibold text-[#1D1D1F] dark:text-[#F4F4F5] tracking-tight">
              Hardware Optics Calibration
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F5F5F7] dark:bg-zinc-800 hover:bg-[#EBEBEF] dark:hover:bg-zinc-700 flex items-center justify-center text-[#86868B] dark:text-[#A1A1AA] hover:text-[#1D1D1F] dark:hover:text-white transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Color Disc matching Image 5 */}
        <div className="relative w-44 h-44 rounded-full p-1 bg-[#F5F5F7] dark:bg-zinc-900 flex items-center justify-center shadow-inner">
          <div
            onClick={handleDiscClick}
            className="w-full h-full rounded-full cursor-pointer relative flex items-center justify-center shadow-sm select-none"
            style={{
              background:
                'conic-gradient(from 0deg, #FF9500, #FFCC00, #34C759, #00C7BE, #30B0C7, #AF52DE, #FF2D55, #FF9500)'
            }}
          >
            <div className="w-20 h-20 rounded-full bg-white dark:bg-[#121216] flex flex-col items-center justify-center shadow-md border border-black/[0.04] dark:border-white/10 pointer-events-none">
              <div
                className="w-4 h-4 rounded-full mb-1 shadow-sm"
                style={{ backgroundColor: rgbToHex(currentLight) }}
              />
              <span className="text-[11px] font-bold text-[#1D1D1F] dark:text-white font-mono">
                {hue}° Hue
              </span>
            </div>
          </div>
        </div>

        {/* Sliders */}
        <div className="w-full space-y-4 pt-1">
          <div>
            <div className="flex justify-between text-[12px] font-medium mb-1">
              <span className="text-[#86868B] dark:text-[#A1A1AA]">Chassis Illumination</span>
              <span className="text-[#1D1D1F] dark:text-white font-semibold">{brightness}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={brightness}
              onChange={(e) => handleBrightnessChange(parseInt(e.target.value, 10))}
              className="w-full h-2.5 bg-[#E5E5EA] dark:bg-zinc-800 rounded-full appearance-none cursor-pointer outline-none"
            />
          </div>

          <div>
            <div className="flex justify-between text-[12px] font-medium mb-1">
              <span className="text-[#86868B] dark:text-[#A1A1AA]">Color Temperature</span>
              <span className="text-[#1D1D1F] dark:text-white font-semibold">{warmth} K</span>
            </div>
            <input
              type="range"
              min="1800"
              max="6500"
              step="100"
              value={warmth}
              onChange={(e) => setWarmth(parseInt(e.target.value, 10))}
              className="w-full h-2.5 bg-[#E5E5EA] dark:bg-zinc-800 rounded-full appearance-none cursor-pointer outline-none"
            />
          </div>
        </div>

        {/* Quick Semantic Presets */}
        <div className="w-full flex items-center justify-between gap-1 pt-1">
          <button
            onClick={() => handleApplyPreset(140, 'Emerald Canopy')}
            className="flex-1 py-1.5 px-1 bg-[#F5F5F7] dark:bg-zinc-800 hover:bg-[#EBEBEF] dark:hover:bg-zinc-700 text-[#1D1D1F] dark:text-[#F4F4F5] rounded-xl text-[11px] font-medium text-center truncate cursor-pointer transition-colors"
          >
            Forest
          </button>
          <button
            onClick={() => handleApplyPreset(35, 'Amber Hearth')}
            className="flex-1 py-1.5 px-1 bg-[#F5F5F7] dark:bg-zinc-800 hover:bg-[#EBEBEF] dark:hover:bg-zinc-700 text-[#1D1D1F] dark:text-[#F4F4F5] rounded-xl text-[11px] font-medium text-center truncate cursor-pointer transition-colors"
          >
            Amber
          </button>
          <button
            onClick={() => handleApplyPreset(210, 'Glacial Stream')}
            className="flex-1 py-1.5 px-1 bg-[#F5F5F7] dark:bg-zinc-800 hover:bg-[#EBEBEF] dark:hover:bg-zinc-700 text-[#1D1D1F] dark:text-[#F4F4F5] rounded-xl text-[11px] font-medium text-center truncate cursor-pointer transition-colors"
          >
            Stream
          </button>
          <button
            onClick={() => handleApplyPreset(280, 'Lotus Dusk')}
            className="flex-1 py-1.5 px-1 bg-[#F5F5F7] dark:bg-zinc-800 hover:bg-[#EBEBEF] dark:hover:bg-zinc-700 text-[#1D1D1F] dark:text-[#F4F4F5] rounded-xl text-[11px] font-medium text-center truncate cursor-pointer transition-colors"
          >
            Dusk
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full ios-liquid-btn-emerald active:scale-[0.97] text-white font-medium text-[14px] h-11 rounded-2xl flex items-center justify-center transition-all shadow-sm cursor-pointer ring-1 ring-white/20"
        >
          <span className="relative z-10">Confirm Calibration</span>
        </button>
      </div>
    </div>
  );
};
