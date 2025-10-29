import { GearSixIcon, XIcon } from "@phosphor-icons/react";
import logo from "@/assets/logo.png";

export const SidebarHeaderMain = () => {
  const handleClose = () => {
    window.close();
  };
  const tabs = ["Current Product", "Past Products"];

  return (
    <div className="flex items-center justify-between px-4 py-3  bg-card m-2 rounded-full backdrop-blur-3xl">
      {/* <h1 className="text-lg font-semibold text-foreground">Shopping</h1> */}
      <img src={logo} className=" h-8" />

      <div className="flex items-center gap-2 text-foreground/70">
        <button
          // size="icon"
          className=" hover:bg-muted"
        >
          <GearSixIcon size={48} className="w-5 h-5 " />
        </button>
        <button>
          <XIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
