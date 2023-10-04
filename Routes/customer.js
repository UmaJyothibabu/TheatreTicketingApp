const router = require("express").Router();
const jwt = require("jsonwebtoken");
const { default: mongoose } = require("mongoose");
const nodemailer = require("nodemailer");
require("dotenv").config();

const auth = require("../Middleware/Auth");

// requiring models
const movieData = require("../Models/movie");
const userData = require("../Models/user");
const reviewData = require("../Models/review");
const ticketData = require("../Models/ticket");

//Getting movie list
router.get("/movie", async (req, res) => {
  try {
    let movies = await movieData.find();

    if (movies.length !== 0) {
      const imgUrl = `${req.protocol}://${req.get("host")}/`;

      res.status(200).json({ movies: movies, imgUrl: imgUrl });
    } else {
      res.status(200).json({ message: "No movies to show" });
    }
  } catch (error) {
    res.json({ message: "Unable to load", err: error.message });
  }
});

// Getting only a particular movie
router.get("/movie/:id", async (req, res) => {
  try {
    const { id } = req.params;
    // console.log(id);
    let movie = await movieData.findById(id);
    if (movie) {
      movie = {
        ...movie,
        image: `${req.protocol}://${req.get("host")}/${movie.image}`,
      };
      res.status(200).json(movie);
    } else {
      res.status(404).json({ message: "Not found" });
    }
  } catch (error) {
    res.json({ message: "unable to find", err: error.message });
  }
});

