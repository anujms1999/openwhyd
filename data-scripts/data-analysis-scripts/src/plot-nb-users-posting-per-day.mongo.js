function map() {
  var DAY_MS = 1000 * 60 * 60 * 24;
  var renderDate = t =>
    new Date(DAY_MS * Math.floor(t / DAY_MS)).toISOString().split('T')[0];
  // notice: MongoDB will not call the reduce function for a key that has only a single value
  // => emit same kind of output as reduce()'s
  emit(renderDate(this._id.getTimestamp()), {
    users: [ this.uId ],
    count: 1
  });
}

function reduce(day, vals) {
  // notice: MongoDB can invoke the reduce function more than once for the same key
  var userSet = {};
  vals.forEach(val => val.users.forEach(uId => userSet[uId] = true));
  var users = Object.keys(userSet);
  return {
    users,
    count: users.length
  };
}

var opts = {
  out: { inline: 1 },
  //limit: 1000
};

var results = db.post.mapReduce(map, reduce, opts).results;
print(results.map(res => [ res._id, res.value.count ]).join('\n'));
