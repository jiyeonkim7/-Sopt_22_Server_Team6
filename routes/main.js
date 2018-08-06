const express = require('express');
const router = express.Router();
const mysql = require('mysql');
const upload = require('../config/multer.js');
const pool = require('../config/dbPool.js');


router.get(('/'), function(req,res){
    pool.getConnection(function(err, connection){
        if(err){
            res.status(500).send({
                message : "Internal Server Error"
            });
            connection.release();
        } else{
            let sql = "SELECT DISTINCT category FROM store";
            connection.query(sql, function(err, result){
            if(err){
                res.status(500).send({
                    message : "main data get error"
                });
                connection.release();
                console.log("main data get error");
            } else {
                console.log(result)
                res.status(200).send({
                    data : result
                });
                connection.release();
                console.log("Successfully get main Data");
                 }
            });
        };
    });
});

router.get(('/:temp_category'), function(req,res){
    var temp_category = req.params.temp_category;
    var category ;
    switch(temp_category){
        case '1' : category = "한식";
        break;
        case '2' : category = "분식";
        break;
        case '3' : category = "중식";
        break;
        case '4' : category = "양식";
        break;
    }
    console.log("temp_category : ", temp_category);
    console.log("category : ", category);
    pool.getConnection(function(err, connection){
        if(err){
            res.status(500).send({
                message : "Internal Server Error"
            });
        } else{
            let sql = "SELECT DISTINCT store_name, "+ 
                      "GROUP_CONCAT( menu_name SEPARATOR ', ') AS menu_name, "+
                      "(SELECT count(*) FROM review as r  WHERE r.store_idx = s.store_idx ) AS review_count "+  
                      "FROM menu JOIN store as s USING(store_idx) "+ 
                      "WHERE s.category  = ? "+
                      "GROUP BY s.store_idx"; 
            connection.query(sql, category, function(err, result){
                if(err){
                    res.status(400).send({
                        message : "gategory parameter error"
                    });
                    connection.release();
                    console.log("gatoegory parameter error");
                } else{
                    console.log(result)
                    res.status(200).send({
                        data : result
                    });
                    connection.release();
                    console.log("Successfully get gategory Data")
                }
            })
        }
    })
})
module.exports = router;
