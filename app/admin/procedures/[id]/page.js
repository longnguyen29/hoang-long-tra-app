import ProcedureDesk from '@/components/staff/ProcedureDesk';
export default async function ProcedurePage({params}){const {id}=await params;return <ProcedureDesk runId={id}/>}
