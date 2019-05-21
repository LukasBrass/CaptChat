var mysql = require('mysql');

exports.getUsers = function(req, con, res) {
    var sql = '';
    if (req.query.name) {
        sql = mysql.format("SELECT * FROM User where username=?", [req.query.name]);
    } else {
        sql = "SELECT * FROM User";
    }
    con.query(sql, function (err, result) {
        if (err) throw err;
        sendResponse(res,result);
    });
};

exports.getOneUser = function(req, con, res){
    var sql = mysql.format("SELECT * FROM User where id=?", [req.params.user_id]);
    con.query(sql, function (err, result) {
        if (err) throw err;
        sendResponse(res,result);
    });
};

exports.postUser = function(req, con, res, send){
        var sql = mysql.format("INSERT INTO user (username, email,password) VALUES (?, ?, ?)", [req.body.username, req.body.email, req.body.password]);
        con.query(sql, function (err, result) {
            if (err) throw err;
            console.log("1 record inserted");
        });
        if(send) {
            sendResponse(res, 200);
        }
};
exports.putUser = function(req, con, res){
    var sql = mysql.format("UPDATE User SET username=?, email=?, password=? where id=?", [req.body.username, req.body.email, req.body.password, req.params.user_id]);
    con.query(sql, function (err, result) {
        if (err) throw err;
        sendResponse(res,200);
    });
};
exports.deleteUser = function(req, con, res){
    var sql = mysql.format("DELETE FROM User where id=?", [req.params.user_id]);
    con.query(sql, function (err, result) {
        if (err) throw err;
        sendResponse(res,result);
    });
};

function sendResponse(res, response)
{
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.send(response);
    return true;
}