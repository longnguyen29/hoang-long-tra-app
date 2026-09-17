import { ACCOUNT_TYPES, VERTICAL_TAGS } from "@/lib/prospect-types";
import styles from "./ProspectDiscovery.module.css";

// Uncontrolled fields deliberately retain edits while a sibling form saves.
export function metadataFromForm(form) {
  return {
    account_type: form.get("account_type"), country_code: form.get("country_code"),
    vertical_tags: form.getAll("vertical_tags"), is_watchlisted: form.has("is_watchlisted"),
  };
}
export default function ProspectAccountFields({ prospect = {} }) {
  return <fieldset className={styles.accountFields}>
    <legend>Phân loại khách hàng</legend>
    <label>Loại khách hàng<select name="account_type" defaultValue={prospect.account_type || "shop"}>
      {Object.entries(ACCOUNT_TYPES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
    </select></label>
    <label>Mã quốc gia<input name="country_code" defaultValue={prospect.country_code || "VN"} required minLength={2} maxLength={3} pattern="[A-Za-z]{2,3}" autoCapitalize="characters"/></label>
    <small>Mã 2–3 chữ cái; VN là mặc định, chưa xác minh địa điểm doanh nghiệp.</small>
    <details><summary>Nhãn lĩnh vực</summary><div className={styles.tagOptions}>
      {Object.entries(VERTICAL_TAGS).map(([key, label]) => <label className={styles.check} key={key}>
        <input type="checkbox" name="vertical_tags" value={key} defaultChecked={prospect.vertical_tags?.includes(key)}/>{label}
      </label>)}
    </div></details>
    <label className={styles.check}><input type="checkbox" name="is_watchlisted" defaultChecked={prospect.is_watchlisted || false}/>Theo dõi hồ sơ</label>
  </fieldset>;
}
