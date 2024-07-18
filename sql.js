const mysql      = require('mysql');
const connection = mysql.createConnection({
  host     : 'mysql.xquare.app',
  user     : 'xquare-scul',
  password : 'OltoO0hNgUEm',
  port: '3306',
  database : 'prod_scul'
});

connection.connect();

connection.query('SELECT * from Users', (error, rows, fields) => {
  if (error) throw error;
  console.log('User info is: ', rows);
});

connection.end();