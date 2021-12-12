const express = require('express');
const  {check, body} = require('express-validator/check') // express-validator installed to validate input data
// body -> It would just look for in the body
const authController = require('../controllers/auth');
const User = require('../models/user') ;

const router = express.Router();

router.get('/login', authController.getLogin);

router.get('/signup', authController.getSignup);

router.post('/login', [body('email').isEmail().withMessage("Please enter a valid email")
                        .normalizeEmail(),  // Sanitizing user data
            body('password', "Password has to be valid")
                    .isLength({min: 5})
                    .isAlphanumeric()
                    .trim() 
    ], authController.postLogin);

router.post('/signup', 
[
check('email')
.isEmail()
.withMessage('Please enter a valid email')
.custom((value, {req}) =>{
    return User.findOne({email: value})
    .then(userDoc => {
        if (userDoc)
        {   
            return Promise.reject('Email exists already, please pick a different one')  // Throwing an error 
        }
    })
})
.normalizeEmail() ,
body('password', 'Please enter a password with only numbers and text and at least 5 characters long').isLength({min: 5}).isAlphanumeric().trim(),
body('confirmPassword').trim().custom((value, {req}) => {  // custom validator 
    if (value !== req.body.password)
    {
        throw new Error('Passwords have to match') ;
    }
    return true ;
})
],
authController.postSignup);    // looks for 'email', int req.body, params, cookies, etc, and finds and does the respective validation

router.post('/logout', authController.postLogout);

router.get('/reset', authController.getReset) ;

router.post('/reset', authController.postReset) ;

router.get('/reset/:token', authController.getNewPassword) ;

router.post('/new-password', authController.postNewPassword) ;
module.exports = router;