// adding review of a movie
router.post("/reviews", auth, async (req, res) => {
  try {
    if (req.body.role === "Customer") {
      // console.log(req.body);
      const review = await reviewData.findOne({
        user: req.body.user,
        movie: req.body.movie,
      });
      if (review) {
        res.json({ message: "You already reviewed the movie" });
        return;
      }
      const newReview = reviewData(req.body);
      await newReview.save();
      res.status(200).json({ message: "Review added Successfully" });
    } else {
      res.status(401).json({ message: "Access denied" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Unable  add movie review" });
  }
});

// getting reviews of a movie

router.get("/reviews/:id", auth, async (req, res) => {
  try {
    if (req.body.role === "Customer") {
      const { id } = req.params;

      // Convert the id parameter to ObjectId
      const movieObjectId = new mongoose.Types.ObjectId(id);

      // finding the average rating
      const averageRatingPipeline = [
        { $match: { movie: movieObjectId } },
        { $group: { _id: null, averageRating: { $avg: "$rating" } } },
      ];

      const averageRatingResult = await reviewData.aggregate(
        averageRatingPipeline
      );

      // finding movie reviews
      const reviews = await reviewData
        .find({ movie: id })
        .populate("user", "name", userData);

      // console.log("Review List:", reviews);

      if (reviews.length !== 0) {
        const averageRating =
          averageRatingResult.length > 0
            ? averageRatingResult[0].averageRating
            : 0;

        res.status(200).json({
          reviews: reviews,
          averageRating: averageRating,
        });
      } else {
        res.status(200).json({ message: "No one reviewed the movie" });
      }
    } else {
      res.status(401).json({ message: "Access denied" });
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// delete movie review
router.delete("/reviewdelete/:id/:userId", auth, async (req, res) => {
  try {
    if (req.body.role === "Customer") {
      const { id, userId } = req.params;
      const deletedReview = await reviewData.findOneAndDelete({
        _id: id,
        user: userId,
      });
      if (deletedReview) {
        res.status(200).json({ message: "Review deleted successfully" });
      } else {
        res.status(404).json({ message: "Review not found" });
      }
    } else {
      res.status(401).json({ message: "Access denied" });
    }
  } catch (error) {
    res.status(500).json({ message: "unable to delete", err: error.message });
  }
});

// send mail function
const sendMail = async (ticket) => {
  let { username, movie, seat_number, date, time, total_rate } = ticket;

  const movie_name = await movieData.findById(movie, { movie_name: 1, _id: 0 });
  console.log(movie_name);
  let config = {
    service: "gmail",
    auth: {
      user: process.env.EMAIL,
      pass: process.env.PASSWORD,
    },
  };

  let transporter = nodemailer.createTransport(config);
  let message = {
    from: process.env.EMAIL,
    to: username,
    subject: "Awesome Movie Ticket Confirmation",
    html: `<div style="border:1px solid #C9BBC1;background-color:#E4DDE0" >
          <h1 style="text-align:center;margin-top:7vh">Awesome Movies</h1>
          <h2 style="text-align:center">${movie_name.movie_name}</h2>
          <h3 style="text-align:center">Seat number :${seat_number.map(
            (val) => {
              val = val + " ";
              return val;
            }
          )}</h3>
          <h3 style="text-align:center">Time : ${time}</h3>
          <h3 style="text-align:center">Total : ${total_rate} RS</h3>
    </div>
    <p>Regards</p>
    <p>Awesome movies</p>`,
  };
  transporter
    .sendMail(message)
    .then(() => {
      console.log("message sent");
    })
    .catch((error) => {
      console.log(error);
      console.log("unable to send");
    });
};

// ticket booking and email sending

router.post("/movie/ticket", auth, async (req, res) => {
  try {
    if (req.body.role === "Customer") {
      console.log(req.body);
      // checking if req.body contain seat which is already booked
      const existingTicket = await ticketData.find({
        movie: req.body.movie,
        date: req.body.date,
        seat_number: { $in: req.body.seat_number },
      });

      console.log(existingTicket);
      if (existingTicket.length !== 0) {
        return res.status(400).json({
          message:
            "Some seats are already booked for this movie on the same date.",
        });
      }

      const newTicket = ticketData(req.body);
      const savedData = await newTicket.save();
      sendMail(req.body);
      res.status(200).json({ message: "Booking completed" });
    } else {
      res.status(401).json({ message: "Access denied" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Unable  add booking" });
  }
});

// getting tickets booked by a person
router.get("/ticket/:username", auth, async (req, res) => {
  try {
    if (req.body.role === "Customer" || req.body.role === "Admin") {
      const { username } = req.params;
      console.log(username);

      const tickets = await ticketData
        .find({ username: username })
        .populate("movie", "movie_name", movieData);

      if (tickets.length === 0) {
        return res.status(200).json({ message: "No bokkings yet" });
      } else {
        res.status(200).json(tickets);
      }
    } else {
      res.status(401).json({ message: "Access denied" });
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// getting tickets sold for a movie each day with seat number
router.get("/movietickets/:id", auth, async (req, res) => {
  try {
    if (req.body.role === "Customer" || req.body.role === "Admin") {
      const { id } = req.params;
      console.log(id);

      const movieId = new mongoose.Types.ObjectId(id);
      const tickets = await ticketData.aggregate([
        { $match: { movie: movieId } },
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
            seats: { $push: "$seat_number" },
          },
        },
      ]);
      console.log(tickets);
      if (tickets.length !== 0) res.status(200).json(tickets);
      else res.status(200).json({ message: "No booking" });
    } else {
      res.status(401).json({ message: "Access denied" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json("Server error");
  }
});

// getting whole tickets from collection
router.get("/tickets", async (req, res) => {
  try {
    // console.log("hi");
    const tickets = await ticketData
      .find()
      .populate("movie", "movie_name", movieData);
    console.log(tickets);
    if (tickets.length === 0) {
      return res.status(200).json({ message: "No bookings yet" });
    } else {
      res.status(200).json(tickets);
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Cancel booking
router.delete("/ticket/:id", auth, async (req, res) => {
  try {
    if (req.body.role === "Customer") {
      const { id } = req.params;
      await ticketData.findByIdAndDelete(id);
      res.status(200).json({ message: "Booking cancelled" });
    } else {
      res.status(401).json({ message: "Access denied" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "unable to delete", err: error.message });
  }
});

// cancel seats only
router.put("/ticket/:id", auth, async (req, res) => {
  try {
    if (req.body.role === "Customer") {
      const { id } = req.params;
      const updateTicket = await ticketData.findByIdAndUpdate(id, {
        seat_number: req.body.seat_number,
        total_rate: req.body.total_rate,
      });
      res.status(200).json({ message: "Seat cancellation successful" });
    } else {
      res.status(401).json({ message: "Access denied" });
    }
  } catch (error) {
    console.log(error.message);
    res.json({ message: "Unable to Cancel", err: error.message });
  }
});

module.exports = router;
