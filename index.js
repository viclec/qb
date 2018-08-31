module.exports = class Query {
  constructor(query, params) {
    this.query = query || '';
    this.params = params || [];
  }

  /* Method for executing query with parameters */
  execute(done) {
    var query = this.query;
    var params = this.params;
    POOL.getConnection(function(error, connection) {
      if(error){
        done(error);
      }else{
        connection.query(query, params, function (error, results, columns) {
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
  format() {
    return MYSQL.format(this.query, this.params)
  }

  /* Method for building query with SELECT clause */
  select(table, fieldsToSelect) {
    this.query += 'SELECT ?? FROM ?? ';
    this.params.push(fieldsToSelect, table);
    return this;
  }

  /* Method for building query with SELECT AS clause */
  selectAs(table, fieldsToSelect) {
    this.query += 'SELECT ' + fieldsToSelect + ' FROM ?? ';
    this.params.push(table);
    return this;
  }

  /* Method for creating new row */
  insert(table, rows) {
    this.query = 'INSERT INTO ?? SET ?;';
    this.params = [
      table,
      rows
    ];
    return this;
  }

  /* Method for creating multiple rows */
  insertMultiple(table, fields, rows) {
    this.query = 'INSERT INTO ?? (??) VALUES ?';
    this.params = [
      table,
      fields,
      rows
    ];
    return this;
  }

  /* Method for updating in place of insertion */
  onDuplicateUpdate(fields) {
    var isFirst = true;
    this.query += ' ON DUPLICATE KEY UPDATE ';
    fields.forEach(field => {
      if(isFirst){
        isFirst = false;
        this.query += '??=VALUES(??)'
      }else{
        this.query += ', ??=VALUES(??)'
      }
      this.params.push(field, field);
    })

    return this;
  }

  /* Method for updating in place of insertion */
  onDuplicateUpdateIf(fields, conditions) {
    var isFirst = true;
    this.query += ' ON DUPLICATE KEY UPDATE ';
    fields.forEach(field => {
      if(isFirst){
        isFirst = false;
        this.query += '??=IF(';
        this.params.push(field);
        var ifStatement = this.whereGroup(conditions, true);

        this.query = ifStatement.query;
        this.params = ifStatement.params;

        this.query += ', VALUES(??), ??)';
      }else{
        this.query += ',??=IF(';
        this.params.push(field);

        this.whereGroup(conditions, true);

        this.query += ', VALUES(??), ??)';
      }
      this.params.push(field, field);
    })

    return this;
  }

  /* Method for building query with UPDATE clause */
  update(table, fieldsToUpdate) {
    this.query += 'UPDATE ?? SET ?';
    this.params.push(table, fieldsToUpdate);
    return this;
  }

  /* Method for building query with UPDATE clause */
  updateSimple(table) {
    this.query += 'UPDATE ?? ';
    this.params.push(table);
    return this;
  }

  /* Method for building query with UPDATE clause */
  set(fields) {
    this.query += ' SET ?';
    this.params.push(fields);
    return this;
  }

  /* Method for building query with DELETE clause */
  _delete(table) {
    this.query += 'DELETE FROM ??';
    this.params.push(table);
    return this;
  }

  /* Method for building query with JOIN ON clause */
  join(tableToJoin, onClause) {
    if(typeof onClause === 'object' && onClause.length === 2){
      this.query += ' JOIN ?? ON ?? = ??';
      this.params.push(tableToJoin, onClause[0], onClause[1]);
    }else if(typeof onClause === 'object' && onClause.length === 1){
      this.query += ' JOIN ?? ON ';
      this.params.push(tableToJoin);
      return this.whereGroup(onClause[0], true)
    }else{
      this.query += ' JOIN ?? ';
      this.params.push(tableToJoin);
    }
    return this;
  }

  /* Method for building query with LEFT JOIN ON clause */
  joinLeft(tableToJoin, onClause) {
    if(typeof onClause === 'object' && onClause.length === 2){
      this.query += ' LEFT JOIN ?? ON ?? = ??';
      this.params.push(tableToJoin, onClause[0], onClause[1]);
    }else if(typeof onClause === 'object' && onClause.length === 1){
      this.query += ' LEFT JOIN ?? ON ';
      this.params.push(tableToJoin);
      return this.whereGroup(onClause[0], true)
    }else{
      this.query += ' LEFT JOIN ?? ';
      this.params.push(tableToJoin);
    }
    return this;
  }

  // TODO replace with better join()
  joinValue(tableToJoin, onClause) {
    if(typeof onClause === 'object' && onClause.length === 2){
      this.query += ' JOIN ?? ON ?? = ?';
      this.params.push(tableToJoin, onClause[0], onClause[1]);
    }else{
      this.query += ' JOIN ?? ';
      this.params.push(tableToJoin);
    }
    return this;
  }

  /* Method for building query with ORDER BY clause */
  orderBy(fieldToSort, typeOfSort) {
    this.query += ' ORDER BY ?? ' + (typeOfSort || '');
    this.params.push(fieldToSort);
    return this;
  }

  /* Method for building query with GROUP BY clause */
  groupBy(fieldToGroup) {
    this.query += ' GROUP BY ?? ';
    this.params.push(fieldToGroup);
    return this;
  }

  /* Method for building query with GROUP BY clause */
  groupByValue(fieldToGroup) {
    this.query += ' GROUP BY ' + fieldToGroup;
    return this;
  }

  /* Method for building query with ORDER BY clause */
  limit(page, limit) {
    this.query += ' LIMIT ' + page + ',' + limit;
    return this;
  }

  /* Method for building query with WHERE clause */
  whereJoin(fieldsToFilter) { //TODO expand where for other filters such as IN(), BETWEEN etc.
    var isFirst = true;
    fieldsToFilter.forEach(clause => {
      if(isFirst){
        isFirst = false;
        this.query += ' WHERE ?? ' + clause.operation + ' (??)';
        this.params.push(clause.field, clause.value);
      }else{
        this.query += ' ' + (clause.boolOp || 'AND') + ' ?? ' + clause.operation + ' (??)';
        this.params.push(clause.field, clause.value);
      }
    });
    return this;
  }

  /* Method for building query with WHERE clause */
  where(fieldsToFilter) {
    this.query += ' WHERE';
    return this.whereGroup(fieldsToFilter, true)
  }

  /* Method for grouping boolean clauses */
  whereGroup(fieldsToFilter, isFirstGroup, groupBoolOp) { //TODO expand where for other filters such as BETWEEN etc.
    if(!isFirstGroup){
      this.query += ' ' + (groupBoolOp || 'AND');
    }

    var isFirst = true;
    var boolOp = null;
    this.query += ' (';
    fieldsToFilter.forEach((clause, i) => {
      if(typeof clause === 'object' && clause.length > 0){
        var result = this.whereGroup(clause, i === 0, boolOp)
        this.query = result.query;
        this.params = result.params;
      }else{

        if(isFirst){
          isFirst = false;
        }else{
          this.query += ' ' + (clause.boolOp || 'AND')
        }

        this.params.push(clause.field);

        this.query += ' ?? ' + clause.operation;

        if(clause.value){
          if(clause.dateFormat){
            this.query += ' DATE_FORMAT(' + (clause.isField ? '??' : '?') + ', ?)';
            this.params.push(clause.value, clause.dateFormat);
          }else{
            this.query += ' (' + (clause.isField ? '??' : '?') + ')';
            this.params.push(clause.value);
          }
        }
      }
      boolOp = clause.boolOp;
    });
    this.query += ')';
    return this;
  }
}
