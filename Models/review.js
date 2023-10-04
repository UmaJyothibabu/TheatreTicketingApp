const mongoose = require("mongoose");
const movies = require("./movie");
const users = require("./user");

const reviewSchema = mongoose.Schema({
  movie: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "movies",
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users", // Reference to the User model
    required: true,
  },
  review: String,
  rating: Number,
});

const reviewModel = mongoose.model("review", reviewSchema);
module.exports = reviewModel;
