const bcrypt = require('bcryptjs')

const crypto = require('crypto') // Built in nodeJS library 

// nodemailer, nodemailer-sendgrid-transport, installed for sending mails integrated with sendgrid
const nodemailer = require('nodemailer') ;
const sendgridTransport = require('nodemailer-sendgrid-transport') ;

const {validationResult} = require('express-validator') // Validation check package-> express-validator 

const User = require('../models/user') ;

const transporter = nodemailer.createTransport(sendgridTransport({
    auth: {
        api_key: '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'
    }
})) ; 

exports.getLogin = (req, res, next) => {
    //const isLoggedIn = req.get('Cookie').split(';')[0].trim().split('=')[1] === 'true';
    let message = req.flash('error') ;
    if (message.length > 0)
    {
        message = message[0] ;
    }
    else 
    {
        message = null ;
    }
    res.render('auth/login', {
    path: '/login',
    pageTitle: 'Login',
    errorMessage: message, // Just accessing the key, thereafter this info is removed from the session
    oldInput: {
        email: "",
        password: ""
    },
    validationErrors: [] 
});
};

exports.getSignup = (req, res, next) => {
    let message = req.flash('error') ;
    if (message.length > 0)
    {
        message = message[0] ;
    }
    else 
    {
        message = null ;
    }
    res.render('auth/signup', {
    path: '/signup',
    pageTitle: 'Signup',
    errorMessage: message,
    oldInput: {
        email: "",
        password: "",
        confirmPassword: "" 
    },
    validationErrors: []
  });
};

exports.postLogin = (req, res, next) => {
    const email = req.body.email ;
    const password = req.body.password ;

    const errors = validationResult(req) ;
    
    if (!errors.isEmpty())
    {
        return res.status(422).render('auth/login', {
            path: '/login',
            pageTitle: 'Login',
            errorMessage: errors.array()[0].msg,
            oldInput: {
                email: email,
                password: password
            },
            validationErrors: errors.array() 
        })
    }
    
    User.findOne({email: email})
        .then(user => {
            if (!user)
            {
                // req.flash('error', 'Invalid email or password')  We want to flash an error message to the user, flash method added by the package itself (connect-flash)
                return res.status(422).render('auth/login', {
                path: '/login',
                pageTitle: 'Login',
                errorMessage: 'Invalid email or password',
                oldInput: {
                    email: email,
                    password: password
                },
                validationErrors: [] 
                })
            }
            bcrypt.compare(password, user.password)
            .then(doMatch => {   // both matching and unmatching case we make it into the then block
                // doMatch -> boolean value, returns true or false accordingly
                if (doMatch)
                {
                    req.session.isLoggedIn = true ;
                    req.session.user = user ;
                    return req.session.save((err) => { // To make sure we redirect, after we save session in the database
                        console.log(err) ;
                        res.redirect('/'); 
                    }) ;
                } 
                return res.status(422).render('auth/login', {
                path: '/login',
                pageTitle: 'Login',
                errorMessage: 'Invalid email or password',
                oldInput: {
                    email: email,
                    password: password
                },
                validationErrors: [] 
                })
            })
            .catch(err => { // Only if something else goes wrong we enter this catch block
                res.redirect('/login')
            })
        })
    .catch(err => { 
      const error = new Error(err) 
      error.httpStatusCode = 500 ;
      return next(error) ;
    });
    // res.setHeader('Set-Cookie', 'loggedIn=true;')   // Setting a cookie
};

