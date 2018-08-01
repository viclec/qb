module.exports = {
  select: select,
  selectAs: selectAs,
  insertMultiple: insertMultiple,
  insert: insert,
  onDuplicateUpdate: onDuplicateUpdate,
  update: update,
  delete: _delete,
  orderBy: orderBy,
  where: where,
  whereJoin: whereJoin,
  join: join,
  joinValue: joinValue,
  limit: limit,
  execute: execute,
  format: format
}

/* Method for executing query with parameters */
function execute(query, insertParams, done) {
  POOL.getConnection(function(error, connection) {
    if(error){
      done(error);
    }else{
      connection.query(query, insertParams, function (error, results, columns) {
        connection.release();
        if(error){
          done(error);
        }else{
          done(null, results);
        }
      })
    }
  })
}

/* Method for formating query with parameters. Useful for debugging */
function format(query, insertParams) {
  return MYSQL.format(query, insertParams)
}

/* Method for building query with SELECT clause */
function select(table, fieldsToSelect, query, insertParams) {
  query += 'SELECT ?? FROM ?? ';
  insertParams.push(fieldsToSelect, table);
  return {query: query, insertParams: insertParams};
}

/* Method for building query with SELECT AS clause */
function selectAs(table, fieldsToSelect, query, insertParams) {
  query += 'SELECT ' + fieldsToSelect + ' FROM ?? ';
  insertParams.push(table);
  return {query: query, insertParams: insertParams};
}

/* Method for creating new row */
function insert(table, rows) {
  var query = 'INSERT INTO ?? SET ?;';
  var insertParams = [
    table,
    rows
  ];
  return {query: query, insertParams: insertParams};
}

/* Method for creating multiple rows */
function insertMultiple(table, fields, rows) {
  var query = 'INSERT INTO ?? (??) VALUES ?';
  var insertParams = [
    table,
    fields,
    rows
  ];
  return {query: query, insertParams: insertParams};
}

/* Method for updating in place of insertion */
function onDuplicateUpdate(fields, query, insertParams) {
  var isFirst = true;
  query += ' ON DUPLICATE KEY UPDATE ';
  fields.forEach(field => {
    if(isFirst){
      isFirst = false;
      query += '??=VALUES(??)'
    }else{
      query += ', ??=VALUES(??)'
    }
    insertParams.push(field, field);
  })

  return {query: query, insertParams: insertParams};
}

/* Method for building query with UPDATE clause */
function update(table, fieldsToUpdate, query, insertParams) {
  query += 'UPDATE ?? SET ?';
  insertParams.push(table, fieldsToUpdate);
  return {query: query, insertParams: insertParams};
}

/* Method for building query with DELETE clause */
function _delete(table, query, insertParams) {
  query += 'DELETE FROM ??';
  insertParams.push(table);
  return {query: query, insertParams: insertParams};
}

/* Method for building query with JOIN ON clause */
function join(tableToJoin, onClause, query, insertParams) {
  if(typeof onClause === 'object' && onClause.length === 2){
    query += ' JOIN ?? ON ?? = ??';
    insertParams.push(tableToJoin, onClause[0], onClause[1]);
  }else{
    query += ' JOIN ?? ';
    insertParams.push(tableToJoin);
  }
  return {query: query, insertParams: insertParams};
}

// TODO replace with better join()
function joinValue(tableToJoin, onClause, query, insertParams) {
  if(typeof onClause === 'object' && onClause.length === 2){
    query += ' JOIN ?? ON ?? = ?';
    insertParams.push(tableToJoin, onClause[0], onClause[1]);
  }else{
    query += ' JOIN ?? ';
    insertParams.push(tableToJoin);
  }
  return {query: query, insertParams: insertParams};
}

/* Method for building query with ORDER BY clause */
function orderBy(fieldToSort, typeOfSort, query, insertParams) {
  query += ' ORDER BY ?? ' + typeOfSort;
  insertParams.push(fieldToSort);
  return {query: query, insertParams: insertParams};
}

/* Method for building query with ORDER BY clause */
function limit(page, limit, query, insertParams) {
  query += ' LIMIT ' + page + ',' + limit;
  return {query: query, insertParams: insertParams};
}

/* Method for building query with WHERE clause */
function whereJoin(fieldsToFilter, query, insertParams) { //TODO expand where for other filters such as IN(), BETWEEN etc.
  var isFirst = true;
  fieldsToFilter.forEach(clause => {
    if(isFirst){
      isFirst = false;
      query += ' WHERE ?? ' + clause.operation + ' (??)';
      insertParams.push(clause.field, clause.value);
    }else{
      query += ' ' + (clause.boolOp || 'AND') + ' ?? ' + clause.operation + ' (??)';
      insertParams.push(clause.field, clause.value);
    }
  });
  return {
    query: query,
    insertParams: insertParams
  };
}

/* Method for building query with WHERE clause */
function where(fieldsToFilter, query, insertParams) {
  query += ' WHERE';
  return whereGroup(fieldsToFilter, query, insertParams, true)
}

/* Method for grouping boolean clauses */
function whereGroup(fieldsToFilter, query, insertParams, isFirstGroup) { //TODO expand where for other filters such as BETWEEN etc.
  if(!isFirstGroup){
    query += ' AND';
  }

  var isFirst = true;
  query += ' (';
  fieldsToFilter.forEach((clause, i) => {
    if(typeof clause === 'object' && clause.length > 0){
      var result = whereGroup(clause, query, insertParams, i === 0)
      query = result.query;
      insertParams = result.insertParams;
    }else{
      if(isFirst){
        isFirst = false;
        query += ' ?? ' + clause.operation + ' (' + (clause.isField ? '??' : '?') + ')';
      }else{
        query += ' ' + (clause.boolOp || 'AND') + ' ?? ' + clause.operation + ' (' + (clause.isField ? '??' : '?') + ')';
      }
      insertParams.push(clause.field, clause.value);
    }
  });
  query += ')';
  return {
    query: query,
    insertParams: insertParams
  };
}
