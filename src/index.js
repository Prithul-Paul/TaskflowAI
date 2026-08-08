require("dotenv").config();


const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');

// console.log("PORT:", PORT);

const sequelize = require('./db'); // db setup using "Sequilize" ORM
require("./models"); // Loading all the models

const authRoutes = require("./routers/auth");



const app = express();
const PORT = process.env.PORT || 3000;

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());


// Api endpoints
app.use("/v1/api/", authRoutes);


async function startServer(){
  
  try {
    await sequelize.authenticate();
    console.log('MySQL connected successfully');

    await sequelize.sync();
    console.log("Models synchronized.");

    app.listen(PORT, async () => {
      console.log(`Server started on port ${PORT}`);
    });

  } catch (error) {
    console.error('Some error occurred:', error.message);
  }

};

startServer();
