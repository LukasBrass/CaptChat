var express = require('express');

var mysql = require('mysql');
var cors = require('cors');
var sqlCall = require('./sqlCall');
var bodyParser = require('body-parser');
var bcrypt = require('bcrypt');
var fs = require('fs');
var https = require('https');
var pug = require('pug');
var formidable = require('formidable');
var AdmZip = require('adm-zip');

var db = require('./env_variable').db;

var con = mysql.createConnection({
    host: db.host,
    port: db.port,
    user: db.user,
    password: db.password,
    database: db.name
});

con.connect(function(err) {
    if (err) throw err;
});

var app = express();
var hint;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'pug');


/*
    front side
 */

app.get('/repo', function(req, res) {
    var sql = mysql.format("SELECT i.name, u.username as artist, t.name as theme, i.location FROM ImagesSet i, User u, Theme t where i.artist = u.id and i.theme = t.id");
    con.query(sql, function (err, result) {
        if (err) throw err;
        res.render('repos', {repoList: result})
    });
});

app.get('/repo/:name', function(req, res) {
    fs.readdir('./img/' + req.params.name, function (err, files) {
        if (err) throw err;
        let sql = mysql.format("SELECT id from ImagesSet where name=? limit 1", [req.params.name]);
        con.query(sql, function (err, result) {
            if (err) throw err;
            renderImages(result[0].id, req.params.name, files, res, req.query.update !== undefined);
        });

    });
});

app.get('/', function (req, res) {
    res.render('index');
});

app.get('/signin', function(req, res) {
    res.render('authenticate', {method: "signin", title:"Vous identifier"})
});
app.post('/signin', function(req, res) {
    if(req.body.hasOwnProperty("username") && req.body.hasOwnProperty("password")) {
        var sql = mysql.format("SELECT token FROM User where username=? and password=?", [req.body.username, req.body.password]);
        con.query(sql, function (err, result) {
            if (err) throw err;
            res.writeHead("302", {
                Location: '/repo'
                }
                );
            res.end();
        });
    }
});

app.get('/signup', function(req, res) {
    res.render('authenticate', {method:"signup", title:"Vous inscrire"})
});

app.post('/signup', function(req, res) {
    req.body.login = req.body.register_login;
    req.body.password = req.body.register_password;
    req.body.email = '';
    execSql(con, req, res, "postUser", false);
    req.query.username = req.body.login;
    req.query.password = req.body.password;
    var token;
    if(token = apiToken(req, res, false)) {
        res.setHeader("Content-Type", "text/html;charset=utf-8");
        res.setHeader("X-TOKEN", token);
    } else {
        return false;
    }
    fs.readFile('./homepage.html', null, (error, data) => {
        if(error) {
            response.writeHead(404);
            response.write('file not found');
        }
        else
            response.write(data);
        response.end();
    });
});

app.get('/example', function(req, res) {
   res.render("example");
   res.end();
});



/*
    API requests
 */
app.get('/api/auth', function(req, res) {
    apiToken(req, res);
});

app.post('/api/users', function(req, res) {
    checkToken(con, req, res, 'postUser');
});

app.get('/api/users', function(req, res) {
    checkToken(con, req, res, 'getUsers');
});

app.get('/api/users/:user_id', function(req, res) {
    checkToken(con, req, res, 'getOneUser');
});

app.delete('/api/users/:user_id', function(req, res) {
    checkToken(con, req, res, 'deleteUser');
});

app.put('/api/users/:user_id', function(req, res) {
    checkToken(con, req, res, 'putUser');
});

app.get('/api', function(req, res) {
    res.sendFile( __dirname + "/openapi.yaml" );
});

