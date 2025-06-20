var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var mysql = require('mysql2/promise');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

let db;

(async() => {
    try {
        // connect to database
        db=await mysql.createConnection({
            host='localhost',
            user:'root',
            password:'',
            database:'DogWalkService'
        });

        console.log('Connect to DogWalkService database');
    } catch (err) {
        console.error('Error connecting to database, ensure MYSQL is running: service mysql start', err);
    }
})();

// get /api/dogs, return all dogs with their size and owner's username
app.get('/api/dogs', async (req, res) => {
    try {
        const [rows]=await db.execute(`
            SELECT d.name as dog_name, d.size, u.username as owner_username
            FROM Dogs d
            JOIN Users u ON d.owner_id=u.user_id
            ORDER BY d.name
            `);
    }
})
