export async function deleteSelectedConversations(ids, remove) {
  const removed=[];
  const failed=[];
  for(const id of ids){
    try {
      await remove(id);
      removed.push(id);
    } catch(error) {
      if(error.message==="thread_not_found") removed.push(id);
      else failed.push(id);
    }
  }
  return {removed,failed};
}
