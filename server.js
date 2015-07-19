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


var prefix = "stats:api:";
var countersByRequest = ['url', 'server', 'apikey', 'statuscode', 'verb', 'user'];
var sets = ['urls', 'counters'];

var getKeys = function(callback) {

  var multi = client.multi();

  sets.forEach(function(item) {
    multi.smembers(prefix + item);
  });

  multi.exec(function (err, replies) {
    var props = {};

    replies.forEach(function(r, index) {
      props[prefix + sets[index]] = r;
    });

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

    props[prefix + "counters"].forEach(function(item) {
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
  client.INCR(prefix + "calls");

  // keep list of last 200 requests
  client.LPUSH(prefix + "requests", JSON.stringify(hit));
  client.LTRIM(prefix + "requests", 0, 200);

  // keep list of unique urls
  client.SADD(prefix + 'urls', hit.url);

  saveStats(prefix, hit);
  saveStats(prefix + hit.url + ":", hit);
};

var saveStats = function(keyPrefix, hit) {

  client.LPUSH(keyPrefix + "ms", hit.elapsed);

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
