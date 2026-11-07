
const express = require("express");
const cors = require("cors");
const crypto = require("crypto");

const app = express();
app.use(cors());
app.use(express.json());

const GD = "https://www.boomlings.com/database/";
const SECRET = "Wmfd2893gb7";
const BINARY_VERSION = "51";

const codes = new Map();
const players = new Map();

async function gdRequest(endpoint, data) {
  const body = new URLSearchParams({
    secret: SECRET,
    gameVersion: "22",
    binaryVersion: BINARY_VERSION,
    ...data
  });

  const response = await fetch(GD + endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": ""
    },
    body
  });

  if (!response.ok) {
    throw new Error("Geometry Dash server request failed.");
  }

  return response.text();
}

function parseObject(text) {
  const values = text.split(":");
  const object = {};

  for (let i = 0; i + 1 < values.length; i += 2) {
    object[values[i]] = values[i + 1];
  }

  return object;
}

function getPlayer(username, accountId) {
  const key = String(accountId);

  if (!players.has(key)) {
    players.set(key, {
      username,
      accountId: key,
      DS: 0,
      MP: 0,
      LP: 0
    });
  }

  return players.get(key);
}

// DEMON LIST
app.get("/api/demons", async (req, res) => {
  try {
    const type = req.query.type === "platformer"
      ? "platformer"
      : "classic";

    const difficulty = req.query.difficulty || "all";
    const page = Math.max(0, Math.min(10000, Number(req.query.page || 0)));

    const filters = {
      type: "2",
      diff: "-2",
      star: "1",
      page: String(page),
      total: "0"
    };

    if (type === "platformer") filters.len = "5";

    if (difficulty !== "all") {
      const value = Number(difficulty);

      if (!Number.isInteger(value) || value < 1 || value > 5) {
        return res.status(400).json({
          error: "Invalid demon difficulty."
        });
      }

      filters.demonFilter = String(value);
    }

    const response = await gdRequest("getGJLevels21.php", filters);

    if (!response || response === "-1") {
      return res.json({
        type,
        page,
        levels: [],
        hasResults: false
      });
    }

    const levels = response.split("#")[0]
      .split("|")
      .filter(Boolean)
      .map(raw => {
        const data = parseObject(raw);

        return {
          id: data["1"],
          name: data["2"] || "Unknown level",
          creatorId: data["6"] || "",
          stars: Number(data["18"] || 0)
        };
      });

    res.json({
      type,
      page,
      levels,
      hasResults: levels.length > 0
    });
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

// START GEOMETRY DASH VERIFICATION
app.post("/api/verify/start", (req, res) => {
  const username = String(req.body.username || "").trim();

  if (!username || username.length > 30) {
    return res.status(400).json({
      error: "Enter a valid GD username."
    });
  }

  const code = "DS-" +
    crypto.randomBytes(5).toString("hex").toUpperCase();

  codes.set(username.toLowerCase(), {
    code,
    expires: Date.now() + 10 * 60 * 1000
  });

  res.json({
    username,
    code,
    expiresInSeconds: 600
  });
});

// CHECK GEOMETRY DASH VERIFICATION
app.post("/api/verify/check", async (req, res) => {
  try {
    const username = String(req.body.username || "").trim();
    const code = String(req.body.code || "").trim();
    const key = username.toLowerCase();
    const stored = codes.get(key);

    if (!stored || stored.code !== code) {
      return res.status(400).json({
        error: "Invalid verification code."
      });
    }

    if (Date.now() > stored.expires) {
      codes.delete(key);

      return res.status(400).json({
        error: "Your code expired. Generate another."
      });
    }

    const search = await gdRequest("getGJUsers20.php", {
      str: username,
      page: "0",
      total: "0"
    });

    if (!search || search === "-1") {
      return res.status(404).json({
        error: "Geometry Dash player not found."
      });
    }

    const user = parseObject(search.split("#")[0]);
    const accountId = user["16"];

    if (!accountId) {
      return res.status(400).json({
        error: "Could not find account ID."
      });
    }

    const profileResponse = await gdRequest(
      "getGJUserInfo20.php",
      { targetAccountID: accountId }
    );

    if (!profileResponse || profileResponse === "-1") {
      return res.status(502).json({
        error: "Could not read the public GD profile."
      });
    }

    const profile = parseObject(profileResponse);

    if (
      String(profile["16"] || "") !== String(accountId) ||
      String(profile["61"] || "") !== code
    ) {
      return res.status(400).json({
        error: "The code was not found in the correct GD profile."
      });
    }

    codes.delete(key);

    const player = getPlayer(
      profile["1"] || username,
      accountId
    );

    res.json({
      verified: true,
      player,
      message: "Verified! You may remove the code from your GD profile."
    });
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

// ALL THREE LEADERBOARDS
app.get("/api/leaderboard/:currency", (req, res) => {
  const currency = req.params.currency.toUpperCase();

  if (!["DS", "MP", "LP"].includes(currency)) {
    return res.status(400).json({
      error: "Choose DS, MP or LP."
    });
  }

  const leaderboard = [...players.values()]
    .sort((a, b) => b[currency] - a[currency])
    .map((player, index) => ({
      rank: index + 1,
      username: player.username,
      accountId: player.accountId,
      points: player[currency]
    }));

  res.json({
    currency,
    leaderboard
  });
});

// ALL CURRENCIES FOR ONE PLAYER
app.get("/api/player/:accountId", (req, res) => {
  const player = players.get(String(req.params.accountId));

  if (!player) {
    return res.status(404).json({
      error: "Player not found."
    });
  }

  res.json(player);
});

// PROTECTED POINT AWARDING
// Set ADMIN_KEY in Render environment variables.
// Never put the key in public website code.
app.post("/api/admin/award", (req, res) => {
  const adminKey = process.env.ADMIN_KEY;

  if (!adminKey || req.get("x-admin-key") !== adminKey) {
    return res.status(403).json({
      error: "Not authorised."
    });
  }

  const { accountId, currency, amount } = req.body;
  const type = String(currency || "").toUpperCase();
  const points = Number(amount);

  if (!["DS", "MP", "LP"].includes(type)) {
    return res.status(400).json({
      error: "Currency must be DS, MP or LP."
    });
  }

  if (
    !accountId ||
    !Number.isSafeInteger(points) ||
    points <= 0 ||
    points > 1000
  ) {
    return res.status(400).json({
      error: "Invalid account ID or point amount."
    });
  }

  const player = players.get(String(accountId));

  if (!player) {
    return res.status(404).json({
      error: "Verified player not found."
    });
  }

  player[type] += points;

  res.json({
    success: true,
    player
  });
});

app.get("/", (req, res) => {
  res.send("DemonStats backend is running.");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("DemonStats backend running on port " + PORT);
});
