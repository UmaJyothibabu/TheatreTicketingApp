const express = require("express");
const router = express.Router();
const auth = require("../Middleware/Auth");

const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// accessing schemas
const movieData = require("../Models/movie");
const userData = require("../Models/user");
const reviewData = require("../Models/review");
const ticketData = require("../Models/ticket");

const baseUrl = process.env.BASE_URL || "http://localhost:8000";

router.use(express.json());
router.use(express.urlencoded({ extended: true }));
// const destinationPath = path.resolve(__dirname, "../uploads");

// // Check if the directory exists, and create it if not
// if (!fs.existsSync(destinationPath)) {
//   fs.mkdirSync(destinationPath, { recursive: true });
// }

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads/"); // Specify the destination folder where uploaded files will be stored
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname); // Define the file name for uploaded files
  },
});

const upload = multer({ storage: storage });
// adding new movies

router.post("/movie", upload.single("image"), auth, async (req, res) => {
  try {
    // console.log(req.body.role);
    if (req.body.role === "Admin") {
      // console.log(req.body);

      // Access the uploaded file details via req.file
      if (!req.file) {
        return res.status(400).json({ message: "No image file received" });
      }
      // const webImagePath = imagePathFromDB.replace(/\\/g, '/');
      const imagePath = req.file.path.replace(/\\/g, "/");
      req.body.image = imagePath;
      req.body.cast = JSON.parse(req.body.cast);
      req.body.languages = JSON.parse(req.body.languages);
      req.body.genre = JSON.parse(req.body.genre);
      console.log(req.body);
      const newMovie = movieData(req.body);

      await newMovie.save();
      res.status(200).json({ message: "Movie data added Successfully" });
    } else {
      res.status(401).json({ message: "Access denied" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Unable  add movie data" });
  }
});

// Deleting a movie
router.delete("/movie/:id", auth, async (req, res) => {
  try {
    if (req.body.role === "Admin") {
      const { id } = req.params;
      // Retrieve the movie data including the image file path
      const movie = await movieData.findById(id);

      if (!movie) {
        return res.status(404).json({ message: "Movie not found" });
      }

      // Delete the image file if it exists
      if (movie.image) {
        const imagePath = path.join(__dirname, "uploads", movie.image);

        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      }

      // Delete the movie record from the database
      await movieData.findByIdAndDelete(id);

      res.status(200).json({ message: "Movie deleted successfully" });
    } else {
      res.status(401).json({ message: "Access denied" });
    }
  } catch (error) {
    res.status(500).json({ message: "unable to delete", err: error.message });
  }
});

// update ticket rate

router.put("/movie/rate/:id", auth, async (req, res) => {
  try {
    if (req.body.role === "Admin") {
      const { id } = req.params;
      console.log(req.body);
      const updateMovie = await movieData.findByIdAndUpdate(id, {
        ticket_rates: req.body.ticket_rates,
      });
      res.status(200).json({ message: "Ticket rate is updated" });
    } else {
      res.status(401).json({ message: "Access denied" });
    }
  } catch (error) {
    console.log(error.message);
    res.json({ message: "Unable to update", err: error.message });
  }
});

// update movie timing
router.put("/movie/time/:id", auth, async (req, res) => {
  try {
    if (req.body.role === "Admin") {
      const { id } = req.params;
      const updateMovie = await movieData.updateOne(
        { _id: id },
        {
          timing: req.body.timing,
        }
      );
      res.status(200).json({ message: "Timing updated" });
    } else {
      res.status(401).json({ message: "Access denied" });
    }
  } catch (error) {
    console.log(error.message);
    res.json({ message: "Unable to update", err: error.message });
  }
});

// find Average rating of a movie
router.get("/avgreview/:id", auth, async (req, res) => {
  try {
    if (req.body.role === "Admin") {
      const { id } = req.params;
      const movieObjectId = new mongoose.Types.ObjectId(id);

      // finding the average rating
      const averageRatingPipeline = [
        { $match: { movie: movieObjectId } },
        { $group: { _id: null, averageRating: { $avg: "$rating" } } },
      ];

      const averageRatingResult = await reviewData.aggregate(
        averageRatingPipeline
      );

      const averageRating =
        averageRatingResult.length > 0
          ? averageRatingResult[0].averageRating
          : 0;
      console.log(averageRating);
      res.status(200).json(averageRating);
    } else {
      res.status(401).json({ message: "Access denied" });
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// find ticket sold for each day for a movie
router.get("/ticketcount/:id", auth, async (req, res) => {
  try {
    if (req.body.role === "Admin") {
      const { id } = req.params;
      console.log(id);
      const movieId = new mongoose.Types.ObjectId(id);

      const ticketCounts = await ticketData.aggregate([
        { $match: { movie: movieId } }, // Filter tickets for the specific movie
        {
          $unwind: "$seat_number", // Flatten the seat_number array
        },
        {
          $group: {
            _id: {
              $dateFromString: {
                dateString: {
                  $dateToString: { format: "%d-%m-%Y", date: "$date" },
                },
              },
            }, // Group by booking date
            totalTicketsSold: { $sum: 1 },
          },
        },

        { $sort: { _id: 1 } },
        {
          $project: {
            _id: {
              $dateToString: {
                format: "%d-%m-%Y", // Format the date as dd-mm-yyyy
                date: "$_id",
              },
            },
            totalTicketsSold: 1,
          },
        },
      ]);
      if (ticketCounts.length !== 0) res.status(200).json(ticketCounts);
      else res.status(200).json({ message: "No bookings" });
    } else {
      res.status(401).json({ message: "Access denied" });
    }
  } catch (error) {
    console.log(error);
  }
});
module.exports = router;
