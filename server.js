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

function parseLevels(response) {
  if (!response || response === "-1") return [];

  const parts = response.split("#");
  if (!parts[0]) return [];

  return parts[0].split("|").filter(Boolean).map(raw => {
    const data = parseObject(raw);

    return {
      id: data["1"],
      name: data["2"] || "Unknown level",
      creatorId: data["6"] || "",
      stars: Number(data["18"] || data["43"] || 0),
      demonDifficulty: Number(data["43"] || 0)
    };
  });
}

async function getCreatorNames(levels) {
  return levels.map(level => ({
    ...level,
    creator: level.creatorId || "Unknown creator"
  }));
}

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
        return res.status(400).json({error:"Invalid demon difficulty."});
      }
      filters.demonFilter = String(value);
    }

    const response = await gdRequest("getGJLevels21.php", filters);
    const levels = parseLevels(response);

    res.json({
      type,
      page,
      levels: await getCreatorNames(levels),
      hasResults: levels.length > 0
    });
  } catch (error) {
    res.status(502).json({error:error.message});
  }
});

app.post("/api/verify/start", (req, res) => {
  const username = String(req.body.username || "").trim();

  if (!username || username.length > 30) {
    return res.status(400).json({error:"Enter a valid GD username."});
  }

  const code = "DS-" + crypto.randomBytes(5).toString("hex").toUpperCase();

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

app.post("/api/verify/check", async (req, res) => {
  try {
    const username = String(req.body.username || "").trim();
    const code = String(req.body.code || "").trim();
    const key = username.toLowerCase();
    const stored = codes.get(key);

    if (!stored || stored.code !== code) {
      return res.status(400).json({error:"That code is not valid. Generate a new one."});
    }

    if (Date.now() > stored.expires) {
      codes.delete(key);
      return res.status(400).json({error:"Your code expired. Generate a new one."});
    }

    const search = await gdRequest("getGJUsers20.php", {
      str: username,
      page: "0",
      total: "0"
    });

    if (!search || search === "-1") {
      return res.status(404).json({error:"Geometry Dash player not found."});
    }

    const user = parseObject(search.split("#")[0]);
    const accountId = user["16"];

    if (!accountId) {
      return res.status(400).json({error:"Could not find the player's account ID."});
    }

    const profileResponse = await gdRequest("getGJUserInfo20.php", {
      targetAccountID: accountId
    });

    if (!profileResponse || profileResponse === "-1") {
      return res.status(502).json({error:"Could not read the public GD profile."});
    }

    const profile = parseObject(profileResponse);
    const customText = profile["61"] || "";

    if (customText !== code) {
      return res.status(400).json({
        error:"The code was not found in the Geometry Dash Custom profile text. Save your profile and try again."
      });
    }

    codes.delete(key);

    res.json({
      verified: true,
      username: profile["1"] || username,
      accountId,
      message:"Verified! You may remove the code from your Custom profile text."
    });
  } catch (error) {
    res.status(502).json({error:error.message});
  }
});

app.get("/", (req, res) => {
  res.send("DemonStats backend is running.");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("DemonStats backend running on port " + PORT);
});