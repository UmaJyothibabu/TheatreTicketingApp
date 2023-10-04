const mongoose = require("mongoose");

// const rateSchema = mongoose.Schema({
//   seat_type: {
//     type: String,
//     requires: true,
//   },
//   rate: {
//     type: Number,
//     required: true,
//   },
// });

const castSchema = mongoose.Schema({
  actor: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    required: true,
  },
});

const movieSchema = mongoose.Schema({
  movie_name: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  languages: {
    type: [String],
    required: true,
  },
  cast: {
    type: [castSchema],
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  duration: {
    type: String,
  },
  genre: {
    type: [String],
  },
  ticket_rates: {
    type: Number,
    required: true,
  },
  seat_count: {
    type: Number,
    required: true,
  },
  timing: {
    type: String,
  },
  start_date: {
    type: Date,
    required: true,
  },
  end_date: {
    type: Date,
    required: true,
  },
});

const movieData = mongoose.model("movie", movieSchema);
module.exports = movieData;
