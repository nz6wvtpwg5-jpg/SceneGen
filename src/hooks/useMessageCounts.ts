'use client';
import {useEffect,useState} from 'react';
import {useProfileStore} from '@/store/useProfileStore';
export function useMessageCounts(){
  const {activeProfile}=useProfileStore();
  const workspaceId=activeProfile?.id;
  const canMessage=Boolean(workspaceId && ['owner','admin'].includes(activeProfile?.membershipRole||''));
  const [counts,setCounts]=useState({pendingRequests:0,unreadConversations:0});
  useEffect(()=>{
    const controller=new AbortController();
    setCounts({pendingRequests:0,unreadConversations:0});
    if(!canMessage || !workspaceId)return;
    const load=async()=>{
      try{
        const response=await fetch('/api/promoter-outreach/summary',{headers:{'X-Entity-Id':workspaceId},signal:controller.signal,cache:'no-store'});
        if(!response.ok)return;
        const data=await response.json();
        if(!controller.signal.aborted)setCounts({pendingRequests:Number(data.pendingRequests)||0,unreadConversations:Number(data.unreadConversations)||0});
      }catch{/* If offline, don't display an invented count. */}
    };
    void load();const interval=setInterval(()=>void load(),45000);
    return()=>{controller.abort();clearInterval(interval);};
  },[canMessage,workspaceId]);
  return {pendingRequests:counts.pendingRequests,unreadConversations:counts.unreadConversations,total:counts.pendingRequests+counts.unreadConversations};
}
