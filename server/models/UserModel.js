const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema({
    user: String,
    pw: String,
    documents: [],
}, { collection: 'users' });

module.exports = User = mongoose.model("user", userSchema);