const express = require("express");
var cors = require("cors");
const app = express();
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();
const port = process.env.PORT || 5000;
const dns = require("dns");
dns.setServers(["1.1.1.1", "8.8.8.8"]);

// middleware
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello World!");
});

// URI
const uri = process.env.CONNECTION_STRING;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    const db = client.db("ticketsZone");
    const userCollection = db.collection("users");

    // users related api
    app.post("/users", async (req, res) => {
      const { name, email } = req.body;
      const doc = {
        name: name,
        email: email,
        role: "user",
        createdAt: new Date(),
      };

      const findEmail = { email: email };

      const existsUser = await userCollection.findOne(findEmail);

      if (existsUser) {
        return res.send("user already exists");
      }

      const result = await userCollection.insertOne(doc);
      res.status(201).send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log("successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}

run().catch(console.dir);

app.listen(port, () => {
  console.log(`app listening on port ${port}`);
});
