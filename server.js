var restify = require('restify');
var redis = require("redis"),
    client = redis.createClient();

var server = restify.createServer({
  name: 'ApiSpy',
  version: '1.0.0'
});

server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());
server.use(restify.bodyParser());

client.on("error", function (err) {
    console.log("Error " + err);
});

server.get('/stats', function (req, res, next) {
  var stats = { counts: {} };
  client.GET("total", function (err, result) {
    stats.counts.total = result;
    res.send(stats);
    return next();
  });
});

server.post('/stats', function(req, res, next) {
  client.INCR("total", redis.print);
  client.GET("total", function (err, result) {
    res.send(result);
    return next();
  });
});

server.listen(8080, function () {
  console.log('%s listening at %s', server.name, server.url);
});
