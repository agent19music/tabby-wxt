import React from "react";
import soundcore from "@/assets/soundcore.png";
import { Button } from "@/components/ui/button";
import { PaperPlaneRightIcon, PaperPlaneTiltIcon } from "@phosphor-icons/react";
type Props = {};

export const CurrentProductChat = (props: Props) => {
  return (
    <div className="bg-card rounded-[20px] p-2 -mt-2 backdrop-blur-3xl  border border-foreground/5 space-y-2 h-full ">
      <div className="bg-input rounded-[10px] p-2 h-[80px] relative">
        <textarea
          placeholder="Ask anything about the product..."
          className="w-full bg-transparent outline-none h-full pl resize-none rounded-[10px]"
        />
        <button className="absolute right-2 bottom-2 p-2">
          <PaperPlaneTiltIcon size={18} />
        </button>
      </div>
    </div>
  );
};
