
const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        await mongoose.connect('mongodb+srv://varun:1jVJTrqYe1ZIvjdw@microfinance.8d4fjn4.mongodb.net/?appName=microfinance');
        console.log("Connected to Database");
    }
    catch (error){
        console.log("Connection Failed! : ", error);

    }
};

module.exports = connectDB;