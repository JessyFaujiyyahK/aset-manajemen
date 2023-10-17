const express = require("express");
const mysql = require("mysql");
const session = require("express-session");
const flash = require("connect-flash");

const port = 3001;

const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "aset",
  multipleStatements: true,
});

connection.connect(function (err) {
  if (err) {
    console.log("Cannot connect to mysql...");
    throw err;
  }
  console.log("Connected to mysql...");
});

const app = express();
app.use(
  session({
    secret: "secret",
    loggedin: false,
    resave: true,
    saveUninitialized: true,
  })
);

app.use(flash());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static("public"));

//set view engine to ejs
app.set("view engine", "ejs");

app.get("/", (req, res) => {
  req.session.register = false;
  const test = true;
  if (req.session.isadmin) {
    res.redirect("/dashboard/admin");
  } else if (req.session.loggedin) {
    res.redirect("/dashboard/user");
  } else {
    res.render("login", {
      success: test,
    });
  }
});

app.post("/auth-mhs", (req, res) => {
  let username = req.body.username;
  let password = req.body.password;

  // const test = true;

  if (username && password) {
    connection.query(
      "SELECT * FROM users WHERE username = ? AND password = ?",
      [username, password],
      (err, results, fields) => {
        if (err) throw err;

        if (results.length > 0) {
          req.session.loggedin = true;
          req.session.username = username;
          req.session.userid = results[0].id;
          // console.log(results[0].role);
          if (results[0].role == 1) {
            req.session.isadmin = true;
            req.session.loggedin = false;
            res.redirect("/dashboard/admin");
          } else {
            req.session.isadmin = false;
            res.redirect("/dashboard/user");
          }
        } else {
          res.send(`
          <html>
          <head>
            <title>Login Failed</title>
            <style>
              .alert {
                padding: 15px;
                background-color: #f44336;
                color: white;
              }
              .nostyle {
                text-decoration: none;
              }
            </style>
          </head>
          <body>
            <div class="alert">Login Failed. Please <a href="/" class="nostyle">try again</a>.</div>
          </body>
          </html>
        `);

          // res.redirect("/");
        }
        res.end();
      }
    );
  } else {
    res.send("Invalid");
    res.end();
  }
});

app.get("/register", (req, res) => {
  session_reg = req.session.register;
  res.render("register", { session_reg });
});

app.post("/account-register", (req, res) => {
  const data = req.body;
  const query = `
  INSERT INTO users (name, username, password, role) VALUES ('${data.name}', '${data.username}', '${data.password}', '0')`;
  connection.query(query, (err) => {
    if (err) throw err;
    req.session.register = true;
    session_reg = req.session.register;
    res.render("register", { session_reg });
  });
});

//endpoint admin

// Rute untuk halaman dashboard
app.get("/dashboard/admin", (req, res) => {
  // Anda dapat menyesuaikan data yang akan ditampilkan pada dashboard di sini
  const totalAset = 100;
  const nilaiAsetLokasi = {
    Lokasi1: 50000,
    Lokasi2: 70000,
  };
  const jumlahAsetKategori = {
    Kategori1: 40,
    Kategori2: 60,
  };

  // Render halaman dashboard.ejs dengan data yang diberikan
  res.render("dashboard", {
    totalAset: totalAset,
    nilaiAsetLokasi: nilaiAsetLokasi,
    jumlahAsetKategori: jumlahAsetKategori,
  });
});

// Handle POST request to add a new category
app.post("/kategori/tambah", (req, res) => {
  const { idkategori, kategori } = req.body;
  const query = `INSERT INTO kategori (id_kategori, nama_kategori) VALUES (${idkategori}, '${kategori}')`;
  connection.query(query, (error, results, fields) => {
    if (error) throw error;
    console.log("Category added successfully!");
    res.redirect("/kategori");
  });
});

// Handle POST request to edit a category
app.post("/kategori/edit/:id", (req, res) => {
  const categoryId = req.params.id;
  const { idkategori, kategori } = req.body;
  const query = `UPDATE kategori SET id_kategori = ${idkategori}, nama_kategori = '${kategori}' WHERE id_kategori = ${categoryId}`;
  connection.query(query, (error, results, fields) => {
    if (error) throw error;
    console.log("Category updated successfully!");
    res.redirect("/kategori");
  });
});

