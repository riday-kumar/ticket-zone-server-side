const express = require("express");
var cors = require("cors");
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const port = process.env.PORT || 5000;
const stripe = require("stripe")(process.env.STRIPE_SECRET);

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
    const bookingCollection = db.collection("bookings");
    const transactionHistory = db.collection("transactionHistory");

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

    // get single ticket (vendor)
    app.get("/tickets/:id", async (req, res) => {
      const id = req.params.id;
      // console.log(id);
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

    // get all Requested bookings for showing vendor
    app.get("/req-bookings", async (req, res) => {
      const cluster = bookingCollection.find();
      const result = await cluster.toArray();
      res.send(result);
    });

    app.patch("/req-bookings/:id", async (req, res) => {
      const id = req.params.id;
      const reqMsg = req.query.msg;

      const filter = {
        _id: new ObjectId(id),
      };

      const updateDoc = {
        $set: {
          status: reqMsg,
        },
      };

      const result = await bookingCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // get all tickets for individual user
    app.get("/bookings", async (req, res) => {
      const { email } = req.query;
      const query = { userEmail: email };

      const result = await db
        .collection("bookings")
        .aggregate([
          {
            $match: { userEmail: email },
          },
          {
            $lookup: {
              from: "tickets",
              localField: "ticketId",
              foreignField: "_id",
              as: "ticketBooingCombineData",
            },
          },
        ])
        .toArray();

      // const cluster = bookingCollection.find(query);
      // const result = await cluster.toArray();

      res.send(result);
    });

    // bookings create api
    app.post("/bookings", async (req, res) => {
      const { bkTicketId, bkTotalPrice, bkuserEmail, bkuserTicketQuantity } =
        req.body;

      const doc = {
        ticketId: new ObjectId(bkTicketId),
        totalPrice: Number(bkTotalPrice),
        userEmail: bkuserEmail,
        ticketQuantity: Number(bkuserTicketQuantity),
        status: "pending",
        payment: "pending",
      };

      const result = await bookingCollection.insertOne(doc);
      res.send(result);
    });

    // payment related apis
    app.post("/create-checkout-session", async (req, res) => {
      const paymentInfo = req.body;
      const amount = parseInt(paymentInfo.cost) * 100;

      const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            price_data: {
              currency: "BDT",
              unit_amount: amount,
              product_data: {
                name: paymentInfo.ticketName,
              },
            },
            quantity: 1,
          },
        ],
        customer_email: paymentInfo.bookingEmail,
        mode: "payment",
        metadata: {
          bookingId: paymentInfo.bookingId,
          ticketId: paymentInfo.ticketId,
          bookingQuantity: paymentInfo.bookingQuantity,
          cost: paymentInfo.cost,
          ticketName: paymentInfo.ticketName,
        },
        success_url: `${process.env.SITE_DOMAIN}/dashboard/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.SITE_DOMAIN}/dashboard/payment-cancel`,
      });

      // console.log(session);
      res.send({ url: session.url });
    });

    app.patch("/verify-payment-success", async (req, res) => {
      const sessionId = req.query.session_id;
      // console.log("session id", sessionId);
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      // console.log("session get", session);
      if (session.payment_status === "paid") {
        const bookingId = session.metadata.bookingId;
        const ticketId = session.metadata.ticketId;
        const bookingQuantity = Number(session.metadata.bookingQuantity);
        const totalCost = session.metadata.cost;
        const bookingTicketName = session.metadata.ticketName;

        const queryForBookingId = { _id: new ObjectId(bookingId) };
        const findBooking = await bookingCollection.findOne(queryForBookingId);

        if (!findBooking) {
          return res.send({ message: "Booking is not get" });
        }

        if (findBooking.payment === "paid") {
          return res.send({ message: "Already Paid" });
        }

        const queryForTicketId = {
          _id: new ObjectId(ticketId),
          ticketQuantity: {
            $gte: bookingQuantity,
          },
        };
        const updateTicket = {
          $inc: {
            ticketQuantity: -bookingQuantity,
          },
        };
        // reduce quantity from ticket
        const updateTicketResult = await ticketCollection.updateOne(
          queryForTicketId,
          updateTicket,
        );

        if (updateTicketResult.modifiedCount === 0) {
          return res.send({ message: "insufficient ticket" });
        }

        // we will update payment status in the booking collection
        const updateBooking = {
          $set: {
            payment: "paid",
            paymentDate: new Date(),
          },
        };
        const updateBookingResult = await bookingCollection.updateOne(
          queryForBookingId,
          updateBooking,
        );

        // now create a transaction table
        const newTransaction = {
          bookingEmail: session.customer_email,
          transactionId: session.payment_intent,
          amount: totalCost,
          ticketTitle: bookingTicketName,
          paymentDate: new Date(),
        };
        const makeTransaction =
          await transactionHistory.insertOne(newTransaction);

        return res.status(200).send({ success: true });
      }

      res.send({ success: false });
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