app.post('/repo/:repoName/image/:path/invert', function (req,res) {
    var sql = mysql.format("SELECT h.id from Hint h, ImagesSet i where h.image_name=? and i.name=?", [req.params.path, req.params.repoName]);
    con.query(sql, function (err, result) {
        if (err) throw err;
        if (result[0]) {
            sql = mysql.format("DELETE FROM Hint where id=?", result[0].id);
            con.query(sql, function (err, result) {
                if (err) throw err;

                res.writeHead("302", {
                    Location: '/repo/' + req.params.repoName
                });
                res.end();
            });
        } else {
            sql = mysql.format("SELECT id from ImagesSet where name=?", req.params.repoName);
            con.query(sql, function (err, result2) {
                if (err) throw err;
                sql = mysql.format("INSERT INTO Hint (description, imageSet_id, image_name) VALUES (?, ?, ?)", ["", result2[0].id, req.params.path]);
                con.query(sql, function (err, result3) {
                    if (err) throw err;

                    res.writeHead("302", {
                            Location: '/repo/' + req.params.repoName + '/image/' + req.params.path + "/new_hint"
                        }
                    );
                    res.end();
                })
            });
        }
    });

});

app.get('/getsingular', function (req, res) {
    let repoName = req.query.repoName;
    var sql = mysql.format("SELECT id from ImagesSet where name=?", repoName);
    con.query(sql, function(err, result) {
       if(err) throw err;
       sql = mysql.format("SELECT * from Hint where imageSet_id=?", result[0].id);

       con.query(sql, function(err, result) {
           if(err) throw err;
           const singular_file = result[Math.floor(Math.random() * result.length-1 +1)];
           res.writeHead(200, {'Content-Type': 'image'});
           fs.readFile('./img/'+repoName+'/' + singular_file.image_name, null, (error,data) => {
               if(error) throw error;
               hint = singular_file.description;
               res.write(data);
               res.end();
           });
       });
    });
});

app.get('/getsingularhint', function(req, res) {
    res.write(hint);
    res.end();
});

app.get("/repo/:repoName/image/:path/new_hint", function (req, res) {
    if(req.query.hint) {
        var sql = mysql.format("Update Hint, ImagesSet SET Hint.description=? where Hint.image_name=? and ImagesSet.name=?", [req.query.hint, req.params.path, req.params.repoName])
        con.query(sql, function(err, result) {
           if(err) throw err;
           res.writeHead("302", {
               Location: "/repo/" + req.params.repoName
           });
            res.end();
        });
    } else {
        res.render("newHint", {repoName : req.params.repoName, imagePath : req.params.path});
        res.end();
    }


});

app.get("/upload", function (req, res) {
   res.render("upload");
   res.end();
});

app.post("/upload", function (req, res) {
    var form = new formidable.IncomingForm();
    form.parse(req, function(err, fields, files) {
        var zippath = files.filetoupload.path;
        var newPath = './img/' + files.filetoupload.name.slice(0, -4);
        var zip = new AdmZip(zippath);
        var zipEntries = zip.getEntries();

        if(fs.existsSync(newPath)) {
            res.write("Ce set d'image existe déjà !");
            res.end();
            return false;
        }
        var i = 1;

        Object.keys(zipEntries).forEach(function (zipEntry) {
            console.log(zipEntry);
            if(zipEntries[zipEntry].isDirectory === false) {
                zip.extractEntryTo(zipEntries[zipEntry], newPath );
                fs.rename(newPath + "/" + zipEntries[zipEntry].entryName, newPath + "/" + i + ".jpg", function(err) {
                    if (err) throw err;
                });
                i++
            }
        });

        var sql = mysql.format("INSERT INTO ImagesSet (name, artist, theme, location) VALUES (?, ?, ?, ?)", [files.filetoupload.name.slice(0, -4), 1,1, newPath]);
        con.query(sql, function (err, result) {
            if(err) throw err;
            res.writeHead("302", {
                Location: "/repo/" + files.filetoupload.name.slice(0, -4) + "?update=true"
            });
            res.end();
        });
    });


});


app.get("/captcha/", function (req, res) {
    var imageSet = req.query.imageset;
    var okButton = req.query.okbutton;
    if(imageSet) {
        res.writeHead("302", {
            Location: "/captcha/repo/"+imageSet+"?okbutton="+okButton
        });
    } else {
        res.render("captcha");
    }
    res.end();
});

app.get("/captcha/repo/:repoName", function (req, res) {
    res.render("captcha", {imageSet: req.params.repoName, okButton: req.query.okbutton});
    res.end();
});

