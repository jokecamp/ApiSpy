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
  client.multi()
    .get("stats:hits")
    .smembers('stats:urls')
    .lrange('stats:requests', 0, 200)
    .exec(function (err, replies) {
      res.send(replies);
      return next();
  });
});

var saveUrlStats = function(hit) {

  // keep list of last 200 requests
  client.LPUSH("stats:requests", JSON.stringify(hit));
  client.LTRIM("stats:requests", 0, 200);

  client.LPUSH("stats:requests:ms", hit.elapsedms);
  client.LTRIM("stats:requests:ms", 0, 1000);

  client.INCR("stats:hits:" + hit.server);
  client.INCR("stats:hits:" + hit.apikey, redis.print);

  client.INCR("stats:hits");
  client.SADD('stats:urls', hit.url);
  client.INCR('stats:hits:' + hit.url + ':hits', redis.print);
};

server.post('/stats', function(req, res, next) {
  console.log(req.body);
  saveUrlStats(req.body);
  res.send("success");
  return next();
});

server.listen(8080, function () {
  console.log('%s listening at %s', server.name, server.url);
});
