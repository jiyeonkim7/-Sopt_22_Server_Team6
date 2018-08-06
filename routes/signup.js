const express = require('express');
const router = express.Router();

const async = require('async');
const crypto = require('crypto');
const pool = require('../config/dbPool.js');

// url : localhost:3000/signup , method : POST
router.post('/', function(req, res) {	// (req, res) => {} 가능
	let user_id = req.body.user_id;
	let user_pw = req.body.user_pw;

	let taskArray = [
		// 1. pool에서 connection 하나 가져오기
		function(callback) {
      pool.getConnection(function(err, connection) {
        if (err) {
          res.status(500).send({
            message: "Internal Server Error"
          });
          console.log("ㅅㅂ")
          callback("pool.getConnection Error : " + err);
        } else {
          callback(null, connection);
        }
      });
    },
		// 2. user 중복 확인
    function(connection, callback) {
      let checkUserIdQuery = 'SELECT * FROM user WHERE user_id = ?';
      connection.query(checkUserIdQuery, user_id, function(err, result) { // 하나일 경우 배열 없이 전달 가능 ( [user_id] 도 가능 )
        if (err) {
          res.status(500).send({
            message: "Internal Server Error"
          });
          connection.release(); // connection 반환
          callback("connection.query Error : " + err);
        } else {
          if (result.length !== 0) {
            res.status(400).send({
              message: "Already Joined"
            });
            connection.release(); // connection 반환
            callback("Already Joined");
          } else {
            callback(null, connection);
          }
        }
      });
    },
    // 3. salt 생성
    function(connection, callback) {
      crypto.randomBytes(32, function(err, buffer) {
        if (err) {
          res.status(500).send({
            message: "Internal Server Error"
          });
          connection.release(); // connection 반환
          callback("crypto.randomBytes Error : " + err);
        } else {
          callback(null, connection, buffer.toString('base64')); // salt가 정상적으로 생성되었을 경우 다음 함수로 넘김
        }
      });
    },
    // 4. 비밀번호 해싱
    function(connection, salt, callback) {
      crypto.pbkdf2(user_pw, salt, 100000, 64, 'sha512', function(err, hashed) {
        if (err) {
          res.status(500).send({
            message: "Internal Server Error"
          });
          connection.release(); // connection 반환
          callback("crypto pbkdf2 Error : " + err);
        } else {
          callback(null, connection, salt, hashed.toString('base64')); // salt, hashedpwd 다음 함수로 넘김
        }
      });
    },
    // 5. DB에 user정보 insert
    function(connection, salt, hashedpwd, callback) {
      let insertUserQuery = 'INSERT INTO user (user_id, user_salt, user_pw) VALUES (?, ?, ?)';
      connection.query(insertUserQuery, [user_id, salt, hashedpwd], function(err, result) { // 2개 이상인 경우 배열로 전달
        if (err) {
          res.status(500).send({
              message: "Internal Server Error"
          });
          callback("connection.query Error : " + err);
        } else {
          res.status(201).send({
            message: "Successfully Signup"
          });
          callback(null, "Successfully Signup");
        }
        connection.release(); // connection 반환
      });
    }
];

	async.waterfall(taskArray, function(err, result) {
    if (err) {
      console.log(err);
    } else {
      console.log(result);
    }
	});
});

module.exports = router;