import React, { useState } from 'react';
import {
  X,
  Activity,
  Heart,
  Eye,
  Shield,
  Flame,
  Crown,
  AlertCircle,
  Plus,
  Trash2,
  EyeOff,
} from 'lucide-react';
import { PsychologicalHUD, InventoryItem } from '../types/roleplay';

interface PsychologicalHUDDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  hud: PsychologicalHUD;
  onUpdateHud: (hud: Partial<PsychologicalHUD>) => void;
  inventory: InventoryItem[];
  onAddInventoryItem: (item: Omit<InventoryItem, 'id' | 'acquiredAt'>) => void;
  onToggleHideItem: (id: string) => void;
  onDeleteItem: (id: string) => void;
}

export const PsychologicalHUDDrawer: React.FC<PsychologicalHUDDrawerProps> = ({
  isOpen,
  onClose,
  hud,
  onUpdateHud,
  inventory,
  onAddInventoryItem,
  onToggleHideItem,
  onDeleteItem,
}) => {
  const [activeTab, setActiveTab] = useState<'meters' | 'inventory'>('meters');
  const [invFilter, setInvFilter] = useState<'all' | 'item' | 'injury' | 'clue' | 'secret'>('all');
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<'item' | 'injury' | 'clue' | 'secret'>('item');

  if (!isOpen) return null;

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    onAddInventoryItem({
      name: newItemName.trim(),
      description: newItemDesc.trim() || 'A crucial object in Lian’s possession.',
      category: newItemCategory,
      hiddenFromAI: false,
    });
    setNewItemName('');
    setNewItemDesc('');
    setIsAddingItem(false);
  };

  const filteredInventory = inventory.filter((item) => {
    if (invFilter === 'all') return true;
    return item.category === invFilter;
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md h-full bg-[#0c0a10]/95 backdrop-blur-2xl border-l-[0.5px] border-[#d4af37]/25 shadow-2xl flex flex-col text-zinc-200">
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#d4af37]/20">
          <div className="flex items-center gap-2.5">
            <Activity className="w-5 h-5 text-[#d4af37] animate-heart-pulse" />
            <div>
              <h2 className="font-heading font-semibold text-base tracking-wider text-[#f4f4f6]">
                PSYCHOLOGICAL HUD & INVENTORY
              </h2>
              <p className="text-[11px] text-[#c5a059]/80 font-serif italic">
                Live simulation meters & possession ledger
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-[#d4af37] hover:bg-[#d4af37]/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-[#d4af37]/20 bg-[#070709]">
          <button
            onClick={() => setActiveTab('meters')}
            className={`flex-1 py-3 text-xs font-serif tracking-wider transition-all border-b-2 ${
              activeTab === 'meters'
                ? 'border-[#d4af37] text-[#d4af37] bg-[#d4af37]/10 font-semibold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            PSYCHOLOGICAL METERS
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex-1 py-3 text-xs font-serif tracking-wider transition-all border-b-2 ${
              activeTab === 'inventory'
                ? 'border-[#d4af37] text-[#d4af37] bg-[#d4af37]/10 font-semibold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            INVENTORY & CLUES ({inventory.length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">
          {activeTab === 'meters' ? (
            <div className="space-y-5">
              {/* Heart rate & Composure Hero */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-[#17121c]/90 via-[#270c16]/90 to-[#17121c]/90 border-[0.5px] border-[#d4af37]/35 flex items-center justify-between shadow-lg">
                <div>
                  <div className="text-[10px] uppercase font-serif tracking-[0.2em] text-[#d4af37]">
                    Composure State
                  </div>
                  <div className="text-base font-serif italic font-semibold text-[#f4f4f6]">
                    "{hud.composure}"
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-[#070709]/80 px-3.5 py-2 rounded-xl border-[0.5px] border-[#d4af37]/40 shadow-inner">
                  <Heart className="w-4 h-4 text-[#d4af37] fill-[#d4af37]/80 animate-heart-pulse" />
                  <div>
                    <span className="text-lg font-mono font-bold text-[#f4f4f6]">{hud.heartRate}</span>
                    <span className="text-[10px] text-zinc-400 font-serif ml-1">BPM</span>
                  </div>
                </div>
              </div>

              {/* Individual Dynamic Meters */}
              <div className="space-y-4">
                {/* Obsession */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-serif">
                    <span className="flex items-center gap-1.5 font-medium text-[#f5d0a9]">
                      <Flame className="w-3.5 h-3.5 text-[#d4af37]" /> Obsession & Possession
                    </span>
                    <span className="font-mono text-[#f4f4f6]">{hud.obsession}%</span>
                  </div>
                  <div className="w-full bg-[#18161f] h-2 rounded-full overflow-hidden border-[0.5px] border-[#d4af37]/20">
                    <div
                      className="bg-gradient-to-r from-[#6b1424] via-[#9e2a3b] to-[#d4af37] h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(212,175,55,0.4)]"
                      style={{ width: `${hud.obsession}%` }}
                    />
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={hud.obsession}
                    onChange={(e) => onUpdateHud({ obsession: parseInt(e.target.value, 10) })}
                    className="w-full accent-[#d4af37] bg-transparent h-1 appearance-none cursor-pointer"
                  />
                </div>

                {/* Trust */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-serif">
                    <span className="flex items-center gap-1.5 font-medium text-emerald-300">
                      <Shield className="w-3.5 h-3.5 text-emerald-400" /> Trust & Vulnerability
                    </span>
                    <span className="font-mono text-[#f4f4f6]">{hud.trust}%</span>
                  </div>
                  <div className="w-full bg-[#18161f] h-2 rounded-full overflow-hidden border-[0.5px] border-emerald-900/30">
                    <div
                      className="bg-gradient-to-r from-emerald-900 via-emerald-600 to-emerald-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${hud.trust}%` }}
                    />
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={hud.trust}
                    onChange={(e) => onUpdateHud({ trust: parseInt(e.target.value, 10) })}
                    className="w-full accent-emerald-500 bg-transparent h-1 appearance-none cursor-pointer"
                  />
                </div>

                {/* Suspicion */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-serif">
                    <span className="flex items-center gap-1.5 font-medium text-amber-300">
                      <Eye className="w-3.5 h-3.5 text-amber-400" /> Suspicion & Paranoia
                    </span>
                    <span className="font-mono text-[#f4f4f6]">{hud.suspicion}%</span>
                  </div>
                  <div className="w-full bg-[#18161f] h-2 rounded-full overflow-hidden border-[0.5px] border-amber-900/30">
                    <div
                      className="bg-gradient-to-r from-amber-900 via-amber-600 to-amber-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${hud.suspicion}%` }}
                    />
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={hud.suspicion}
                    onChange={(e) => onUpdateHud({ suspicion: parseInt(e.target.value, 10) })}
                    className="w-full accent-amber-500 bg-transparent h-1 appearance-none cursor-pointer"
                  />
                </div>

                {/* Danger / Tension */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-serif">
                    <span className="flex items-center gap-1.5 font-medium text-[#e5c07b]">
                      <AlertCircle className="w-3.5 h-3.5 text-[#e5c07b]" /> Danger & Visceral Tension
                    </span>
                    <span className="font-mono text-[#f4f4f6]">{hud.danger}%</span>
                  </div>
                  <div className="w-full bg-[#18161f] h-2 rounded-full overflow-hidden border-[0.5px] border-[#d4af37]/20">
                    <div
                      className="bg-gradient-to-r from-[#4a0e17] via-[#851e2f] to-[#e5c07b] h-full rounded-full transition-all duration-500"
                      style={{ width: `${hud.danger}%` }}
                    />
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={hud.danger}
                    onChange={(e) => onUpdateHud({ danger: parseInt(e.target.value, 10) })}
                    className="w-full accent-[#d4af37] bg-transparent h-1 appearance-none cursor-pointer"
                  />
                </div>

                {/* Dominance / Control */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-serif">
                    <span className="flex items-center gap-1.5 font-medium text-[#d8b4e2]">
                      <Crown className="w-3.5 h-3.5 text-[#c084fc]" /> Psychological Dominance
                    </span>
                    <span className="font-mono text-[#f4f4f6]">{hud.dominance}%</span>
                  </div>
                  <div className="w-full bg-[#18161f] h-2 rounded-full overflow-hidden border-[0.5px] border-purple-900/30">
                    <div
                      className="bg-gradient-to-r from-purple-950 via-purple-700 to-[#d4af37] h-full rounded-full transition-all duration-500"
                      style={{ width: `${hud.dominance}%` }}
                    />
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={hud.dominance}
                    onChange={(e) => onUpdateHud({ dominance: parseInt(e.target.value, 10) })}
                    className="w-full accent-purple-500 bg-transparent h-1 appearance-none cursor-pointer"
                  />
                </div>
              </div>

              {/* Director override for Composure */}
              <div className="p-3.5 rounded-2xl bg-[#14121a] border-[0.5px] border-[#d4af37]/25 space-y-2">
                <label className="text-[11px] font-serif font-semibold text-[#d4af37] uppercase tracking-wider block">
                  Override Composure State
                </label>
                <select
                  value={hud.composure}
                  onChange={(e) => onUpdateHud({ composure: e.target.value })}
                  className="w-full p-2.5 bg-[#070709] border-[0.5px] border-[#d4af37]/35 rounded-xl text-xs text-[#f4f4f6] focus:outline-none focus:border-[#d4af37] font-serif"
                >
                  <option value="The Cracking Calm">The Cracking Calm</option>
                  <option value="The Impeccable Mask">The Impeccable Mask</option>
                  <option value="Predatory Alert">Predatory Alert</option>
                  <option value="Restrained Volatility">Restrained Volatility</option>
                  <option value="Unhinged Possession">Unhinged Possession</option>
                  <option value="Venomous Charm">Venomous Charm</option>
                  <option value="Total Psychological Dominance">Total Psychological Dominance</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Category Filter & Add Item Button */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex gap-1 overflow-x-auto pb-1 text-xs">
                  {(['all', 'item', 'injury', 'clue', 'secret'] as const).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setInvFilter(cat)}
                      className={`px-3 py-1 rounded-full text-[11px] font-serif capitalize transition-all ${
                        invFilter === cat
                          ? 'bg-[#d4af37]/20 border-[0.5px] border-[#d4af37] text-[#f4e4a6] font-medium'
                          : 'bg-[#14121a] text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setIsAddingItem(!isAddingItem)}
                  className="px-3 py-1 rounded-full bg-[#d4af37]/15 border-[0.5px] border-[#d4af37]/60 text-[#f4e4a6] text-xs font-serif flex items-center gap-1 hover:bg-[#d4af37]/30 transition-all shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>

              {/* Add Item Form */}
              {isAddingItem && (
                <form
                  onSubmit={handleAddItem}
                  className="p-3.5 rounded-2xl bg-[#14121a] border-[0.5px] border-[#d4af37]/45 space-y-2.5 animate-in fade-in"
                >
                  <div className="text-xs font-serif font-semibold text-[#d4af37]">Record New Item or Injury</div>
                  <input
                    type="text"
                    placeholder="Name (e.g. Hidden Dagger, Bruised Wrist, Stolen Cipher)"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className="w-full p-2.5 bg-[#070709] border-[0.5px] border-[#d4af37]/30 rounded-xl text-xs text-[#f4f4f6] focus:outline-none focus:border-[#d4af37] font-serif"
                    required
                  />
                  <textarea
                    placeholder="Physical details / significance..."
                    value={newItemDesc}
                    onChange={(e) => setNewItemDesc(e.target.value)}
                    rows={2}
                    className="w-full p-2.5 bg-[#070709] border-[0.5px] border-[#d4af37]/30 rounded-xl text-xs text-[#f4f4f6] focus:outline-none focus:border-[#d4af37] font-serif"
                  />
                  <div className="flex gap-2">
                    <select
                      value={newItemCategory}
                      onChange={(e) => setNewItemCategory(e.target.value as any)}
                      className="p-2 bg-[#070709] border-[0.5px] border-[#d4af37]/30 rounded-xl text-xs text-zinc-300 font-serif flex-1"
                    >
                      <option value="item">Physical Item</option>
                      <option value="injury">Injury / Physical State</option>
                      <option value="clue">Clue / Document</option>
                      <option value="secret">Hidden Secret</option>
                    </select>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-gradient-to-r from-[#d4af37] to-[#b38f2a] text-[#070709] rounded-xl text-xs font-serif font-medium hover:brightness-105 shadow-sm"
                    >
                      Save
                    </button>
                  </div>
                </form>
              )}

              {/* Items List */}
              <div className="space-y-2.5">
                {filteredInventory.length === 0 ? (
                  <div className="text-center py-8 text-xs font-serif italic text-zinc-500">
                    No items in this category.
                  </div>
                ) : (
                  filteredInventory.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-2xl bg-[#14121a]/80 backdrop-blur-md border-[0.5px] border-[#d4af37]/20 flex items-start justify-between gap-3 shadow-md"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-serif font-semibold text-sm text-[#f4f4f6]">
                            {item.name}
                          </span>
                          <span className="text-[9px] uppercase tracking-wider px-2 py-0.2 rounded-full bg-[#d4af37]/10 text-[#d4af37] font-serif border-[0.5px] border-[#d4af37]/30">
                            {item.category}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 font-serif leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => onToggleHideItem(item.id)}
                          className={`p-1.5 rounded-full transition-colors ${
                            item.hiddenFromAI
                              ? 'text-[#e05263] bg-[#4a0e17]/40'
                              : 'text-zinc-500 hover:text-zinc-300'
                          }`}
                          title={item.hiddenFromAI ? 'Hidden from AI prompt' : 'Visible to AI prompt'}
                        >
                          <EyeOff className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteItem(item.id)}
                          className="p-1.5 rounded-full text-zinc-500 hover:text-[#e05263] transition-colors"
                          title="Delete item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
