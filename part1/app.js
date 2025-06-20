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
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'DogWalkService'
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

            res.json(rows);
    } catch (error) {
        console.error('Error fetching dogs:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// get /api/walkrequests/open, return all open requests
app.get('/api/walkrequests/open', async (req, res) => {
    try {
        const [rows]=await db.execute(`
            SELECT wr.request_id, d.name as dog_name, wr.requested_time, wr.duration_minutes, wr.location, u.username as owner_username
            FROM WalkRequest wr
            JOIN Dogs d ON wr.dog_id=d.dog_id
            JOIN Users u ON d.owner_id=u.user_id
            WHERE wr.status='open'
            ORDER BY wr.requested_time
            `);

            res.json(rows);
    } catch (error) {
        console.error('Error fetching open walk requests:', error);
        res.status(500).json({ error: 'Internet server error ' });
    }
});

// get /api/walkers/summary, return summary of each walker
app.get('/api/walkers/summary', async (req, res) => {
    try {
        const [rows]=await db.execute(`
            SELECT
            u.username as walker_username,
            COUNT(wr.rating_id) as total_ratings,
            CASE
            WHEN COUNT(WR.RATING_ID)>0 THEN ROUND(AVG(wr.rating), 1)
            ELSE NULL
            END as average_rating,
            COUNT(DISTINCT CASE WHEN wreq.status='completed' THEN wa.request_id END) as completed_walks
            FROM Users u
            LEFT JOIN WalkApplications wa ON u.user_id=wa.walker_id AND wa.status='accepted'
            LEFT JOIN WalkRequests wreq ON wa.request_id=wreq.request_id
            LEFT JOIN WalkRatings wr ON wa.request_id=wr.request_id AND wa.walker_id=wr.walker_id
            WHERE u.role='walker'
            GROUP BY u.user_id, u.username
            ORDER BY u.username
        `);

        // convert numeric strings to numbers for consistency
        const formattedRows=rows.map(row => ({
            walker_username: row.walker_username,
            total_ratings: parseInt(row.total_ratings),
            average_rating: row.average_rating ? parseFloat(row.average_rating) : null,
            completed_walks: parseInt(row.completed_walks)
        }));

        res.json(formattedRows);
    } catch (error)
});
