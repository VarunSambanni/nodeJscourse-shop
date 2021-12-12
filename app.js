const path = require('path');
const { v4: uuidv4 } = require('uuid')

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session') ;
const MongoDBStore = require('connect-mongodb-session')(session) ;
const csrf = require('csurf') ;// Enabling CSRF protection, installed csurf package to do so
const flash = require('connect-flash') //package install connect-flash, using it here for providing user feedback and messages, by persisting data between redirects
const MONGODB_URI = 'mongodb+srv://ReadWriteUser:mongodbisnice@nodetutorial.0zjdn.mongodb.net/shop?retryWrites=true&w=majority' ;
const multer = require('multer') // For parsing file data from req body 
// nodemailer, nodemailer-sendgrid-transport, installed for sending mails integrated with sendgrid
const errorController = require('./controllers/error');
const User = require('./models/user');

const app = express();
const store = new MongoDBStore({
  uri: MONGODB_URI,
  collection: 'sessions',
}) ;

const csrfProtection = csrf() ; 

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'images') ;
  },
  filename: (req, file, cb) => {
    cb(null, uuidv4() + '-' + file.originalname) ;  // null -> no errors, store the file, uuidv4 package -> to create unique values  (UUID generator)
  }
}) ;

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'image/png' || file.mimetype === 'image/jpg' || file.mimetype === 'image/jpeg'){
    cb(null, true) ;
  }
  else 
  {
    cb(null, false) ;
  }
}

app.set('view engine', 'ejs');
app.set('views', 'views');

const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');

app.use(bodyParser.urlencoded({ extended: false }));   
app.use(multer({storage: fileStorage, fileFilter: fileFilter}).single('image'))// For parsing incoming requests containing files, install multer package
// Single -> expecting to get only one file  
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'images')));// Statically serving 'images' folder, 
// static -> serves them as if they were in the root folder, so we need to add /images at the start 

app.use(session({
  secret: 'my secret',
  resave: false,
  saveUninitialized: false,
  store: store
})) ;

// After initialising session

app.use(csrfProtection) ; 
app.use(flash()); // After intialising a session

app.use((req, res, next)=> {
  res.locals.isAuthenticated = req.session.isLoggedIn ; // Doing this instead of passing this info to every view renders
  res.locals.csrfToken = req.csrfToken() ;  
  next() ;
}) ;

app.use((req, res, next)=> {
  if (!req.session.user){
    return next() ;
  }
  User.findById(req.session.user._id)
        .then(user => {
          if (!user) {  // jic we dont find any user
            return next() ; 
          }
          req.user =  user // Using session data to set back the mongoose object of user
          next() ;
    })
    .catch(err => {
      // throw new Error(err) ;  // Inside async code, express error middlware cannot catch this 
      next(new Error(err)) ;  // This should be done 
    })  ; 
})

app.use('/admin', adminRoutes);
app.use(shopRoutes);
app.use(authRoutes) ;
app.get('/500', errorController.get500);
app.use(errorController.get404);

app.use((error, req, res, next) => {
  console.log("ERROR: ", error) ;
  res.status(500).render('500', {
    pageTitle: 'Error!' ,
    path: '/500',
    isAuthenticated: req.session.isLoggedIn
  }) ;
});  // Error handling middleware identified by express, if there are more than one, top to bottom execution 

mongoose
  .connect(
    MONGODB_URI
  )
  .then(result => {
    app.listen(3000);
  })
  .catch(err => {
    console.log(err);
  });
