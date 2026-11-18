const link = (path, key, id) => `${path}?${new URLSearchParams({ [key]: id })}`;
const time = value => Date.parse(value) || 0;
const savedAction = (row, added, updated) => time(row.updated_at) > time(row.created_at) ? updated : added;

export function recentStaffActivity({
  orders = [], orderEvents = [], privatePages = [], opportunities = [], quotes = [], recipes = [], recipeVersions = [], tasks = [],
} = {}) {
  const rows = [];
  const record = (id, type, title, action, at, href) => {
    if (id && title && time(at)) rows.push({ id: `${type}:${id}`, type, title, action, at, href });
  };
  const eventByOrder = new Map();
  for (const event of orderEvents) {
    if (!eventByOrder.has(event.order_id) || time(event.created_at) > time(eventByOrder.get(event.order_id).created_at)) {
      eventByOrder.set(event.order_id, event);
    }
  }
  for (const order of orders) {
    if (order.deleted_at) continue;
    const event = eventByOrder.get(order.id);
    const changed = event && event.kind !== "created" && time(event.created_at) >= time(order.ts);
    record(order.id, "Đơn hàng", order.customer_name || order.id,
      changed ? (order.status === "completed" ? "Hoàn tất đơn" : "Cập nhật đơn") : "Thêm đơn",
      changed ? event.created_at : order.ts, link("/admin/orders", "order", order.id));
  }
  for (const page of privatePages) {
    record(page.id, "Trang mua riêng", page.customer_name,
      savedAction(page, "Tạo trang", "Lưu trang"), page.updated_at || page.created_at, link("/admin/orders/private", "page", page.id));
  }
  for (const customer of opportunities) {
    record(customer.id, "Hồ sơ khách", customer.business_name, savedAction(customer, "Thêm hồ sơ", "Lưu hồ sơ"),
      customer.updated_at || customer.created_at, link("/admin/pipeline", "opportunity", customer.id));
  }
  for (const quote of quotes) {
    if (!quote.opportunity_id) continue;
    const params = new URLSearchParams({ opportunity: quote.opportunity_id, quote: quote.id });
    record(quote.id, "Báo giá", quote.customer_name || quote.id, savedAction(quote, "Tạo báo giá", "Cập nhật báo giá"),
      quote.updated_at || quote.created_at, `/admin/pipeline?${params}#customer-quotes`);
  }
  const versionByRecipe = new Map();
  for (const version of recipeVersions) {
    if (time(version.created_at) > time(versionByRecipe.get(version.recipe_id))) versionByRecipe.set(version.recipe_id, version.created_at);
  }
  for (const recipe of recipes) {
    if (recipe.status === "archived") continue;
    const version = versionByRecipe.get(recipe.id);
    const versionLatest = time(version) >= time(recipe.updated_at || recipe.created_at);
    const params = new URLSearchParams({ view: "lab", recipe: recipe.id });
    record(recipe.id, "Công thức", recipe.name,
      versionLatest ? "Ghi lần thử" : savedAction(recipe, "Tạo công thức", "Lưu công thức"),
      versionLatest ? version : recipe.updated_at || recipe.created_at, `/admin/recipes?${params}`);
  }
  for (const task of tasks) {
    const completed = task.status === "completed";
    record(task.id, "Công việc", task.title, completed ? "Hoàn tất việc" : savedAction(task, "Giao việc", "Cập nhật việc"),
      completed ? task.completed_at || task.updated_at : task.updated_at || task.created_at, link("/admin/work", "task", task.id));
  }
  return rows.sort((a, b) => time(b.at) - time(a.at) || a.id.localeCompare(b.id)).slice(0, 24);
}
