const express = require("express");
var cors = require("cors");
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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

    // user role
    app.get("/user/role", async (req, res) => {
      const email = req.query.email;
      const query = { email };
      const user = await userCollection.findOne(query);
      res.send(user);
    });

    // users related api
    app.get("/users", async (req, res) => {
      const cursor = userCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // given access of ------>'admin' or 'vendor'
    app.patch("/users/:id", async (req, res) => {
      const id = req.params.id;
      const role = req.query.role;
      const email = req.query.email;
      // find that user and check he is admin or not
      const isCheck = await userCollection.find({ email });
      if (isCheck.role !== "admin") {
        return res.send({
          message: "You are not eligible for changing the role",
        });
      }
      // console.log(id);
      const filter = { _id: new ObjectId(id) };
      const document = {
        $set: {
          role: role,
        },
      };

      const result = await userCollection.updateOne(filter, document);
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
    // (vendors get all tickets which he added)
    app.get("/tickets", async (req, res) => {
      const email = req.query.email;

      const filter = { vendorEmail: email };

      const findTickets = ticketCollection.find(filter);
      const result = await findTickets.toArray();
      res.send(result);
    });

    // get single ticket for showing update form (vendor)
    app.get("/tickets/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { _id: new ObjectId(id) };
      const result = await ticketCollection.findOne(filter);
      res.send(result);
    });

    // ticket add (vendor)
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
        ticketPrice: Number(ticketPrice),
        ticketQuantity: Number(ticketQuantity),
        departureTime: departureTime,
        perks: perks,
        photoURL: photoURL,
        vendorName: vendorName,
        vendorEmail: vendorEmail,
        status: "pending",
        advertise: "no",
        createdAt: new Date(),
      };

      const result = await ticketCollection.insertOne(newTicket);
      res.status(201).send(result);
    });

    //ticket update (vendor)
    app.patch("/tickets/:id", async (req, res) => {
      const id = req.params.id;

      const filter = { _id: new ObjectId(id) };

      // check ticket status 'pending' or 'approved'
      const thatTicket = await ticketCollection.findOne(filter);

      if (thatTicket?.status === "rejected") {
        return res.send({ message: "rejected tickets can't be update" });
      }

      const {
        ticketTitle,
        ticketFrom,
        ticketTo,
        transportType,
        ticketPrice,
        ticketQuantity,
        departureTime,
        perks,
      } = req.body;

      const updateDocument = {
        $set: {
          ticketTitle,
          ticketFrom,
          ticketTo,
          transportType,
          ticketPrice,
          ticketQuantity,
          departureTime,
          perks,
        },
      };

      const result = await ticketCollection.updateOne(filter, updateDocument);
      res.send(result);
    });

    // ticket delete (vendor)
    app.delete("/tickets/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };

      // check ticket status 'pending' or 'approved'
      const thatTicket = await ticketCollection.findOne(filter);

      if (thatTicket?.status === "rejected") {
        return res.send({ message: "rejected tickets can't be Delete" });
      }

      const result = await ticketCollection.deleteOne(filter);
      res.send(result);
    });

    // all tickets for admin
    app.get("/vendors-added-tickets", async (req, res) => {
      const cursor = ticketCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // ticket approved by admin
    app.patch("/approve-ticket/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { _id: new ObjectId(id) };
      const document = {
        $set: {
          status: "approved",
        },
      };

      const result = await ticketCollection.updateOne(filter, document);
      res.send(result);
    });

    // ticket rejected by admin
    app.patch("/reject-ticket/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const document = {
        $set: {
          status: "rejected",
        },
      };

      const result = await ticketCollection.updateOne(filter, document);
      res.send(result);
    });

    // get all the approved tickets for 'advertising',
    //  admin can select for show advertise
    // advertise ticket page + Home page + all tickets page
    app.get("/approved-tickets", async (req, res) => {
      const { from, to, type, sort } = req.query;

      const query = { status: "approved" };

      // From + To search
      if (from || to) {
        query.$or = [];

        if (from) {
          query.$or.push({
            ticketFrom: { $regex: from, $options: "i" },
          });
        }

        if (to) {
          query.$or.push({
            ticketTo: { $regex: to, $options: "i" },
          });
        }
      }

      // Sort
      const options = {
        sort: {},
      };

      if (sort === "low") {
        options.sort.ticketPrice = 1;
      } else if (sort === "high") {
        options.sort.ticketPrice = -1;
      } else {
        options.sort.createdAt = -1;
      }

      // Transport filter
      if (type === "all-type") {
        options.sort.createdAt = -1;
        query.transportType = {
          $in: ["Bus", "Train", "Flight", "Ship"],
        };
      } else if (type) {
        query.transportType = type;
      }

      const result = await ticketCollection.find(query, options).toArray();

      res.send(result);
    });

    // featured tickets that admin wanted to advertise + shown in 'home'
    app.get("/featured-tickets", async (req, res) => {
      const filter = {
        status: "approved",
        advertise: "yes",
      };

      const cursor = ticketCollection.find(filter).limit(6);
      const result = await cursor.toArray();
      res.send(result);
    });

    // advertise ticket by 'Admin'
    app.patch("/advertise-tickets/:id", async (req, res) => {
      const id = req.params.id;
      const { advertise } = req.query;

      const filter = {
        _id: new ObjectId(id),
      };

      const updateDoc = {
        $set: {
          advertise: advertise,
        },
      };

      const result = await ticketCollection.updateOne(filter, updateDoc);
      res.send(result);
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
