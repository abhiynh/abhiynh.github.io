/* Shared helpers for the Y N Hosakote community feed.
   Deliberately free of Firebase imports so the logic can be unit tested. */

export const CATEGORY_META = {
  general:{label:"General", icon:"forum", badge:"bg-slate-100 text-slate-700"},
  event:{label:"Event", icon:"event", badge:"bg-purple-100 text-purple-700"},
  help:{label:"Help Needed", icon:"volunteer_activism", badge:"bg-rose-100 text-rose-700"},
  lost:{label:"Lost & Found", icon:"travel_explore", badge:"bg-amber-100 text-amber-800"},
  notice:{label:"Notice", icon:"campaign", badge:"bg-blue-100 text-blue-700"}
};

const HTML_ESCAPES = {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"};

/* Escapes every value that comes from a member before it reaches innerHTML. */
export function escapeHtml(value){
  return String(value ?? "").replace(/[&<>"']/g, (ch)=>HTML_ESCAPES[ch]);
}

export function categoryMeta(key){
  return CATEGORY_META[key] || CATEGORY_META.general;
}

export function initials(name){
  const words = String(name || "").trim().split(/\s+/).filter(Boolean);
  if(!words.length) return "M";
  const letters = words.length === 1 ? words[0].slice(0,2) : words[0][0] + words[1][0];
  return letters.toUpperCase();
}

/* Accepts a Firestore Timestamp, Date, epoch number or ISO string. */
export function toMillis(value){
  if(!value) return 0;
  if(typeof value === "number") return value;
  if(value instanceof Date) return value.getTime();
  if(typeof value.toDate === "function"){
    try{ return value.toDate().getTime(); }catch{ return 0; }
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function formatDateTime(value){
  const ms = toMillis(value);
  if(!ms) return "";
  return new Date(ms).toLocaleString("en-IN",{
    day:"2-digit",
    month:"short",
    year:"numeric",
    hour:"numeric",
    minute:"2-digit",
    hour12:true
  });
}

/* Deep link that GitHub Pages can actually serve: feeds.html?post=<id> */
export function buildShareUrl(locationLike, postId){
  const origin = locationLike?.origin ?? "";
  const pathname = locationLike?.pathname ?? "/feeds.html";
  return `${origin}${pathname}?post=${encodeURIComponent(String(postId ?? ""))}`;
}

function searchBlob(item){
  return [item.authorName, item.title, item.text, item.message, item.location, item.category]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function filterFeed(items, options = {}){
  const {type = "all", search = "", category = "all", onlyMine = false, uid = ""} = options;
  const needle = String(search).trim().toLowerCase();

  return (items || []).filter((item)=>{
    if(!item) return false;
    if(type !== "all" && item.type !== type) return false;
    if(category !== "all" && (item.category || "general") !== category) return false;
    if(onlyMine && (!uid || item.uid !== uid)) return false;
    if(needle && !searchBlob(item).includes(needle)) return false;
    return true;
  });
}

export function sortFeed(items, sort = "newest"){
  const list = [...(items || [])];
  if(sort === "oldest"){
    return list.sort((a,b)=>toMillis(a.createdAt) - toMillis(b.createdAt));
  }
  if(sort === "popular"){
    return list.sort((a,b)=>
      (b.likeCount || 0) - (a.likeCount || 0) ||
      toMillis(b.createdAt) - toMillis(a.createdAt)
    );
  }
  return list.sort((a,b)=>toMillis(b.createdAt) - toMillis(a.createdAt));
}
