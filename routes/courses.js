const express = require('express');
// Construct a router instance.
const router = express.Router();
const bcryptjs = require('bcryptjs');
const auth = require('basic-auth');
const Course = require("../models").Course;
const User = require("../models").User;

//Handler to repeate try/catches
const asyncHandler = cb => {
  return async (req, res, next) => {
    try {
      await cb(req, res, next);
    } catch(err) {
      console.log('Oops - There was an error with the App!');
      next(err);
    }
  }
}

//User authentication middleware
const authenticateUser = async (req, res, next) => {
  let message;
  // Parse the user's credentials from the Authorization header.
  const credentials = auth(req);
  if(credentials) {
    //Find user with matching email address
    const user = await User.findOne({
        raw: true,
        where: {
          emailAddress: credentials.name,
        },
    });
    //If user matches email
    if(user) {
      // Use the bcryptjs npm package to compare the user's password
      // (from the Authorization header) to the user's password
      // that was retrieved from the data store.
      const authenticated = bcryptjs.compareSync(credentials.pass, user.password);
      //If password matches
      if(authenticated) {
        console.log(`Authentication successful for user: ${user.firstName} ${user.lastName}`);
        if(req.originalUrl.includes('courses')) {
          //If route has a courses endpoint, set request userId to matched user id
          req.body.userId = user.id;
        } else if(req.originalUrl.includes('users')) {
          //If route has a users endpoint, set request id to matched user id
          req.body.id = user.id;
        }
      } else {
        //Otherwise the Authentication failed
        message = `Authentication failed for user: ${user.firstName} ${user.lastName}`;
      }
    } else {
      // No email matching the Authorization header
      message = `User not found for email address: ${credentials.name}`;
    }
  } else {
    //No user credentials/authorization header available
    message = 'Authorization header not found';
  }
  // Deny Access if there is anything stored in message
  if(message) {
    console.warn(message);
    const err = new Error('Access Denied');
    err.status = 401;
    next(err);
  } else {
    //User authenticated
    next();
  }
}

//GET/api/courses 200 - Returns a list of courses (including the user that owns each course)
router.get('/courses', asyncHandler(async (req, res) => {
  const courses = await Course.findAll({
    // Exclude private or unecessary info
    attributes: {
      exclude: ['createdAt', 'updatedAt'],
    },
    include: [
      {
        model: User,
        as: 'user',
        attributes: {
          exclude: ['password', 'createdAt', 'updatedAt'],
        },
      },
    ],
  });
  res.json(courses);
})
);

//'GET/api/courses/:id 200' -Returns a the course (including the user that owns the course) 
                           //for the provided course ID
router.get('/courses/:id', asyncHandler(async (req, res) => {
  const course = await Course.findAll({
    where: {
      id: req.params.id,
    },
    // Exclude private or unecessary info
    attributes: {
      exclude: ['createdAt', 'updatedAt'],
    },
    include: [
      {
        model: User,
        as: 'user',
        attributes: {
          exclude: ['password', 'createdAt', 'updatedAt'],
        },
      },
    ],
  });
  res.json(course);
})
);

//POST/api/courses 201 -  Creates a course, sets the Location header to the URI for the course, 
                          //and returns no content
router.post('/courses', authenticateUser, asyncHandler(async (req, res) => {
  // Model validations for User model
  const newCourse = await Course.create(req.body);
  res.location(`/api/courses/${newCourse.id}`);
  res.status(201).end();
})
);

//PUT/api/courses/:id 204 - Updates a course and returns no content
router.put('/courses/:id', authenticateUser, asyncHandler(async (req, res, next) => {
  let course = await Course.findByPk(req.params.id);
  // Checking if the user is the owner of the course
  if(course.userId === req.body.userId) {
    course.title = req.body.title;
    course.description = req.body.description;
    course.estimatedTime = req.body.estimatedTime;
    course.materialsNeeded = req.body.materialsNeeded;
    //Course model validations 
    course = await course.save();
    res.status(204).end();
  } else {
    // Forbidden from updated course
    const err = new Error('Forbidden');
    err.status = 403;
    next(err);
  }
})
);

//DELETE/api/courses/:id 204 - Deletes a course and returns no content
router.delete('/courses/:id', authenticateUser, asyncHandler(async (req, res, next) => {
  const course = await Course.findByPk(req.params.id);
  // Delete course only if user is the owner
  if(course.userId === req.body.userId) {
    await course.destroy();
    res.status(204).end();
  } else {
    //Forbidden from updated course
    const err = new Error('Forbidden');
    err.status = 403;
    next(err);
  }
})
);

  module.exports = router;