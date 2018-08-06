
/*  localhost:3030/store  */
/*  가게 등록 + 특정 가게 (메뉴, 정보, 리뷰) + 가게 리뷰 등록 */


const express = require('express');
const router = express.Router();
const async = require('async');
const pool = require('../config/dbPool.js');
const upload = require('../config/multer.js');



/*** 가게 등록 ***/
// url : localhost:3000/store , method : POST
router.post(('/'), upload.array('store_image'), async function(req, res) {
  let category = req.body.category;
  let store_name = req.body.store_name;
  let store_info = req.body.store_info;

  let store_image = null;
  let menu = req.body.menu;
  let numOfMenu = 0;

  let taskArray = [
    // 1. Null Value Check
    function(callback) {

      if (!store_name || !store_info) { 
        res.status(400).send({
          'message' : "Null Value Error"
        });
        callback("Null Value Error");
      } else {

        if (req.files) {
          store_image = req.files[0].location;
        }
        if (menu) {
          numOfMenu = menu.length;
        }
        callback(null);
      }
    },

    // 2. get connection in pool
    function(callback) {
      pool.getConnection(function(err, connection) {
        if (err) {
          res.status(500).send({
            'message' : "Internal Server Error - Get Connection"
          });
          callback("pool.getConnection Error : " + err);
        } else {
          callback(null, connection);
        }
      });
    },

    // 3. insert store
    function(connection, callback) {
      let insertStoreItemQuery = 'INSERT INTO store (category, store_name, store_info, store_image) VALUES (?, ?, ?, ?)';
      
      connection.query(insertStoreItemQuery, [category, store_name, store_info, store_image], function(err, result) {
        if (err) {
          res.status(500).send({
            'message' : "Internal Server Error - Insert Store"
          });
          callback("connection.query Error : " + err);
        } else {
          callback(null, connection);
        }
      });

    },

    // 4. select store_idx
    function(connection, callback) { 

      let countStoreQuery = 'SELECT store_idx FROM store ORDER BY writing_time DESC limit 1'; 

      connection.query(countStoreQuery, function(err, result) {

        if (err) {
          res.status(500).send({
            'message' : "Internal Server Error - Select Store Index"
          });
          callback("connection.query Error : " + err);
        } else {
          store_idx = result[0].store_idx;
          callback(null, connection, store_idx);
        }

      });
    },

    // 5. insert menu
    function(connection, store_idx, callback) { 

        let insertMenuItemQuery = 'INSERT INTO menu (store_idx, menu_name, menu_price) VALUES (?, ?, ?)';

        for (i = 0; i < numOfMenu; i++) {

          connection.query(insertMenuItemQuery, [store_idx, menu[i][0], menu[i][1]], function(err, result) {
            if (err) {
              res.status(500).send({
                'message' : "Internal Server Error - Insert Menu"
              });
              callback("connection.query Error : " + err);
            }
          });

        }

        callback(null, connection, "Successfully Insert Store & Menu");
    }
  ];


  async.waterfall(taskArray, function(err, connection, message) {
    if (err) {
      console.log(err);
    } else {
      console.log(message);
      res.status(201).send({
        'message' : message
      });

      connection.release();
    }
  });
  
});



/*** 특정 가게 (메뉴) ***/
// url : localhost:3000/store/menu/:store_idx , method : GET
router.get(('/menu/:store_idx'), function(req, res) {

  var store_idx = req.params.store_idx;

  let taskArray = [
    // 1. get connection in pool
    function(callback) {
      pool.getConnection(function(err, connection) {
        if (err) {
          res.status(500).send({
            'message' : "Internal Server Error - Get Connection"
          });
          callback("pool.getConnection Error : " + err);
        } else {
          callback(null, connection);
        }
      });
    },
    // 2. select menu 
    function(connection, callback) { 
      let selectMenuItemsQuery = 'SELECT menu_name, menu_price FROM menu WHERE store_idx = ?';

      connection.query(selectMenuItemsQuery, [store_idx], function(err, result) {
        if (err) {
          res.status(500).send({
            'message' : "Internal Server Error - Select Menu List"
          });
          callback("connection.query Error : " + err);
        } else {
          callback(null, connection, result, "Successfully Get Menu List");
        }
        
      });
    }
  ];

  async.waterfall(taskArray, function(err, connection, result, message) {
    if (err) {
      console.log(err);
    } else {
      console.log(message);

      res.status(200).send({
        'message' : message,
        'data' : result  
      });
    }

    connection.release();     // connection 반환
  });
});



