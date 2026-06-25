import React, { useState } from "react";
import { 
  Sliders, 
  X, 
  RefreshCw 
} from "lucide-react";
import { SubscriptionPlan } from "../../types.ts";

interface AdminPlansTabProps {
  plans: SubscriptionPlan[];
  onRefreshData: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

export default function AdminPlansTab({
  plans,
  onRefreshData,
  onSuccess,
  onError
}: AdminPlansTabProps) {
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [editPlanName, setEditPlanName] = useState("");
  const [editPlanPrice, setEditPlanPrice] = useState(0);
  const [editPlanMaxMonitors, setEditPlanMaxMonitors] = useState(0);
  const [editPlanMinInterval, setEditPlanMinInterval] = useState(30);
  const [editPlanFeaturesText, setEditPlanFeaturesText] = useState("");
  const [editPlanIsActive, setEditPlanIsActive] = useState(true);
  const [isSavingPlan, setIsSavingPlan] = useState(false);

  const startEditPlan = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setEditPlanName(plan.name);
    setEditPlanPrice(plan.price);
    setEditPlanMaxMonitors(plan.max_monitors);
    setEditPlanMinInterval(plan.min_interval_sec);
    setEditPlanFeaturesText(plan.features.join("\n"));
    setEditPlanIsActive(plan.is_active);
  };

  const handleSavePlanEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;

    onSuccess("");
    onError("");
    setIsSavingPlan(true);

