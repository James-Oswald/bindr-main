/* bindr - a collaboritve editing application
 * server.js - the centralized server for all platforms of application
 * version 1.1
 */
const express = require('express')
const app = express() // init express.js
const chalk = require('chalk') // fancier console logging
const fs = require('fs');
const path = require('path');
const key = fs.readFileSync('./development.pem');
const cert = fs.readFileSync('./development.pem');
const https = require('https');
const server = https.createServer({ key: key, cert: cert }, app);
var session = require('express-session');
const mongoose = require("mongoose");
const bodyParser = require('body-parser');
var urlencodedParser = bodyParser.urlencoded({ extended: true });
app.use(express.json());
const bcrypt = require('bcryptjs');

/* Temp config
 */
const PORT = 8080
const SESSION_SECRET = "penis123";
const SESSION_LIFETIME = 1000 * 60 * 60 * 10; // 10 hours
const SALTROUNDS = 10;

/* Init express-sessions
 */
app.use(session({
    resave: false,
    saveUninitialized: true,
    secret: SESSION_SECRET,
    cookie: {
        maxAge: SESSION_LIFETIME,
        sameSite: true,
        secure: false,
    }
}));

// init mongoose
const MONGODB_CONNECTION_STRING = "mongodb+srv://bindr:ImIHMyiLADlcn3tV@cluster0.mxnz1.mongodb.net/bindr?retryWrites=true&w=majority"; // replace with .env
mongoose.connect(MONGODB_CONNECTION_STRING, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true
}, (err) => {
    if (err) throw err;
    console.log("MongoDB connection established.")
});

/* Mongoose Models
 */
const User = require("./models/UserModel");
const Doc = require("./models/DocumentModel");

/* Load view engine (Pug)
 */
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(express.static('views'));

// Routing
app.get("/", (req, res) => {
    const ses = req.session;
    res.render('index', {
        session: ses.user,
    });
});

app.get("/register", (req, res) => {
    const ses = req.session;
    if (ses.user != undefined) {
        res.redirect("/");
    } else {
        res.render('register', {
            session: ses.user,
        });
    }
});

app.get("/login", (req, res) => {
    const ses = req.session;
    if (ses.user != undefined) {
        res.redirect("/dashboard");
    } else {
        res.render('login', {
            session: ses.user,
        });
    }
});

app.get("/dashboard", async (req, res) => {
    const ses = req.session;
    //console.log(ses.user.documents[0].author[0].name);
    if (ses.user != undefined) {
        res.render('dashboard', {
            session: ses.user,
        });
    } else {
        res.redirect("/");
    }
});

app.get("/document", async (req, res) => {
    const ses = req.session;
    console.log(ses);
    if (ses.user != undefined) {
        Doc.findById(req.query.id, function (err, doc) {
            console.log(doc);
            res.render('document', {
                session: ses.user,
                document: doc,
            });
        });
    } else {
        res.redirect("/");
    }
});

app.get("/logout", (req, res) => {
    if (req.session.user != undefined) {
        req.session.user = undefined;
        res.redirect("/");
    } else {
        res.redirect("/");
    }
});


app.post("/API/register", urlencodedParser, async (req, res) => {
    const { user, pw, pwAgain } = req.body;
    //console.log(req.body);
    if (user != "" && pw != "" && pwAgain != "") // check if any empty fields
    {
        let userCheck = await User.find({ user: user });
        //console.log(userCheck);
        if (userCheck.length == 0) {
            if (pw == pwAgain && pw.length > 8)// check if pw's are the same and greater than 8 chars
            {
                const salt = bcrypt.genSaltSync(SALTROUNDS);
                const hash = bcrypt.hashSync(pw, salt);
                const newUser = new User({
                    user: user,
                    pw: hash,
                });
                const newInstance = await newUser.save(); // save new user
                req.session.user = {
                    id: newInstance._id,
                    user: newInstance.user,
                    documents: newInstance.documents,
                }
                //res.send("Account created!");
                console.log("Account created.");
                res.redirect("/dashboard");
            } else {
                //res.send("Passwords either do not match or are not greater than 8 characters.");
                res.redirect("/register");
            }
        } else {
            //res.send("Username already taken.");
            res.redirect("/register");
        }
    } else {
        //res.send("One or more field(s) are empty.");
        res.redirect("/register");
    }
});

app.post("/API/login", urlencodedParser, async (req, res) => {
    const { user, pw } = req.body;
    //console.log(req.body);
    if (user != "" && pw != "") // check if fields are empty
    {
        const instance = await User.find({ user: user });
        if (instance.length != 0) // check if username is found
        {
            //console.log(instance[0].pw);
            const pwMatch = await bcrypt.compareSync(pw, instance[0].pw); // check if pws match
            if (pwMatch) {
                req.session.user = {
                    id: instance[0]._id,
                    user: instance[0].user,
                    documents: instance[0].documents,
                }
                res.redirect("/login");
            } else {
                res.redirect("/login?ERR=pw_incorrect");
            }
        } else {
            res.redirect("/login?ERR=user_not_found");
        }
    } else {
        res.redirect("/login?ERR=fields_are_empty");
    }
});

