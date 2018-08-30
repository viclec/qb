MYSQL = require('mysql');
var QueryBuilder = require('../index.js');

var query = new QueryBuilder();

query.select('USER', ['name', 'email', 'dateCreated'])
.join('PURCHASE', [[{
    field: 'USER.id',
    value: 'PURCHASE.userID',
    operation: '='
}]])
.join('IMAGE', ['IMAGE.userID', 'USER.id'])
.where([{
    field: 'USER.dateCreated',
    value: new Date(),
    operation: '<='
}])
.orderBy('USER.name')
.limit(0, 10);
    
console.log(query.format());