// Handle GET request to delete a category
app.get("/kategori/delete/:id", (req, res) => {
  const categoryId = req.params.id;
  const query = `DELETE FROM kategori WHERE id_kategori = ${categoryId}`;
  connection.query(query, (error, results, fields) => {
    if (error) throw error;
    console.log("Category deleted successfully!");
    res.redirect("/kategori");
  });
});

// Endpoint untuk menampilkan daftar jenis
app.get("/jenis", (req, res) => {
  connection.query("SELECT * FROM jenis", (error, results, fields) => {
    if (error) throw error;
    res.render("jenis", { jenis: results });
  });
});

// Endpoint untuk menampilkan halaman tambah jenis
app.get("/jenis/tambah", (req, res) => {
  res.render("jenis-tambah");
});

// Endpoint untuk menangani penambahan jenis
app.post("/jenis/tambah", (req, res) => {
  const { id_kategori, nama_jenis } = req.body;
  const query = `INSERT INTO jenis (id_kategori, nama_jenis) VALUES (${id_kategori}, '${nama_jenis}')`;

  connection.query(query, (error, results, fields) => {
    if (error) {
      return res.status(500).send("Gagal menambah jenis baru");
    }

    res.redirect("/jenis");
  });
});

// Endpoint untuk menampilkan halaman edit jenis
app.get("/jenis/edit/:id", (req, res) => {
  const jenisId = req.params.id;
  connection.query(
    `SELECT * FROM jenis WHERE id = ${jenisId}`,
    (error, results, fields) => {
      if (error) throw error;
      res.render("jenis-edit", { jenis: results[0] });
    }
  );
});

// Endpoint untuk menangani pengeditan jenis
app.post("/jenis/edit/:id", (req, res) => {
  const jenisId = req.params.id;
  const { id_kategori, nama_jenis } = req.body;
  const query = `UPDATE jenis SET id_kategori = ${id_kategori}, nama_jenis = '${nama_jenis}' WHERE id = ${jenisId}`;

  connection.query(query, (error, results, fields) => {
    if (error) {
      return res.status(500).send("Gagal mengedit jenis");
    }

    res.redirect("/jenis");
  });
});

// Handle POST request to add a new location
app.post("/lokasi/tambah", (req, res) => {
  const lokasi = req.body.Lokasi;
  const query = `INSERT INTO lokasi (nama_lokasi) VALUES ('${lokasi}')`;

  connection.query(query, (error, results, fields) => {
    if (error) {
      return res.status(500).send("Gagal menambah lokasi baru");
    }

    res.redirect("/lokasi");
  });
});

// Handle GET request to edit a location
app.get("/lokasi/edit/:id", (req, res) => {
  const lokasiId = req.params.id;
  connection.query(
    `SELECT * FROM lokasi WHERE id = ${lokasiId}`,
    (error, results, fields) => {
      if (error) throw error;
      res.render("lokasi-edit", { lokasi: results[0] });
    }
  );
});

// Handle POST request to edit a location
app.post("/lokasi/edit/:id", (req, res) => {
  const lokasiId = req.params.id;
  const lokasi = req.body.Lokasi;
  const query = `UPDATE lokasi SET nama_lokasi = '${lokasi}' WHERE id = ${lokasiId}`;

  connection.query(query, (error, results, fields) => {
    if (error) {
      return res.status(500).send("Gagal mengedit lokasi");
    }

    res.redirect("/lokasi");
  });
});

// Handle GET request to delete a location
app.get("/lokasi/delete/:id", (req, res) => {
  const lokasiId = req.params.id;
  const query = `DELETE FROM lokasi WHERE id = ${lokasiId}`;
  connection.query(query, (error, results, fields) => {
    if (error) {
      return res.status(500).send("Gagal menghapus lokasi");
    }

    res.redirect("/lokasi");
  });
});

app.listen(port, () => {
  console.log("Server started at port " + port);
  console.log("http://localhost:" + port);
});
