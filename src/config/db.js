
const mongoose = require('mongoose');
require("dotenv").config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MongoDB_URI);
        console.log("Connected to Database");
    }
    catch (error){
        console.log("Connection Failed! : ", error);

    }
};

module.exports = connectDB;