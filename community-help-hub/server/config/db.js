const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const bcrypt = require("bcrypt");

const dbPath = path.join(__dirname, "../community_help_hub.db");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error("SQLite connection failed:", err.message);
  else console.log("SQLite connected:", dbPath);
});

// This database is intentionally migration-friendly.  CREATE TABLE IF NOT EXISTS
// does not update an existing SQLite table, so older project databases need their
// missing columns added before the application starts using them.
db.serialize(() => {
  db.run("PRAGMA foreign_keys = ON");
  db.run("PRAGMA journal_mode = WAL");

  db.run(`CREATE TABLE IF NOT EXISTS users(
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL, phone TEXT DEFAULT '', location TEXT DEFAULT '', role TEXT DEFAULT 'user',
    skills TEXT DEFAULT '', available INTEGER DEFAULT 0, latitude REAL, longitude REAL,
    rating REAL DEFAULT 5, trustScore REAL DEFAULT 50, createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS communities(
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, category TEXT DEFAULT 'General',
    description TEXT DEFAULT '', location TEXT DEFAULT '', adminId INTEGER, status TEXT DEFAULT 'Active',
    latitude REAL, longitude REAL, radiusKm REAL DEFAULT 2, createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(adminId) REFERENCES users(id) ON DELETE SET NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS community_members(
    id INTEGER PRIMARY KEY AUTOINCREMENT, communityId INTEGER NOT NULL, userId INTEGER NOT NULL,
    role TEXT DEFAULT 'member', joinedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(communityId,userId), FOREIGN KEY(communityId) REFERENCES communities(id) ON DELETE CASCADE,
    FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS community_join_requests(
    id INTEGER PRIMARY KEY AUTOINCREMENT, communityId INTEGER NOT NULL, userId INTEGER NOT NULL,
    status TEXT DEFAULT 'Pending', requestedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(communityId,userId), FOREIGN KEY(communityId) REFERENCES communities(id) ON DELETE CASCADE,
    FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS ai_match_decisions(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    helpRequestId INTEGER NOT NULL,
    helperId INTEGER NOT NULL,
    decision TEXT NOT NULL,
    reason TEXT DEFAULT '',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(helpRequestId,helperId),
    FOREIGN KEY(helpRequestId) REFERENCES help_requests(id) ON DELETE CASCADE,
    FOREIGN KEY(helperId) REFERENCES users(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS help_requests(
    id INTEGER PRIMARY KEY AUTOINCREMENT, userId INTEGER NOT NULL, communityId INTEGER,
    title TEXT NOT NULL, description TEXT NOT NULL, category TEXT NOT NULL, urgency TEXT DEFAULT 'Normal',
    location TEXT DEFAULT '', latitude REAL, longitude REAL, status TEXT DEFAULT 'Open', adminStatus TEXT DEFAULT 'Pending',
    helperId INTEGER, trustScore REAL DEFAULT 50, createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(communityId) REFERENCES communities(id) ON DELETE SET NULL,
    FOREIGN KEY(helperId) REFERENCES users(id) ON DELETE SET NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS bookings(
    id INTEGER PRIMARY KEY AUTOINCREMENT, requesterId INTEGER, helperId INTEGER,
    helpRequestId INTEGER, service TEXT, bookingDate TEXT, bookingTime TEXT DEFAULT '10:00',
    notes TEXT DEFAULT '', amount REAL DEFAULT 0, status TEXT DEFAULT 'Pending',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(requesterId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(helperId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(helpRequestId) REFERENCES help_requests(id) ON DELETE SET NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS payments(
    id INTEGER PRIMARY KEY AUTOINCREMENT, bookingId INTEGER, amount REAL DEFAULT 0,
    paymentMethod TEXT DEFAULT 'Cash', paymentStatus TEXT DEFAULT 'Pending',
    transactionRef TEXT, paidAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(bookingId) REFERENCES bookings(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS notifications(
    id INTEGER PRIMARY KEY AUTOINCREMENT, userId INTEGER, type TEXT DEFAULT 'Community',
    title TEXT DEFAULT '', message TEXT DEFAULT '', location TEXT DEFAULT '', isRead INTEGER DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS announcements(
    id INTEGER PRIMARY KEY AUTOINCREMENT, communityId INTEGER, adminId INTEGER,
    title TEXT DEFAULT '', message TEXT DEFAULT '', createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(communityId) REFERENCES communities(id) ON DELETE CASCADE,
    FOREIGN KEY(adminId) REFERENCES users(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS messages(
    id INTEGER PRIMARY KEY AUTOINCREMENT, senderId INTEGER, receiverId INTEGER,
    message TEXT DEFAULT '', attachment TEXT, sentAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(senderId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(receiverId) REFERENCES users(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS services(
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, category TEXT NOT NULL,
    description TEXT DEFAULT '', price REAL DEFAULT 0, serviceType TEXT DEFAULT 'paid',
    providerId INTEGER, verified INTEGER DEFAULT 1, available INTEGER DEFAULT 1,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(providerId) REFERENCES users(id) ON DELETE SET NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS reviews(
    id INTEGER PRIMARY KEY AUTOINCREMENT, bookingId INTEGER, reviewerId INTEGER NOT NULL,
    revieweeId INTEGER NOT NULL, rating REAL NOT NULL, comment TEXT DEFAULT '',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(bookingId) REFERENCES bookings(id) ON DELETE SET NULL,
    FOREIGN KEY(reviewerId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(revieweeId) REFERENCES users(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS audit_logs(
    id INTEGER PRIMARY KEY AUTOINCREMENT, userId INTEGER, action TEXT NOT NULL,
    entity TEXT, entityId INTEGER, metadata TEXT, createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(userId) REFERENCES users(id) ON DELETE SET NULL
  )`);

  // Add columns to tables created by older versions of the project.
  const migrations = [
    ["users", "location", "TEXT DEFAULT ''"],
    ["users", "trustScore", "REAL DEFAULT 50"],
    ["users", "locationUpdatedAt", "DATETIME"],
    ["communities", "latitude", "REAL"],
    ["communities", "longitude", "REAL"],
    ["communities", "radiusKm", "REAL DEFAULT 2"],
    ["help_requests", "latitude", "REAL"],
    ["help_requests", "longitude", "REAL"],
    ["help_requests", "helperId", "INTEGER"],
    ["help_requests", "trustScore", "REAL DEFAULT 50"],
    ["help_requests", "attachments", "TEXT DEFAULT '[]'"],
    ["help_requests", "voiceTranscript", "TEXT DEFAULT ''"],
    ["help_requests", "adminStatus", "TEXT DEFAULT 'Pending'"],
    ["bookings", "requesterId", "INTEGER"],
    ["bookings", "helperId", "INTEGER"],
    ["bookings", "helpRequestId", "INTEGER"],
    ["bookings", "service", "TEXT"],
    ["bookings", "bookingTime", "TEXT DEFAULT '10:00'"],
    ["bookings", "notes", "TEXT DEFAULT ''"],
    ["payments", "transactionRef", "TEXT"],
    ["notifications", "type", "TEXT DEFAULT 'Community'"],
    ["notifications", "location", "TEXT DEFAULT ''"],
    ["messages", "attachment", "TEXT"],
    ["community_join_requests", "userLatitude", "REAL"],
    ["community_join_requests", "userLongitude", "REAL"],
    ["community_join_requests", "userLocation", "TEXT DEFAULT ''"]
  ];

  const migrateNext = (index) => {
    if (index >= migrations.length) {
      finishMigration();
      return;
    }
    const [table, column, definition] = migrations[index];
    db.all(`PRAGMA table_info(${table})`, (err, columns) => {
      if (err) {
        console.error(`Migration check failed for ${table}.${column}:`, err.message);
        return migrateNext(index + 1);
      }
      const exists = columns.some(c => c.name.toLowerCase() === column.toLowerCase());
      if (exists) return migrateNext(index + 1);
      db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`, (alterErr) => {
        if (alterErr) console.error(`Migration failed for ${table}.${column}:`, alterErr.message);
        else console.log(`Database migration: added ${table}.${column}`);
        migrateNext(index + 1);
      });
    });
  };

  const seedDemoData = () => {
    const adminHash = bcrypt.hashSync("Admin@12345", 10);
    const userHash = bcrypt.hashSync("User@12345", 10);

    db.run(`INSERT OR IGNORE INTO users(name,email,password,phone,location,role,skills,available,latitude,longitude,trustScore,locationUpdatedAt)
      VALUES('Community Admin','admin@communityhub.local',?,'9999999999','Hyderabad','admin','management,emergency',1,17.3850,78.4867,95,CURRENT_TIMESTAMP)`, [adminHash]);
    db.run(`INSERT OR IGNORE INTO users(name,email,password,phone,location,role,skills,available,latitude,longitude,trustScore,locationUpdatedAt)
      VALUES('Demo Helper','user@communityhub.local',?,'9888888888','Hyderabad','user','medicine delivery,tutoring,transportation,food support',1,17.3850,78.4867,88,CURRENT_TIMESTAMP)`, [userHash], () => {
      db.get("SELECT id FROM users WHERE email='admin@communityhub.local'", (aErr, admin) => {
        db.get("SELECT id FROM users WHERE email='user@communityhub.local'", (uErr, user) => {
          if (aErr || uErr || !admin || !user) return;
          const services = [
            ['Electrician','Home Repair','Verified electrical repair and maintenance.',300,'paid',admin.id],
            ['Plumber','Home Repair','Verified plumbing support.',250,'paid',admin.id],
            ['Home Tutor','Education','Community tutoring for school students.',500,'paid',user.id],
            ['Medicine Pickup','Community Help','Free volunteer medicine pickup.',0,'free',user.id],
            ['Student Tutoring','Education','Free peer tutoring by community volunteers.',0,'free',user.id]
          ];
          services.forEach(s => db.run("INSERT INTO services(name,category,description,price,serviceType,providerId) SELECT ?,?,?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM services WHERE name=? AND serviceType=?)", [...s, s[0], s[4]]));
          const communities = [
            ['Green Valley Community','Apartment','Neighbour support for residents, emergencies and local services.','Hyderabad',admin.id],
            ['Student Learning Circle','Hostel','Peer tutoring, notes, study support and student assistance.','Hyderabad',admin.id],
            ['Sai Nagar Local Help','Colony','A local help network for food, transport and elderly support.','Warangal',admin.id]
          ];
          communities.forEach(c => db.run("INSERT INTO communities(name,category,description,location,adminId) SELECT ?,?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM communities WHERE name=?)", [...c, c[0]]));
        });
      });
    });
  };

  const finishMigration = () => {
    db.run("UPDATE help_requests SET helperId=volunteerId WHERE helperId IS NULL AND EXISTS (SELECT 1 FROM pragma_table_info('help_requests') WHERE name='volunteerId')", () => {
      db.run("UPDATE bookings SET requesterId=userId WHERE requesterId IS NULL AND EXISTS (SELECT 1 FROM pragma_table_info('bookings') WHERE name='userId')", () => {
        db.run("UPDATE bookings SET service=serviceName WHERE (service IS NULL OR service='') AND EXISTS (SELECT 1 FROM pragma_table_info('bookings') WHERE name='serviceName')", () => {
          db.run("UPDATE bookings SET bookingTime='10:00' WHERE bookingTime IS NULL OR bookingTime=''", () => {
            db.run("UPDATE communities SET radiusKm=2 WHERE radiusKm IS NULL OR radiusKm<=0", () => {
              db.run("UPDATE communities SET latitude=17.3850,longitude=78.4867 WHERE name='Green Valley Community' AND (latitude IS NULL OR longitude IS NULL)");
              db.run("UPDATE communities SET latitude=17.4448,longitude=78.3498 WHERE name='Student Learning Circle' AND (latitude IS NULL OR longitude IS NULL)");
              db.run("UPDATE communities SET latitude=17.9689,longitude=79.5941 WHERE name='Sai Nagar Local Help' AND (latitude IS NULL OR longitude IS NULL)");
              db.run("CREATE INDEX IF NOT EXISTS idx_help_status ON help_requests(status)");
              db.run("CREATE INDEX IF NOT EXISTS idx_help_user ON help_requests(userId)");
              db.run("CREATE INDEX IF NOT EXISTS idx_members_community ON community_members(communityId)");
              db.run("CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(userId,isRead)");
              db.run("CREATE INDEX IF NOT EXISTS idx_messages_pair ON messages(senderId,receiverId,sentAt)");
              seedDemoData();
            });
          });
        });
      });
    });
  };

  migrateNext(0);
});

module.exports = db;
