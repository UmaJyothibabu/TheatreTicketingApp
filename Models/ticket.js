const mongoose = require("mongoose");
const movies = require("./movie");

const ticketSchema = mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  movie: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "movies",
    required: true,
  },
  seat_number: {
    type: [String],
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  time: {
    type: String,
    required: true,
  },
  total_rate: {
    type: Number,
    required: true,
  },
});

const ticketModel = mongoose.model("ticket", ticketSchema);
module.exports = ticketModel;
