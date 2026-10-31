import React, { useState } from 'react';
import { useDevice } from '../../hooks/useDevice';
import { useAuth } from '../../hooks/useAuth';

interface ClaimDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ClaimDeviceModal: React.FC<ClaimDeviceModalProps> = ({ isOpen, onClose }) => {
  const { claimDevice, deviceId } = useDevice();
  const { user } = useAuth();

  const [inputDeviceId, setInputDeviceId] = useState(deviceId || 'ARX-000001');
  const [claimCode, setClaimCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  if (!isOpen) return null;

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputDeviceId.trim() || !claimCode.trim()) {
      setMessage({ text: 'Please fill in both Device ID and Claim Code.', type: 'error' });
      return;
    }

    setLoading(true);
    setMessage(null);

    const res = await claimDevice(inputDeviceId.trim(), claimCode.trim(), user?.uid);
    setLoading(false);

    if (res.success) {
      setMessage({
        text: `Device ${inputDeviceId.toUpperCase()} successfully claimed and linked to your account!`,
        type: 'success'
      });
      setTimeout(() => {
        onClose();
      }, 1400);
    } else {
      setMessage({ text: res.error || 'Failed to claim device.', type: 'error' });
    }
  };

  const handleSimulateQR = () => {
    setInputDeviceId('ARX-000001');
    setClaimCode('ARX-FACTORY-9821');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="ios-glass-card w-full max-w-sm rounded-[32px] p-6 shadow-2xl flex flex-col gap-5 text-[#1D1D1F] dark:text-[#F4F4F5]">
        {/* Top specular reflection rim */}
        <div className="glass-reflection-rim inset-x-8" />
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-black/[0.05] dark:border-white/10">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-emerald-600 dark:text-emerald-400">qr_code_scanner</span>
            <h2 className="text-[17px] font-semibold text-[#1D1D1F] dark:text-[#F4F4F5] tracking-tight">
              Claim Hardware Device
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full ios-glass hover:bg-white/90 dark:hover:bg-zinc-700 flex items-center justify-center text-[#86868B] dark:text-[#A1A1AA] hover:text-[#1D1D1F] dark:hover:text-white transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <p className="text-[13px] text-[#86868B] dark:text-[#A1A1AA] leading-snug">
          Enter the permanent Device ID and one-time factory Claim Code from the QR sticker underneath your physical AromaxAI unit.
        </p>

        <form onSubmit={handleClaim} className="flex flex-col gap-3.5">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-[#86868B] dark:text-[#A1A1AA] block mb-1">
              Physical Device ID
            </label>
            <input
              type="text"
              value={inputDeviceId}
              onChange={(e) => setInputDeviceId(e.target.value.toUpperCase())}
              placeholder="e.g. ARX-000001"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-black/[0.1] dark:border-white/10 bg-[#F5F5F7] dark:bg-zinc-900 text-[#1D1D1F] dark:text-white text-[14px] font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 uppercase"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-[#86868B] dark:text-[#A1A1AA] block mb-1">
              Factory Claim Code
            </label>
            <input
              type="password"
              value={claimCode}
              onChange={(e) => setClaimCode(e.target.value)}
              placeholder="Enter 6-8 digit code"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-black/[0.1] dark:border-white/10 bg-[#F5F5F7] dark:bg-zinc-900 text-[#1D1D1F] dark:text-white text-[14px] font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handleSimulateQR}
              className="text-[11px] text-[#0071E3] dark:text-sky-400 hover:underline flex items-center gap-1 font-medium cursor-pointer"
            >
              <span className="material-symbols-outlined text-[13px]">content_paste</span>
              <span>Fill Test QR Code</span>
            </button>
            <span className="text-[10px] text-[#86868B] dark:text-[#A1A1AA]">Account: {user ? user.email || 'Signed In' : 'Guest'}</span>
          </div>

          {message && (
            <p
              className={`text-[12px] p-2.5 rounded-xl ${
                message.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40'
                  : 'bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-800/40'
              }`}
            >
              {message.text}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-2xl ios-liquid-btn-emerald text-white text-[13px] font-semibold transition-all active:scale-95 disabled:opacity-50 mt-1 cursor-pointer ring-1 ring-white/20"
          >
            <span className="relative z-10">{loading ? 'Verifying & Claiming...' : 'Link Device to My Account'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
