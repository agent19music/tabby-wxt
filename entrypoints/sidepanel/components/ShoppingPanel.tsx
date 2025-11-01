import { ShoppingTabs } from "./shopping/shopping_ui_utils";

export default function ShoppingPanel() {
  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 overflow-y-auto ">
        <ShoppingTabs />
      </div>
    </div>
  );
}
