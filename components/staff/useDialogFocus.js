"use client";
import {useEffect,useRef} from "react";
export function useDialogFocus(ref, open, onClose) {
 const close = useRef(onClose); close.current = onClose;
 useEffect(() => {
  if(!open || !ref.current)return;
  const opener=document.activeElement, dialog=ref.current;
  const controls=()=>[...dialog.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')].filter(node=>node.getClientRects().length);
  (controls()[0] || dialog).focus();
  function keydown(event){
   if(event.key==='Escape'){event.preventDefault();close.current();return}
   if(event.key!=='Tab')return;
   const nodes=controls(),first=nodes[0],last=nodes.at(-1);
   if(!first){event.preventDefault();dialog.focus();return}
   if(event.shiftKey && (document.activeElement===first || !dialog.contains(document.activeElement))){event.preventDefault();last.focus()}
   else if(!event.shiftKey && (document.activeElement===last || !dialog.contains(document.activeElement))){event.preventDefault();first.focus()}
  }
  document.addEventListener('keydown',keydown);
  return ()=>{document.removeEventListener('keydown',keydown);if(opener?.isConnected)opener.focus()};
 },[open,ref]);
}
