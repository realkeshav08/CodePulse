import { Textarea } from "@/components/ui/textarea";

export function Form({ value, onChange }) {
  return (
    <div className="w-full">
      <Textarea
        value={value}
        onChange={onChange}
        className="min-h-[400px] w-full p-6 text-base font-mono rounded-2xl border-border bg-white/50 focus-visible:ring-primary/20 transition-all resize-none shadow-inner"
        placeholder="Paste your source code here (JS, Python, C++, etc.)..."
      />
    </div>
  );
}

