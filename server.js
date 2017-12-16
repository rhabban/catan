var express = require( 'express' );
var app = express();
var ent = require('ent');
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var server_port = process.env.OPENSHIFT_NODEJS_PORT || 8000;
var server_ip_address = process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1';

function Player(name, color){
    this.name = name;
    this.color = color;
    this.score = 0;
}

app.use(express.static('public'));

var players = [];

app.get( '/', function ( req, res ) {
    res.sendfile(__dirname + '/index.html');
} );

io.sockets.on('connection', function (socket, pseudo) {
    // Dès qu'on nous donne un pseudo, on le stocke en variable de session et on informe les autres personnes
    socket.on('nouveau_client', function(data) {
        pseudo = ent.encode(data.pseudo);
        color = ent.encode(data.color);
        players.push(new Player(data.pseudo, data.color));
        socket.pseudo = pseudo;
        socket.broadcast.emit('nouveau_client', pseudo);
        socket.emit('ok_nouveau', players);
        socket.broadcast.emit('ok_nouveau', players);

        if(players.length == 2){
            socket.emit('initGame');
            socket.broadcast.emit('initGame'); 
        }
    });

    // Dès qu'on reçoit un message, on récupère le pseudo de son auteur et on le transmet aux autres personnes
    socket.on('message', function (message) {
        message = ent.encode(message);
        socket.broadcast.emit('message', {pseudo: socket.pseudo, message: message});
    }); 

    //Dès que l'utilisateur ferme la page
    socket.on('disconnect', function () {
        socket.broadcast.emit('deconnexion', socket.pseudo);
        var new_players = [];
        for(i in players){
            if (players[i].name != socket.pseudo)
                new_players.push(players[i]);
        }
        players = new_players;
        socket.broadcast.emit('ok_nouveau', players);
    }); 
});

server.listen( server_port, server_ip_address, function () {
    var host = server.address().address;
    var port = server.address().port;
    console.log( 'Listening at http://%s:%s', host, port );
} );