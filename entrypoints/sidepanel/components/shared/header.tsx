import { GearSixIcon, XIcon } from "@phosphor-icons/react";
import logo from "@/assets/logo.png";

export const SidebarHeaderMain = () => {
  const handleClose = () => {
    window.close();
  };
  const tabs = ["Current Product", "Past Products"];

  return (
    <div className="flex items-center justify-between px-5 py-3.5 bg-card mx-3 mt-3 mb-2 rounded-2xl backdrop-blur-sm border border-border/50">
      <img src={logo} className="h-7" />

      <div className="flex items-center gap-1.5 text-foreground/60">
        <button className="p-2 hover:bg-foreground/5 rounded-xl transition-all duration-200">
          <GearSixIcon size={18} className="w-[18px] h-[18px]" />
        </button>
        <button className="p-2 hover:bg-foreground/5 rounded-xl transition-all duration-200" onClick={handleClose}>
          <XIcon className="w-[18px] h-[18px]" />
        </button>
      </div>
    </div>
  );
};
