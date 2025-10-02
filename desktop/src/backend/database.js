const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor() {
    this.db = new sqlite3.Database(path.join(__dirname, 'cleaning_business.db'));
    this.initializeTables();
  }

  initializeTables() {
    const tables = [
      `CREATE TABLE IF NOT EXISTS employees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE,
        phone TEXT,
        role TEXT,
        hire_date DATE,
        status TEXT DEFAULT 'active'
      )`,
      `CREATE TABLE IF NOT EXISTS equipment (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT,
        purchase_date DATE,
        status TEXT DEFAULT 'available',
        maintenance_due DATE
      )`,
      `CREATE TABLE IF NOT EXISTS chemicals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        quantity INTEGER DEFAULT 0,
        unit TEXT,
        reorder_point INTEGER DEFAULT 10,
        supplier TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS cleaning_sites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_name TEXT NOT NULL,
        address TEXT,
        floor_plan_path TEXT,
        contract_details TEXT,
        frequency TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS robots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        model TEXT,
        capabilities TEXT,
        battery_level INTEGER DEFAULT 100,
        status TEXT DEFAULT 'idle',
        location TEXT,
        last_update DATETIME
      )`,
      `CREATE TABLE IF NOT EXISTS space_projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        design_data TEXT,
        simulation_results TEXT,
        created_date DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    tables.forEach(sql => {
      this.db.run(sql, (err) => {
        if (err) console.error('Table creation error:', err);
      });
    });
  }

  query(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }
}

module.exports = new Database();