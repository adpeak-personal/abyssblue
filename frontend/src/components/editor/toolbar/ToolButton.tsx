"use client";

import { cn } from "../lib/cn";

export function ToolButton({
  onClick,
  active,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "rounded p-2 transition disabled:cursor-not-allowed disabled:opacity-40",
        active ? "bg-ocean-50 text-ocean-700" : "text-gray-500 hover:bg-gray-100",
      )}
    >
      {children}
    </button>
  );
}

export const ToolDivider = () => (
  <span className="mx-0.5 my-1 w-px self-stretch bg-gray-200" aria-hidden />
);
