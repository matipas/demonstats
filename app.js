const players = [
  { name: "Nova", ds: 1280, mp: 640, lp: 210, status: "TOP PLAYER" },
  { name: "PixelRush", ds: 940, mp: 820, lp: 185, status: "ACTIVE" },
  { name: "MATIPAS", ds: 145, mp: 80, lp: 35, status: "RISING" },
  { name: "WaveCore", ds: 120, mp: 55, lp: 20, status: "ACTIVE" }
];

const levels = {
  classic: [
    { name: "Shiver", creator: "SpKale", difficulty: "Easy Demon", points: 10, className: "Easy class" },
    { name: "System Split", creator: "Danzmen", difficulty: "Medium Demon", points: 20, className: "Easy class" },
    { name: "Nine Circles", creator: "Zobros", difficulty: "Hard Demon", points: 30, className: "Easy class" },
    { name: "Bloodlust", creator: "Knobbelboy", difficulty: "Extreme Demon", points: 55, className: "Hard class" },
    { name: "Alkatraz", creator: "TeamN2", difficulty: "Insane Demon", points: 45, className: "Hard class" }
  ],

  platformer: [
    { name: "Coaster Mountain", creator: "Example Creator", difficulty: "Easy Demon", points: 10, className: "Easy class" },
    { name: "The Tower", creator: "Example Creator", difficulty: "Medium Demon", points: 25, className: "Hard class" },
    { name: "Flipswap Factory", creator: "Example Creator", difficulty: "Hard Demon", points: 30, className: "Easy class" }
  ]
};

let board = "ds";
let list = "classic";

const $ = selector => document.querySelector(selector);

function renderBoard() {
  const sorted = [...players].sort((a, b) => b[board] - a[board]);

  $("#leaderboardRows").innerHTML = sorted.map((player, index) => `
    <tr>
      <td>${String(index + 1).padStart(2, "0")}</td>
      <td>${player.name}</td>
      <td>${player[board].toLocaleString()} ${board.toUpperCase()}</td>
      <td><span class="status">${player.status}</span></td>
    </tr>
  `).join("");
}

function renderLevels() {
  const query = $("#levelSearch").value.trim().toLowerCase();

  const shown = levels[list].filter(level =>
    (level.name + " " + level.creator + " " + level.difficulty)
      .toLowerCase()
      .includes(query)
  );

  $("#levelGrid").innerHTML = shown.length
    ? shown.map(level => `
      <article class="level-card">
        <div class="level-card-top">
          <span class="difficulty">${level.difficulty}</span>
          <span class="muted">${level.className}</span>
        </div>
        <h3>${level.name}</h3>
        <p>by ${level.creator}</p>
        <div class="level-meta">
          <span>${list === "classic" ? "CLASSIC DEMON" : "PLATFORMER DEMON"}</span>
          <b>${level.points} ${list === "classic" ? "DS" : "MP"}</b>
        </div>
      </article>
    `).join("")
    : `<p class="muted">No matching levels in this example list.</p>`;
}

document.querySelectorAll("[data-board]").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-board]").forEach(item =>
      item.classList.remove("active")
    );

    button.classList.add("active");
    board = button.dataset.board;
    renderBoard();
  });
});

document.querySelectorAll("[data-list]").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-list]").forEach(item =>
      item.classList.remove("active")
    );

    button.classList.add("active");
    list = button.dataset.list;
    renderLevels();
  });
});

$("#levelSearch").addEventListener("input", renderLevels);

$("#recordForm").addEventListener("submit", event => {
  event.preventDefault();

  const data = Object.fromEntries(new FormData(event.currentTarget).entries());

  try {
    const saved = JSON.parse(
      localStorage.getItem("demonstats-demo-submissions") || "[]"
    );

    saved.push({
      ...data,
      createdAt: new Date().toISOString()
    });

    localStorage.setItem(
      "demonstats-demo-submissions",
      JSON.stringify(saved)
    );

    $("#formMessage").textContent =
      "Submission saved in this browser.";

    event.currentTarget.reset();
  } catch (error) {
    $("#formMessage").textContent =
      "Could not save. Please try again.";
  }
});

$("#menuToggle").addEventListener("click", () => {
  $("#mainNav").classList.toggle("open");
});

document.querySelectorAll("#mainNav a").forEach(link => {
  link.addEventListener("click", () => {
    $("#mainNav").classList.remove("open");
  });
});

renderBoard();
renderLevels();