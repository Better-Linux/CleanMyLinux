import React from "react";
import { motion } from "framer-motion";

interface SettingRowProps {
  icon: React.ElementType;
  label: string;
  description: string;
  action: React.ReactNode;
  onClick?: () => void;
}

export function SettingRow({ icon: Icon, label, description, action, onClick }: SettingRowProps) {
  return (
    <div 
      onClick={onClick}
      className={`flex items-center justify-between p-4 hover:bg-white/2 transition-colors ${onClick ? "cursor-pointer" : ""}`}
    >
      <div className="flex items-center gap-4">
        <div className="p-2 rounded-xl bg-white/5">
          <Icon size={18} className="text-[#94a3b8]" />
        </div>
        <div className="flex flex-col">
          <span className="text-[13px] font-semibold text-white">{label}</span>
          <span className="text-[11px] text-[#94a3b8]">{description}</span>
        </div>
      </div>
      <div>{action}</div>
    </div>
  );
}

interface SwitchProps {
  enabled: boolean;
  onChange?: (enabled: boolean) => void;
}

export function Switch({ enabled, onChange }: SwitchProps) {
  return (
    <div 
      onClick={() => onChange?.(!enabled)}
      className={`w-9 h-5 rounded-full relative transition-colors duration-200 cursor-pointer ${enabled ? "bg-blue-600" : "bg-white/10 border border-white/10"}`}
    >
      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-md transition-all duration-200 ${enabled ? "left-4.5" : "left-0.5"}`} />
    </div>
  );
}

interface SegmentedControlProps<T extends string> {
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
  layoutId: string;
}

export function SegmentedControl<T extends string>({ options, value, onChange, layoutId }: SegmentedControlProps<T>) {
  return (
    <div className="flex p-1 bg-black/20 rounded-xl border border-white/5 relative">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`relative z-10 px-4 py-1.5 text-[11px] font-semibold transition-colors duration-200 min-w-17.5 ${
            value === option.value ? "text-white" : "text-white/40 hover:text-white/60"
          }`}
        >
          {option.label}
          {value === option.value && (
            <motion.div
              layoutId={layoutId}
              className="absolute inset-0 bg-white/10 rounded-lg shadow-sm -z-10 border border-white/10"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
        </button>
      ))}
    </div>
  );
}
