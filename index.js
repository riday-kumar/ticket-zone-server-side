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
    const ticketCollection = db.collection("tickets");

    // users related api
    app.get("/users", async (req, res) => {
      const cursor = userCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

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

    // ticket related
    app.post("/tickets", async (req, res) => {
      const {
        ticketTitle,
        ticketFrom,
        ticketTo,
        transportType,
        ticketPrice,
        ticketQuantity,
        departureTime,
        perks,
        photoURL,
        vendorName,
        vendorEmail,
      } = req.body;

      const newTicket = {
        ticketTitle: ticketTitle,
        ticketFrom: ticketFrom,
        ticketTo: ticketTo,
        transportType: transportType,
        ticketPrice: ticketPrice,
        ticketQuantity: ticketQuantity,
        departureTime: departureTime,
        perks: perks,
        photoURL: photoURL,
        vendorName: vendorName,
        vendorEmail: vendorEmail,
        status: "pending",
        createdAt: new Date(),
      };

      const result = await ticketCollection.insertOne(newTicket);
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
