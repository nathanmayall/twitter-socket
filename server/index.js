import needle from "needle";
import dotenv from "dotenv";
import { createServer } from "http";
import path from "path";
import express from "express";
import { Server } from "socket.io";

const PORT = process.env.PORT || 3000;

const app = express();
const server = createServer(app);
const io = new Server(server);

const __dirname = path.resolve();

app.get("/", (req, res) => {
  res.sendFile(path.resolve(__dirname, "client", "index.html"));
});

dotenv.config();

const TOKEN = process.env.BEARER_TOKEN;
const rulesUrl = "https://api.twitter.com/2/tweets/search/stream/rules";
const streamUrl =
  "https://api.twitter.com/2/tweets/search/stream?tweet.fields=public_metrics&expansions=author_id";

const rules = [{ value: "reddit" }];

// Get stream rules
const getRules = async (res) => {
  res = await needle("get", rulesUrl, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
    },
  });
  return res.body;
};

// Set stream rules
const setRules = async (res) => {
  const data = {
    add: rules,
  };

  res = await needle("post", rulesUrl, data, {
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${TOKEN}`,
    },
  });
  return res.body;
};

// Delete stream rules
const deleteRules = async (rules, res) => {
  if (!Array.isArray(rules.data)) {
    return null;
  }

  const ids = rules.data.map((rule) => rule.id);

  const data = {
    delete: {
      ids: ids,
    },
  };

  res = await needle("post", rulesUrl, data, {
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${TOKEN}`,
    },
  });

  return res.body;
};

const streamTweets = (socket) => {
  const stream = needle.get(streamUrl, {
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${TOKEN}`,
    },
  });

  stream.on("data", (data) => {
    try {
      //   console.log(json);
      socket.emit("tweet", JSON.parse(data));
    } catch (err) {
      console.log(err);
    }
  });
};

io.on("connection", async () => {
  console.log("Client Connected");

  let currentRules;

  try {
    // Get all stream rules
    currentRules = await getRules();
    // Delete all stream rules
    await deleteRules(currentRules);
    //set current stream rules based on declared array
    await setRules();
  } catch (err) {
    console.log(err);
    process.exit(1);
  }

  streamTweets(io);
});

server.listen(PORT, () => console.log(`listening on port ${PORT}`));
