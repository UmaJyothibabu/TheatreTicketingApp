const express = require("express");
const app = new express();

const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
require("dotenv").config();
const mongoose = require("mongoose");

app.use(express.static(path.join(__dirname, "/build")));
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT;

const accountApi = require("./Routes/users");
const customerApi = require("./Routes/customer");
const adminApi = require("./Routes/admin");
app.use("/uploads", express.static("uploads"));

app.use("/api", accountApi); //routes for login and sign up
app.use("/api", adminApi); //routes handling admin activities
app.use("/api", customerApi); //routes handling customer activities

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.mongodb_url);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

app.get("/*", function (req, res) {
  res.sendFile(path.join(__dirname, "/build/index.html"));
});

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running at port ${PORT}`);
  });
});
