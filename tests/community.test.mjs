import test from "node:test";
import assert from "node:assert/strict";

import {
  escapeHtml,
  initials,
  formatDateTime,
  toMillis,
  buildShareUrl,
  filterFeed,
  sortFeed,
  categoryMeta
} from "../js/community.js";

const feedItems = [
  {
    id:"p1",
    type:"post",
    uid:"u1",
    authorName:"Asha Rao",
    text:"Water tanker at the temple gate",
    category:"general",
    likeCount:2,
    createdAt:{toDate:()=>new Date("2026-01-02T10:00:00Z")}
  },
  {
    id:"p2",
    type:"post",
    uid:"u2",
    authorName:"Mohan",
    text:"Lost a brown cow near the lake",
    location:"Hosakote Lake",
    category:"lost",
    likeCount:9,
    createdAt:new Date("2026-01-03T10:00:00Z")
  },
  {
    id:"a1",
    type:"announcement",
    uid:"",
    authorName:"Village Office",
    title:"Gram Sabha meeting",
    message:"Sunday at 10am in the panchayat hall",
    category:"notice",
    likeCount:0,
    createdAt:new Date("2026-01-01T10:00:00Z")
  }
];

test("escapeHtml neutralises member supplied markup", () => {
  assert.equal(
    escapeHtml(`<img src=x onerror="alert('x')">`),
    "&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt;"
  );
  assert.equal(escapeHtml("Ramesh & Sons"), "Ramesh &amp; Sons");
  assert.equal(escapeHtml(null), "");
});

test("initials builds a two letter avatar label", () => {
  assert.equal(initials("Asha Rao"), "AR");
  assert.equal(initials("Mohan"), "MO");
  assert.equal(initials(""), "M");
});

test("formatDateTime handles Firestore, Date and empty values", () => {
  assert.match(formatDateTime({toDate:()=>new Date("2026-01-02T10:00:00Z")}), /2026/);
  assert.match(formatDateTime(new Date("2026-01-02T10:00:00Z")), /Jan/);
  assert.equal(formatDateTime(null), "");
  assert.equal(toMillis(undefined), 0);
});

test("buildShareUrl points at the real feed page instead of a fake /post route", () => {
  const url = buildShareUrl({origin:"https://abhiynh.github.io", pathname:"/feeds.html"}, "abc123");
  assert.equal(url, "https://abhiynh.github.io/feeds.html?post=abc123");
  assert.ok(!url.includes("/post/abc123"));
});

test("filterFeed narrows by type, search text, category and author", () => {
  assert.equal(filterFeed(feedItems, {type:"announcement"}).length, 1);
  assert.equal(filterFeed(feedItems, {type:"post"}).length, 2);

  const lake = filterFeed(feedItems, {search:"  LAKE "});
  assert.deepEqual(lake.map(i=>i.id), ["p2"]);

  const office = filterFeed(feedItems, {search:"gram sabha"});
  assert.deepEqual(office.map(i=>i.id), ["a1"]);

  const lost = filterFeed(feedItems, {category:"lost"});
  assert.deepEqual(lost.map(i=>i.id), ["p2"]);

  const mine = filterFeed(feedItems, {onlyMine:true, uid:"u1"});
  assert.deepEqual(mine.map(i=>i.id), ["p1"]);

  assert.equal(filterFeed(feedItems, {search:"nothing here"}).length, 0);
});

test("sortFeed orders by date and popularity without mutating the input", () => {
  const newest = sortFeed(feedItems, "newest").map(i=>i.id);
  assert.deepEqual(newest, ["p2","p1","a1"]);

  const oldest = sortFeed(feedItems, "oldest").map(i=>i.id);
  assert.deepEqual(oldest, ["a1","p1","p2"]);

  const popular = sortFeed(feedItems, "popular").map(i=>i.id);
  assert.deepEqual(popular, ["p2","p1","a1"]);

  assert.deepEqual(feedItems.map(i=>i.id), ["p1","p2","a1"]);
});

test("categoryMeta falls back to General for unknown categories", () => {
  assert.equal(categoryMeta("event").label, "Event");
  assert.equal(categoryMeta("mystery").label, "General");
  assert.equal(categoryMeta(undefined).label, "General");
});