/*** 특정 가게 (정보) ***/
// url : localhost:3000/store/info/:store_idx , method : GET
router.get(('/info/:store_idx'), function(req, res) {

  var store_idx = req.params.store_idx;

  let taskArray = [
    // 1. get connection in pool
    function(callback) {
      pool.getConnection(function(err, connection) {
        if (err) {
          res.status(500).send({
            'message' : "Internal Server Error - Get Connection"
          });
          callback("pool.getConnection Error : " + err);
        } else {
          callback(null, connection);
        }
      });
    }, 
    // 2. select store_info
    function(connection, callback) { 
      let selectStoreInfoItemsQuery = 'SELECT store_info, store_image, (SELECT count(*) FROM review WHERE store_idx = ?) as review_count FROM store where store_idx = ?';

      connection.query(selectStoreInfoItemsQuery, [store_idx, store_idx], function(err, result) {
        if (err) {
          res.status(500).send({
            'message' : "Internal Server Error - Select Store Info"
          });
          callback("connection.query Error : " + err);
        } else {
          
          callback(null, connection, result, "Successfully Get Store Info");
        }
      });
    }
  ];

  async.waterfall(taskArray, function(err, connection, result, message) {
    if (err) {
      console.log(err);
    } else {
      console.log(message);

      res.status(200).send({
        'message' : message,
        'data' : result  
      });
    }

    connection.release();     // connection 반환
  });
});



/*** 특정 가게 (리뷰) ***/
// url : localhost:3000/store/review/:store_idx , method : GET
router.get(('/review/:store_idx'), function(req, res){
  
    let store_idx = req.params.store_idx;
    pool.getConnection(function(err, connection){
        if(err){
            res.status(500).send({
                message : "Internal Server Error"
            });
            connection.release();
        } else{
            let sql = "SELECT review_content, review_image, writing_time, user_id "+
            "FROM review,user "+
            "WHERE store_idx =?"+
            " ORDER BY writing_time DESC";
            connection.query(sql, [store_idx], function(err, result){
            if(err){
                res.status(500).send({
                    message : "Internal Server Error"
                });
                connection.release();
                console.log("Internal Server Error");
            } else {
                console.log(result)
                res.status(200).send({
                    data : result
                });
                connection.release();
                console.log("Successfully SELECT Review Data");
                 }
            })
        };
    });
});



/*** 특정 가게 (리뷰) ***/
// uri : localhost:3030/store/review/:store_idx , method : GET
router.get(('/review/:store_idx'), function(req, res){
  
    let store_idx = req.params.store_idx;
    pool.getConnection(function(err, connection){
        if(err){
            res.status(500).send({
                message : "Internal Server Error"
            });
            connection.release();
        } else{
            let sql = "SELECT review_content, review_image, writing_time, user_id "+
            "FROM review,user "+
            "WHERE store_idx =?"+
            " ORDER BY writing_time DESC";
            connection.query(sql, [store_idx], function(err, result){
            if(err){
                res.status(400).send({
                    message : "store_idx error"
                });
                connection.release();
            } else {
                console.log(result)
                res.status(200).send({
                    data : result
                });
                connection.release();
                console.log("Successfully SELECT Review Data");
                 }
            })
        };
    });
});



/*** 가게 리뷰 등록 ***/
// uri : localhost:3030/store/review , method : POST
router.post(('/review/:store_idx'), upload.array('review_image'), function(req, res) {

    let user_idx= req.body.user_idx;
    let review_image = req.files[0].location;
    let store_idx = req.params.store_idx;
    let review_content =  req.body.review_content;
    pool.getConnection(function(err, connection){
        if(err){
            res.status(500).send({
                message : "Internal Server Error"
            });
            connection.release();
        } else {
            console.log("success connection")
            if(!req.body.user_idx){ //user_idx 체크
                res.status(500).send({
                    message : "user_idx error"
                });
                connection.release();
                console.log("user_idx error");
            } else{
                let sql = "INSERT INTO review ( review_content, review_image, store_idx, user_idx) VALUE(?,?,?,?)";
                connection.query(sql,[review_content,review_image, store_idx, user_idx] ,function (err, result) {
                if (err){
                    res.status(400).send({
                        message : "parameter error"
                    });
                    connection.release();
                    console.log("parameter error");
                } else{
                    console.log(result)
                    res.status(201).send({
                        message : "Successfully Post Review Data",
                    });
                    connection.release();
                    console.log("Successfully Post Review Data");
                    };
                });
            }
        }
    });
});




module.exports = router;