exports.postSignup = (req, res, next) => {
    const email = req.body.email ;
    const password = req.body.password ;
    
    const errors = validationResult(req)    // Retrieving errors if any
    if (!errors.isEmpty())
    {
        return res.status(422).render('auth/signup', {
        path: '/signup',
        pageTitle: 'Signup',
        errorMessage: errors.array()[0].msg, // just taking the first error
        oldInput: {email: email, password: password, confirmPassword: req.body.confirmPassword }, // Sending the data back, to keep the old input     
        validationErrors: errors.array() // For conditional CSS classes in  views
    }); 
    }
    // Checking if email already exists, the validation done before this in the routes file
    bcrypt.hash(password, 12)   // second value is how many rounds of hashing to be used(more the number, more secure it is)
        .then(hashedPassword => {
        const user = new User({
            email: email,
            password: hashedPassword, // bcryptjs package installed to encrypt passwords
            cart: {items: []}
        }) ;
        return user.save() ;
        })  
        .then(result => {
            res.redirect('/login') ;
            return transporter.sendMail({
                to: email,
                from: 'shop@node-complete.com',
                subject: 'Signup succeeded !',
                html: '<h1>You successfully signed up! </h1>'
            })     // returns a promise 
        })
        .catch(err=> {
            console.log("Error sending mail: ", err) ;
        })
    .catch(err => { 
      const error = new Error(err) 
      error.httpStatusCode = 500 ;
      return next(error) ;
    }) ;
};

exports.postLogout = (req, res, next) => {
        req.session.destroy((err) => {
        console.log(err) ;
        res.redirect('/')
    })
};

exports.getReset = (req, res, next) => {
    let message = req.flash('error') ;
    if (message.length > 0)
    {
        message = message[0] ;
    }
    else 
    {
        message = null ;
    }
    res.render('auth/reset', {
    path: '/reset',
    pageTitle: 'Reset Password',
    errorMessage: message
  });
}

exports.postReset = (req, res, next) => {
    crypto.randomBytes(32, (err, buffer) => {
        if (err){
            console.log(err) ;
            return res.redirect('/reset') ;
        }
        const token = buffer.toString('hex') ;
        User.findOne({email: req.body.email})
        .then(user=> {
            if (!user)
            {
                req.flash('error', 'No account with that email found') ;
                return res.redirect('/reset') ;
            }
            user.resetToken = token ;
            user.resetTokenExpiration = Date.now() + 3600000 ;
            return user.save() ;
        })
        .then(result => {
            res.redirect('/') ;
            return transporter.sendMail({
                    to: req.body.email,
                    from: 'shop@node-complete.com',
                    subject: 'Password reset!',
                    html: `
                            <p>You requested a password reset</p>
                            <p>Click this<a href= "http://localhost:3000/reset/${token}">  link to set a new password </p>
                        `
            })   
        })
        .catch(err => { 
            const error = new Error(err) 
            error.httpStatusCode = 500 ;
            return next(error) ;
            });
    })
}

exports.getNewPassword = (req, res, next) => {
    // check if u find an user with the token u received 
    const token  = req.params.token ;
    User.findOne({resetToken: token, resetTokenExpiration: {$gt: Date.now()}}) // $gt used for comparing if greater or not 
    .then(user => {
        let message = req.flash('error') ;
        if (message.length > 0)
        {
            message = message[0] ;
        }
        else 
        {
            message = null ;
        }
        res.render('auth/new-password', {
        path: '/new-password',
        pageTitle: 'New Password',
        errorMessage: message,
        userId: user._id.toString(),
        passwordToken: token
        });
    })
    .catch(err => { 
      const error = new Error(err) 
      error.httpStatusCode = 500 ;
      return next(error) ;
    }); 
}

exports.postNewPassword = (req, res, next) => {
    const newPassword = req.body.password ; 
    const userId = req.body.userId; // Extracting the userId sent with the hidden input, to change that particular users password
    const passwordToken = req.body.passwordToken ;
    let resetUser ;
    User.findOne({resetToken: passwordToken, resetTokenExpiration: {$gt: Date.now()}, _id: userId})
    .then(user => {
        resetUser = user ;
        return bcrypt.hash(newPassword, 12) ;
    })
    .then(hashedPassword => {
        resetUser.password = hashedPassword ;
        resetUser.resetToken = undefined ;
        resetUser.resetTokenExpiration = undefined ;
        return resetUser.save() ;
    })
    .then(result => {
        res.redirect('/login') ;
    })
    .catch(err => { 
      const error = new Error(err) 
      error.httpStatusCode = 500 ;
      return next(error) ;
    });
}