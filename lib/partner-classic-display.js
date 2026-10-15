// Display only; financial entitlement is always calculated by the database.
export function currentClassicAgreement(snapshot, partnerId, at = new Date()) {
 const time = new Date(at).getTime();
 return (snapshot?.classic_agreements || []).filter(row => (!partnerId || row.partner_id === partnerId) && new Date(row.effective_at).getTime() <= time).sort((a,b) => new Date(b.effective_at)-new Date(a.effective_at) || b.version-a.version)[0] || null;
}
