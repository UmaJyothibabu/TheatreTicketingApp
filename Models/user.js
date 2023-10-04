const mongoose = require("mongoose");

const ticketSchema = mongoose.Schema({
  movie_name: {
    type: String,
    requiredd: true,
  },
  seat_no: {
    type: String,
    requiredd: true,
  },
  date_time: {
    type: Date,
    requiredd: true,
  },
});

const userSchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  phone: {
    type: Number,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    required: true,
  },
  ticket_details: { type: [ticketSchema] },
});

const userData = mongoose.model("user", userSchema);
module.exports = userData;
