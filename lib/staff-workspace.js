export const WORKSPACE_MODULES = [
  "work", "orders", "pipeline", "customerMemory", "discovery", "partnerNetwork",
  "operations", "procedures", "house", "recipes", "productDevelopment", "suppliers",
  "knowledge", "growth", "documents", "control", "assistant",
];

export const WORKSPACE_PRESETS = [
  { id: "standard", label: "Theo vai trò hiện tại", modules: null },
  { id: "work", label: "Chỉ công việc", modules: ["work"] },
  { id: "sales", label: "Bán hàng", modules: ["work", "orders", "pipeline", "customerMemory", "discovery"] },
  { id: "operations", label: "Vận hành", modules: ["work", "orders", "operations", "procedures", "suppliers"] },
  { id: "product", label: "Sản phẩm & nội dung", modules: ["work", "house", "recipes", "productDevelopment", "knowledge", "growth"] },
];

const PAGE_MODULES = {
  work: "work", orders: "orders", pipeline: "pipeline", "customer-memory": "customerMemory",
  discovery: "discovery", "partner-network": "partnerNetwork", operations: "operations",
  procedures: "procedures", house: "house", recipes: "recipes",
  "product-development": "productDevelopment", suppliers: "suppliers", knowledge: "knowledge",
  growth: "growth", documents: "documents", control: "control", assistant: "assistant",
};

const API_MODULES = {
  work: "work", workers: "work", orders: "orders", "private-orders": "orders", procedures: "procedures",
  "customer-memory": "customerMemory", discovery: "discovery", partners: "partnerNetwork",
  "recipe-radar": "recipes", knowledge: "knowledge", growth: "growth", "meta-insights": "growth",
  integrations: "control", assistant: "assistant", "b2b-workflow": ["orders", "pipeline", "documents"],
};

export function workspaceModules(staff) {
  if (staff?.role === "admin" || (staff?.role === "manager" && staff.workspace_modules == null)) return null;
  if (staff?.role === "manager" && Array.isArray(staff.workspace_modules)) return staff.workspace_modules;
  return staff?.role === "employee" ? ["work"] : [];
}

export function validWorkspaceSelection(modules) {
  return modules === null || (
    Array.isArray(modules) && modules.includes("work") &&
    modules.length === new Set(modules).size &&
    modules.every(key => WORKSPACE_MODULES.includes(key))
  );
}

export function canOpenStaffPage(staff, path) {
  const section = path.split("/")[2];
  if (section === "team-access") return staff?.role === "admin";
  const modules = workspaceModules(staff);
  if (modules === null) return true;
  if (!staff) return !section;
  return modules.includes(PAGE_MODULES[section]);
}

export function canCallStaffApi(staff, path) {
  const section = path.split("/")[3];
  if (section === "team-access") return staff?.role === "admin";
  if (staff?.role !== "manager") return true; // Existing role and assignment checks still govern employees.
  const modules = workspaceModules(staff);
  const required = API_MODULES[section];
  return modules === null || (Array.isArray(required)
    ? required.some(module => modules.includes(module)) : modules.includes(required));
}
