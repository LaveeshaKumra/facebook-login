const express=require("express");
const passport=require("passport");
const FacebookStrategy=require("passport-facebook").Strategy;
const session=require("express-session");
const cookieParser=require("cookie-parser");
const bodyParser=require("body-parser");
const config=require("./configuration/config");
const mysql=require("mysql");
const app=express();

//define mysql parameter in config.js file
const pool=mysql.createPool({
  host : config.host,
  user : config.username,
  password : config.password,
  database: config.database
});
//passport session setup
passport.serializeUser(function(user,done){
  done(null,user);
});

passport.deserializeUser(function(obj,done){
  done(null,obj);
});

//use the facebook strategy within passport
passport.use(new FacebookStrategy({
  clientID:config.facebook_api_key,
  clientSecret:config.facebook_api_secret,
  callbackURL: config.callback_url
},

function(assessToken,refreshToken,profile,done){
  process.nextTick(function(){
    //checks weather user exist or not using profile id
    if(config.use_database){
      //if sets true
      pool.query("select * from user_info where user_id="+profile.id,(err,rows)=>{
        console.log(rows);
        if(err) throw err;
        if(rows && rows.length===0){


          console.log("there is no such user, adding now ");
          console.log(profile);
         pool.query("insert into user_info(user_id,user_name) values ('"+profile.id+"','"+profile.displayName+"')");
        }
        else{
          console.log("user already exists")
        }
      });
    }
    return done(null,profile);
  });
}));

app.set('views',__dirname + '/views');
app.set('view engine','ejs');
app.use(cookieParser());
app.use(bodyParser.urlencoded({extended:true}));
app.use(session({secret:'keyboard cat',key:'sid'}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(__dirname +'/public'));


app.get('/',function(req,res){
  res.render('index',{user:req.user});
});

app.get('/account',ensureAuthenticated,function(req,res){
  res.render('account',{user:req.user});
});

app.get('/auth/facebook',passport.authenticate('facebook',{scope:'email'}));

app.get('/auth/facebook/callback',passport.authenticate('facebook',{successRedirect:'/',failureRedirect:'/login'}),
function(req,res){
  res.redirect('/');
});

app.get('logout',function(req,res){
  req.logout();
  res.redirect();
});


function ensureAuthenticated(req,res,next){
  if(req.isAuthenticated()){return next();}
  res.redirect('/login');
}

app.listen(3000);
