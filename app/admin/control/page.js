"use client";

import {useEffect,useMemo,useState} from "react";
import {useRouter} from "next/navigation";
import {createClient} from "@/lib/supabase/client";
import BusinessControl from "@/components/staff/BusinessControl";

export default function BusinessControlPage(){
 const router=useRouter(),supabase=useMemo(()=>createClient(),[]),[status,setStatus]=useState("checking"),[email,setEmail]=useState("");
 useEffect(()=>{let live=true;(async()=>{const {data:{user}}=await supabase.auth.getUser();if(!user){router.push("/admin/login");return}const {data:staff}=await supabase.from("staff_roles").select("role").eq("user_id",user.id).maybeSingle();if(!live)return;setEmail(user.email||"");setStatus(staff?"staff":"denied")})();return()=>{live=false}},[router,supabase]);
 const logout=async()=>{await supabase.auth.signOut();router.push("/admin/login");router.refresh()};
 if(status==="checking")return <main className="hl-admin-state" aria-live="polite"><span className="hl-admin-state__pulse"/><p>Đang mở phòng thương mại…</p></main>;
 if(status==="denied")return <main className="hl-admin-state hl-admin-state--denied"><section><span className="hl-auth__seal">皇龍</span><h1>Tài khoản không có quyền nhân viên.</h1><button className="hl-button hl-button--secondary" onClick={logout}>Đăng xuất</button></section></main>;
 return <BusinessControl supabase={supabase} email={email} onLogout={logout}/>;
}