app.get("/success", function (req, res) {
   res.write("Bravo !");
   res.end();
});


app.use(express.static('forms'));
app.use('/static', express.static('public'));

app.get('/img/:repoName/:imgName', function (req, res) {
    res.writeHead(200, {'Content-Type': 'image/jpeg'});
    if(req.params.imgName !== "__MACOSX" && req.params.imgName !== req.params.repoName ) {
        fs.readFile('./img/' + req.params.repoName + '/' + req.params.imgName, null, (error, data) => {
            if (error) throw error;
            res.write(data);
            res.end();
        });
    }
});

app.use(function(req, res, next){
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(404).send('Lieu inconnu :'+req.originalUrl);
});

app.listen(8080);

function renderImages(repo_id, repo_name, files, res, update) {
    let sourceList = [];
    files.forEach(function (file) {
        if(file.path !== "__MACOSX" && file.path !== repo_name ) {
            let source = {};
            source.path = file;
            let sql = mysql.format("SELECT description from Hint where image_name=? and imageSet_id=? limit 1", [file, repo_id]);
            con.query(sql, function (err, sqlResult) {
                if (err) throw err;
                if (sqlResult[0]) {
                    source.singulier = true;
                    source.indice = sqlResult[0].description;
                } else
                    source.singulier = false;
                sourceList.push(source);
            });
        }
    });
    con.query("select sleep(0.5);", function (err, result) {
        res.render('imageSet', {repoName: repo_name, sourceList: sourceList, update:update});
    });
}


function apiToken(req, res, send = true) {
    var sql = mysql.format("SELECT * from User where username=? and password=?", [req.query.username, req.query.password]);
    con.query(sql, function (err, result) {
        if(err) throw err;
        if(result.length  === 0) {
            sendResponse(res,'Mauvais login et/ou mot de passe');
            return false;
        }
        else {
            let token = bcrypt.hashSync(req.query.username + req.query.password + new Date().getTime().toString(),10);
            con.query( mysql.format("UPDATE User SET token = ?, token_date = ? where id = ?", [token, new Date(), result[0].id]), function(err, result) {
                if(err) throw err;
                if(send) {
                    sendResponse(res, {"X-TOKEN": token});
                }
                return token;
            });
        }
    });
}

function checkToken(con, req, res, method) {
    var sql = mysql.format('SELECT * from User where token= ?', [req.headers.token]);
    con.query(sql, function (err, result) {
        if (err) throw err;
        if (result.length === 0) {
            sendResponse(res,'Token non trouvé');
            return false;
        }
        var user = result[0];
        let dateToCheck = new Date();
        dateToCheck.setTime(new Date().getTime() - 5 * 60 * 1000);
        if (user.token === null) {
            sendResponse(res,{"Error" : 'Aucun token trouvé, utilisez l\'url /auth pour génerer un token'});
            return false;
        }
        if (user.token_date < dateToCheck) {
            sendResponse(res,{"Error" : 'Token expiré, veuillez en choisir un nouveau'});
            return true;
        }

        execSql(con, req, res, method);
    });
}

function sendResponse(res, response)
{
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.send(response);
    return true;
}

function execSql(con, req, res, method, send = true) {
    var result;
    switch(method){
        case 'getOneUser':
            sqlCall.getOneUser(req, con, res);
            break;
        case 'postUser':
            sqlCall.postUser(req, con, res, send);
            break;
        case 'putUser':
            sqlCall.putUser(req, con, res);
            break;
        case 'deleteUser':
            sqlCall.deleteUser(req, con, res);
            break;
        case 'getUsers':
            sqlCall.getUsers(req, con, res);
            break;
    }
}

function checkIfSingular(imagePath) {
    let pathArray = imagePath.split('/');
    let imageSetPath = pathArray[0] +"/"+ pathArray[1];
    let image = pathArray[2];

    var sql = mysql.format("SELECT h.description, i.name, i.location from Hint h, ImagesSet i where i.imageSet_id = h.id and h.image_name=?", [imagePath])
}

function sendSQLNoResult(sqlString) {
    var sql = mysql.format(sqlString);
    con.query(sql, function(err, result) {
        if(err) throw err;
    });
}