const express = require("express");
const bodyParser = require("body-parser");
const session = require('express-session');
const { Client } = require('cassandra-driver');
const Uuid = require('cassandra-driver').types.Uuid;

const app = express();

app.use(express.static("public"));
app.use(express.json());
app.use(session({ secret: "cats" }));

app.use(bodyParser.urlencoded({ extended: false }));

// given a username this function returns true if the username already exists
// or false if the username doesn't exist in the database
async function userExists(user) {
    const client = new Client({
        cloud: { secureConnectBundle: 'secure-connect-whack.zip' },
        credentials: { username: 'user', password: 'pass' },
        keyspace: 'whack'
    });

    await client.connect();

    const select = 'select * from users where user = :user';
    const params = [user];

    let result = await client.execute(select, params);

    const userResult = result.first();

    if (userResult) {
        return true;
    } else {
        return false
    }

}

// given a first name, last name, username, and password, this function adds the user to the database
async function addUser(fname, lname, user, pass) {
    const client = new Client({
        cloud: { secureConnectBundle: 'secure-connect-whack.zip' },
        credentials: { username: 'user', password: 'pass' },
        keyspace: 'whack'
    });

    await client.connect();
    const insert = 'insert into users (id, fname, lname, user, pass) values (?, ?, ?, ?, ?)';
    const params = [Uuid.random(), fname, lname, user, pass];
    return client.execute(insert, params);

    await client.shutdown();
}

// given a username and password, this function checks the database for the username
// and compares both to see if they match. returns true if they match, false if they don't
let presentaccountid;
let presentaccountuser;
async function authenticateUser(user, pass) {
    const client = new Client({
        cloud: { secureConnectBundle: 'secure-connect-whack.zip' },
        credentials: { username: 'user', password: 'pass' },
        keyspace: 'whack'
    });

    await client.connect();

    const select = 'select * from users where user = :user';
    const params = [user];

    let result = await client.execute(select, params);

    const userResult = result.first();
    if (user === userResult.user && pass === userResult.pass) {
        presentaccountid = userResult.id;
        presentaccountuser = userResult.user;
        return true;
    }
    else {
        return false;
    }
}

app.get('/', (req, res) => {
    res.sendFile(__dirname + "/public/index.html");
});

// the post request end point to sign up for an account
app.get('/signup', (req, res) => {
    let user = req.body.user;
    let fname = req.body.fname;
    let lname = req.body.lname;
    let pass = req.body.pass;
    if (userExists(user)) {
        res.json({message: 'Username already exists, try another one'});
    }
    else {
        addUser(fname, lname, user, pass);
    }
});


// the post request end point to log into an account
app.get('/login', async (req, res) => {
    let user = req.body.user;
    let pass = req.body.pass;
    if (! await userExists(user)) {
        res.json({message: 'Username not found in database'});
    }
    else if (await authenticateUser(user, pass)) {
        req.session.accountSession = presentaccountid;
        req.session.auth = true;
        req.session.username = presentaccountuser;

        res.json({message: 'User is logged in'});
    }
    else {
        res.json({message: 'Password didn\'t match'});
    }
})

let port = process.env.PORT;
if (port == null || port == "") {
    port = 5000;
}
// listen for requests :)
const listener = app.listen(port, () => {
    console.log("Your app is listening on port " + listener.address().port);
});