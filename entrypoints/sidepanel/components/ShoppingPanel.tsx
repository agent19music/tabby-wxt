import { ShoppingHeader, ShoppingTabs } from "./shopping/shopping_ui_utils";

export default function ShoppingPanel() {
  return (
    <div className="flex flex-col h-screen">
      <div className="sticky top-0 z-10">
        <ShoppingHeader />
      </div>
      <div className="flex-1 overflow-y-auto ">
        <ShoppingTabs />
      </div>
    </div>
  );
}
