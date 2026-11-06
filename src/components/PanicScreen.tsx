import React from 'react';
import { Eye, FileSpreadsheet, Lock, ArrowLeft } from 'lucide-react';

interface PanicScreenProps {
  onRestore: () => void;
}

export const PanicScreen: React.FC<PanicScreenProps> = ({ onRestore }) => {
  return (
    <div className="fixed inset-0 z-50 bg-[#f8fafc] text-[#0f172a] p-6 overflow-y-auto font-sans select-none">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Corporate Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
              Q4
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-800">
                Operations & Capital Allocation Review — Confidential
              </h1>
              <p className="text-xs text-slate-500">Internal Audit & Liquidity Projections (FY 2026-Q4)</p>
            </div>
          </div>

          {/* Hidden Exit Restore Button */}
          <button
            onClick={onRestore}
            className="px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200 border border-slate-300 text-xs text-slate-600 font-medium flex items-center gap-1.5 transition-colors"
            title="Resume Secure Session"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Resume</span>
          </button>
        </div>

        {/* Mock Financial Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
            <span className="text-xs font-medium text-slate-500">Adjusted EBITDA</span>
            <div className="text-xl font-bold text-slate-900 mt-1">$4,821,300</div>
            <span className="text-[11px] text-emerald-600 font-medium">+14.2% YoY</span>
          </div>
          <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
            <span className="text-xs font-medium text-slate-500">Working Capital</span>
            <div className="text-xl font-bold text-slate-900 mt-1">$1,240,890</div>
            <span className="text-[11px] text-slate-500 font-medium">98.4% target</span>
          </div>
          <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
            <span className="text-xs font-medium text-slate-500">Operating Margin</span>
            <div className="text-xl font-bold text-slate-900 mt-1">28.4%</div>
            <span className="text-[11px] text-emerald-600 font-medium">+2.1% QoQ</span>
          </div>
          <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
            <span className="text-xs font-medium text-slate-500">Audit Compliance</span>
            <div className="text-xl font-bold text-slate-900 mt-1">Tier-1 Pass</div>
            <span className="text-[11px] text-slate-500 font-medium">Standard 4.2</span>
          </div>
        </div>

        {/* Corporate Spreadsheet Mock */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">Projected Depreciation & Amortization</span>
            <span className="text-xs text-slate-500 font-mono">Updated: 10:45 AM</span>
          </div>
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-600 uppercase font-mono text-[10px]">
              <tr>
                <th className="p-2.5">Asset Code</th>
                <th className="p-2.5">Category</th>
                <th className="p-2.5">Book Value</th>
                <th className="p-2.5">Depreciation</th>
                <th className="p-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="p-2.5 font-mono text-slate-700">AST-9402</td>
                <td className="p-2.5">Infrastructure Systems</td>
                <td className="p-2.5 font-mono">$420,000</td>
                <td className="p-2.5 font-mono text-slate-500">-$24,000</td>
                <td className="p-2.5 text-emerald-700 font-medium">Active</td>
              </tr>
              <tr>
                <td className="p-2.5 font-mono text-slate-700">AST-9403</td>
                <td className="p-2.5">Enterprise Software Licensing</td>
                <td className="p-2.5 font-mono">$185,500</td>
                <td className="p-2.5 font-mono text-slate-500">-$12,500</td>
                <td className="p-2.5 text-emerald-700 font-medium">Active</td>
              </tr>
              <tr>
                <td className="p-2.5 font-mono text-slate-700">AST-9404</td>
                <td className="p-2.5">Logistics & Supply Facilities</td>
                <td className="p-2.5 font-mono">$890,000</td>
                <td className="p-2.5 font-mono text-slate-500">-$45,000</td>
                <td className="p-2.5 text-emerald-700 font-medium">Active</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Executive Memo Notes */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold text-slate-800">Executive Committee Notes</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Consolidation schedules for international subsidiaries have finalized without material exceptions. All vendor agreements and leasehold covenants remain in full compliance with senior credit facilities. Next quarterly audit meeting scheduled for the third Tuesday of next month.
          </p>
        </div>
      </div>
    </div>
  );
};
