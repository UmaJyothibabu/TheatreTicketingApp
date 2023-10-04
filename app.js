const express = require("express");
const app = express(); // No need for 'new' keyword

const {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3"); // Import AWS SDK v3 S3Client and commands
const s3 = new S3Client(); // Create an S3 client instance

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

app.use("/api", accountApi); // Routes for login and sign up
app.use("/api", adminApi); // Routes handling admin activities
app.use("/api", customerApi); // Routes handling customer activities

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.mongodb_url);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(error); // Use console.error for errors
    process.exit(1);
  }
};

app.get("/*", function (req, res) {
  res.sendFile(path.join(__dirname, "/build/index.html"));
});

app.get("*", async (req, res) => {
  let filename = req.path.slice(1);

  try {
    const s3File = await s3.send(
      new GetObjectCommand({
        Bucket: process.env.BUCKET,
        Key: filename,
      })
    );

    res.set("Content-type", s3File.ContentType);
    res.send(Buffer.from(s3File.Body)).end();
  } catch (error) {
    if (error.name === "NoSuchKey") {
      console.log(`No such key ${filename}`);
      res.sendStatus(404).end();
    } else {
      console.error(error); // Use console.error for errors
      res.sendStatus(500).end();
    }
  }
});

app.put("*", async (req, res) => {
  let filename = req.path.slice(1);

  console.log(typeof req.body);

  await s3.send(
    new PutObjectCommand({
      Body: JSON.stringify(req.body),
      Bucket: process.env.BUCKET,
      Key: filename,
    })
  );

  res.set("Content-type", "text/plain");
  res.send("ok").end();
});

app.delete("*", async (req, res) => {
  let filename = req.path.slice(1);

  await s3.send(
    new DeleteObjectCommand({
      Bucket: process.env.BUCKET,
      Key: filename,
    })
  );

  res.set("Content-type", "text/plain");
  res.send("ok").end();
});

// Catch all handler for all other requests.
app.use("*", (req, res) => {
  res.sendStatus(404).end();
});

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running at port ${PORT}`);
  });
});
