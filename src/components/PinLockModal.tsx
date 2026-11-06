import React, { useState } from 'react';
import { Lock, Unlock, KeyRound, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface PinLockModalProps {
  isOpen: boolean;
  pinCode: string;
  onUnlock: () => void;
  onSetNewPin?: (newPin: string) => void;
}

export const PinLockModal: React.FC<PinLockModalProps> = ({
  isOpen,
  pinCode,
  onUnlock,
}) => {
  const [enteredPin, setEnteredPin] = useState('');
  const [errorShake, setErrorShake] = useState(false);
  const [showPin, setShowPin] = useState(false);

  if (!isOpen) return null;

  const handleDigit = (digit: string) => {
    if (enteredPin.length >= 4) return;
    const nextPin = enteredPin + digit;
    setEnteredPin(nextPin);

    if (nextPin.length === 4) {
      if (nextPin === pinCode || nextPin === '1984') {
        setTimeout(() => {
          setEnteredPin('');
          onUnlock();
        }, 150);
      } else {
        setErrorShake(true);
        setTimeout(() => {
          setEnteredPin('');
          setErrorShake(false);
        }, 600);
      }
    }
  };

  const handleBackspace = () => {
    setEnteredPin((prev) => prev.slice(0, -1));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#09090b]/95 backdrop-blur-xl animate-in fade-in select-none">
      <div className="w-full max-w-xs bg-[#121216] border border-[#7f1d1d]/60 rounded-3xl p-6 shadow-2xl flex flex-col items-center space-y-6 text-zinc-200">
        <div className="w-14 h-14 rounded-2xl bg-[#1c0f12] border border-red-700/60 flex items-center justify-center shadow-inner">
          <Lock className="w-7 h-7 text-red-500 animate-pulse" />
        </div>

        <div className="text-center space-y-1">
          <h2 className="font-heading font-semibold text-lg text-zinc-100 tracking-wider">
            OBSIDIAN VAULT LOCKED
          </h2>
          <p className="text-xs text-zinc-400">
            Enter 4-digit PIN to access private session
          </p>
        </div>

        {/* PIN Indicator Dots */}
        <div
          className={`flex items-center gap-4 py-2 transition-transform ${
            errorShake ? 'animate-bounce text-red-500' : ''
          }`}
        >
          {[0, 1, 2, 3].map((idx) => {
            const hasDigit = enteredPin.length > idx;
            return (
              <div
                key={idx}
                className={`w-3.5 h-3.5 rounded-full border transition-all ${
                  hasDigit
                    ? 'bg-red-600 border-red-500 scale-110 shadow-[0_0_8px_rgba(220,38,38,0.8)]'
                    : 'bg-zinc-800 border-zinc-700'
                }`}
              />
            );
          })}
        </div>

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-3 w-full">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              onClick={() => handleDigit(num)}
              className="h-12 rounded-2xl bg-[#18181b] hover:bg-zinc-800 active:scale-95 border border-[#27272a] text-lg font-mono font-bold text-zinc-200 transition-all flex items-center justify-center shadow-sm"
            >
              {num}
            </button>
          ))}
          <button
            onClick={() => setEnteredPin('')}
            className="h-12 rounded-2xl bg-[#18181b] hover:bg-zinc-800 text-xs font-mono text-zinc-400 border border-[#27272a] transition-all flex items-center justify-center"
          >
            Clear
          </button>
          <button
            onClick={() => handleDigit('0')}
            className="h-12 rounded-2xl bg-[#18181b] hover:bg-zinc-800 active:scale-95 border border-[#27272a] text-lg font-mono font-bold text-zinc-200 transition-all flex items-center justify-center shadow-sm"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            className="h-12 rounded-2xl bg-[#18181b] hover:bg-zinc-800 text-xs font-mono text-zinc-400 border border-[#27272a] transition-all flex items-center justify-center"
          >
            ⌫
          </button>
        </div>

        <div className="text-[10px] text-zinc-500 font-mono text-center">
          Default Master PIN: <span className="text-red-400">1984</span>
        </div>
      </div>
    </div>
  );
};
