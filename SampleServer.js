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
            renderImages(result[0].id, req.params.name, files, res);
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
    console.log(req.body);
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
    console.log(req.body);
    let newPath;
   if(req.params.path.charAt(0) === 's') {
       let stringArray = req.params.path.split("-");
       newPath = stringArray[1];
   } else
       newPath = "singulier-" + req.params.path;
    if (fs.existsSync('./img/' + req.params.repoName + '/' + newPath)) {
    }

   fs.rename('./img/'+req.params.repoName+ '/' + req.params.path, './img/'+req.params.repoName+ '/' + newPath, function(err) {
       if (err) throw err
   });
   if(newPath.charAt(0)) {
       res.writeHead("302", {
               Location: '/repo/'+ req.params.repoName+ '/image/' + newPath + "/new_hint"
           }
       );
       res.end();
   } else {
       var sql = mysql.format("DELETE from Hint where image_name=?", req.params.path);
       con.query(sql, function (err, result) {
           if (err) throw err;
       });
       res.writeHead("302", {
           Location: '/repo/' + req.params.repoName
       });
       res.end();
   }

});

app.get('/getsingular', function (req, res) {
    let i = 0;
    res.writeHead(200, {'Content-Type': 'image'});
    fs.readdir("../img/initial", (err, files) => {
        files.forEach(function(file) {
            if(file.charAt(0) === s) {
                i++;
            }
        });
        singular_file = files[Math.floor(Math.random() * i-1 +1)];
        fs.readFile('../img/initial/singulier-' + singular_file +'.jpg', null, (error,data) => {
            res.write(data);
            res.end();
        });
    });
});

app.get("/repo/:repoName/image/:path/new_hint", function (req, res) {
   res.write('test');
   res.end();
});

app.get("/upload", function (req, res) {
   res.render("upload");
   res.end();
});

app.post("/upload", function (req, res) {
    var form = new formidable.IncomingForm();
    form.parse(req, function(err, fields, files) {
        var oldpath = files.filetoupload.path;
        var newpath = './img/' + files.filetoupload.name;
        fs.rename(oldpath, newpath, function (err) {
            if(err) throw err;

            var zip = new AdmZip(newpath);
            var zipEntries = zip.getEntries();
            fs.mkdirSync('./img/1');

            zipEntries.forEach(function(zipEntry) {
               zip.extractAllTo('./img/1');
            });

            res.write('File uploaded and moved');
            res.end();
        })
    });
    res.end();
});

app.get("/captcha", function (req, res) {
    res.render('captcha');
    res.end();
});


app.use(express.static('forms'));
app.use('/static', express.static('public'));

app.get('/img/:repoName/:imgName', function (req, res) {
    res.writeHead(200, {'Content-Type': 'image'});
    fs.readFile('./img/' + req.params.repoName + '/' + req.params.imgName, null, (error,data) => {
        res.write(data);
        res.end();
    });
});

app.use(function(req, res, next){
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(404).send('Lieu inconnu :'+req.originalUrl);
});

app.listen(8080);

function renderImages(repo_id, repo_name, files, res) {
    let sourceList = [];
    files.forEach(function (file) {
        let source = {};
        source.path = file;
        if (file.charAt(0) === 's') {
            source.singulier = true;
            let sql = mysql.format("SELECT description from Hint where image_name=? and imageSet_id=? limit 1", [file, repo_id]);
            con.query(sql, function (err, sqlResult) {
                if (err) throw err;
                source.indice = sqlResult[0].description;
            });
        } else
            source.singulier = false;
        sourceList.push(source);
    });
    con.query("select sleep(0.5);", function (err, result) {
        res.render('imageSet', {repoName: repo_name, sourceList: sourceList});
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