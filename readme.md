# TicketZone Server 🚀

Backend server for the TicketZone application built with Express.js, MongoDB, and Firebase Admin Authentication.

## 🎯 Purpose

This project was created to practice and apply backend development concepts such as REST APIs, authentication, database management, and secure server-side operations using Express.js and MongoDB.

## 🌐 Live API

https://ticket-zone-server.vercel.app

## 🛠️ Technologies Used

- Node.js
- Express.js
- MongoDB
- Firebase Admin SDK
- Stripe
- dotenv
- cors

## ✨ Features

- RESTful API development
- Firebase token verification
- Protected API routes
- Role-based authorization
- MongoDB CRUD operations
- Stripe payment integration
- Booking and transaction management
- Secure environment variable handling

## 📦 NPM Packages

```bash
express
mongodb
cors
dotenv
stripe
firebase-admin
```

## ⚙️ Installation

Clone the repository

```bash
git clone https://github.com/riday-kumar/ticket-zone-server-side.git
```

Go to the project directory

```bash
cd project-name
```

Install dependencies

```bash
npm install
```

Run the server

```bash
nodemon index.js
```

## 🔐 Environment Variables

Create a `.env` file and add:

```env
DB_USER=your_db_user
DB_PASS=your_db_password
SITE_DOMAIN=your_site_domain
STRIPE_SECRET_KEY=your_secret_key
```

## 📌 API Endpoints

| Method | Endpoint          | Description                       |
| ------ | ----------------- | --------------------------------- |
| GET    | /approved-tickets | Get all approved tickets by admin |
| GET    | /featured-tickets | Get all featured tickets          |
| POST   | /bookings         | Create bookings                   |
| GET    | /my-transaction   | Get user transactions             |

## 👨‍💻 Developed By

Hridoy Kumar Saha
