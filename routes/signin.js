const express = require('express');
const router = express.Router();

const async = require('async');
const crypto = require('crypto');
const pool = require('../config/dbPool.js');

// url : localhost:3000/signin , method : POST
router.post('/', function(req, res) {	// (req, res) => {} 가능
	let user_id = req.body.user_id;
	let user_pw = req.body.user_pw;
	let taskArray = [
    // 1. pool에서 connection 하나 가져오기
		function(callback) {
      pool.getConnection(function(err, connection) {
        if (err) {
          res.status(500).send({
            message : "Internal Server Error"
          });
          callback("pool.getConnection Error : " + err);
        } else {
        	callback(null, connection);
        }
      });
    },
    // 2. 입력받은 user_id에 대한 user 정보를 DB에서 검색 => salt, hashedpwd를 가져오기 위함
    function(connection, callback) {
    	let selectUserIdQuery = 'SELECT * FROM user WHERE user_id = ?';
    	connection.query(selectUserIdQuery, user_id, function(err, result) {
    		if (err) {
          res.status(500).send({
            message : "Internal Server Error"
          });
          connection.release();			// connection 반환
          callback("connection.query Error : " + err);
        } else {
          
        	if (result.length === 0) {					// select한 결과가 0 => 유저 정보가 없음
        		res.status(400).send({
        			message : "Login Error"					// 클라에게 보내는 정보에는 로그인 에러라고만 보냄
        		});
        		connection.release();			// connection 반환
        		callback("Login Error : ID");			// 서버에서 볼 정보에서는 아이디 에러임을 보여줌
        	} else {
        		callback(null, connection, result[0]);		// result[0] => JSON만 다음 함수로 넘김
        	}
        }
    	});
    },
    // 3. DB에 있는 salt값과 입력받은 pw로 해싱을 진행 => DB에 있는 pw와 비교
    function(connection, result, callback) {
			let selectUserIdQuery = 'SELECT * FROM user WHERE user_id = ?';
			
			connection.query(selectUserIdQuery,user_id,function(err, result){
				crypto.pbkdf2(user_pw, result[0].user_salt, 100000, 64, 'sha512', function(err, hashed) {
					if (err) {
						res.status(500).send({
							message : "Internal Server Error"
						});
						callback("crypto pbkdf2 Error : " + err);
					} else {
						if (hashed.toString('base64') === result[0].user_pw) {			// 비밀번호까지 정확하게 입력 => 로그인 성공!
							res.status(201).send({
								message : "Successfully Signin",
								data : 	{"user_idx": result[0].user_idx}
							
							});
							callback(null, "Successfully Signin");
						} else {																								// 비밀번호 틀림 => 로그인 실패!
							res.status(400).send({
								message : "Login Error"					// 클라에게 보내는 정보에는 로그인 에러라고만 보냄
							});
							callback("Login Error : PW");			// 서버에서 볼 정보에서는 비밀번 에러임을 보여줌
						}
					}
					connection.release();			// connection 반환
				});
			})
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