    try {
      const parsedFeatures = editPlanFeaturesText
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      const res = await fetch(`/api/admin/plans/${editingPlan.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editPlanName,
          price: editPlanPrice,
          max_monitors: editPlanMaxMonitors,
          min_interval_sec: editPlanMinInterval,
          is_active: editPlanIsActive,
          features: parsedFeatures
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update subscription plan.");
      }

      setEditingPlan(null);
      onSuccess(`Successfully updated subscription plan for "${editPlanName}"!`);
      onRefreshData();
    } catch (err: any) {
      onError(err.message || "An unexpected error occurred saving plan.");
    } finally {
      setIsSavingPlan(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in" id="admin-plans-tab">
      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-xs space-y-4">
        <h3 className="font-black text-slate-900 text-sm flex items-center gap-1.5 pb-2 border-b border-slate-100">
          <Sliders className="w-4 h-4 text-indigo-500" />
          <span>Subscription Pricing Matrices Configuration</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {plans.map((plan) => (
            <div 
              key={plan.id} 
              className={`border p-3.5 rounded-xl flex flex-col justify-between space-y-4 hover:shadow-sm transition-all duration-200 ${
                plan.is_active 
                  ? "border-slate-150 bg-white" 
                  : "border-slate-100 bg-slate-50/50 opacity-70"
              }`}
            >
              <div className="space-y-2.5">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[8px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono uppercase font-black">
                      {plan.id}
                    </span>
                    <h4 className="font-black text-slate-800 text-xs mt-1.5">{plan.name}</h4>
                  </div>
                  <span className={`w-2 h-2 rounded-full ${plan.is_active ? "bg-emerald-500 animate-pulse" : "bg-rose-400"}`} />
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] bg-slate-50 p-2.5 rounded-xl font-bold text-slate-600">
                  <div>
                    <span className="text-[8px] text-slate-400 block uppercase font-black">Price Rate</span>
                    <span className="font-black text-slate-800">${plan.price} USDT</span>
                  </div>
                  <div>
                    <span className="text-[8px] text-slate-400 block uppercase font-black">Max Quota</span>
                    <span className="font-black text-slate-800">{plan.max_monitors} targets</span>
                  </div>
                  <div className="mt-0.5">
                    <span className="text-[8px] text-slate-400 block uppercase font-black">Min Interval</span>
                    <span className="font-black text-slate-800">{plan.min_interval_sec}s check</span>
                  </div>
                  <div className="mt-0.5">
                    <span className="text-[8px] text-slate-400 block uppercase font-black">Status</span>
                    <span className={`font-black ${plan.is_active ? "text-emerald-600" : "text-rose-500"}`}>
                      {plan.is_active ? "Active" : "Disabled"}
                    </span>
                  </div>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[8px] text-slate-400 block font-black uppercase">Perks</span>
                  <ul className="text-[10px] text-slate-500 space-y-1 pl-1">
                    {plan.features.slice(0, 3).map((feat, i) => (
                      <li key={i} className="flex items-center gap-1 font-medium">
                        <span className="w-1 h-1 rounded-full bg-slate-400 shrink-0" />
                        <span className="truncate leading-none">{feat}</span>
                      </li>
                    ))}
                    {plan.features.length > 3 && (
                      <li className="text-[9px] text-slate-400 font-bold italic">
                        + {plan.features.length - 3} more perks...
                      </li>
                    )}
                  </ul>
                </div>
              </div>

              <button
                onClick={() => startEditPlan(plan)}
                className="w-full py-1.5 bg-slate-900 hover:bg-indigo-600 text-white text-xs font-black rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 shadow-3xs"
              >
                <Sliders className="w-3 h-3" />
                <span>Configure Perks</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Plan segment modal - Compact */}
      {editingPlan && (
        <div className="bg-slate-900 text-slate-100 p-4 rounded-xl space-y-3 border border-slate-800 shadow-lg max-w-2xl animate-fade-in mx-auto">
          <div className="flex justify-between items-center pb-2 border-b border-slate-800/80">
            <h4 className="text-[11px] font-black text-indigo-400 flex items-center gap-1.5 uppercase">
              <Sliders className="w-3.5 h-3.5" />
              <span>Configure plan constraints: {editingPlan.id.toUpperCase()}</span>
            </h4>
            <button onClick={() => setEditingPlan(null)} className="text-slate-400 hover:text-slate-200 cursor-pointer p-0.5">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSavePlanEdit} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] text-slate-400 block font-bold uppercase">Plan Title</label>
                <input
                  type="text"
                  required
                  value={editPlanName}
                  onChange={(e) => setEditPlanName(e.target.value)}
                  className="w-full bg-slate-850 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-slate-400 block font-bold uppercase">Price Rate (USDT)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={editPlanPrice}
                  onChange={(e) => setEditPlanPrice(Number(e.target.value))}
                  className="w-full bg-slate-850 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-slate-400 block font-bold uppercase">Targets Cap</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={editPlanMaxMonitors}
                  onChange={(e) => setEditPlanMaxMonitors(Number(e.target.value))}
                  className="w-full bg-slate-850 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-slate-400 block font-bold uppercase">Min Interval (sec)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={editPlanMinInterval}
                  onChange={(e) => setEditPlanMinInterval(Number(e.target.value))}
                  className="w-full bg-slate-850 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="space-y-1 md:col-span-1">
                <label className="text-[9px] text-slate-400 block font-bold uppercase">Plan Status</label>
                <select
                  value={editPlanIsActive ? "true" : "false"}
                  onChange={(e) => setEditPlanIsActive(e.target.value === "true")}
                  className="w-full bg-slate-850 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="true">Active & Visible</option>
                  <option value="false">Blocked / Suspended</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] text-slate-400 block font-bold uppercase">Feature Perks (one per line)</label>
              <textarea
                rows={3}
                value={editPlanFeaturesText}
                onChange={(e) => setEditPlanFeaturesText(e.target.value)}
                className="w-full bg-slate-850 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono outline-none focus:border-indigo-500"
                placeholder="Enter feature lines..."
              />
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingPlan(null)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingPlan}
                className="px-4 py-1.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-55 text-white rounded-lg text-xs font-black shadow-sm cursor-pointer flex items-center gap-1"
              >
                {isSavingPlan && <RefreshCw className="w-3 h-3 animate-spin" />}
                <span>{isSavingPlan ? "Saving perks..." : "Apply Updates"}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
