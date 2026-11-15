-- NULL uses the account's existing role-based workspace.
alter table public.staff_roles add column workspace_modules text[];

alter table public.staff_roles add constraint staff_roles_workspace_modules_check check (
  workspace_modules is null or (
    role = 'manager'
    and array_ndims(workspace_modules) = 1
    and array_position(workspace_modules, null) is null
    and 'work' = any(workspace_modules)
    and workspace_modules <@ array[
      'work', 'orders', 'pipeline', 'customerMemory', 'discovery', 'partnerNetwork',
      'operations', 'procedures', 'house', 'recipes', 'productDevelopment', 'suppliers',
      'knowledge', 'growth', 'documents', 'control', 'assistant'
    ]::text[]
  )
);