app.post("/API/AddDocument", urlencodedParser, async (req, res) => {
    const { name, pw, pwAgain } = req.body;
    //console.log(req.body);
    if (name != "" && pw != "" && pwAgain != "") // check if fields are empty
    {
        if (pw == pwAgain) {
            const newDoc = new Doc({
                name: name,
                author: {
                    id: req.session.user.id,
                    name: req.session.user.user,
                },
            });
            const newInstance = await newDoc.save();
            User.findById(req.session.user.id, function (err, user) {
                user.documents.push({ id: newInstance._id, name: newInstance.name, author: newInstance.author });
                user.save();
            });
            req.session.user.documents.push({ id: newInstance._id, name: newInstance.name, author: newInstance.author });
            res.redirect("/dashboard");
        } else {
            res.redirect("/dashboard?ERR=pws_dont_match");
        }
    } else {
        res.redirect("/dashboard?ERR=fields_are_empty");
    }
});

app.post("/API/invite", urlencodedParser, (req, res) => {
    const { invite, docId } = req.body;
    console.log(req.body);
    //console.log(req.body);
    if (req.session.user != undefined) {
        if (docId.length > 0 && invite.length > 0) {
            Doc.findById(docId, function (err, doc) {
                doc.invites.push(invite);
                doc.save();
            });
            res.redirect(`/document?id=${docId}`);
        } else {
            res.redirect("/dashboard");
        }
    } else {
        res.redirect("/");
    }
});

app.get("/API/RemoveInvite", async (req, res) => {
    const name = req.query.name;
    const docId = req.query.docId;
    console.log(req.query);
    if (req.session.user != undefined) {
        Doc.findById(docId, function (err, doc) {
            const index = doc.invites.indexOf(name);
            doc.invites.splice(index, 1);
            doc.save();
        });
        res.redirect(`/document?id=${docId}`);
    } else {
        res.redirect("/");
    }
});

app.post("/API/ChangeDocumentName", urlencodedParser, async (req, res) => {
    const { id, name } = req.body;
    if (req.session.user != undefined) {
        Doc.findById(id, function (err, doc) {
            doc.name = name;
            doc.save();
        });
        res.redirect(`/document?id=${id}`);
    }
});



//concurrent editing via websocket garbage
let WebSocket = require("ws");

class Session{
    constructor(documentID, websocket){
        this.id = documentID;
        this.users = [websocket];
        this.documentHistory = [];
    }
}

//dictionary of sessions indexed by document ID
//This is NOT the same as user sessions managed by express
let sessions = {};

//=============== Application State =========================
const wss = new WebSocket.Server({port: 8000}); //The websocket Server

init();

//Initilization function, run at startup
function init(){
    wss.on('connection', onConnection);
}

function onConnection(websocket, request){
    try{
        let connectionParams = new URL("http://test.com" + request.url).searchParams;
        let documentId = connectionParams.get("doc");
        //let user = connectionParams.get("doc");
        if(sessions[documentId] == undefined)   //if the user has yet to connect
            sessions[documentId] = new Session(documentId, websocket)
        else{ //someone is already connected, we add ourselves to the session
            sessions[documentId].users.push(websocket);
            Doc.findById(documentId, function (err, doc){
                if(err){
                    console.log(err);
                    return;
                }
                let loadMessage = {
                    id: 0,
                    type: "load",
                    edits: doc.edits
                }
                websocket.send(JSON.stringify(loadMessage));
            });
        }
        let thisSession = sessions[documentId];
        websocket.on('message', message=>onMessage(websocket, message, thisSession));
        websocket.on('close', (code,reason)=>onClose(thisSession));
        
        console.log("connection sucsessful");
    }catch(e){
        console.log(e);
    }
}

function onMessage(websocket, message, session){
    let messageObject = JSON.parse(message);
    try{
        dispatch(messageObject, session);
    }catch(e){
        console.log(e);
        websocket.send(JSON.stringify({"id": messageObject.id, "error":e.message}));
    }
}

function dispatch(messageObject, session){
    console.log(messageObject);
    switch(messageObject.type){
        case "edit":   //just forwards it to all connections
            console.log(session.id);
            Doc.findById(session.id, function (err, doc) {
                if(err){
                    console.log(err);
                    return;
                }
                doc.edits.push(messageObject.msg);
                doc.save();
            });
            //session.documentHistory.push(messageObject.msg)
            for(let user of session.users)
                user.send(JSON.stringify(messageObject));
            break;
        default:
            throw new Error("Invalid message type");
    }
}

//This should eventually kick people out of sessions
function onClose(thisSession){

}


// Server listening on PORT
server.listen(PORT, () => console.log(chalk.bold(`Server started on `) + chalk.green.bold.underline(`https://localhost:${PORT}`)))