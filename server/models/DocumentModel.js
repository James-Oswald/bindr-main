const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const docSchema = new Schema({
    name: String,
    author: [],
    invites: [],
}, { collection: 'docs' });

module.exports = User = mongoose.model("document", docSchema);