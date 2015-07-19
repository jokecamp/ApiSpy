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

var countersByRequest = ['url', 'server', 'apikey', 'statuscode', 'verb', 'user'];

var getKeys = function(callback) {

  var multi = client.multi()
    .smembers('stats:urls')
    .smembers('stats:hits:counters');

  multi.exec(function (err, replies) {
    var props = {};
    props["stats:urls"] = replies[0];
    props["stats:hits:counters"] = replies[1];
    callback(props);
  });

};

server.get('/stats', function (req, res, next) {

  getKeys(function(props) {

    var data = {};
    var multi = client.multi();

    multi.get('stats:hits', function(err, reply) {
      data.hits = reply;
    });

    props["stats:hits:counters"].forEach(function(item) {
      multi.get(item, function(err, reply) {
        data[item] = reply;
      });
    });

    multi.exec(function(err, replies) {

      res.send(data);
      return next();

    });

  });

});


var saveRequestStats = function(hit) {

  // total api hit
  client.INCR("stats:hits");

  // keep list of last 200 requests
  client.LPUSH("stats:requests", JSON.stringify(hit));
  client.LTRIM("stats:requests", 0, 200);

  client.LPUSH("stats:requests:ms", hit.elapsed);
  client.LTRIM("stats:requests:ms", 0, 1000);

  // keep list of unique urls
  client.SADD('stats:urls', hit.url);

  saveStats("stats:hits:", hit);

};

var saveStats = function(keyPrefix, hit) {

  // counters
  countersByRequest.forEach(function(item) {
    var key = keyPrefix + hit[item];
    client.SADD(keyPrefix + "counters", key);
    client.INCR(key);
  });

};

server.post('/stats', function(req, res, next) {
  console.log(req.body);
  saveRequestStats(req.body);
  res.send("success");
  return next();
});

server.listen(8080, function () {
  console.log('%s listening at %s', server.name, server.url);
});
