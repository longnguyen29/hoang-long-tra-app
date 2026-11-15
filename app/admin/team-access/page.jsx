"use client";

import { useCallback, useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { WORKSPACE_MODULES, WORKSPACE_PRESETS } from "@/lib/staff-workspace";
import { STAFF_APPS, STAFF_APP_GROUPS } from "@/components/staff/staff-navigation";
import { useStaffFeatures } from "@/components/staff/StaffFeatures";
import styles from "./page.module.css";

const ROLES = { admin: "Quản trị viên", manager: "Quản lý", employee: "Nhân viên" };

function sameModules(left, right) {
  return left === right || (left && right && left.length === right.length && left.every(key => right.includes(key)));
}

async function requestAccess(options) {
  const { data: { session } } = await createClient().auth.getSession();
  if (!session) throw new Error("not_authorised");
  const response = await fetch("/api/staff/team-access", {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
    cache: "no-store",
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error);
  return result;
}

export default function TeamAccessPage() {
  const { partnerNetworkEnabled } = useStaffFeatures();
  const [members, setMembers] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState(null);
  const [draftRole, setDraftRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const selected = members.find(member => member.user_id === selectedId);
  const editable = selected && selected.role !== "admin";
  const hasModules = draftRole === "manager";
  const dirty = editable && (draftRole !== selected.role || !sameModules(draft, selected.workspace_modules));
  const preset = WORKSPACE_PRESETS.find(option => sameModules(option.modules, draft));
  const modules = draft ?? WORKSPACE_MODULES;

  function selectMember(member) {
    setSelectedId(member?.user_id || "");
    setDraft(member?.workspace_modules ?? null);
    setDraftRole(member?.role || "");
    setMessage("");
    setError("");
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await requestAccess();
      setMembers(result.members);
      const first = result.members.find(member => member.role === "manager") ?? result.members[0];
      selectMember(first);
    } catch {
      setError("Chưa tải được danh sách thành viên.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function toggleModule(key) {
    const next = modules.includes(key) ? modules.filter(item => item !== key) : [...modules, key];
    setDraft(next);
    setMessage("");
    setError("");
  }

  async function save(event) {
    event.preventDefault();
    if (!dirty || saving) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const { member } = await requestAccess({
        method: "PATCH",
        body: JSON.stringify({
          userId: selectedId, role: draftRole, modules: draft,
          previousRole: selected.role, previous: selected.workspace_modules,
        }),
      });
      setMembers(items => items.map(item => item.user_id === member.user_id ? { ...item, ...member } : item));
      setDraft(member.workspace_modules);
      setDraftRole(member.role);
      setMessage("Đã lưu quyền. Menu sẽ cập nhật khi thành viên tải lại trang.");
    } catch (error) {
      setError(error.message === "member_changed"
        ? "Quyền hoặc vai trò vừa thay đổi. Tải lại danh sách để kiểm tra."
        : "Chưa lưu được quyền truy cập. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  }

  return <main className={styles.page}>
    <header className={styles.heading}>
      <ShieldCheck aria-hidden="true"/>
      <div>
        <h1>Quyền thành viên</h1>
        <p>Chọn những khu vực mỗi thành viên dùng trong admin.</p>
      </div>
    </header>
    {loading ? <p role="status">Đang tải thành viên…</p> : <>
      {members.length > 0 && <div className={styles.workspace}>
        <aside className={styles.members}>
          <h2>Thành viên</h2>
          <Link className={styles.inviteLink} href="/admin/work">Mời nhân viên trong Giao việc</Link>
          {members.map(member => <button
            key={member.user_id} type="button" aria-pressed={member.user_id === selectedId} disabled={saving}
            onClick={() => {
              if (member.user_id !== selectedId && (!dirty || window.confirm("Bỏ phần quyền chưa lưu?"))) selectMember(member);
            }}
          >
            <b>{member.display_name}</b>
            <small>{ROLES[member.role]}{!member.active && " · Hồ sơ ngưng hoạt động"}</small>
          </button>)}
        </aside>
        {selected && <form className={styles.editor} onSubmit={save}>
          <div>
            <h2>{selected.display_name}</h2>
            {selected.role === "admin" && <p>Quản trị viên có đầy đủ quyền quản lý khu vực admin.</p>}
          </div>
          {editable && <label className={styles.preset}>Vai trò
            <select aria-describedby="role-description" value={draftRole} disabled={saving} onChange={event => {
              const role = event.target.value;
              setDraftRole(role);
              setDraft(role === selected.role ? selected.workspace_modules : role === "manager" ? ["work"] : null);
              setMessage("");
              setError("");
            }}>
              <option value="employee">Nhân viên</option>
              <option value="manager">Quản lý</option>
            </select>
          </label>}
          {editable && <p id="role-description" className={styles.roleDescription}>{hasModules
            ? "Quản lý có quyền xử lý dữ liệu và giao việc theo vai trò. Mẫu quyền giới hạn các mục và API trong admin."
            : "Nhân viên mở Giao việc để xem các việc được giao."}</p>}
          {editable && hasModules && <>
            <label className={styles.preset}>Mẫu quyền
              <select value={preset?.id || "custom"} disabled={saving} onChange={event => {
                const option = WORKSPACE_PRESETS.find(item => item.id === event.target.value);
                if (option) setDraft(option.modules);
                setMessage("");
                setError("");
              }}>
                {WORKSPACE_PRESETS.map(item => <option value={item.id} key={item.id}>{item.label}</option>)}
                {!preset && <option value="custom">Tùy chỉnh</option>}
              </select>
            </label>
            <div className={styles.modules}>
              {STAFF_APP_GROUPS.map(group => <fieldset key={group.label} disabled={saving}>
                <legend>{group.label}</legend>
                {group.keys.filter(key => key !== "partnerNetwork" || partnerNetworkEnabled).map(key => <label className={styles.module} key={key}>
                  <input type="checkbox" checked={modules.includes(key)} disabled={key === "work"} onChange={() => toggleModule(key)}/>
                  <span><b>{STAFF_APPS[key].label}</b><small>{STAFF_APPS[key].description}</small></span>
                </label>)}
              </fieldset>)}
            </div>
          </>}
          {editable && <footer className={styles.actions}>
            <button className="hl-button hl-button--primary" type="submit" disabled={!dirty || saving}>{saving ? "Đang lưu…" : "Lưu quyền"}</button>
            {dirty && !saving && <small>Có thay đổi chưa lưu</small>}
          </footer>}
          {message && <p role="status">{message}</p>}
        </form>}
      </div>}
      {error && <p className={styles.error} role="alert">{error} <button type="button" disabled={saving} onClick={load}>Tải lại danh sách</button></p>}
      {!members.length && !error && <p>Chưa có thành viên.</p>}
    </>}
  </main>;
}
