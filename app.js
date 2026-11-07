const players = [
  {name:"Nova", ds:1280, mp:640, lp:210, status:"TOP PLAYER"},
  {name:"PixelRush", ds:940, mp:820, lp:185, status:"ACTIVE"},
  {name:"MATIPAS", ds:145, mp:80, lp:35, status:"RISING"},
  {name:"WaveCore", ds:120, mp:55, lp:20, status:"ACTIVE"}
];

const levels = {
  classic:[
    {name:"Shiver", creator:"SpKale", difficulty:"Easy Demon", stars:10, className:"Easy class"},
    {name:"System Split", creator:"Danzmen", difficulty:"Medium Demon", stars:20, className:"Easy class"},
    {name:"Nine Circles", creator:"Zobros", difficulty:"Hard Demon", stars:30, className:"Easy class"},
    {name:"Bloodlust", creator:"Knobbelboy", difficulty:"Extreme Demon", stars:55, className:"Hard class"},
    {name:"Alkatraz", creator:"TeamN2", difficulty:"Insane Demon", stars:45, className:"Hard class"}
  ],
  platformer:[
    {name:"Coaster Mountain", creator:"Example Creator", difficulty:"Easy Demon", stars:10, className:"Easy class"},
    {name:"The Tower", creator:"Example Creator", difficulty:"Medium Demon", stars:25, className:"Hard class"},
    {name:"Flipswap Factory", creator:"Example Creator", difficulty:"Hard Demon", stars:30, className:"Easy class"}
  ]
};

let board="ds", list="classic";
const $ = (s)=>document.querySelector(s);

function renderBoard(){
  const sorted=[...players].sort((a,b)=>b[board]-a[board]);
  $("#leaderboardRows").innerHTML=sorted.map((p,i)=>`<tr><td>${String(i+1).padStart(2,"0")}</td><td>${p.name}</td><td>${p[board].toLocaleString()} ${board.toUpperCase()}</td><td><span class="status">${p.status}</span></td></tr>`).join("");
}

function renderLevels(){
  const q=$("#levelSearch").value.trim().toLowerCase();
  const shown=levels[list].filter(l=>(l.name+" "+l.creator+" "+l.difficulty).toLowerCase().includes(q));
  $("#levelGrid").innerHTML=shown.length?shown.map(l=>`<article class="level-card"><div class="level-card-top"><span class="difficulty">${l.difficulty}</span><span class="muted">${l.className}</span></div><h3>${l.name}</h3><p>by ${l.creator}</p><div class="level-meta"><span>${list==="classic"?"CLASSIC DEMON":"PLATFORMER DEMON"}</span><b>${l.stars} ${list==="classic"?"DS":"MP"} sample</b></div></article>`).join(""):`<p class="muted">No matching levels in this sample list.</p>`;
}

document.querySelectorAll("[data-board]").forEach(b=>b.addEventListener("click",()=>{
  document.querySelectorAll("[data-board]").forEach(x=>x.classList.remove("active"));
  b.classList.add("active");
  board=b.dataset.board;
  renderBoard();
}));

document.querySelectorAll("[data-list]").forEach(b=>b.addEventListener("click",()=>{
  document.querySelectorAll("[data-list]").forEach(x=>x.classList.remove("active"));
  b.classList.add("active");
  list=b.dataset.list;
  renderLevels();
}));

$("#levelSearch").addEventListener("input",renderLevels);

$("#recordForm").addEventListener("submit",e=>{
  e.preventDefault();
  const data=Object.fromEntries(new FormData(e.currentTarget).entries());
  try{
    const saved=JSON.parse(localStorage.getItem("demonstats-demo-submissions")||"[]");
    saved.push({...data,createdAt:new Date().toISOString()});
    localStorage.setItem("demonstats-demo-submissions",JSON.stringify(saved));
    $("#formMessage").textContent="Demo submission saved on this device. It has NOT been sent to a moderator.";
    e.currentTarget.reset();
  }catch(err){
    $("#formMessage").textContent="Could not save in this browser. Please try again.";
  }
});

$("#menuToggle").addEventListener("click",()=>$("#mainNav").classList.toggle("open"));
document.querySelectorAll("#mainNav a").forEach(a=>a.addEventListener("click",()=>$("#mainNav").classList.remove("open")));

renderBoard();
renderLevels();