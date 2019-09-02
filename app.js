'use strict';

// load modules
const express = require('express');
const morgan = require('morgan');

// variable to enable global error logging
const enableGlobalErrorLogging = process.env.ENABLE_GLOBAL_ERROR_LOGGING === 'true';

// create the Express app
const app = express();

// Define sequelize
const sequelize = require("./models").sequelize;

// setup morgan which gives us http request logging
app.use(morgan('dev'));

// setup json parsing and access to req.body
app.use(express.json());
//app.use(express.urlencoded({ extended: true }));

// setup api routes
const homeRoute = require('./routes/home');
const usersRoute = require('./routes/users');
const coursesRoute = require('./routes/courses');

app.use('/api', homeRoute);
app.use('/api', usersRoute);
app.use('/api', coursesRoute);

// REDIRECT TO BOOKS ROUTE
app.get("/", function(req, res, next) {
  res.redirect("/api");
});

// send 404 if no other route matched
app.use((req, res) => {
  res.status(404).json({
    message: 'Route Not Found',
  });
});

// setup a global error handler
app.use((err, req, res, next) => {
  if (enableGlobalErrorLogging) {
    console.error(`Global error handler: ${JSON.stringify(err.stack)}`);
  }

  res.status(err.status || 500).json({
    message: err.message,
    error: {},
  });
});

//Set port value
app.set('port', process.env.PORT || 5000);

// Test connection to database
console.log('Testing the connection to the database');
sequelize
  .authenticate() // Authenticating database
  .then(() => {
    // Sync database
    console.log('Connection successful - synchronizing models to database');
    return sequelize.sync();
  })
  .then(() => {
    // Listen on port after database has been synced
    const server = app.listen(app.get('port'), () => {
      console.log(`Express server is listening on port ${server.address().port}`);
    });
  }) // Catch error if database did not sync
  .catch(err => console.log('Connection failed - unable to connect to the database'));

