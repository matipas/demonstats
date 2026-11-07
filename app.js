const API = "https://demonstats.onrender.com";

const boards = {
  ds: { label: "Demon Stars", field: "ds" },
  mp: { label: "Moon Points", field: "mp" },
  lp: { label: "List Points", field: "lp" },
  dcp: { label: "Demon Creator Points", field: "dcp" }
};

let board = "ds";
let players = [];
let list = "classic";
let difficulty = "all";
let page = 0;
let loading = false;

const $ = selector => document.querySelector(selector);

async function loadPlayers() {
  try {
    const response = await fetch(`${API}/api/leaderboard`);
    if (!response.ok) throw new Error("Leaderboard unavailable");

    const data = await response.json();
    players = Array.isArray(data.players) ? data.players : [];
    renderBoard();
  } catch (error) {
    const rows = $("#leaderboardRows");
    if (rows) {
      rows.innerHTML =
        `<tr><td colspan="4">Leaderboard is waiting for backend support.</td></tr>`;
    }
  }
}

function renderBoard() {
  const rows = $("#leaderboardRows");
  if (!rows) return;

  const sorted = [...players].sort(
    (a, b) => Number(b[board] || 0) - Number(a[board] || 0)
  );

  rows.innerHTML = sorted.length
    ? sorted.map((player, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHTML(player.name || "Unknown")}</td>
        <td>${Number(player[board] || 0).toLocaleString()}</td>
      </tr>
    `).join("")
    : `<tr><td colspan="3">No verified players yet.</td></tr>`;

  const title = $("#leaderboardTitle");
  if (title) title.textContent = boards[board].label;
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function renderLevels(levels) {
  const grid = $("#levelGrid");
  if (!grid) return;

  const query = ($("#levelSearch")?.value || "").trim().toLowerCase();

  const shown = levels.filter(level =>
    `${level.name} ${level.creator} ${level.difficulty}`
      .toLowerCase().includes(query)
  );

  grid.innerHTML = shown.length
    ? shown.map(level => `
      <article class="level-card">
        <h3>${escapeHTML(level.name)}</h3>
        <p>By ${escapeHTML(level.creator || "Unknown creator")}</p>
        <p>${escapeHTML(level.difficulty || "Demon")}</p>
      </article>
    `).join("")
    : `<p>No matching demons found.</p>`;
}

async function loadDemons(reset = false) {
  if (loading) return;
  if (reset) page = 0;

  loading = true;

  try {
    const params = new URLSearchParams({
      type: list,
      difficulty,
      page: String(page)
    });

    const response = await fetch(`${API}/api/demons?${params}`);
    if (!response.ok) throw new Error("Could not load demons");

    const data = await response.json();

    renderLevels(data.levels || []);
    page++;
  } catch (error) {
    const grid = $("#levelGrid");
    if (grid) grid.innerHTML = "<p>Could not load demons. Try again later.</p>";
  } finally {
    loading = false;
  }
}

document.querySelectorAll("[data-board]").forEach(button => {
  button.addEventListener("click", () => {
    board = button.dataset.board;
    document.querySelectorAll("[data-board]").forEach(item =>
      item.classList.toggle("active", item === button)
    );
    renderBoard();
  });
});

document.querySelectorAll("[data-list]").forEach(button => {
  button.addEventListener("click", () => {
    list = button.dataset.list;
    document.querySelectorAll("[data-list]").forEach(item =>
      item.classList.toggle("active", item === button)
    );
    loadDemons(true);
  });
});

$("#levelSearch")?.addEventListener("input", () => loadDemons(true));

$("#difficultyFilter")?.addEventListener("change", event => {
  difficulty = event.target.value;
  loadDemons(true);
});

$("#loadMore")?.addEventListener("click", () => loadDemons());

$("#menuToggle")?.addEventListener("click", () => {
  $("#mainNav")?.classList.toggle("open");
});

$("#recordForm")?.addEventListener("submit", async event => {
  event.preventDefault();

  const message = $("#formMessage");
  if (message) {
    message.textContent =
      "Record submissions need backend approval and verification.";
  }
});

loadPlayers();
loadDemons(true);